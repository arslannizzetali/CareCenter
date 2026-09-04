import { Router } from "express";
import {
  createPatientSchema,
  createPatientUpdateSchema,
  documentPrioritySchema,
  patientIdParamSchema,
  patientQuerySchema,
  patientUpdateQuerySchema,
  updatePatientSchema
} from "@bakimevi/validation";
import { documentController } from "../controllers/document.controller.js";
import { patientController } from "../controllers/patient.controller.js";
import { patientUpdateController } from "../controllers/patient-update.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { uploadSingleDocument, verifyUploadedFile } from "../middleware/file-upload.js";
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

patientRoutes.post(
  "/:id/documents",
  validate({ params: patientIdParamSchema }),
  uploadSingleDocument,
  verifyUploadedFile,
  validate({ body: documentPrioritySchema }),
  documentController.upload
);
patientRoutes.get(
  "/:id/documents",
  validate({ params: patientIdParamSchema }),
  documentController.listForPatient
);
