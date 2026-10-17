import { Router } from "express";
import { idParamSchema, notificationQuerySchema } from "@bakimevi/validation";
import { notificationController } from "../controllers/notification.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireAdmin } from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";

export const notificationRoutes = Router();

notificationRoutes.use(authenticate, requireAdmin);
notificationRoutes.get("/", validate({ query: notificationQuerySchema }), notificationController.list);
notificationRoutes.get("/unread-count", notificationController.unreadCount);
notificationRoutes.post("/read-all", notificationController.markAllRead);
notificationRoutes.post("/scan", notificationController.scan);
notificationRoutes.post("/:id/read", validate({ params: idParamSchema }), notificationController.markRead);
notificationRoutes.delete("/:id", validate({ params: idParamSchema }), notificationController.remove);
