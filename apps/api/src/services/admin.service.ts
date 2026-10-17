import type { Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";
import { auditService } from "./audit.service.js";
import { AUDIT_CATEGORY_ACTIONS, ROUTINE_AUDIT_ACTIONS, describeAuditLogs, type AuditCategory } from "./audit-describe.js";
import { patientService, type PatientQuery } from "./patient.service.js";
import { patientUpdateService, type RecentUpdatesQuery, type Requester } from "./patient-update.service.js";
import { getPagination, makePagination } from "../utils/pagination.js";
import { yearsAgo } from "../utils/date.js";

export interface AuditQuery {
  page?: number;
  limit?: number;
  userId?: string;
  action?: string;
  resourceType?: string;
  category?: AuditCategory;
  importantOnly?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
}

export class AdminService {
  async dashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const age65Cutoff = yearsAgo(65);
    const activeWhere: Prisma.PatientWhereInput = { status: "ACTIVE", deletedAt: null };

    const [
      activePatients,
      activeEmployees,
      todayUpdates,
      urgentUpdates,
      redDocuments,
      yellowDocuments,
      greenDocuments,
      over65,
      under65,
      physicalDisabled,
      mentalDisabled,
      unreadNotifications
    ] = await prisma.$transaction([
      prisma.patient.count({ where: activeWhere }),
      prisma.user.count({ where: { role: "EMPLOYEE", isActive: true, deletedAt: null } }),
      prisma.patientUpdate.count({ where: { createdAt: { gte: today } } }),
      prisma.patientUpdate.count({ where: { isUrgent: true } }),
      prisma.document.count({ where: { isDeleted: false, priority: "RED" } }),
      prisma.document.count({ where: { isDeleted: false, priority: "YELLOW" } }),
      prisma.document.count({ where: { isDeleted: false, priority: "GREEN" } }),
      prisma.patient.count({ where: { ...activeWhere, birthDate: { lte: age65Cutoff } } }),
      prisma.patient.count({ where: { ...activeWhere, birthDate: { gt: age65Cutoff } } }),
      prisma.patient.count({ where: { ...activeWhere, disabilityType: { in: ["PHYSICAL", "BOTH"] } } }),
      prisma.patient.count({ where: { ...activeWhere, disabilityType: { in: ["MENTAL", "BOTH"] } } }),
      prisma.notification.count({ where: { isRead: false } })
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
      urgentUpdates,
      ageBreakdown: { over65, under65 },
      disabilityBreakdown: { physical: physicalDisabled, mental: mentalDisabled },
      unreadNotifications
    };
  }

  async recentUpdates(query: RecentUpdatesQuery, requester: Requester) {
    return patientUpdateService.recent(query, requester);
  }

  async patients(query: PatientQuery, requester: Requester) {
    return patientService.list(query, requester);
  }

  async deletedPatients(query: { page?: number; limit?: number; search?: string }) {
    return patientService.listDeleted(query);
  }

  async restorePatient(id: string, requester: Requester) {
    return patientService.restore(id, requester);
  }

  async purgePatient(id: string, requester: Requester) {
    return patientService.hardDelete(id, requester);
  }

  async auditLogs(query: AuditQuery) {
    const pagination = getPagination(query);
    const where: Prisma.AuditLogWhereInput = {
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.category || query.importantOnly
        ? {
            AND: [
              ...(query.category ? [{ action: { in: AUDIT_CATEGORY_ACTIONS[query.category] } }] : []),
              ...(query.importantOnly ? [{ action: { notIn: ROUTINE_AUDIT_ACTIONS } }] : [])
            ]
          }
        : {}),
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
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } } }
      })
    ]);

    return {
      data: await describeAuditLogs(logs),
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
