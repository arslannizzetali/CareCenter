import type { PatientMood, Prisma, UpdateType } from "@prisma/client";
import type { CreatePatientUpdateInput } from "@bakimevi/validation";
import { prisma } from "../config/database.js";
import { auditService } from "./audit.service.js";
import { patientService } from "./patient.service.js";
import { getPagination, makePagination } from "../utils/pagination.js";
import { omitUndefined } from "../utils/object.js";
import type { RequestContext } from "./user.service.js";

export interface PatientUpdateQuery {
  page?: number;
  limit?: number;
  type?: UpdateType;
  from?: Date;
  to?: Date;
}

export interface RecentUpdatesQuery {
  page?: number;
  limit?: number;
  employeeId?: string;
  type?: UpdateType;
  updateType?: UpdateType;
  isUrgent?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface Requester extends RequestContext {
  role: "ADMIN" | "EMPLOYEE";
}

export class PatientUpdateService {
  async create(patientId: string, input: CreatePatientUpdateInput, requester: Requester) {
    await patientService.ensureExists(patientId);

    const update = await prisma.patientUpdate.create({
      data: omitUndefined({
        patientId,
        employeeId: requester.userId,
        updateType: input.updateType as UpdateType,
        content: input.content,
        medicationsGiven: input.medicationsGiven
          ? input.medicationsGiven.map((medication) => ({
              ...medication,
              givenAt: medication.givenAt.toISOString()
            }))
          : undefined,
        vitalSigns: input.vitalSigns as Prisma.InputJsonValue | undefined,
        carePerformed: input.carePerformed,
        patientMood: input.patientMood as PatientMood,
        nextActionRequired: input.nextActionRequired,
        isUrgent: input.isUrgent
      }) as Prisma.PatientUpdateUncheckedCreateInput,
      include: updateInclude
    });

    await auditService.write({
      userId: requester.userId,
      action: "PATIENT_UPDATE_CREATED",
      resourceType: "PatientUpdate",
      resourceId: update.id,
      metadata: { patientId, updateType: input.updateType, isUrgent: input.isUrgent },
      ipAddress: requester.ipAddress,
      userAgent: requester.userAgent
    });

    return update;
  }

  async listForPatient(patientId: string, query: PatientUpdateQuery, requester: Requester) {
    await patientService.ensureExists(patientId);
    const pagination = getPagination(query);
    const where: Prisma.PatientUpdateWhereInput = {
      patientId,
      ...(requester.role === "EMPLOYEE" ? { employeeId: requester.userId } : {}),
      ...(query.type ? { updateType: query.type } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {})
            }
          }
        : {})
    };

    const [total, updates] = await prisma.$transaction([
      prisma.patientUpdate.count({ where }),
      prisma.patientUpdate.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { createdAt: "desc" },
        include: updateInclude
      })
    ]);

    return {
      data: updates,
      pagination: makePagination(total, pagination.page, pagination.limit)
    };
  }

  async recent(query: RecentUpdatesQuery, requester: Requester) {
    const pagination = getPagination(query);
    const updateType = query.updateType ?? query.type;
    const where: Prisma.PatientUpdateWhereInput = {
      ...(requester.role === "EMPLOYEE" ? { employeeId: requester.userId } : {}),
      ...(requester.role === "ADMIN" && query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(updateType ? { updateType } : {}),
      ...(typeof query.isUrgent === "boolean" ? { isUrgent: query.isUrgent } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            createdAt: {
              ...(query.dateFrom ? { gte: query.dateFrom } : {}),
              ...(query.dateTo ? { lte: query.dateTo } : {})
            }
          }
        : {})
    };

    const [total, updates] = await prisma.$transaction([
      prisma.patientUpdate.count({ where }),
      prisma.patientUpdate.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: [{ isUrgent: "desc" }, { createdAt: "desc" }],
        include: updateInclude
      })
    ]);

    return {
      data: updates.map((update) => ({
        ...update,
        summary: update.content.length > 140 ? `${update.content.slice(0, 137)}...` : update.content
      })),
      pagination: makePagination(total, pagination.page, pagination.limit)
    };
  }
}

const updateInclude = {
  employee: { select: { id: true, firstName: true, lastName: true } },
  patient: { select: { id: true, firstName: true, lastName: true, roomNumber: true } }
} satisfies Prisma.PatientUpdateInclude;

export const patientUpdateService = new PatientUpdateService();
