// Creates the first admin user for a new institution. Unlike `prisma/seed.ts`,
// it does NOT generate fake patient/demo data — it is used for real, paid institution
// setups (see scripts/tenant-create.sh).
import bcrypt from "bcrypt";
import { prisma } from "../src/config/database.js";
import { storageService } from "../src/services/storage.service.js";

async function main(): Promise<void> {
  const email = process.env.TENANT_ADMIN_EMAIL;
  const password = process.env.TENANT_ADMIN_PASSWORD;
  const firstName = process.env.TENANT_ADMIN_FIRST_NAME ?? "Admin";
  const lastName = process.env.TENANT_ADMIN_LAST_NAME ?? "Manager";

  if (!email || !password) {
    throw new Error("TENANT_ADMIN_EMAIL and TENANT_ADMIN_PASSWORD environment variables are required");
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

  console.log(`Institution admin created: ${email}`);
}

void main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown seed error";
    console.error(message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
