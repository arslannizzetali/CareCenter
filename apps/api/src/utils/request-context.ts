import type { Request } from "express";
import type { RequestContext } from "../services/user.service.js";
import type { Requester } from "../services/patient-update.service.js";
import { BadRequestError, UnauthorizedError } from "./errors.js";

export function getClientIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || "unknown";
}

export function requestContext(req: Request): RequestContext {
  if (!req.user) {
    throw new UnauthorizedError();
  }

  return {
    userId: req.user.id,
    ipAddress: getClientIp(req),
    userAgent: req.header("user-agent")
  };
}

export function requester(req: Request): Requester {
  if (!req.user) {
    throw new UnauthorizedError();
  }

  return {
    userId: req.user.id,
    role: req.user.role,
    ipAddress: getClientIp(req),
    userAgent: req.header("user-agent")
  };
}

export function routeId(req: Request): string {
  const id = req.params.id;
  if (!id) {
    throw new BadRequestError("MISSING_ROUTE_ID", "Geçersiz istek");
  }
  return id;
}
