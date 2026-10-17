import Queue from "bull";
import { env } from "../config/index.js";
import { processDocumentRetention } from "./document-retention.job.js";
import { processDocumentExpiry } from "./document-expiry.job.js";

export const retentionQueue = new Queue("document-retention", env.REDIS_URL);
export const documentExpiryQueue = new Queue("document-expiry", env.REDIS_URL);

export function registerQueues(): void {
  retentionQueue.process(async () => {
    await processDocumentRetention();
  });

  void retentionQueue.add(
    {},
    {
      repeat: {
        cron: "0 2 * * *",
        tz: "Europe/Istanbul"
      },
      removeOnComplete: true,
      removeOnFail: false
    }
  );

  documentExpiryQueue.process(async () => {
    await processDocumentExpiry();
  });

  void documentExpiryQueue.add(
    {},
    {
      repeat: {
        cron: "15 2 * * *",
        tz: "Europe/Istanbul"
      },
      removeOnComplete: true,
      removeOnFail: false
    }
  );

  // Sunucu açılışında bir kez tara ki geçmiş yüklemeler de bildirim üretsin.
  void documentExpiryQueue.add({}, { removeOnComplete: true, removeOnFail: true });
}
