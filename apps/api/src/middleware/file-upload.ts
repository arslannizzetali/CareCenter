import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { BadRequestError } from "../utils/errors.js";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

const allowedMimeByExtension = new Map<string, string[]>([
  [".pdf", ["application/pdf"]],
  [".jpg", ["image/jpeg"]],
  [".jpeg", ["image/jpeg"]],
  [".png", ["image/png"]],
  [".webp", ["image/webp"]],
  [".docx", ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"]],
  [".xlsx", ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]]
]);

export const uploadSingleDocument = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  },
  fileFilter: (_req, file, callback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedMimes = allowedMimeByExtension.get(ext);
    if (!allowedMimes || !allowedMimes.includes(file.mimetype)) {
      callback(new BadRequestError("UNSUPPORTED_FILE_TYPE", "Desteklenmeyen dosya türü"));
      return;
    }
    callback(null, true);
  }
}).single("file");

export function verifyUploadedFile(req: Request, _res: Response, next: NextFunction): void {
  try {
    if (!req.file) {
      throw new BadRequestError("FILE_REQUIRED", "Dosya zorunludur");
    }

    assertMagicBytes(req.file.buffer, req.file.mimetype);
    next();
  } catch (error) {
    next(error);
  }
}

export function makeStoredFileName(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  return `${randomUUID()}${ext}`;
}

function assertMagicBytes(buffer: Buffer, mimeType: string): void {
  if (buffer.length < 4) {
    throw new BadRequestError("INVALID_FILE", "Dosya içeriği geçersiz");
  }

  const isValid =
    (mimeType === "application/pdf" && buffer.subarray(0, 4).toString("ascii") === "%PDF") ||
    (mimeType === "image/jpeg" && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) ||
    (mimeType === "image/png" &&
      buffer[0] === 0x89 &&
      buffer.subarray(1, 4).toString("ascii") === "PNG") ||
    (mimeType === "image/webp" &&
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP") ||
    ((mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") &&
      buffer.subarray(0, 2).toString("ascii") === "PK");

  if (!isValid) {
    throw new BadRequestError("INVALID_FILE_SIGNATURE", "Dosya içeriği uzantı ile eşleşmiyor");
  }
}
