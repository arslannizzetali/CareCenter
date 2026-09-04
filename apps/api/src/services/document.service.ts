import type { DocumentPriority, Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";
import { auditService } from "./audit.service.js";
import { encryptionService } from "./encryption.service.js";
import { storageService } from "./storage.service.js";
import { makeStoredFileName } from "../middleware/file-upload.js";
import { ForbiddenError, NotFoundError } from "../utils/errors.js";
import type { Requester } from "./patient-update.service.js";

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
  async upload(patientId: string, file: UploadedDocumentFile, priority: DocumentPriority, requester: Requester) {
    const patient = await prisma.patient.findFirst({ where: { id: patientId, deletedAt: null }, select: { id: true } });
    if (!patient) {
      throw new NotFoundError("PATIENT_NOT_FOUND", "Hasta bulunamadı");
    }

    const encrypted = encryptionService.encryptFile(file.buffer);
    const storedFileName = makeStoredFileName(file.originalname);
    await storageService.uploadFile(storedFileName, encrypted.encrypted, "application/octet-stream");

    const document = await prisma.document.create({
      data: {
        patientId,
        uploadedById: requester.userId,
        fileName: file.originalname,
        storedFileName,
        fileSize: BigInt(file.size),
        mimeType: file.mimetype,
        priority,
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
      metadata: { patientId, priority, fileSize: file.size, mimeType: file.mimetype },
      ipAddress: requester.ipAddress,
      userAgent: requester.userAgent
    });

    return serializeDocument(document);
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
      throw new ForbiddenError("RED_DOCUMENT_IMMUTABLE", "Kırmızı evraklar silinemez");
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
      throw new ForbiddenError("DOCUMENT_ACCESS_DENIED", "Bu evrakı indirme yetkiniz yok");
    }

    return document;
  }

  private async getDocument(documentId: string) {
    const document = await prisma.document.findFirst({
      where: { id: documentId, isDeleted: false },
      include: documentInclude
    });
    if (!document) {
      throw new NotFoundError("DOCUMENT_NOT_FOUND", "Evrak bulunamadı");
    }
    return document;
  }
}

const documentInclude = {
  uploadedBy: { select: { id: true, firstName: true, lastName: true } },
  patient: { select: { id: true, firstName: true, lastName: true } }
} satisfies Prisma.DocumentInclude;

function serializeDocument<T extends { fileSize: bigint }>(document: T): Omit<T, "fileSize"> & { fileSize: number } {
  return {
    ...document,
    fileSize: Number(document.fileSize)
  };
}

export const documentService = new DocumentService();
