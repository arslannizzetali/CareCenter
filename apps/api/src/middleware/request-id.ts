import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header("X-Request-ID");
  req.requestId = incoming && incoming.length <= 100 ? incoming : randomUUID();
  res.setHeader("X-Request-ID", req.requestId);
  next();
}
