import cookieParser from "cookie-parser";
import express from "express";
import { routes } from "./routes/index.js";
import { apiLimiter } from "./middleware/rate-limit.js";
import { errorHandler } from "./middleware/error-handler.js";
import { requestId } from "./middleware/request-id.js";
import { securityMiddleware } from "./middleware/security-headers.js";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(requestId);
  app.use(securityMiddleware);
  app.use(apiLimiter);
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.use("/api/v1", routes);
  app.use(errorHandler);

  return app;
}
