import { Router } from "express";
import {
  auditLogQuerySchema,
  patientQuerySchema,
  recentUpdatesQuerySchema,
  retentionPoliciesSchema
} from "@bakimevi/validation";
import { adminController } from "../controllers/admin.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireAdmin } from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";

export const adminRoutes = Router();

adminRoutes.use(authenticate, requireAdmin);
adminRoutes.get("/dashboard-stats", adminController.dashboardStats);
adminRoutes.get("/recent-updates", validate({ query: recentUpdatesQuerySchema }), adminController.recentUpdates);
adminRoutes.get("/audit-logs", validate({ query: auditLogQuerySchema }), adminController.auditLogs);
adminRoutes.get("/patients", validate({ query: patientQuerySchema }), adminController.patients);
adminRoutes.get("/retention-policies", adminController.retentionPolicies);
adminRoutes.patch(
  "/retention-policies",
  validate({ body: retentionPoliciesSchema }),
  adminController.updateRetentionPolicies
);
