import { env } from "../config/index.js";
import type { DemoRequestInput } from "@bakimevi/validation";

export class NotificationService {
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
      console.log(`[demo-request] RESEND_API_KEY tanımlı değil, e-posta gönderilmedi.\n${subject}\n${body}`);
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
        console.error(`[demo-request] Resend API hatası: ${response.status} ${await response.text()}`);
      }
    } catch (error) {
      console.error("[demo-request] E-posta gönderilemedi", error);
    }
  }
}

export const notificationService = new NotificationService();
