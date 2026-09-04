import { env } from "./config/index.js";
import { ensureRedisConnected } from "./config/redis.js";
import { createApp } from "./app.js";
import { registerQueues } from "./jobs/queue.js";

async function main(): Promise<void> {
  await ensureRedisConnected();
  registerQueues();

  const app = createApp();
  app.listen(env.API_PORT, () => {
    console.log(`BakımEvi API ${env.API_PORT} portunda çalışıyor`);
  });
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Bilinmeyen hata";
  console.error(`API başlatılamadı: ${message}`);
  process.exit(1);
});
