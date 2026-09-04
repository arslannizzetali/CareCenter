import { env } from "../config/index.js";
import { minioClient } from "../config/storage.js";

export class StorageService {
  async ensureBucket(): Promise<void> {
    const exists = await minioClient.bucketExists(env.MINIO_BUCKET);
    if (!exists) {
      await minioClient.makeBucket(env.MINIO_BUCKET);
    }
  }

  async uploadFile(objectName: string, buffer: Buffer, mimeType: string): Promise<void> {
    await this.ensureBucket();
    await minioClient.putObject(env.MINIO_BUCKET, objectName, buffer, buffer.length, {
      "Content-Type": mimeType
    });
  }

  async getFile(objectName: string): Promise<Buffer> {
    const stream = await minioClient.getObject(env.MINIO_BUCKET, objectName);
    const chunks: Buffer[] = [];

    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  }

  async deleteFile(objectName: string): Promise<void> {
    await minioClient.removeObject(env.MINIO_BUCKET, objectName);
  }
}

export const storageService = new StorageService();
