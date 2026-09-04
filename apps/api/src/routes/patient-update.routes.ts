import { Router } from "express";
import { recentUpdatesQuerySchema } from "@bakimevi/validation";
import { patientUpdateController } from "../controllers/patient-update.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { validate } from "../middleware/validate.js";

export const patientUpdateRoutes = Router();

patientUpdateRoutes.use(authenticate);
patientUpdateRoutes.get("/recent", validate({ query: recentUpdatesQuerySchema }), patientUpdateController.recent);
