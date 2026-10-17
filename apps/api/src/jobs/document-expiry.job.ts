import { notificationService } from "../services/notification.service.js";

export async function processDocumentExpiry(): Promise<{ created: number }> {
  return notificationService.scanExpiringDocuments();
}
