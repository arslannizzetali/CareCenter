import type { NextFunction, Request, Response } from "express";
import { adminService } from "../services/admin.service.js";
import { ok } from "../utils/api-response.js";
import { requester } from "../utils/request-context.js";

export class AdminController {
  dashboardStats = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      ok(res, await adminService.dashboardStats());
    } catch (error) {
      next(error);
    }
  };

  recentUpdates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await adminService.recentUpdates(req.query, requester(req));
      ok(res, result.data, { pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  };

  patients = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await adminService.patients(req.query, requester(req));
      ok(res, result.data, { pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  };

  auditLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await adminService.auditLogs(req.query);
      ok(res, result.data, { pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  };

  retentionPolicies = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      ok(res, await adminService.retentionPolicies());
    } catch (error) {
      next(error);
    }
  };

  updateRetentionPolicies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      ok(res, await adminService.updateRetentionPolicies(req.body, requester(req)));
    } catch (error) {
      next(error);
    }
  };
}

export const adminController = new AdminController();
