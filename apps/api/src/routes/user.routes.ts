import { Router } from "express";
import { createUserSchema, idParamSchema, updateUserSchema, userQuerySchema } from "@bakimevi/validation";
import { userController } from "../controllers/user.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireAdmin } from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";

export const userRoutes = Router();

userRoutes.use(authenticate, requireAdmin);
userRoutes.get("/", validate({ query: userQuerySchema }), userController.list);
userRoutes.post("/", validate({ body: createUserSchema }), userController.create);
userRoutes.get("/:id", validate({ params: idParamSchema }), userController.get);
userRoutes.patch("/:id", validate({ params: idParamSchema, body: updateUserSchema }), userController.update);
userRoutes.delete("/:id", validate({ params: idParamSchema }), userController.delete);
userRoutes.post("/:id/restore", validate({ params: idParamSchema }), userController.restore);
