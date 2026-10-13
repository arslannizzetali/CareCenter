import crypto from "node:crypto";
import { env } from "../config/index.js";
import { BadRequestError } from "../utils/errors.js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const MASTER_KEY = Buffer.from(env.MASTER_ENCRYPTION_KEY, "hex");

// Deterministic (searchable) encryption for TC numbers uses an SIV-style construction:
// the nonce is derived from the plaintext via HMAC, so identical TCs yield identical
// ciphertext (equality search still works) while different TCs never share a nonce.
// This removes the catastrophic AES-GCM nonce-reuse of the previous fixed zero-IV scheme.
// Separate subkeys are derived so the master key is never used directly for both roles.
const DETERMINISTIC_NONCE_LENGTH = 12; // standard GCM nonce size
const TC_ENC_KEY = crypto.createHmac("sha256", MASTER_KEY).update("tc-enc-v2").digest();
const TC_IV_KEY = crypto.createHmac("sha256", MASTER_KEY).update("tc-iv-v2").digest();

interface WrappedKey {
  key: string;
  iv: string;
  authTag: string;
}

interface DeterministicCipherText {
  v?: number;
  data: string;
  authTag: string;
  iv?: string;
}

export interface EncryptedFile {
  encrypted: Buffer;
  key: string;
  iv: string;
  authTag: string;
  checksum: string;
}

export class EncryptionService {
  encryptFile(buffer: Buffer): EncryptedFile {
    const checksum = crypto.createHash("sha256").update(buffer).digest("hex");
    const fileKey = crypto.randomBytes(32);
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, fileKey, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      key: this.wrapFileKey(fileKey),
      iv: iv.toString("hex"),
      authTag: authTag.toString("hex"),
      checksum
    };
  }

  decryptFile(encrypted: Buffer, encryptionKey: string, iv: string, authTag: string): Buffer {
    const fileKey = this.unwrapFileKey(encryptionKey);
    const decipher = crypto.createDecipheriv(ALGORITHM, fileKey, Buffer.from(iv, "hex"));
    decipher.setAuthTag(Buffer.from(authTag, "hex"));
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  verifyChecksum(buffer: Buffer, expectedChecksum: string): void {
    const actual = crypto.createHash("sha256").update(buffer).digest("hex");
    if (actual !== expectedChecksum) {
      throw new BadRequestError("CHECKSUM_MISMATCH", "File integrity could not be verified");
    }
  }

  encryptTc(tc: string): string {
    // SIV-style synthetic nonce: deterministic in the plaintext, distinct across values.
    const iv = crypto
      .createHmac("sha256", TC_IV_KEY)
      .update(tc, "utf8")
      .digest()
      .subarray(0, DETERMINISTIC_NONCE_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, TC_ENC_KEY, iv);
    const encrypted = Buffer.concat([cipher.update(tc, "utf8"), cipher.final()]);
    const payload: DeterministicCipherText = {
      v: 2,
      data: encrypted.toString("hex"),
      authTag: cipher.getAuthTag().toString("hex"),
      iv: iv.toString("hex")
    };
    return JSON.stringify(payload);
  }

  decryptTc(encrypted: string): string {
    const payload = this.parseDeterministicCipherText(encrypted);

    // v2+: per-value synthetic nonce stored alongside the ciphertext.
    if (payload.iv) {
      const decipher = crypto.createDecipheriv(ALGORITHM, TC_ENC_KEY, Buffer.from(payload.iv, "hex"));
      decipher.setAuthTag(Buffer.from(payload.authTag, "hex"));
      return Buffer.concat([decipher.update(Buffer.from(payload.data, "hex")), decipher.final()]).toString("utf8");
    }

    // Legacy records encrypted with the old fixed zero-IV scheme (read-only fallback).
    const legacyIv = Buffer.alloc(IV_LENGTH, 0);
    const decipher = crypto.createDecipheriv(ALGORITHM, MASTER_KEY, legacyIv);
    decipher.setAuthTag(Buffer.from(payload.authTag, "hex"));
    return Buffer.concat([decipher.update(Buffer.from(payload.data, "hex")), decipher.final()]).toString("utf8");
  }

  packDocumentKey(encryptionKey: string, iv: string, authTag: string): string {
    return JSON.stringify({
      wrappedKey: JSON.parse(encryptionKey) as WrappedKey,
      fileIv: iv,
      fileAuthTag: authTag
    });
  }

  unpackDocumentKey(packed: string): { encryptionKey: string; iv: string; authTag: string } {
    const parsed = JSON.parse(packed) as { wrappedKey?: WrappedKey; fileIv?: string; fileAuthTag?: string };
    if (!parsed.wrappedKey || !parsed.fileIv || !parsed.fileAuthTag) {
      return {
        encryptionKey: packed,
        iv: "",
        authTag: ""
      };
    }

    return {
      encryptionKey: JSON.stringify(parsed.wrappedKey),
      iv: parsed.fileIv,
      authTag: parsed.fileAuthTag
    };
  }

  private wrapFileKey(fileKey: Buffer): string {
    const keyIv = crypto.randomBytes(IV_LENGTH);
    const keyCipher = crypto.createCipheriv(ALGORITHM, MASTER_KEY, keyIv);
    const encryptedKey = Buffer.concat([keyCipher.update(fileKey), keyCipher.final()]);
    const wrapped: WrappedKey = {
      key: encryptedKey.toString("hex"),
      iv: keyIv.toString("hex"),
      authTag: keyCipher.getAuthTag().toString("hex")
    };
    return JSON.stringify(wrapped);
  }

  private unwrapFileKey(encryptionKey: string): Buffer {
    const keyData = JSON.parse(encryptionKey) as WrappedKey;
    const keyDecipher = crypto.createDecipheriv(ALGORITHM, MASTER_KEY, Buffer.from(keyData.iv, "hex"));
    keyDecipher.setAuthTag(Buffer.from(keyData.authTag, "hex"));
    return Buffer.concat([keyDecipher.update(Buffer.from(keyData.key, "hex")), keyDecipher.final()]);
  }

  private parseDeterministicCipherText(encrypted: string): DeterministicCipherText {
    const parsed = JSON.parse(encrypted) as Partial<DeterministicCipherText>;
    if (!parsed.data || !parsed.authTag) {
      throw new BadRequestError("INVALID_ENCRYPTED_VALUE", "Invalid encrypted value");
    }
    return {
      data: parsed.data,
      authTag: parsed.authTag,
      ...(parsed.v !== undefined ? { v: parsed.v } : {}),
      ...(parsed.iv !== undefined ? { iv: parsed.iv } : {})
    };
  }
}

export const encryptionService = new EncryptionService();
