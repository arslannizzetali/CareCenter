import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";
import { env } from "../config/index.js";
import { prisma } from "../config/database.js";
import { redis } from "../config/redis.js";
import { UnauthorizedError } from "../utils/errors.js";

interface AccessTokenPayload extends JwtPayload {
  sub: string;
  email: string;
  role: "ADMIN" | "EMPLOYEE";
  jti: string;
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      throw new UnauthorizedError("UNAUTHORIZED", "Giriş yapmalısınız");
    }

    const payload = jwt.verify(token, env.JWT_SECRET, {
      issuer: "bakimevi-api",
      audience: "bakimevi-web",
      algorithms: ["HS256"]
    }) as AccessTokenPayload;

    if (!payload.sub || !payload.jti || typeof payload.exp !== "number") {
      throw new UnauthorizedError("INVALID_TOKEN", "Oturum geçersiz");
    }

    const blacklisted = await redis.get(`blacklist:access:${payload.jti}`);
    if (blacklisted) {
      throw new UnauthorizedError("TOKEN_REVOKED", "Oturum sonlandırılmış");
    }

    const user = await prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null, isActive: true },
      select: { id: true, email: true, firstName: true, lastName: true, role: true }
    });

    if (!user) {
      throw new UnauthorizedError("USER_INACTIVE", "Kullanıcı aktif değil");
    }

    req.user = {
      ...user,
      accessTokenJti: payload.jti,
      accessTokenExp: payload.exp
    };

    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      next(error);
      return;
    }
    next(new UnauthorizedError("INVALID_TOKEN", "Oturum geçersiz"));
  }
}

function extractBearerToken(req: Request): string | null {
  const header = req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  return header.slice("Bearer ".length).trim();
}
