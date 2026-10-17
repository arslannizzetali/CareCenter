import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  patient: { findFirst: vi.fn(), findMany: vi.fn() },
  patientUpdate: { findMany: vi.fn() },
  user: { findMany: vi.fn() }
}));
const auditWrite = vi.hoisted(() => vi.fn());

vi.mock("../config/database.js", () => ({ prisma: prismaMock }));
vi.mock("./audit.service.js", () => ({ auditService: { write: auditWrite } }));

import { AiSummaryService } from "./ai-summary.service.js";
import { LlmDisabledError, LlmUnavailableError, type LlmProvider } from "./llm/index.js";
import type { Requester } from "./patient-update.service.js";

const PATIENT_ID = "11111111-1111-4111-8111-111111111111";
const TC = "12345678901";
const SUMMARY = "- Acil durum yok.\n- Metformin 500mg verildi.";

const requester: Requester = { userId: "u-1", role: "EMPLOYEE", ipAddress: "10.0.0.5", userAgent: "vitest" };

function mockProvider(summarize: LlmProvider["summarize"] = vi.fn().mockResolvedValue(SUMMARY)) {
  const provider: LlmProvider = { name: "claude", summarize };
  return { provider, summarize: vi.mocked(summarize), factory: vi.fn(() => provider) };
}

function seedPatient() {
  prismaMock.patient.findFirst.mockResolvedValue({
    firstName: "Ahmet",
    lastName: "Yılmaz",
    birthDate: new Date("1952-03-14T00:00:00.000Z"),
    roomNumber: "12A",
    emergencyContactName: "Fatma Kaya",
    emergencyContactPhone: "05321234567"
  });
  prismaMock.patient.findMany.mockResolvedValue([{ firstName: "Mehmet", lastName: "Demir" }]);
  prismaMock.user.findMany.mockResolvedValue([{ firstName: "Zeynep", lastName: "Aksoy" }]);
}

function seedUpdates(count = 2) {
  prismaMock.patientUpdate.findMany.mockResolvedValue(
    Array.from({ length: count }, (_, index) => ({
      createdAt: new Date(Date.now() - (index + 1) * 60 * 60 * 1000),
      updateType: "MEDICATION",
      content: `Ahmet Yılmaz (${TC}) ilacını aldı, Zeynep yardım etti. Mehmet Demir ziyarete geldi.`,
      medicationsGiven: [{ name: "Metformin", dosage: "500mg", route: "oral", givenAt: new Date().toISOString() }],
      vitalSigns: { bloodPressure: "130/85" },
      carePerformed: [],
      patientMood: "GOOD",
      nextActionRequired: "Fatma Kaya'yı 0532 123 45 67 numarasından ara",
      isUrgent: false
    }))
  );
}

describe("AiSummaryService.generateHandoverSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("anonimleştirilmiş metni LLM'e gönderip özeti döndürmeli", async () => {
    seedPatient();
    seedUpdates(2);
    const { factory, summarize } = mockProvider();

    const result = await new AiSummaryService(factory).generateHandoverSummary(PATIENT_ID, 24, requester);

    expect(result.summary).toBe(SUMMARY);
    expect(result.updateCount).toBe(2);
    expect(summarize).toHaveBeenCalledOnce();

    const sent = summarize.mock.calls[0]?.[0] ?? "";
    for (const secret of ["Ahmet", "Yılmaz", TC, "Fatma", "Kaya", "0532", "Zeynep", "Mehmet", "Demir"]) {
      expect(sent).not.toContain(secret);
    }
    expect(sent).toContain("Resident");
    expect(sent).toContain("Room: 12A");
  });

  it("audit log'a metadata yazmalı ama özetin kendisini YAZMAMALI", async () => {
    seedPatient();
    seedUpdates(3);
    const { factory } = mockProvider();

    await new AiSummaryService(factory).generateHandoverSummary(PATIENT_ID, 12, requester);

    expect(auditWrite).toHaveBeenCalledOnce();
    const entry = auditWrite.mock.calls[0]?.[0];
    expect(entry).toMatchObject({
      userId: "u-1",
      action: "AI_SUMMARY_GENERATED",
      resourceType: "Patient",
      resourceId: PATIENT_ID,
      metadata: { patientId: PATIENT_ID, hours: 12, updateCount: 3, provider: "claude", outcome: "SUCCESS" }
    });
    expect(JSON.stringify(entry)).not.toContain("Metformin 500mg verildi");
  });

  it("çalışan için de tüm personelin kayıtlarını almalı, çalışan bilgisi seçmemeli", async () => {
    seedPatient();
    seedUpdates(1);
    const { factory } = mockProvider();

    await new AiSummaryService(factory).generateHandoverSummary(PATIENT_ID, 48, requester);

    const query = prismaMock.patientUpdate.findMany.mock.calls[0]?.[0];
    expect(query.where).not.toHaveProperty("employeeId");
    expect(query.select).not.toHaveProperty("employee");
    expect(query.select).not.toHaveProperty("employeeId");
    const since: Date = query.where.createdAt.gte;
    expect(Date.now() - since.getTime()).toBeGreaterThanOrEqual(48 * 60 * 60 * 1000 - 1000);
  });

  it("kayıt yoksa LLM'i çağırmadan 'Bu aralıkta kayıt yok' dönmeli", async () => {
    seedPatient();
    seedUpdates(0);
    const { factory, summarize } = mockProvider();

    const result = await new AiSummaryService(factory).generateHandoverSummary(PATIENT_ID, 24, requester);

    expect(result.summary).toBe("No records in this period.");
    expect(summarize).not.toHaveBeenCalled();
    expect(auditWrite.mock.calls[0]?.[0].metadata).toMatchObject({ updateCount: 0, outcome: "NO_RECORDS" });
  });

  it("LLM kapalıyken 503 vermeli ve veritabanına hiç dokunmamalı", async () => {
    const factory = vi.fn(() => {
      throw new LlmDisabledError();
    });

    await expect(new AiSummaryService(factory).generateHandoverSummary(PATIENT_ID, 24, requester)).rejects.toMatchObject({
      statusCode: 503,
      message: "The AI feature is disabled"
    });
    expect(prismaMock.patient.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.patientUpdate.findMany).not.toHaveBeenCalled();
  });

  it("sağlayıcı hata verirse genel Türkçe mesajla 502 dönmeli ve FAILED olarak loglamalı", async () => {
    seedPatient();
    seedUpdates(1);
    const { factory } = mockProvider(vi.fn().mockRejectedValue(new LlmUnavailableError()));

    await expect(new AiSummaryService(factory).generateHandoverSummary(PATIENT_ID, 24, requester)).rejects.toMatchObject({
      statusCode: 502,
      code: "AI_UNAVAILABLE"
    });
    expect(auditWrite.mock.calls[0]?.[0].metadata).toMatchObject({ outcome: "FAILED" });
  });

  it("Engelli bulunamazsa 404 dönmeli", async () => {
    prismaMock.patient.findFirst.mockResolvedValue(null);
    const { factory, summarize } = mockProvider();

    await expect(new AiSummaryService(factory).generateHandoverSummary(PATIENT_ID, 24, requester)).rejects.toMatchObject({
      statusCode: 404,
      message: "Resident not found"
    });
    expect(summarize).not.toHaveBeenCalled();
  });
});
