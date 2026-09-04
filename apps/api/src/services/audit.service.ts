import type { Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";

export interface AuditInput {
  userId?: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata?: Prisma.InputJsonValue | undefined;
  ipAddress?: string;
  userAgent?: string | undefined;
}

export class AuditService {
  async write(input: AuditInput): Promise<void> {
    const data: Prisma.AuditLogUncheckedCreateInput = {
      userId: input.userId ?? null,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      ipAddress: input.ipAddress ?? "system"
    };
    if (input.metadata !== undefined) {
      data.metadata = input.metadata;
    }
    if (input.userAgent !== undefined) {
      data.userAgent = input.userAgent;
    }

    await prisma.auditLog.create({
      data
    });
  }
}

export const auditService = new AuditService();
