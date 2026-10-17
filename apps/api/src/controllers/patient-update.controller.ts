import type { NextFunction, Request, Response } from "express";
import { patientUpdateService } from "../services/patient-update.service.js";
import { created, noContent, ok } from "../utils/api-response.js";
import { BadRequestError } from "../utils/errors.js";
import { requester, routeId } from "../utils/request-context.js";

function updateRouteId(req: Request): string {
  const updateId = req.params.updateId;
  if (!updateId) {
    throw new BadRequestError("MISSING_ROUTE_ID", "Invalid request");
  }
  return updateId;
}

export class PatientUpdateController {
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      created(res, await patientUpdateService.create(routeId(req), req.body, requester(req)));
    } catch (error) {
      next(error);
    }
  };

  listForPatient = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await patientUpdateService.listForPatient(routeId(req), req.query, requester(req));
      ok(res, result.data, { pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      ok(res, await patientUpdateService.update(updateRouteId(req), req.body, requester(req)));
    } catch (error) {
      next(error);
    }
  };

  remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await patientUpdateService.remove(updateRouteId(req), requester(req));
      noContent(res);
    } catch (error) {
      next(error);
    }
  };

  recent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await patientUpdateService.recent(req.query, requester(req));
      ok(res, result.data, { pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  };
}

export const patientUpdateController = new PatientUpdateController();
