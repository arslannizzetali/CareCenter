import type { DocumentPriority } from "@prisma/client";
import { prisma } from "../config/database.js";
import { documentService } from "../services/document.service.js";

export async function processDocumentRetention(): Promise<{ deleted: number }> {
  const policies = await prisma.documentRetentionPolicy.findMany({
    where: {
      autoDeleteEnabled: true,
      priority: { in: ["YELLOW", "GREEN"] },
      retentionDays: { gt: 0 }
    }
  });

  let deleted = 0;

  for (const policy of policies) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

    const documents = await prisma.document.findMany({
      where: {
        priority: policy.priority as DocumentPriority,
        isDeleted: false,
        uploadedAt: { lt: cutoffDate }
      },
      select: { id: true }
    });

    for (const document of documents) {
      await documentService.autoDelete(document.id, policy.retentionDays);
      deleted += 1;
    }
  }

  return { deleted };
}
