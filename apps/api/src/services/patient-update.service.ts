import type { PatientMood, Prisma, UpdateType } from "@prisma/client";
import type { CreatePatientUpdateInput, UpdatePatientUpdateInput } from "@bakimevi/validation";
import { prisma } from "../config/database.js";
import { auditService } from "./audit.service.js";
import { patientService } from "./patient.service.js";
import { ForbiddenError, NotFoundError } from "../utils/errors.js";
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

  async update(updateId: string, input: UpdatePatientUpdateInput, requester: Requester) {
    const existing = await this.ensureManageable(updateId, requester);

    const data = omitUndefined({
      updateType: input.updateType as UpdateType | undefined,
      content: input.content,
      medicationsGiven: input.medicationsGiven
        ? input.medicationsGiven.map((medication) => ({
            ...medication,
            givenAt: medication.givenAt.toISOString()
          }))
        : undefined,
      vitalSigns: input.vitalSigns as Prisma.InputJsonValue | undefined,
      carePerformed: input.carePerformed,
      patientMood: input.patientMood as PatientMood | undefined,
      nextActionRequired: input.nextActionRequired,
      isUrgent: input.isUrgent
    }) as Prisma.PatientUpdateUncheckedUpdateInput;

    const updated = await prisma.patientUpdate.update({
      where: { id: updateId },
      data,
      include: updateInclude
    });

    await auditService.write({
      userId: requester.userId,
      action: "PATIENT_UPDATE_EDITED",
      resourceType: "PatientUpdate",
      resourceId: updateId,
      metadata: { patientId: existing.patientId, changedFields: Object.keys(input) },
      ipAddress: requester.ipAddress,
      userAgent: requester.userAgent
    });

    return updated;
  }

  async remove(updateId: string, requester: Requester): Promise<void> {
    const existing = await this.ensureManageable(updateId, requester);

    await prisma.patientUpdate.delete({ where: { id: updateId } });

    await auditService.write({
      userId: requester.userId,
      action: "PATIENT_UPDATE_DELETED",
      resourceType: "PatientUpdate",
      resourceId: updateId,
      metadata: { patientId: existing.patientId },
      ipAddress: requester.ipAddress,
      userAgent: requester.userAgent
    });
  }

  private async ensureManageable(updateId: string, requester: Requester) {
    const existing = await prisma.patientUpdate.findUnique({
      where: { id: updateId },
      select: { id: true, patientId: true, employeeId: true }
    });
    if (!existing) {
      throw new NotFoundError("PATIENT_UPDATE_NOT_FOUND", "Update not found");
    }
    if (requester.role === "EMPLOYEE" && existing.employeeId !== requester.userId) {
      throw new ForbiddenError("PATIENT_UPDATE_FORBIDDEN", "You can only edit your own updates");
    }
    return existing;
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
