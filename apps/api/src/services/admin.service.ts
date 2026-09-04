import type { Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";
import { auditService } from "./audit.service.js";
import { patientService, type PatientQuery } from "./patient.service.js";
import { patientUpdateService, type RecentUpdatesQuery, type Requester } from "./patient-update.service.js";
import { getPagination, makePagination } from "../utils/pagination.js";

export interface AuditQuery {
  page?: number;
  limit?: number;
  userId?: string;
  action?: string;
  resourceType?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export class AdminService {
  async dashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [activePatients, activeEmployees, todayUpdates, urgentUpdates, redDocuments, yellowDocuments, greenDocuments] =
      await prisma.$transaction([
      prisma.patient.count({ where: { status: "ACTIVE", deletedAt: null } }),
      prisma.user.count({ where: { role: "EMPLOYEE", isActive: true, deletedAt: null } }),
      prisma.patientUpdate.count({ where: { createdAt: { gte: today } } }),
      prisma.patientUpdate.count({ where: { isUrgent: true } }),
      prisma.document.count({ where: { isDeleted: false, priority: "RED" } }),
      prisma.document.count({ where: { isDeleted: false, priority: "YELLOW" } }),
      prisma.document.count({ where: { isDeleted: false, priority: "GREEN" } })
    ]);

    return {
      activePatients,
      totalDocuments: {
        red: redDocuments,
        yellow: yellowDocuments,
        green: greenDocuments
      },
      todayUpdates,
      activeEmployees,
      urgentUpdates
    };
  }

  async recentUpdates(query: RecentUpdatesQuery, requester: Requester) {
    return patientUpdateService.recent(query, requester);
  }

  async patients(query: PatientQuery, requester: Requester) {
    return patientService.list(query, requester);
  }

  async auditLogs(query: AuditQuery) {
    const pagination = getPagination(query);
    const where: Prisma.AuditLogWhereInput = {
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.resourceType ? { resourceType: query.resourceType } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            performedAt: {
              ...(query.dateFrom ? { gte: query.dateFrom } : {}),
              ...(query.dateTo ? { lte: query.dateTo } : {})
            }
          }
        : {})
    };

    const [total, logs] = await prisma.$transaction([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { performedAt: "desc" },
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } }
      })
    ]);

    return {
      data: logs,
      pagination: makePagination(total, pagination.page, pagination.limit)
    };
  }

  async retentionPolicies() {
    return prisma.documentRetentionPolicy.findMany({ orderBy: { priority: "desc" } });
  }

  async updateRetentionPolicies(
    input: {
      yellow: { retentionDays: number; autoDeleteEnabled: boolean };
      green: { retentionDays: number; autoDeleteEnabled: boolean };
    },
    requester: Requester
  ) {
    const [yellow, green] = await prisma.$transaction([
      prisma.documentRetentionPolicy.upsert({
        where: { priority: "YELLOW" },
        update: {
          retentionDays: input.yellow.retentionDays,
          autoDeleteEnabled: input.yellow.autoDeleteEnabled,
          updatedById: requester.userId
        },
        create: {
          priority: "YELLOW",
          retentionDays: input.yellow.retentionDays,
          autoDeleteEnabled: input.yellow.autoDeleteEnabled,
          updatedById: requester.userId
        }
      }),
      prisma.documentRetentionPolicy.upsert({
        where: { priority: "GREEN" },
        update: {
          retentionDays: input.green.retentionDays,
          autoDeleteEnabled: input.green.autoDeleteEnabled,
          updatedById: requester.userId
        },
        create: {
          priority: "GREEN",
          retentionDays: input.green.retentionDays,
          autoDeleteEnabled: input.green.autoDeleteEnabled,
          updatedById: requester.userId
        }
      })
    ]);

    await auditService.write({
      userId: requester.userId,
      action: "RETENTION_POLICY_UPDATED",
      resourceType: "DocumentRetentionPolicy",
      resourceId: "all",
      metadata: { yellow: input.yellow, green: input.green },
      ipAddress: requester.ipAddress,
      userAgent: requester.userAgent
    });

    return { yellow, green };
  }
}

export const adminService = new AdminService();
