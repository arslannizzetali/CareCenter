export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class BadRequestError extends AppError {
  constructor(code: string, message: string, details?: unknown) {
    super(400, code, message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(code = "UNAUTHORIZED", message = "You must sign in", details?: unknown) {
    super(401, code, message, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(code = "FORBIDDEN", message = "You don't have permission for this action", details?: unknown) {
    super(403, code, message, details);
  }
}

export class NotFoundError extends AppError {
  constructor(code: string, message: string, details?: unknown) {
    super(404, code, message, details);
  }
}

export class ConflictError extends AppError {
  constructor(code: string, message: string, details?: unknown) {
    super(409, code, message, details);
  }
}

export class ValidationError extends AppError {
  constructor(details: unknown) {
    super(422, "VALIDATION_ERROR", "The provided information is invalid", details);
  }
}
