import { Router } from "express";
import { demoRequestSchema } from "@bakimevi/validation";
import { demoRequestController } from "../controllers/demo-request.controller.js";
import { publicLimiter } from "../middleware/rate-limit.js";
import { validate } from "../middleware/validate.js";

export const publicRoutes = Router();

publicRoutes.post(
  "/demo-requests",
  publicLimiter,
  validate({ body: demoRequestSchema }),
  demoRequestController.create
);
