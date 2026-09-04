import type { DemoRequestInput } from "@bakimevi/validation";
import { prisma } from "../config/database.js";
import { notificationService } from "./notification.service.js";

export class DemoRequestService {
  async create(input: DemoRequestInput): Promise<void> {
    await prisma.demoRequest.create({
      data: {
        institutionName: input.institutionName,
        contactName: input.contactName,
        phone: input.phone,
        email: input.email,
        ...(input.message !== undefined ? { message: input.message } : {})
      }
    });
    await notificationService.sendDemoRequestNotification(input);
  }
}

export const demoRequestService = new DemoRequestService();
