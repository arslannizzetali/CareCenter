import type { DocumentTypeInput } from "@bakimevi/validation";
import { prisma } from "../config/database.js";
import { ConflictError, NotFoundError } from "../utils/errors.js";

export class DocumentTypeService {
  async list(includeInactive = false) {
    return prisma.documentType.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    });
  }

  async create(input: DocumentTypeInput) {
    const existing = await prisma.documentType.findUnique({ where: { name: input.name } });
    if (existing) {
      throw new ConflictError("DOCUMENT_TYPE_EXISTS", "A document type with this name already exists");
    }
    return prisma.documentType.create({
      data: {
        name: input.name,
        sortOrder: input.sortOrder ?? 0,
        isActive: input.isActive ?? true
      }
    });
  }

  async update(id: string, input: DocumentTypeInput) {
    await this.ensureExists(id);
    return prisma.documentType.update({
      where: { id },
      data: {
        name: input.name,
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {})
      }
    });
  }

  async remove(id: string): Promise<void> {
    const type = await prisma.documentType.findUnique({
      where: { id },
      include: { _count: { select: { documents: true } } }
    });
    if (!type) {
      throw new NotFoundError("DOCUMENT_TYPE_NOT_FOUND", "Document type not found");
    }
    // Kullanımdaysa veya sistem türüyse silme, pasife al.
    if (type.isSystem || type._count.documents > 0) {
      await prisma.documentType.update({ where: { id }, data: { isActive: false } });
      return;
    }
    await prisma.documentType.delete({ where: { id } });
  }

  private async ensureExists(id: string): Promise<void> {
    const count = await prisma.documentType.count({ where: { id } });
    if (count === 0) {
      throw new NotFoundError("DOCUMENT_TYPE_NOT_FOUND", "Document type not found");
    }
  }
}

export const documentTypeService = new DocumentTypeService();
