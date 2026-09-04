import type { Role } from "@prisma/client";

export interface RequestUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  accessTokenJti?: string;
  accessTokenExp?: number;
}

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      user?: RequestUser;
    }
  }
}

export {};
