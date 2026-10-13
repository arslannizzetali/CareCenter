import { describe, expect, it } from "vitest";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

// Needs Redis (global rate limiter), like the other integration tests.
const runIntegration = process.env.RUN_INTEGRATION === "true";
const describeIntegration = runIntegration ? describe : describe.skip;

const PATIENT_ID = "11111111-1111-4111-8111-111111111111";

describeIntegration("POST /api/v1/patients/:id/ai/handover-summary", () => {
  it("an unauthenticated user should get 401", async () => {
    const server = await startServer();
    try {
      const response = await fetch(`${server.url}/api/v1/patients/${PATIENT_ID}/ai/handover-summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours: 24 })
      });
      expect(response.status).toBe(401);
    } finally {
      await server.close();
    }
  });

  it("should get 401 with an invalid token", async () => {
    const server = await startServer();
    try {
      const response = await fetch(`${server.url}/api/v1/patients/${PATIENT_ID}/ai/handover-summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer gecersiz.token.degeri" },
        body: JSON.stringify({ hours: 24 })
      });
      expect(response.status).toBe(401);
    } finally {
      await server.close();
    }
  });
});

async function startServer(): Promise<{ url: string; close: () => Promise<void> }> {
  const { ensureRedisConnected } = await import("../../apps/api/src/config/redis.js");
  await ensureRedisConnected();
  const { createApp } = await import("../../apps/api/src/app.js");
  const app = createApp();
  const server: Server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      })
  };
}
