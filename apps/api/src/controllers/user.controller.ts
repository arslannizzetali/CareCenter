import type { NextFunction, Request, Response } from "express";
import { userService } from "../services/user.service.js";
import { created, noContent, ok } from "../utils/api-response.js";
import { requestContext, routeId } from "../utils/request-context.js";

export class UserController {
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await userService.list(req.query);
      ok(res, result.data, { pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await userService.create(req.body, requestContext(req));
      created(res, user);
    } catch (error) {
      next(error);
    }
  };

  get = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      ok(res, await userService.getById(routeId(req)));
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      ok(res, await userService.update(routeId(req), req.body, requestContext(req)));
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await userService.delete(routeId(req), requestContext(req));
      noContent(res);
    } catch (error) {
      next(error);
    }
  };
}

export const userController = new UserController();
