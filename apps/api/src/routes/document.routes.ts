import { Router } from "express";
import { documentIdParamSchema, documentPrioritySchema } from "@bakimevi/validation";
import { documentController } from "../controllers/document.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireAdmin } from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";

export const documentRoutes = Router();

documentRoutes.use(authenticate);
documentRoutes.get("/:id/download", validate({ params: documentIdParamSchema }), documentController.download);
documentRoutes.patch(
  "/:id/priority",
  requireAdmin,
  validate({ params: documentIdParamSchema, body: documentPrioritySchema }),
  documentController.changePriority
);
documentRoutes.delete("/:id", requireAdmin, validate({ params: documentIdParamSchema }), documentController.delete);
