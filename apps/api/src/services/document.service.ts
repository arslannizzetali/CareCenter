import type { DocumentPriority, Prisma } from "@prisma/client";
import type { DocumentMetaInput } from "@bakimevi/validation";
import { prisma } from "../config/database.js";
import { auditService } from "./audit.service.js";
import { encryptionService } from "./encryption.service.js";
import { storageService } from "./storage.service.js";
import { patientService, type PatientQuery } from "./patient.service.js";
import { notificationService } from "./notification.service.js";
import { makeStoredFileName } from "../middleware/file-upload.js";
import { ForbiddenError, NotFoundError } from "../utils/errors.js";
import { daysUntilExpiry, expiryStatus, remainingLabel } from "../utils/expiry.js";
import type { Requester } from "./patient-update.service.js";

export interface DocumentUploadMeta {
  expiresAt?: Date | undefined;
  documentTypeId?: string | undefined;
}

export interface DocumentMatrixQuery extends PatientQuery {
  missingTypeId?: string;
}

export interface UploadedDocumentFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface DownloadedDocument {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  fileSize: bigint;
}

export class DocumentService {
  async upload(
    patientId: string,
    file: UploadedDocumentFile,
    priority: DocumentPriority,
    meta: DocumentUploadMeta,
    requester: Requester
  ) {
    const patient = await prisma.patient.findFirst({ where: { id: patientId, deletedAt: null }, select: { id: true } });
    if (!patient) {
      throw new NotFoundError("PATIENT_NOT_FOUND", "Resident not found");
    }
    if (meta.documentTypeId) {
      await this.assertDocumentType(meta.documentTypeId);
    }

    const encrypted = encryptionService.encryptFile(file.buffer);
    const storedFileName = makeStoredFileName(file.originalname);
    await storageService.uploadFile(storedFileName, encrypted.encrypted, "application/octet-stream");

    const document = await prisma.document.create({
      data: {
        patientId,
        uploadedById: requester.userId,
        documentTypeId: meta.documentTypeId ?? null,
        fileName: file.originalname,
        storedFileName,
        fileSize: BigInt(file.size),
        mimeType: file.mimetype,
        priority,
        expiresAt: meta.expiresAt ?? null,
        encryptionKey: encryptionService.packDocumentKey(encrypted.key, encrypted.iv, encrypted.authTag),
        checksum: encrypted.checksum
      },
      include: documentInclude
    });

    await auditService.write({
      userId: requester.userId,
      action: "DOCUMENT_UPLOADED",
      resourceType: "Document",
      resourceId: document.id,
      metadata: {
        patientId,
        priority,
        documentTypeId: meta.documentTypeId ?? null,
        expiresAt: meta.expiresAt ?? null,
        fileSize: file.size,
        mimeType: file.mimetype
      },
      ipAddress: requester.ipAddress,
      userAgent: requester.userAgent
    });

    return serializeDocument(document);
  }

  async updateMeta(documentId: string, input: DocumentMetaInput, requester: Requester) {
    const document = await this.getDocument(documentId);
    if (requester.role === "EMPLOYEE" && document.uploadedById !== requester.userId) {
      throw new ForbiddenError("DOCUMENT_ACCESS_DENIED", "You are not allowed to edit this document");
    }
    if (input.documentTypeId) {
      await this.assertDocumentType(input.documentTypeId);
    }

    const data: Prisma.DocumentUpdateInput = {};
    if (input.documentTypeId !== undefined) {
      data.documentType = input.documentTypeId
        ? { connect: { id: input.documentTypeId } }
        : { disconnect: true };
    }
    if (input.expiresAt !== undefined) {
      data.expiresAt = input.expiresAt;
    }

    const updated = await prisma.document.update({
      where: { id: documentId },
      data,
      include: documentInclude
    });

    // Yeni geçerlilik tarihi artık "yakında dolmuyor" ise süre-bildirimini kaldır.
    if (input.expiresAt !== undefined && expiryStatus(updated.expiresAt) !== "RED") {
      await notificationService.dismissForDocument(documentId);
    }

    await auditService.write({
      userId: requester.userId,
      action: "DOCUMENT_META_UPDATED",
      resourceType: "Document",
      resourceId: documentId,
      metadata: { changedFields: Object.keys(input) },
      ipAddress: requester.ipAddress,
      userAgent: requester.userAgent
    });

    return serializeDocument(updated);
  }

