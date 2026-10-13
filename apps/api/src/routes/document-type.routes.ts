import { Router } from "express";
import { documentTypeSchema, idParamSchema } from "@bakimevi/validation";
import { documentTypeController } from "../controllers/document-type.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireAdmin } from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";

export const documentTypeRoutes = Router();

documentTypeRoutes.use(authenticate);
documentTypeRoutes.get("/", documentTypeController.list);
documentTypeRoutes.post("/", requireAdmin, validate({ body: documentTypeSchema }), documentTypeController.create);
documentTypeRoutes.patch(
  "/:id",
  requireAdmin,
  validate({ params: idParamSchema, body: documentTypeSchema }),
  documentTypeController.update
);
documentTypeRoutes.delete("/:id", requireAdmin, validate({ params: idParamSchema }), documentTypeController.remove);
