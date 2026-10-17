import { describe, expect, it } from "vitest";
import { EncryptionService } from "../../apps/api/src/services/encryption.service.js";

describe("EncryptionService", () => {
  const service = new EncryptionService();
  const original = Buffer.from("hasta evraki test icerigi");

  it("encrypts the same file to different output with a different IV", () => {
    const first = service.encryptFile(original);
    const second = service.encryptFile(original);

    expect(first.encrypted.equals(second.encrypted)).toBe(false);
    expect(first.iv).not.toBe(second.iv);
  });

  it("encrypt then decrypt returns the original file", () => {
    const encrypted = service.encryptFile(original);
    const decrypted = service.decryptFile(encrypted.encrypted, encrypted.key, encrypted.iv, encrypted.authTag);

    expect(decrypted.equals(original)).toBe(true);
  });

  it("rejects a file whose checksum changed", () => {
    const encrypted = service.encryptFile(original);
    const tampered = Buffer.from("degistirilmis");

    expect(() => service.verifyChecksum(tampered, encrypted.checksum)).toThrow("File integrity check failed");
  });

  it("national ID encryption is deterministic", () => {
    const first = service.encryptTc("12345678901");
    const second = service.encryptTc("12345678901");

    expect(first).toBe(second);
    expect(service.decryptTc(first)).toBe("12345678901");
  });
});
