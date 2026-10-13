import type { NextFunction, Request, Response } from "express";
import { documentTypeService } from "../services/document-type.service.js";
import { created, noContent, ok } from "../utils/api-response.js";
import { routeId } from "../utils/request-context.js";

export class DocumentTypeController {
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const includeInactive = req.query.includeInactive === "true";
      ok(res, await documentTypeService.list(includeInactive));
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      created(res, await documentTypeService.create(req.body));
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      ok(res, await documentTypeService.update(routeId(req), req.body));
    } catch (error) {
      next(error);
    }
  };

  remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await documentTypeService.remove(routeId(req));
      noContent(res);
    } catch (error) {
      next(error);
    }
  };
}

export const documentTypeController = new DocumentTypeController();
