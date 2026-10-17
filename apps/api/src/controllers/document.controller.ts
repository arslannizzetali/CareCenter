import type { NextFunction, Request, Response } from "express";
import type { DocumentPriority } from "@prisma/client";
import { documentService } from "../services/document.service.js";
import { created, noContent, ok } from "../utils/api-response.js";
import { requester, routeId } from "../utils/request-context.js";
import { BadRequestError } from "../utils/errors.js";

export class DocumentController {
  upload = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        throw new BadRequestError("FILE_REQUIRED", "Dosya zorunludur");
      }
      created(
        res,
        await documentService.upload(
          routeId(req),
          req.file,
          req.body.priority as DocumentPriority,
          {
            expiresAt: req.body.expiresAt as Date | undefined,
            documentTypeId: req.body.documentTypeId as string | undefined
          },
          requester(req)
        )
      );
    } catch (error) {
      next(error);
    }
  };

  listForPatient = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      ok(res, await documentService.listForPatient(routeId(req), requester(req)));
    } catch (error) {
      next(error);
    }
  };

  typeStatusForPatient = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      ok(res, await documentService.typeStatusForPatient(routeId(req), requester(req)));
    } catch (error) {
      next(error);
    }
  };

  matrix = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      ok(res, await documentService.matrix(req.query, requester(req)));
    } catch (error) {
      next(error);
    }
  };

  updateMeta = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      ok(res, await documentService.updateMeta(routeId(req), req.body, requester(req)));
    } catch (error) {
      next(error);
    }
  };

  download = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await documentService.download(routeId(req), requester(req));
      res.setHeader("Content-Type", result.mimeType);
      res.setHeader("Content-Length", result.buffer.length.toString());
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(result.fileName)}"`);
      res.send(result.buffer);
    } catch (error) {
      next(error);
    }
  };

  changePriority = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      ok(res, await documentService.changePriority(routeId(req), req.body.priority, requester(req)));
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await documentService.delete(routeId(req), requester(req));
      noContent(res);
    } catch (error) {
      next(error);
    }
  };
}

export const documentController = new DocumentController();
