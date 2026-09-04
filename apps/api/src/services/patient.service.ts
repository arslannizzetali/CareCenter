import type { CareType, MobilityLevel, PatientStatus, Prisma } from "@prisma/client";
import type { CreatePatientInput, UpdatePatientInput } from "@bakimevi/validation";
import { prisma } from "../config/database.js";
import { auditService } from "./audit.service.js";
import { encryptionService } from "./encryption.service.js";
import { NotFoundError } from "../utils/errors.js";
import { omitUndefined, toJson } from "../utils/object.js";
import { getPagination, makePagination } from "../utils/pagination.js";
import type { Requester } from "./patient-update.service.js";

export interface PatientQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: PatientStatus;
  careType?: CareType;
  mobilityLevel?: MobilityLevel;
  admissionFrom?: Date;
  admissionTo?: Date;
}

export class PatientService {
  async list(query: PatientQuery, requester: Requester) {
    const pagination = getPagination(query);
    const where = this.buildWhere(query);
    const visibility = this.patientVisibilityFilters(requester);

    const [total, patients] = await prisma.$transaction([
      prisma.patient.count({ where }),
      prisma.patient.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: [{ status: "asc" }, { roomNumber: "asc" }, { lastName: "asc" }],
        include: {
          _count: {
            select: {
              patientUpdates: { where: visibility.patientUpdateWhere },
              documents: { where: visibility.documentWhere }
            }
          },
          patientUpdates: {
            where: visibility.patientUpdateWhere,
            take: 1,
            orderBy: { createdAt: "desc" },
            select: { createdAt: true }
          },
          documents: {
            where: visibility.documentWhere,
            select: { priority: true }
          }
        }
      })
    ]);

    await auditService.write({
      userId: requester.userId,
      action: "PATIENT_SEARCHED",
      resourceType: "Patient",
      resourceId: "list",
      metadata: { query: toJson(query) } as Prisma.InputJsonValue,
      ipAddress: requester.ipAddress,
      userAgent: requester.userAgent
    });

    return {
      data: patients.map((patient) => ({
        ...patient,
        documentCounts: countDocuments(patient.documents),
        documents: undefined
      })),
      pagination: makePagination(total, pagination.page, pagination.limit)
    };
  }

  async create(input: CreatePatientInput, requester: Requester) {
    const patient = await prisma.patient.create({
      data: {
        ...this.patientCreateData(input),
        createdById: requester.userId
      },
      include: this.patientDetailInclude(requester)
    });

    await auditService.write({
      userId: requester.userId,
      action: "PATIENT_CREATED",
      resourceType: "Patient",
      resourceId: patient.id,
      metadata: { careType: patient.careType, status: patient.status },
      ipAddress: requester.ipAddress,
      userAgent: requester.userAgent
    });

    return patient;
  }

  async getById(id: string, requester: Requester) {
    const patient = await prisma.patient.findFirst({
      where: { id, deletedAt: null },
      include: this.patientDetailInclude(requester)
    });
    if (!patient) {
      throw new NotFoundError("PATIENT_NOT_FOUND", "Hasta bulunamadı");
    }

    await auditService.write({
      userId: requester.userId,
      action: "PATIENT_VIEWED",
      resourceType: "Patient",
      resourceId: id,
      ipAddress: requester.ipAddress,
      userAgent: requester.userAgent
    });

    return {
      ...patient,
      documentCounts: countDocuments(patient.documents)
    };
  }

  async update(id: string, input: UpdatePatientInput, requester: Requester) {
    await this.ensureExists(id);
    const patient = await prisma.patient.update({
      where: { id },
      data: this.patientUpdateData(input),
      include: this.patientDetailInclude(requester)
    });

    await auditService.write({
      userId: requester.userId,
      action: "PATIENT_UPDATED",
      resourceType: "Patient",
      resourceId: id,
      metadata: { changedFields: Object.keys(input) },
      ipAddress: requester.ipAddress,
      userAgent: requester.userAgent
    });

    return patient;
  }

  async delete(id: string, requester: Requester): Promise<void> {
    await this.ensureExists(id);
    await prisma.patient.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    await auditService.write({
      userId: requester.userId,
      action: "PATIENT_DELETED",
      resourceType: "Patient",
      resourceId: id,
      ipAddress: requester.ipAddress,
      userAgent: requester.userAgent
    });
  }

  async ensureExists(id: string): Promise<void> {
    const count = await prisma.patient.count({ where: { id, deletedAt: null } });
    if (count === 0) {
      throw new NotFoundError("PATIENT_NOT_FOUND", "Hasta bulunamadı");
    }
  }

  private patientCreateData(input: CreatePatientInput): Omit<Prisma.PatientUncheckedCreateInput, "createdById"> {
    const { tcNumber, ...rest } = input;
    return omitUndefined({
      ...rest,
      tcNumberEncrypted: tcNumber ? encryptionService.encryptTc(tcNumber) : undefined
    }) as Omit<Prisma.PatientUncheckedCreateInput, "createdById">;
  }

  private patientUpdateData(input: UpdatePatientInput): Prisma.PatientUncheckedUpdateInput {
    const { tcNumber, ...rest } = input;
    return omitUndefined({
      ...rest,
      tcNumberEncrypted: tcNumber ? encryptionService.encryptTc(tcNumber) : undefined
    }) as Prisma.PatientUncheckedUpdateInput;
  }

  private buildWhere(query: PatientQuery): Prisma.PatientWhereInput {
    return {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.careType ? { careType: query.careType } : {}),
      ...(query.mobilityLevel ? { mobilityLevel: query.mobilityLevel } : {}),
      ...(query.admissionFrom || query.admissionTo
        ? {
            admissionDate: {
              ...(query.admissionFrom ? { gte: query.admissionFrom } : {}),
              ...(query.admissionTo ? { lte: query.admissionTo } : {})
            }
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { firstName: { contains: query.search, mode: "insensitive" } },
              { lastName: { contains: query.search, mode: "insensitive" } },
              { roomNumber: { contains: query.search, mode: "insensitive" } }
            ]
          }
        : {})
    };
  }

  private patientDetailInclude(requester: Requester): Prisma.PatientInclude {
    const visibility = this.patientVisibilityFilters(requester);

    return {
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      patientUpdates: {
        where: visibility.patientUpdateWhere,
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { employee: { select: { id: true, firstName: true, lastName: true } } }
      },
      documents: {
        where: visibility.documentWhere,
        select: { id: true, priority: true, uploadedAt: true, uploadedById: true }
      }
    };
  }

  private patientVisibilityFilters(requester: Requester): {
    patientUpdateWhere: Prisma.PatientUpdateWhereInput;
    documentWhere: Prisma.DocumentWhereInput;
  } {
    if (requester.role === "EMPLOYEE") {
      return {
        patientUpdateWhere: { employeeId: requester.userId },
        documentWhere: { isDeleted: false, uploadedById: requester.userId }
      };
    }

    return {
      patientUpdateWhere: {},
      documentWhere: { isDeleted: false }
    };
  }
}

function countDocuments(documents: Array<{ priority: "RED" | "YELLOW" | "GREEN" }>) {
  const counts = { red: 0, yellow: 0, green: 0 };
  for (const document of documents) {
    if (document.priority === "RED") {
      counts.red += 1;
    } else if (document.priority === "YELLOW") {
      counts.yellow += 1;
    } else {
      counts.green += 1;
    }
  }
  return counts;
}

export const patientService = new PatientService();
