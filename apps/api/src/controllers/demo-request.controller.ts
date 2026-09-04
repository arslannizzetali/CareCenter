import type { NextFunction, Request, Response } from "express";
import { demoRequestService } from "../services/demo-request.service.js";
import { noContent } from "../utils/api-response.js";

export class DemoRequestController {
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await demoRequestService.create(req.body);
      noContent(res);
    } catch (error) {
      next(error);
    }
  };
}

export const demoRequestController = new DemoRequestController();
