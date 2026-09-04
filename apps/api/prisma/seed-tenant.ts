// Yeni bir kurum için ilk admin kullanıcısını oluşturur. `prisma/seed.ts`in
// aksine sahte hasta/demo verisi ÜRETMEZ — gerçek, ücretli kurum kurulumları
// için kullanılır (bkz. scripts/tenant-create.sh).
import bcrypt from "bcrypt";
import { prisma } from "../src/config/database.js";
import { storageService } from "../src/services/storage.service.js";

async function main(): Promise<void> {
  const email = process.env.TENANT_ADMIN_EMAIL;
  const password = process.env.TENANT_ADMIN_PASSWORD;
  const firstName = process.env.TENANT_ADMIN_FIRST_NAME ?? "Admin";
  const lastName = process.env.TENANT_ADMIN_LAST_NAME ?? "Yönetici";

  if (!email || !password) {
    throw new Error("TENANT_ADMIN_EMAIL ve TENANT_ADMIN_PASSWORD ortam değişkenleri zorunlu");
  }

  await storageService.ensureBucket();

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash: await bcrypt.hash(password, 12),
      firstName,
      lastName,
      role: "ADMIN",
      isActive: true
    }
  });

  await prisma.user.update({
    where: { id: admin.id },
    data: { createdById: admin.id }
  });

  console.log(`Kurum admini oluşturuldu: ${email}`);
}

void main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Bilinmeyen seed hatası";
    console.error(message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
