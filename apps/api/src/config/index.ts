import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ path: process.env.NODE_ENV === "test" ? ".env.test" : ".env" });
// .env.example only provides dev/test fallbacks. In production it must never silently
// supply placeholder values (e.g. default MinIO creds) and mask a missing real config.
if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: ".env.example" });
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  TEST_DATABASE_URL: z.string().url().optional(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().regex(/^[a-f0-9]{64}$/i, "JWT_SECRET must be 64 hex characters"),
  JWT_REFRESH_SECRET: z.string().regex(/^[a-f0-9]{64}$/i, "JWT_REFRESH_SECRET must be 64 hex characters"),
  JWT_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("8h"),
  MASTER_ENCRYPTION_KEY: z
    .string()
    .regex(/^[a-f0-9]{64}$/i, "MASTER_ENCRYPTION_KEY must be 64 hex characters"),
  MINIO_ENDPOINT: z.string().default("localhost"),
  MINIO_PORT: z.coerce.number().int().default(9000),
  MINIO_ACCESS_KEY: z.string().default("minioadmin"),
  MINIO_SECRET_KEY: z.string().default("minioadmin"),
  MINIO_BUCKET: z.string().default("bakim-documents"),
  MINIO_USE_SSL: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .default("false"),
  API_PORT: z.coerce.number().int().default(3001),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  API_URL: z.string().url().default("http://localhost:3001"),
  ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().int().default(100),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().default(5),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().default("onboarding@resend.dev"),
  NOTIFY_EMAIL: z.string().email().default("arslannizzet10@gmail.com"),
  LLM_ENABLED: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .default("false"),
  LLM_PROVIDER: z.enum(["claude", "ollama"]).default("ollama"),
  ANTHROPIC_API_KEY: z.string().optional(),
  OLLAMA_URL: z.string().url().default("http://localhost:11434"),
  OLLAMA_MODEL: z.string().min(1).default("llama3.1"),
  AI_SUMMARY_DAILY_LIMIT: z.coerce.number().int().positive().default(50)
});

const parsed = envSchema
  .superRefine((value, ctx) => {
    // Production hardening: never boot with insecure defaults that are fine only for local dev.
    if (value.NODE_ENV !== "production") {
      return;
    }

    if (value.MINIO_ACCESS_KEY === "minioadmin" || value.MINIO_SECRET_KEY === "minioadmin") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["MINIO_SECRET_KEY"],
        message: "Default MinIO credentials (minioadmin) cannot be used in production"
      });
    }

    if (value.JWT_SECRET === value.JWT_REFRESH_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["JWT_REFRESH_SECRET"],
        message: "JWT_SECRET and JWT_REFRESH_SECRET must differ in production"
      });
    }

    if (!value.MINIO_USE_SSL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["MINIO_USE_SSL"],
        message: "In production, the MinIO connection must use TLS (MINIO_USE_SSL=true)"
      });
    }
  })
  .safeParse(process.env);

if (!parsed.success) {
  const errors = parsed.error.errors.map((error) => `${error.path.join(".")}: ${error.message}`).join("; ");
  throw new Error(`Invalid environment variables: ${errors}`);
}

export const env = parsed.data;

export function allowedOrigins(): string[] {
  return env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean);
}
