import { beforeEach, describe, expect, it, vi } from "vitest";

const findManyMock = vi.fn();
const autoDeleteMock = vi.fn();

vi.mock("../../apps/api/src/config/database.js", () => ({
  prisma: {
    documentRetentionPolicy: {
      findMany: findManyMock
    },
    document: {
      findMany: vi.fn(async (args: { where: { priority: string; uploadedAt: { lt: Date } } }) => {
        if (args.where.priority === "YELLOW" && args.where.uploadedAt.lt instanceof Date) {
          return [{ id: "old-yellow-doc" }];
        }
        return [];
      })
    }
  }
}));

vi.mock("../../apps/api/src/services/document.service.js", () => ({
  documentService: {
    autoDelete: autoDeleteMock
  }
}));

describe("document retention job", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes a 91-day-old file under a 90-day YELLOW policy", async () => {
    findManyMock.mockResolvedValue([{ priority: "YELLOW", retentionDays: 90, autoDeleteEnabled: true }]);
    const { processDocumentRetention } = await import("../../apps/api/src/jobs/document-retention.job.js");

    const result = await processDocumentRetention();

    expect(result.deleted).toBe(1);
    expect(autoDeleteMock).toHaveBeenCalledWith("old-yellow-doc", 90);
  });

  it("aktif olmayan politikada dosya silmez", async () => {
    findManyMock.mockResolvedValue([]);
    const { processDocumentRetention } = await import("../../apps/api/src/jobs/document-retention.job.js");

    const result = await processDocumentRetention();

    expect(result.deleted).toBe(0);
    expect(autoDeleteMock).not.toHaveBeenCalled();
  });

  it("RED dosya asla silinmez", async () => {
    findManyMock.mockResolvedValue([{ priority: "RED", retentionDays: 1, autoDeleteEnabled: true }]);
    const { processDocumentRetention } = await import("../../apps/api/src/jobs/document-retention.job.js");

    const result = await processDocumentRetention();

    expect(result.deleted).toBe(0);
    expect(autoDeleteMock).not.toHaveBeenCalled();
  });
});
