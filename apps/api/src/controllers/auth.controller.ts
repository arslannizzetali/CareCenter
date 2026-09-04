import type { NextFunction, Request, Response } from "express";
import { env } from "../config/index.js";
import { authService } from "../services/auth.service.js";
import { ok, noContent } from "../utils/api-response.js";
import { getClientIp } from "../utils/request-context.js";
import { UnauthorizedError } from "../utils/errors.js";

const REFRESH_COOKIE = "refreshToken";

export class AuthController {
  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await authService.login(req.body.email, req.body.password, {
        ipAddress: getClientIp(req),
        userAgent: req.header("user-agent")
      });

      this.setRefreshCookie(res, result.tokens.refreshToken);
      ok(res, {
        user: result.user,
        accessToken: result.tokens.accessToken
      });
    } catch (error) {
      next(error);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const refreshToken = req.cookies?.[REFRESH_COOKIE];
      if (typeof refreshToken !== "string") {
        throw new UnauthorizedError("REFRESH_TOKEN_REQUIRED", "Oturum yenileme bilgisi bulunamadı");
      }

      const tokens = await authService.refresh(refreshToken, {
        ipAddress: getClientIp(req),
        userAgent: req.header("user-agent")
      });
      this.setRefreshCookie(res, tokens.refreshToken);
      ok(res, { accessToken: tokens.accessToken });
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const refreshToken = req.cookies?.[REFRESH_COOKIE];
      await authService.logout(req.user, typeof refreshToken === "string" ? refreshToken : undefined, {
        ipAddress: getClientIp(req),
        userAgent: req.header("user-agent")
      });
      res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
      noContent(res);
    } catch (error) {
      next(error);
    }
  };

  me = (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new UnauthorizedError();
      }
      ok(res, {
        id: req.user.id,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        role: req.user.role
      });
    } catch (error) {
      next(error);
    }
  };

  private setRefreshCookie(res: Response, token: string): void {
    res.cookie(REFRESH_COOKIE, token, {
      ...refreshCookieOptions(),
      maxAge: parseRefreshMaxAgeMs()
    });
  }
}

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict" as const
  };
}

function parseRefreshMaxAgeMs(): number {
  const value = env.JWT_REFRESH_EXPIRES_IN;
  if (value.endsWith("h")) {
    return Number(value.slice(0, -1)) * 60 * 60 * 1000;
  }
  if (value.endsWith("m")) {
    return Number(value.slice(0, -1)) * 60 * 1000;
  }
  return 8 * 60 * 60 * 1000;
}

export const authController = new AuthController();
