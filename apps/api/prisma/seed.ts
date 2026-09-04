import bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";
import type { CareType, DocumentPriority, MobilityLevel, PatientStatus, Prisma, Role, UpdateType } from "@prisma/client";
import { prisma } from "../src/config/database.js";
import { encryptionService } from "../src/services/encryption.service.js";
import { storageService } from "../src/services/storage.service.js";

const users = [
  { email: "admin@bakimevi.com", password: "Admin123!", role: "ADMIN", firstName: "Admin", lastName: "Yönetici" },
  { email: "ahmet@bakimevi.com", password: "Calisan123!", role: "EMPLOYEE", firstName: "Ahmet", lastName: "Demir" },
  { email: "mehmet@bakimevi.com", password: "Calisan123!", role: "EMPLOYEE", firstName: "Mehmet", lastName: "Kaya" },
  { email: "fatma@bakimevi.com", password: "Calisan123!", role: "EMPLOYEE", firstName: "Fatma", lastName: "Şahin" }
] satisfies Array<{ email: string; password: string; role: Role; firstName: string; lastName: string }>;

const patientSeed = [
  ["Ahmet", "Yılmaz", "1952-04-12", "MALE", "ELDERLY", "12A", "ACTIVE", "ASSISTED"],
  ["Fatma", "Sarı", "1948-09-03", "FEMALE", "ELDERLY", "7B", "ACTIVE", "BEDRIDDEN"],
  ["Hasan", "Öztürk", "1955-01-22", "MALE", "ELDERLY", "3C", "ACTIVE", "INDEPENDENT"],
  ["Emine", "Çelik", "1944-07-18", "FEMALE", "ELDERLY", "14A", "DISCHARGED", "ASSISTED"],
  ["Murat", "Aksoy", "1983-03-05", "MALE", "DISABLED", "9D", "ACTIVE", "ASSISTED"],
  ["Zeynep", "Aydın", "1991-11-27", "FEMALE", "DISABLED", "10B", "ACTIVE", "INDEPENDENT"],
  ["Kemal", "Kurt", "1962-02-13", "MALE", "BOTH", "2A", "TRANSFERRED", "BEDRIDDEN"],
  ["Ayşe", "Koç", "1959-12-09", "FEMALE", "BOTH", "8C", "ACTIVE", "ASSISTED"]
] as const;

const updateTypes: UpdateType[] = ["MEDICATION", "CARE", "OBSERVATION", "VITAL_SIGNS", "INCIDENT"];
const priorities: DocumentPriority[] = ["RED", "YELLOW", "YELLOW", "GREEN", "GREEN"];