  /**
   * Evrak matrisi: satır = engelli, sütun = evrak türü.
   * Her hücrede o engellinin o türdeki (silinmemiş, en yeni) evrakı.
   */
  async matrix(query: DocumentMatrixQuery, requester: Requester) {
    const patientWhere = patientService.listWhere(query);
    if (query.missingTypeId) {
      patientWhere.documents = {
        none: { isDeleted: false, documentTypeId: query.missingTypeId }
      };
    }

    const [types, patients] = await Promise.all([
      prisma.documentType.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true }
      }),
      prisma.patient.findMany({
        where: patientWhere,
        take: query.limit ?? 500,
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        select: {
          id: true,
          firstName: true,
          lastName: true,
          roomNumber: true,
          careType: true,
          disabilityType: true,
          birthDate: true,
          status: true,
          documents: {
            where: {
              isDeleted: false,
              documentTypeId: { not: null },
              ...(requester.role === "EMPLOYEE" ? { uploadedById: requester.userId } : {})
            },
            orderBy: { uploadedAt: "desc" },
            select: { id: true, fileName: true, documentTypeId: true, expiresAt: true, priority: true }
          }
        }
      })
    ]);

    const rows = patients.map((patient) => {
      const cells: Record<
        string,
        {
          documentId: string;
          fileName: string;
          expiresAt: Date | null;
          expiryStatus: "RED" | "YELLOW" | "GREEN" | null;
          remainingLabel: string;
          daysUntilExpiry: number | null;
        } | null
      > = {};

      for (const type of types) {
        const doc = patient.documents.find((document) => document.documentTypeId === type.id);
        cells[type.id] = doc
          ? {
              documentId: doc.id,
              fileName: doc.fileName,
              expiresAt: doc.expiresAt,
              expiryStatus: expiryStatus(doc.expiresAt),
              remainingLabel: remainingLabel(doc.expiresAt),
              daysUntilExpiry: daysUntilExpiry(doc.expiresAt)
            }
          : null;
      }

      const { documents: _documents, ...rest } = patient;
      return { patient: rest, cells };
    });

    return { types, rows };
  }

  /** Engelli detay sayfası için: her aktif evrak türü + o engellinin o türdeki son evrakı. */
  async typeStatusForPatient(patientId: string, requester: Requester) {
    const [types, documents] = await Promise.all([
      prisma.documentType.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true }
      }),
      prisma.document.findMany({
        where: {
          patientId,
          isDeleted: false,
          documentTypeId: { not: null },
          ...(requester.role === "EMPLOYEE" ? { uploadedById: requester.userId } : {})
        },
        orderBy: { uploadedAt: "desc" },
        select: { id: true, fileName: true, documentTypeId: true, expiresAt: true, priority: true }
      })
    ]);

    return types.map((type) => {
      const doc = documents.find((document) => document.documentTypeId === type.id);
      return {
        typeId: type.id,
        typeName: type.name,
        document: doc
          ? {
              id: doc.id,
              fileName: doc.fileName,
              expiresAt: doc.expiresAt,
              expiryStatus: expiryStatus(doc.expiresAt),
              remainingLabel: remainingLabel(doc.expiresAt),
              daysUntilExpiry: daysUntilExpiry(doc.expiresAt)
            }
          : null
      };
    });
  }

  private async assertDocumentType(id: string): Promise<void> {
    const count = await prisma.documentType.count({ where: { id, isActive: true } });
    if (count === 0) {
      throw new NotFoundError("DOCUMENT_TYPE_NOT_FOUND", "Document type not found");
    }
  }

  async listForPatient(patientId: string, requester: Requester) {
    const where: Prisma.DocumentWhereInput = {
      patientId,
      isDeleted: false,
      ...(requester.role === "EMPLOYEE" ? { uploadedById: requester.userId } : {})
    };

    const documents = await prisma.document.findMany({
      where,
      orderBy: [{ priority: "asc" }, { uploadedAt: "desc" }],
      include: documentInclude
    });

    return {
      red: documents.filter((document) => document.priority === "RED").map(serializeDocument),
      yellow: documents.filter((document) => document.priority === "YELLOW").map(serializeDocument),
      green: documents.filter((document) => document.priority === "GREEN").map(serializeDocument)
    };
  }

  async download(documentId: string, requester: Requester): Promise<DownloadedDocument> {
    const document = await this.getAccessibleDocument(documentId, requester);
    const encryptedBuffer = await storageService.getFile(document.storedFileName);
    const packed = encryptionService.unpackDocumentKey(document.encryptionKey);
    const decrypted = encryptionService.decryptFile(encryptedBuffer, packed.encryptionKey, packed.iv, packed.authTag);
    encryptionService.verifyChecksum(decrypted, document.checksum);

    await auditService.write({
      userId: requester.userId,
      action: "DOCUMENT_DOWNLOADED",
      resourceType: "Document",
      resourceId: document.id,
      metadata: { patientId: document.patientId, priority: document.priority },
      ipAddress: requester.ipAddress,
      userAgent: requester.userAgent
    });

    return {
      buffer: decrypted,
      fileName: document.fileName,
      mimeType: document.mimeType,
      fileSize: document.fileSize
    };
  }

  async changePriority(documentId: string, priority: DocumentPriority, requester: Requester) {
    const document = await this.getDocument(documentId);
    const updated = await prisma.document.update({
      where: { id: documentId },
      data: { priority },
      include: documentInclude
    });

    await auditService.write({
      userId: requester.userId,
      action: "DOCUMENT_PRIORITY_CHANGED",
      resourceType: "Document",
      resourceId: documentId,
      metadata: { oldPriority: document.priority, newPriority: priority },
      ipAddress: requester.ipAddress,
      userAgent: requester.userAgent
    });

    return serializeDocument(updated);
  }

  async delete(documentId: string, requester: Requester): Promise<void> {
    const document = await this.getDocument(documentId);
    if (document.priority === "RED") {
      throw new ForbiddenError("RED_DOCUMENT_IMMUTABLE", "Red documents cannot be deleted");
    }

    await storageService.deleteFile(document.storedFileName);
    await prisma.document.update({
      where: { id: documentId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedById: requester.userId
      }
    });

    await auditService.write({
      userId: requester.userId,
      action: "DOCUMENT_DELETED",
      resourceType: "Document",
      resourceId: documentId,
      metadata: { priority: document.priority, patientId: document.patientId },
      ipAddress: requester.ipAddress,
      userAgent: requester.userAgent
    });
  }

  async autoDelete(documentId: string, retentionDays: number): Promise<void> {
    const document = await this.getDocument(documentId);
    if (document.priority === "RED") {
      return;
    }

    await storageService.deleteFile(document.storedFileName);
    await prisma.document.update({
      where: { id: documentId },
      data: {
        isDeleted: true,
        deletedAt: new Date()
      }
    });

    await auditService.write({
      userId: null,
      action: "DOCUMENT_DELETED",
      resourceType: "Document",
      resourceId: documentId,
      metadata: { reason: "AUTO_DELETE", priority: document.priority, retentionDays },
      ipAddress: "system"
    });
  }

  private async getAccessibleDocument(documentId: string, requester: Requester) {
    const document = await this.getDocument(documentId);
    if (requester.role === "EMPLOYEE" && document.uploadedById !== requester.userId) {
      throw new ForbiddenError("DOCUMENT_ACCESS_DENIED", "You are not allowed to download this document");
    }

    return document;
  }

  private async getDocument(documentId: string) {
    const document = await prisma.document.findFirst({
      where: { id: documentId, isDeleted: false },
      include: documentInclude
    });
    if (!document) {
      throw new NotFoundError("DOCUMENT_NOT_FOUND", "Document not found");
    }
    return document;
  }
}

const documentInclude = {
  uploadedBy: { select: { id: true, firstName: true, lastName: true } },
  patient: { select: { id: true, firstName: true, lastName: true } },
  documentType: { select: { id: true, name: true } }
} satisfies Prisma.DocumentInclude;

function serializeDocument<T extends { fileSize: bigint; expiresAt: Date | null }>(
  document: T
): Omit<T, "fileSize"> & {
  fileSize: number;
  expiryStatus: "RED" | "YELLOW" | "GREEN" | null;
  daysUntilExpiry: number | null;
  remainingLabel: string;
} {
  return {
    ...document,
    fileSize: Number(document.fileSize),
    expiryStatus: expiryStatus(document.expiresAt),
    daysUntilExpiry: daysUntilExpiry(document.expiresAt),
    remainingLabel: remainingLabel(document.expiresAt)
  };
}

export const documentService = new DocumentService();
