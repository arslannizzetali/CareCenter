process.env.NODE_ENV = "test";
process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://bakim_user:bakim_pass@localhost:5433/bakim_test";
process.env.TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://bakim_user:bakim_pass@localhost:5433/bakim_test";
process.env.REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
process.env.JWT_SECRET =
  process.env.JWT_SECRET ?? "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ?? "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "15m";
process.env.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN ?? "8h";
process.env.MASTER_ENCRYPTION_KEY =
  process.env.MASTER_ENCRYPTION_KEY ?? "1111111111111111111111111111111111111111111111111111111111111111";
process.env.MINIO_ENDPOINT = process.env.MINIO_ENDPOINT ?? "localhost";
process.env.MINIO_PORT = process.env.MINIO_PORT ?? "9000";
process.env.MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY ?? "minioadmin";
process.env.MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY ?? "minioadmin";
process.env.MINIO_BUCKET = process.env.MINIO_BUCKET ?? "bakim-documents";
process.env.MINIO_USE_SSL = process.env.MINIO_USE_SSL ?? "false";
process.env.API_PORT = process.env.API_PORT ?? "3001";
process.env.FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:3000";
process.env.API_URL = process.env.API_URL ?? "http://localhost:3001";
process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS ?? "http://localhost:3000";
process.env.RATE_LIMIT_WINDOW_MS = process.env.RATE_LIMIT_WINDOW_MS ?? "900000";
process.env.RATE_LIMIT_MAX = process.env.RATE_LIMIT_MAX ?? "100";
process.env.AUTH_RATE_LIMIT_MAX = process.env.AUTH_RATE_LIMIT_MAX ?? "5";
