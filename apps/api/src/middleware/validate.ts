import type { NextFunction, Request, Response } from "express";
import type { z } from "zod";
import { ValidationError } from "../utils/errors.js";

interface ValidationSchemas {
  body?: z.ZodType;
  query?: z.ZodType;
  params?: z.ZodType;
}

export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) {
        const parsed = schemas.body.safeParse(req.body);
        if (!parsed.success) {
          throw new ValidationError(formatZodErrors(parsed.error));
        }
        req.body = parsed.data;
      }

      if (schemas.query) {
        const parsed = schemas.query.safeParse(req.query);
        if (!parsed.success) {
          throw new ValidationError(formatZodErrors(parsed.error));
        }
        req.query = parsed.data as Request["query"];
      }

      if (schemas.params) {
        const parsed = schemas.params.safeParse(req.params);
        if (!parsed.success) {
          throw new ValidationError(formatZodErrors(parsed.error));
        }
        req.params = parsed.data as Request["params"];
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

function formatZodErrors(error: z.ZodError): Array<{ field: string; message: string }> {
  return error.errors.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message
  }));
}
