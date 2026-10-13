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
const SUMMARY = "- No emergencies.\n- Metformin 500mg given.";

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
      content: `Ahmet Yılmaz (${TC}) took medication, Zeynep helped. Mehmet Demir visited.`,
      medicationsGiven: [{ name: "Metformin", dosage: "500mg", route: "oral", givenAt: new Date().toISOString() }],
      vitalSigns: { bloodPressure: "130/85" },
      carePerformed: [],
      patientMood: "GOOD",
      nextActionRequired: "Call Fatma Kaya at 0532 123 45 67",
      isUrgent: false
    }))
  );
}

describe("AiSummaryService.generateHandoverSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should send anonymized text to the LLM and return the summary", async () => {
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
    expect(sent).toContain("Patient");
    expect(sent).toContain("Room: 12A");
  });

  it("should write metadata to the audit log but NOT the summary itself", async () => {
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
    expect(JSON.stringify(entry)).not.toContain("Metformin 500mg given");
  });

  it("should fetch all staff records even for an employee, without selecting staff info", async () => {
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

  it("should return 'No records in this range' without calling the LLM when there are no records", async () => {
    seedPatient();
    seedUpdates(0);
    const { factory, summarize } = mockProvider();

    const result = await new AiSummaryService(factory).generateHandoverSummary(PATIENT_ID, 24, requester);

    expect(result.summary).toBe("No records in this range.");
    expect(summarize).not.toHaveBeenCalled();
    expect(auditWrite.mock.calls[0]?.[0].metadata).toMatchObject({ updateCount: 0, outcome: "NO_RECORDS" });
  });

  it("should return 503 and never touch the database when the LLM is disabled", async () => {
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

  it("should return 502 with a generic message and log it as FAILED when the provider errors", async () => {
    seedPatient();
    seedUpdates(1);
    const { factory } = mockProvider(vi.fn().mockRejectedValue(new LlmUnavailableError()));

    await expect(new AiSummaryService(factory).generateHandoverSummary(PATIENT_ID, 24, requester)).rejects.toMatchObject({
      statusCode: 502,
      code: "AI_UNAVAILABLE"
    });
    expect(auditWrite.mock.calls[0]?.[0].metadata).toMatchObject({ outcome: "FAILED" });
  });

  it("should return 404 when the patient is not found", async () => {
    prismaMock.patient.findFirst.mockResolvedValue(null);
    const { factory, summarize } = mockProvider();

    await expect(new AiSummaryService(factory).generateHandoverSummary(PATIENT_ID, 24, requester)).rejects.toMatchObject({
      statusCode: 404,
      message: "Patient not found"
    });
    expect(summarize).not.toHaveBeenCalled();
  });
});
