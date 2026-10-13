import type { NextFunction, Request, Response } from "express";
import type { HandoverSummaryInput } from "@bakimevi/validation";
import { aiSummaryService } from "../services/ai-summary.service.js";
import { ok } from "../utils/api-response.js";
import { requester, routeId } from "../utils/request-context.js";

export class AiSummaryController {
  handover = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { hours } = req.body as HandoverSummaryInput;
      const summary = await aiSummaryService.generateHandoverSummary(routeId(req), hours, requester(req));
      // Health data: never let browsers or proxies keep a copy.
      res.setHeader("Cache-Control", "no-store");
      ok(res, summary);
    } catch (error) {
      next(error);
    }
  };
}

export const aiSummaryController = new AiSummaryController();
