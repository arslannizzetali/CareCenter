import type { NextFunction, Request, Response } from "express";
import { patientService } from "../services/patient.service.js";
import { created, noContent, ok } from "../utils/api-response.js";
import { requester, routeId } from "../utils/request-context.js";

export class PatientController {
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await patientService.list(req.query, requester(req));
      ok(res, result.data, { pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      created(res, await patientService.create(req.body, requester(req)));
    } catch (error) {
      next(error);
    }
  };

  get = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      ok(res, await patientService.getById(routeId(req), requester(req)));
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      ok(res, await patientService.update(routeId(req), req.body, requester(req)));
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await patientService.delete(routeId(req), requester(req));
      noContent(res);
    } catch (error) {
      next(error);
    }
  };
}

export const patientController = new PatientController();
