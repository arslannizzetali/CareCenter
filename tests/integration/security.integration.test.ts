import { describe, expect, it } from "vitest";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { prisma } from "../../apps/api/src/config/database.js";

const runIntegration = process.env.RUN_INTEGRATION === "true";
const describeIntegration = runIntegration ? describe : describe.skip;

describeIntegration("security integration", () => {
  it("Login → token → korumalı endpoint erişimi", async () => {
    const server = await startServer();
    try {
      const login = await jsonRequest<{ accessToken: string }>(server.url, "/api/v1/auth/login", {
        method: "POST",
        body: { email: "admin@carecenter.app", password: "Admin123!" }
      });

      const me = await fetch(`${server.url}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${login.accessToken}` }
      });
      expect(me.status).toBe(200);
    } finally {
      await server.close();
    }
  });

  it("Çalışan admin endpoint'ine erişemez", async () => {
    const server = await startServer();
    try {
      const login = await jsonRequest<{ accessToken: string }>(server.url, "/api/v1/auth/login", {
        method: "POST",
        body: { email: "john@carecenter.app", password: "Employee123!" }
      });

      const response = await fetch(`${server.url}/api/v1/admin/dashboard-stats`, {
        headers: { Authorization: `Bearer ${login.accessToken}` }
      });
      expect(response.status).toBe(403);
    } finally {
      await server.close();
    }
  });

  it("RED evrak silinemez", async () => {
    const server = await startServer();
    try {
      const login = await loginAs(server.url, "admin@carecenter.app", "Admin123!");
      const redDocument = await prisma.document.findFirstOrThrow({
        where: { priority: "RED", isDeleted: false },
        select: { id: true }
      });
      const response = await fetch(`${server.url}/api/v1/documents/${redDocument.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${login.accessToken}` }
      });
      expect(response.status).toBe(403);
    } finally {
      await server.close();
    }
  });

  it("Aynı refresh token iki kez kullanılınca oturum ailesi kapanır", async () => {
    const server = await startServer();
    try {
      const response = await fetch(`${server.url}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "admin@carecenter.app", password: "Admin123!" })
      });
      expect(response.status).toBe(200);
      const cookie = response.headers.get("set-cookie");
      expect(cookie).toBeTruthy();

      const firstRefresh = await fetch(`${server.url}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { Cookie: cookie ?? "" }
      });
      expect(firstRefresh.status).toBe(200);

      const secondRefresh = await fetch(`${server.url}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { Cookie: cookie ?? "" }
      });
      expect(secondRefresh.status).toBe(401);
    } finally {
      await server.close();
    }
  });

  it("Çalışan başka çalışanın evrakını indiremez", async () => {
    const server = await startServer();
    try {
      const login = await loginAs(server.url, "john@carecenter.app", "Employee123!");
      const ahmet = await prisma.user.findUniqueOrThrow({
        where: { email: "john@carecenter.app" },
        select: { id: true }
      });
      const otherDocument = await prisma.document.findFirstOrThrow({
        where: { isDeleted: false, uploadedById: { not: ahmet.id } },
        select: { id: true }
      });

      const response = await fetch(`${server.url}/api/v1/documents/${otherDocument.id}/download`, {
        headers: { Authorization: `Bearer ${login.accessToken}` }
      });
      expect(response.status).toBe(403);
    } finally {
      await server.close();
    }
  });

  it("Hasta güncelleme: çalışan sadece kendi girdiklerini görür", async () => {
    const server = await startServer();
    try {
      const login = await loginAs(server.url, "john@carecenter.app", "Employee123!");
      const ahmet = await prisma.user.findUniqueOrThrow({
        where: { email: "john@carecenter.app" },
        select: { id: true }
      });
      const otherUpdate = await prisma.patientUpdate.findFirstOrThrow({
        where: { employeeId: { not: ahmet.id } },
        select: { id: true, patientId: true }
      });

      const payload = await getJson<Array<{ id: string }>>(
        server.url,
        `/api/v1/patients/${otherUpdate.patientId}/updates`,
        login.accessToken
      );
      expect(payload.some((update) => update.id === otherUpdate.id)).toBe(false);
    } finally {
      await server.close();
    }
  });

  it("Hasta detayı: çalışan başka çalışanların güncelleme ve evrak özetlerini görmez", async () => {
    const server = await startServer();
    try {
      const login = await loginAs(server.url, "john@carecenter.app", "Employee123!");
      const ahmet = await prisma.user.findUniqueOrThrow({
        where: { email: "john@carecenter.app" },
        select: { id: true }
      });
      const otherUpdate = await prisma.patientUpdate.findFirstOrThrow({
        where: { employeeId: { not: ahmet.id } },
        select: { id: true, patientId: true }
      });
      const visibleDocuments = await prisma.document.findMany({
        where: { patientId: otherUpdate.patientId, uploadedById: ahmet.id, isDeleted: false },
        select: { id: true, priority: true, uploadedById: true }
      });

      const detail = await getJson<{
        patientUpdates: Array<{ id: string; employeeId: string }>;
        documents: Array<{ id: string; priority: "RED" | "YELLOW" | "GREEN"; uploadedById: string }>;
        documentCounts: { red: number; yellow: number; green: number };
      }>(server.url, `/api/v1/patients/${otherUpdate.patientId}`, login.accessToken);

      expect(detail.patientUpdates.some((update) => update.id === otherUpdate.id)).toBe(false);
      expect(detail.patientUpdates.every((update) => update.employeeId === ahmet.id)).toBe(true);
      expect(detail.documents.every((document) => document.uploadedById === ahmet.id)).toBe(true);
      expect(detail.documentCounts).toEqual(countDocumentsByPriority(visibleDocuments));
    } finally {
      await server.close();
    }
  });

  it("Hasta listesi: çalışan başka çalışanların güncelleme ve evrak sayaçlarını görmez", async () => {
    const server = await startServer();
    try {
      const login = await loginAs(server.url, "john@carecenter.app", "Employee123!");
      const ahmet = await prisma.user.findUniqueOrThrow({
        where: { email: "john@carecenter.app" },
        select: { id: true }
      });
      const otherUpdate = await prisma.patientUpdate.findFirstOrThrow({
        where: { employeeId: { not: ahmet.id } },
        select: { patientId: true }
      });
      const visibleDocuments = await prisma.document.findMany({
        where: { patientId: otherUpdate.patientId, uploadedById: ahmet.id, isDeleted: false },
        select: { id: true, priority: true }
      });
      const visibleUpdates = await prisma.patientUpdate.count({
        where: { patientId: otherUpdate.patientId, employeeId: ahmet.id }
      });

      const patients = await getJson<
        Array<{
          id: string;
          _count: { patientUpdates: number };
          documentCounts: { red: number; yellow: number; green: number };
        }>
      >(server.url, "/api/v1/patients?limit=50", login.accessToken);
      const listedPatient = patients.find((patient) => patient.id === otherUpdate.patientId);

      expect(listedPatient).toBeTruthy();
      expect(listedPatient?.documentCounts).toEqual(countDocumentsByPriority(visibleDocuments));
      expect(listedPatient?._count.patientUpdates).toBe(visibleUpdates);
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
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      })
  };
}

async function jsonRequest<T>(
  baseUrl: string,
  path: string,
  options: { method: "POST"; body: Record<string, string> }
): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options.body)
  });
  expect(response.status).toBe(200);
  const payload = (await response.json()) as { data: T };
  return payload.data;
}

async function loginAs(baseUrl: string, email: string, password: string): Promise<{ accessToken: string }> {
  return jsonRequest<{ accessToken: string }>(baseUrl, "/api/v1/auth/login", {
    method: "POST",
    body: { email, password }
  });
}

async function getJson<T>(baseUrl: string, path: string, token: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  expect(response.status).toBe(200);
  const payload = (await response.json()) as { data: T };
  return payload.data;
}

function countDocumentsByPriority(documents: Array<{ priority: "RED" | "YELLOW" | "GREEN" }>) {
  return documents.reduce(
    (counts, document) => {
      if (document.priority === "RED") {
        counts.red += 1;
      } else if (document.priority === "YELLOW") {
        counts.yellow += 1;
      } else {
        counts.green += 1;
      }
      return counts;
    },
    { red: 0, yellow: 0, green: 0 }
  );
}
