import type { ErrorRequestHandler } from "express";
import multer from "multer";
import { env } from "../config/index.js";
import { AppError } from "../utils/errors.js";

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const normalized = normalizeError(error);

  res.status(normalized.statusCode).json({
    success: false,
    error: {
      code: normalized.code,
      message: normalized.message,
      details: env.NODE_ENV === "production" ? undefined : normalized.details,
      stack: env.NODE_ENV === "production" ? undefined : normalized.stack,
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    }
  });
};

function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof multer.MulterError) {
    return new AppError(400, "UPLOAD_ERROR", uploadMessage(error), { field: error.field });
  }

  if (error instanceof Error) {
    return new AppError(500, "INTERNAL_SERVER_ERROR", "An unexpected error occurred", {
      originalMessage: error.message,
      stack: error.stack
    });
  }

  return new AppError(500, "INTERNAL_SERVER_ERROR", "An unexpected error occurred");
}

function uploadMessage(error: multer.MulterError): string {
  if (error.code === "LIMIT_FILE_SIZE") {
    return "File size exceeds the 50MB limit";
  }

  return "File upload error";
}