async function main(): Promise<void> {
  const createdUsers = [];
  for (const user of users) {
    createdUsers.push(
      await prisma.user.upsert({
        where: { email: user.email },
        update: {},
        create: {
          email: user.email,
          passwordHash: await bcrypt.hash(user.password, 12),
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isActive: true
        }
      })
    );
  }

  const admin = createdUsers.find((user) => user.role === "ADMIN");
  const employees = createdUsers.filter((user) => user.role === "EMPLOYEE");
  if (!admin) {
    throw new Error("Admin seed kullanıcısı oluşturulamadı");
  }

  await prisma.user.update({
    where: { id: admin.id },
    data: { createdById: admin.id }
  });
  for (const employee of employees) {
    await prisma.user.update({
      where: { id: employee.id },
      data: { createdById: admin.id }
    });
  }

  await storageService.ensureBucket();

  for (const [index, seed] of patientSeed.entries()) {
    const [firstName, lastName, birthDate, gender, careType, roomNumber, status, mobilityLevel] = seed;
    const patient = await prisma.patient.create({
      data: {
        firstName,
        lastName,
        birthDate: new Date(birthDate),
        gender,
        tcNumberEncrypted: encryptionService.encryptTc(`1000000000${index + 1}`),
        careType: careType as CareType,
        roomNumber,
        admissionDate: daysAgo(350 - index * 13),
        status: status as PatientStatus,
        diagnosis: "Hipertansiyon ve yaşa bağlı takip gereksinimi",
        allergies: "Penisilin, Aspirin",
        currentMedications: "Metformin 500mg, Lisinopril 10mg",
        mobilityLevel: mobilityLevel as MobilityLevel,
        dietaryNeeds: "Az tuzlu beslenme",
        emergencyContactName: `${lastName} Yakını`,
        emergencyContactPhone: "05321234567",
        emergencyContactRelation: "Aile",
        notes: "Düzenli takip edilmeli",
        createdById: admin.id
      }
    });

    for (let updateIndex = 0; updateIndex < 4; updateIndex += 1) {
      const employee = employees[(index + updateIndex) % employees.length];
      if (!employee) {
        throw new Error("Çalışan seed verisi eksik");
      }
      const updateType = updateTypes[(index + updateIndex) % updateTypes.length] ?? "OBSERVATION";
      const updateData: Prisma.PatientUpdateUncheckedCreateInput = {
        patientId: patient.id,
        employeeId: employee.id,
        updateType,
        content: `${firstName} ${lastName} için ${updateType} kaydı girildi. Genel durum takip edildi.`,
        ...(updateType === "MEDICATION"
          ? {
              medicationsGiven: [
                { name: "Metformin", dosage: "500mg", route: "oral", givenAt: daysAgo(updateIndex).toISOString() }
              ] satisfies Prisma.InputJsonValue
            }
          : {}),
        ...(updateType === "VITAL_SIGNS" || updateType === "MEDICATION"
          ? {
              vitalSigns: {
                bloodPressure: "130/85",
                heartRate: 78,
                temperature: 36.8,
                oxygenSaturation: 97
              } satisfies Prisma.InputJsonValue
            }
          : {}),
        carePerformed: updateType === "CARE" ? ["Banyo yardımı", "Beslenme yardımı"] : [],
        patientMood: updateIndex % 3 === 0 ? "GOOD" : updateIndex % 3 === 1 ? "MODERATE" : "BAD",
        ...(updateIndex === 2 ? { nextActionRequired: "Doktor değerlendirmesi planlandı" } : {}),
        isUrgent: updateIndex === 3 && index % 2 === 0,
        createdAt: daysAgo(updateIndex + (index % 7))
      };
      await prisma.patientUpdate.create({
        data: updateData
      });
    }

    for (const [documentIndex, priority] of priorities.entries()) {
      const employee = employees[(index + documentIndex) % employees.length];
      if (!employee) {
        throw new Error("Çalışan seed verisi eksik");
      }
      const file = documentIndex % 2 === 0 ? dummyPdf(`${firstName} ${lastName}`) : dummyJpeg();
      const encrypted = encryptionService.encryptFile(file.buffer);
      const storedFileName = `${cryptoRandomName()}.${file.ext}`;
      await storageService.uploadFile(storedFileName, encrypted.encrypted, "application/octet-stream");
      await prisma.document.create({
        data: {
          patientId: patient.id,
          uploadedById: employee.id,
          fileName: `${firstName.toLowerCase()}-${documentIndex + 1}.${file.ext}`,
          storedFileName,
          fileSize: BigInt(file.buffer.length),
          mimeType: file.mimeType,
          priority,
          encryptionKey: encryptionService.packDocumentKey(encrypted.key, encrypted.iv, encrypted.authTag),
          checksum: encrypted.checksum,
          uploadedAt: daysAgo(documentIndex * 10)
        }
      });
    }
  }

  await prisma.documentRetentionPolicy.upsert({
    where: { priority: "YELLOW" },
    update: { retentionDays: 90, autoDeleteEnabled: true, updatedById: admin.id },
    create: { priority: "YELLOW", retentionDays: 90, autoDeleteEnabled: true, updatedById: admin.id }
  });
  await prisma.documentRetentionPolicy.upsert({
    where: { priority: "GREEN" },
    update: { retentionDays: 30, autoDeleteEnabled: true, updatedById: admin.id },
    create: { priority: "GREEN", retentionDays: 30, autoDeleteEnabled: true, updatedById: admin.id }
  });

  console.log("Seed verisi oluşturuldu.");
}

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function dummyPdf(title: string): { buffer: Buffer; mimeType: string; ext: string } {
  const content = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >> endobj
4 0 obj << /Length 44 >> stream
BT /F1 12 Tf 20 100 Td (${title}) Tj ET
endstream endobj
trailer << /Root 1 0 R >>
%%EOF`;
  return { buffer: Buffer.from(content), mimeType: "application/pdf", ext: "pdf" };
}

function dummyJpeg(): { buffer: Buffer; mimeType: string; ext: string } {
  return {
    buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0xff, 0xd9]),
    mimeType: "image/jpeg",
    ext: "jpg"
  };
}

function cryptoRandomName(): string {
  return randomUUID();
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
