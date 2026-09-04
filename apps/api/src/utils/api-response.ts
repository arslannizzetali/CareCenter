import type { Response } from "express";
import type { PaginationMeta } from "@bakimevi/shared-types";

export function ok<T>(res: Response, data: T, meta?: { pagination?: PaginationMeta }): void {
  res.status(200).json({
    success: true,
    data,
    meta: {
      ...meta,
      timestamp: new Date().toISOString(),
      requestId: res.req.requestId
    }
  });
}

export function created<T>(res: Response, data: T): void {
  res.status(201).json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: res.req.requestId
    }
  });
}

export function noContent(res: Response): void {
  res.status(204).send();
}
