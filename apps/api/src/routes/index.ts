import { Router } from "express";
import { adminRoutes } from "./admin.routes.js";
import { authRoutes } from "./auth.routes.js";
import { documentRoutes } from "./document.routes.js";
import { patientRoutes } from "./patient.routes.js";
import { patientUpdateRoutes } from "./patient-update.routes.js";
import { publicRoutes } from "./public.routes.js";
import { userRoutes } from "./user.routes.js";

export const routes = Router();

routes.use("/auth", authRoutes);
routes.use("/public", publicRoutes);
routes.use("/users", userRoutes);
routes.use("/patients", patientRoutes);
routes.use("/patient-updates", patientUpdateRoutes);
routes.use("/documents", documentRoutes);
routes.use("/admin", adminRoutes);
