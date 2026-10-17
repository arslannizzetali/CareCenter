import { env } from "../config/index.js";
import type { DemoRequestInput } from "@bakimevi/validation";
import type { Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";
import { addMonths } from "../utils/date.js";
import { getPagination, makePagination } from "../utils/pagination.js";
import { NotFoundError } from "../utils/errors.js";

export interface NotificationQuery {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

export class NotificationService {
  async list(query: NotificationQuery) {
    const pagination = getPagination(query);
    const where: Prisma.NotificationWhereInput = query.unreadOnly ? { isRead: false } : {};

    const [total, unread, data] = await prisma.$transaction([
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { isRead: false } }),
      prisma.notification.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: [{ isRead: "asc" }, { createdAt: "desc" }]
      })
    ]);

    return {
      data,
      unreadCount: unread,
      pagination: makePagination(total, pagination.page, pagination.limit)
    };
  }

  async unreadCount(): Promise<number> {
    return prisma.notification.count({ where: { isRead: false } });
  }

  async markRead(id: string) {
    const existing = await prisma.notification.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError("NOTIFICATION_NOT_FOUND", "Notification not found");
    }
    return prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() }
    });
  }

  async markAllRead(): Promise<{ updated: number }> {
    const result = await prisma.notification.updateMany({
      where: { isRead: false },
      data: { isRead: true, readAt: new Date() }
    });
    return { updated: result.count };
  }

  async remove(id: string): Promise<void> {
    const existing = await prisma.notification.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError("NOTIFICATION_NOT_FOUND", "Notification not found");
    }
    await prisma.notification.delete({ where: { id } });
  }

  /** Bir evrakın süre-bildirimini kaldırır (ör. yeni geçerlilik tarihi atanınca). */
  async dismissForDocument(documentId: string): Promise<void> {
    await prisma.notification.deleteMany({
      where: { type: "DOCUMENT_EXPIRING", documentId }
    });
  }

  /**
   * Süresi 1 ay içinde dolacak (veya çoktan dolmuş) evraklar için admin paneline
   * bildirim üretir. Her evrak için tek bildirim (type + documentId benzersiz).
   * Günlük job'dan çağrılır.
   */
  async scanExpiringDocuments(): Promise<{ created: number }> {
    const threshold = addMonths(new Date(), 1);

    const documents = await prisma.document.findMany({
      where: {
        isDeleted: false,
        expiresAt: { not: null, lte: threshold }
      },
      select: {
        id: true,
        fileName: true,
        expiresAt: true,
        patientId: true,
        patient: { select: { firstName: true, lastName: true, roomNumber: true } }
      }
    });

    if (documents.length === 0) {
      return { created: 0 };
    }

    const existing = await prisma.notification.findMany({
      where: {
        type: "DOCUMENT_EXPIRING",
        documentId: { in: documents.map((document) => document.id) }
      },
      select: { documentId: true }
    });
    const alreadyNotified = new Set(existing.map((row) => row.documentId));

    const toCreate = documents
      .filter((document) => !alreadyNotified.has(document.id))
      .map((document) => {
        const patientName = `${document.patient.firstName} ${document.patient.lastName}`;
        const room = document.patient.roomNumber ? ` (Oda ${document.patient.roomNumber})` : "";
        const expiresLabel = document.expiresAt
          ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" }).format(document.expiresAt)
          : "-";
        return {
          type: "DOCUMENT_EXPIRING" as const,
          title: `Document expiring: ${patientName}`,
          body: `"${document.fileName}" for ${patientName}${room} expires on ${expiresLabel}.`,
          patientId: document.patientId,
          documentId: document.id
        };
      });

    if (toCreate.length > 0) {
      await prisma.notification.createMany({ data: toCreate, skipDuplicates: true });
    }

    return { created: toCreate.length };
  }

  async sendDemoRequestNotification(request: DemoRequestInput): Promise<void> {
    const subject = `Yeni demo talebi: ${request.institutionName}`;
    const body = [
      `Kurum: ${request.institutionName}`,
      `Yetkili: ${request.contactName}`,
      `Telefon: ${request.phone}`,
      `E-posta: ${request.email}`,
      request.message ? `Mesaj: ${request.message}` : undefined
    ]
      .filter(Boolean)
      .join("\n");

    if (!env.RESEND_API_KEY) {
      console.log(`[demo-request] RESEND_API_KEY is not set, email not sent.\n${subject}\n${body}`);
      return;
    }

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: env.RESEND_FROM_EMAIL,
          to: env.NOTIFY_EMAIL,
          subject,
          text: body
        })
      });

      if (!response.ok) {
        console.error(`[demo-request] Resend API error: ${response.status} ${await response.text()}`);
      }
    } catch (error) {
      console.error("[demo-request] Could not send email", error);
    }
  }
}

export const notificationService = new NotificationService();
