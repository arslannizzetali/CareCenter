import type { NextFunction, Request, Response } from "express";
import { notificationService } from "../services/notification.service.js";
import { noContent, ok } from "../utils/api-response.js";
import { routeId } from "../utils/request-context.js";

export class NotificationController {
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await notificationService.list(req.query);
      ok(res, { items: result.data, unreadCount: result.unreadCount }, { pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  };

  unreadCount = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      ok(res, { unreadCount: await notificationService.unreadCount() });
    } catch (error) {
      next(error);
    }
  };

  markRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      ok(res, await notificationService.markRead(routeId(req)));
    } catch (error) {
      next(error);
    }
  };

  markAllRead = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      ok(res, await notificationService.markAllRead());
    } catch (error) {
      next(error);
    }
  };

  scan = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      ok(res, await notificationService.scanExpiringDocuments());
    } catch (error) {
      next(error);
    }
  };

  remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await notificationService.remove(routeId(req));
      noContent(res);
    } catch (error) {
      next(error);
    }
  };
}

export const notificationController = new NotificationController();
