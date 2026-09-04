import { describe, expect, it } from "vitest";
import { EncryptionService } from "../../apps/api/src/services/encryption.service.js";

describe("EncryptionService", () => {
  const service = new EncryptionService();
  const original = Buffer.from("hasta evraki test icerigi");

  it("aynı dosyayı farklı IV ile farklı çıktıya şifreler", () => {
    const first = service.encryptFile(original);
    const second = service.encryptFile(original);

    expect(first.encrypted.equals(second.encrypted)).toBe(false);
    expect(first.iv).not.toBe(second.iv);
  });

  it("şifrele ve çöz işlemi orijinal dosyayı döndürür", () => {
    const encrypted = service.encryptFile(original);
    const decrypted = service.decryptFile(encrypted.encrypted, encrypted.key, encrypted.iv, encrypted.authTag);

    expect(decrypted.equals(original)).toBe(true);
  });

  it("checksum değişmiş dosyayı reddeder", () => {
    const encrypted = service.encryptFile(original);
    const tampered = Buffer.from("degistirilmis");

    expect(() => service.verifyChecksum(tampered, encrypted.checksum)).toThrow("Dosya bütünlüğü doğrulanamadı");
  });

  it("TC kimlik şifreleme deterministiktir", () => {
    const first = service.encryptTc("12345678901");
    const second = service.encryptTc("12345678901");

    expect(first).toBe(second);
    expect(service.decryptTc(first)).toBe("12345678901");
  });
});
