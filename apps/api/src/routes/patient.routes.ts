import { Router } from "express";
import {
  createPatientSchema,
  createPatientUpdateSchema,
  documentUploadSchema,
  handoverSummarySchema,
  patientIdParamSchema,
  patientQuerySchema,
  patientUpdateIdParamSchema,
  patientUpdateQuerySchema,
  updatePatientSchema,
  updatePatientUpdateSchema
} from "@bakimevi/validation";
import { aiSummaryController } from "../controllers/ai-summary.controller.js";
import { documentController } from "../controllers/document.controller.js";
import { patientController } from "../controllers/patient.controller.js";
import { patientUpdateController } from "../controllers/patient-update.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/authorize.js";
import { uploadSingleDocument, verifyUploadedFile } from "../middleware/file-upload.js";
import { aiSummaryDailyLimiter, aiSummaryLimiter } from "../middleware/rate-limit.js";
import { validate } from "../middleware/validate.js";

export const patientRoutes = Router();

patientRoutes.use(authenticate);
patientRoutes.get("/", validate({ query: patientQuerySchema }), patientController.list);
patientRoutes.post("/", validate({ body: createPatientSchema }), patientController.create);
patientRoutes.get("/:id", validate({ params: patientIdParamSchema }), patientController.get);
patientRoutes.patch("/:id", validate({ params: patientIdParamSchema, body: updatePatientSchema }), patientController.update);
patientRoutes.delete("/:id", validate({ params: patientIdParamSchema }), patientController.delete);

patientRoutes.post(
  "/:id/updates",
  validate({ params: patientIdParamSchema, body: createPatientUpdateSchema }),
  patientUpdateController.create
);
patientRoutes.get(
  "/:id/updates",
  validate({ params: patientIdParamSchema, query: patientUpdateQuerySchema }),
  patientUpdateController.listForPatient
);
patientRoutes.patch(
  "/:id/updates/:updateId",
  validate({ params: patientUpdateIdParamSchema, body: updatePatientUpdateSchema }),
  patientUpdateController.update
);
patientRoutes.delete(
  "/:id/updates/:updateId",
  validate({ params: patientUpdateIdParamSchema }),
  patientUpdateController.remove
);

patientRoutes.post(
  "/:id/documents",
  validate({ params: patientIdParamSchema }),
  uploadSingleDocument,
  verifyUploadedFile,
  validate({ body: documentUploadSchema }),
  documentController.upload
);
patientRoutes.get(
  "/:id/documents",
  validate({ params: patientIdParamSchema }),
  documentController.listForPatient
);
patientRoutes.get(
  "/:id/documents/status",
  validate({ params: patientIdParamSchema }),
  documentController.typeStatusForPatient
);

patientRoutes.post(
  "/:id/ai/handover-summary",
  requireRole("ADMIN", "EMPLOYEE"),
  aiSummaryLimiter,
  aiSummaryDailyLimiter,
  validate({ params: patientIdParamSchema, body: handoverSummarySchema }),
  aiSummaryController.handover
);
