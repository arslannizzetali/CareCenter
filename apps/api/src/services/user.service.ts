import bcrypt from "bcrypt";
import type { Prisma, Role } from "@prisma/client";
import type { CreateUserInput, UpdateUserInput } from "@bakimevi/validation";
import { prisma } from "../config/database.js";
import { auditService } from "./audit.service.js";
import { BadRequestError, ConflictError, NotFoundError } from "../utils/errors.js";
import { omitUndefined } from "../utils/object.js";
import { getPagination, makePagination } from "../utils/pagination.js";

export interface UserQuery {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  deleted?: boolean;
}

export class UserService {
  async list(query: UserQuery) {
    const pagination = getPagination(query);
    const where: Prisma.UserWhereInput = {
      deletedAt: query.deleted ? { not: null } : null,
      ...(typeof query.isActive === "boolean" ? { isActive: query.isActive } : {}),
      ...(query.search
        ? {
            OR: [
              { firstName: { contains: query.search, mode: "insensitive" } },
              { lastName: { contains: query.search, mode: "insensitive" } },
              { email: { contains: query.search, mode: "insensitive" } }
            ]
          }
        : {})
    };

    const [total, users] = await prisma.$transaction([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { createdAt: "desc" },
        select: publicUserSelect
      })
    ]);

    return {
      data: users,
      pagination: makePagination(total, pagination.page, pagination.limit)
    };
  }

  async create(input: CreateUserInput, requester: RequestContext) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new ConflictError("USER_EMAIL_EXISTS", "This email is already in use");
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role as Role,
        isActive: input.isActive,
        createdById: requester.userId
      },
      select: publicUserSelect
    });

    await auditService.write({
      userId: requester.userId,
      action: "USER_CREATED",
      resourceType: "User",
      resourceId: user.id,
      metadata: { role: user.role, email: user.email },
      ipAddress: requester.ipAddress,
      userAgent: requester.userAgent
    });

    return user;
  }

  async getById(id: string) {
    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: publicUserSelect
    });
    if (!user) {
      throw new NotFoundError("USER_NOT_FOUND", "User not found");
    }
    return user;
  }

  async update(id: string, input: UpdateUserInput, requester: RequestContext) {
    await this.getById(id);

    const passwordHash = input.password ? await bcrypt.hash(input.password, 12) : undefined;
    const user = await prisma.user.update({
      where: { id },
      data: omitUndefined({
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role as Role | undefined,
        isActive: input.isActive
      }),
      select: publicUserSelect
    });

    await auditService.write({
      userId: requester.userId,
      action: "USER_UPDATED",
      resourceType: "User",
      resourceId: id,
      metadata: { changedFields: Object.keys(input) },
      ipAddress: requester.ipAddress,
      userAgent: requester.userAgent
    });

    return user;
  }

  async delete(id: string, requester: RequestContext): Promise<void> {
    if (id === requester.userId) {
      throw new BadRequestError("USER_SELF_DELETE", "You cannot delete your own account");
    }

    await this.getById(id);
    await prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date()
      }
    });

    await auditService.write({
      userId: requester.userId,
      action: "USER_DELETED",
      resourceType: "User",
      resourceId: id,
      ipAddress: requester.ipAddress,
      userAgent: requester.userAgent
    });
  }

  async restore(id: string, requester: RequestContext) {
    const user = await prisma.user.findFirst({ where: { id, deletedAt: { not: null } } });
    if (!user) {
      throw new NotFoundError("USER_NOT_FOUND", "Deleted employee not found");
    }

    const restored = await prisma.user.update({
      where: { id },
      data: { deletedAt: null, isActive: true },
      select: publicUserSelect
    });

    await auditService.write({
      userId: requester.userId,
      action: "USER_RESTORED",
      resourceType: "User",
      resourceId: id,
      ipAddress: requester.ipAddress,
      userAgent: requester.userAgent
    });

    return restored;
  }
}

export interface RequestContext {
  userId: string;
  ipAddress: string;
  userAgent?: string | undefined;
}

const publicUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true
} satisfies Prisma.UserSelect;

export const userService = new UserService();
