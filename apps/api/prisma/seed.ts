import bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";
import type { CareType, DocumentPriority, MobilityLevel, PatientStatus, Prisma, Role, UpdateType } from "@prisma/client";
import { prisma } from "../src/config/database.js";
import { encryptionService } from "../src/services/encryption.service.js";
import { storageService } from "../src/services/storage.service.js";

const users = [
  { email: "admin@bakimevi.com", password: "Admin123!", role: "ADMIN", firstName: "Admin", lastName: "Manager" },
  { email: "ahmet@bakimevi.com", password: "Calisan123!", role: "EMPLOYEE", firstName: "Ahmet", lastName: "Demir" },
  { email: "mehmet@bakimevi.com", password: "Calisan123!", role: "EMPLOYEE", firstName: "Mehmet", lastName: "Kaya" },
  { email: "fatma@bakimevi.com", password: "Calisan123!", role: "EMPLOYEE", firstName: "Fatma", lastName: "Şahin" }
] satisfies Array<{ email: string; password: string; role: Role; firstName: string; lastName: string }>;

const updateTypes: UpdateType[] = ["MEDICATION", "CARE", "OBSERVATION", "VITAL_SIGNS", "INCIDENT"];

const documentTypeSeed = [
  "Patient Health Report",
  "Medical Board Report",
  "ID Copy",
  "Guardianship / Power of Attorney",
  "Proof of Residence",
  "Income Statement"
];

// --- Test data generator: enough variety to try out filters and printing ---

const firstNamesMale = ["Ahmet", "Mehmet", "Mustafa", "Hüseyin", "Hasan", "İbrahim", "Ali", "Murat", "Kemal", "Osman", "Yusuf", "Ramazan", "Kadir", "Ercan", "Serkan", "Bülent"];
const firstNamesFemale = ["Fatma", "Ayşe", "Emine", "Hatice", "Zeynep", "Elif", "Meryem", "Şerife", "Sultan", "Havva", "Melek", "Nurten", "Sevim", "Gülşen", "Döndü", "Fadime"];
const lastNames = ["Yılmaz", "Kaya", "Demir", "Şahin", "Çelik", "Yıldız", "Yıldırım", "Öztürk", "Aydın", "Özdemir", "Arslan", "Doğan", "Kılıç", "Aslan", "Çetin", "Kara", "Koç", "Kurt", "Özkan", "Şimşek", "Aksoy", "Polat", "Erdoğan", "Korkmaz"];

type SeedPatient = {
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: "MALE" | "FEMALE";
  careType: CareType;
  disabilityType: "PHYSICAL" | "MENTAL" | "BOTH" | null;
  roomNumber: string;
  status: PatientStatus;
  mobilityLevel: MobilityLevel;
};

// Deterministic PRNG (same data on every seed run).
let rngState = 987654321;
function rnd(): number {
  rngState = (rngState * 1664525 + 1013904223) % 4294967296;
  return rngState / 4294967296;
}
function pick<T>(list: readonly T[]): T {
  return list[Math.floor(rnd() * list.length)] as T;
}
function pickN<T>(list: readonly T[], n: number): T[] {
  const copy = [...list];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i += 1) {
    out.push(copy.splice(Math.floor(rnd() * copy.length), 1)[0] as T);
  }
  return out;
}

function buildPatientSeed(count: number): SeedPatient[] {
  const patients: SeedPatient[] = [];
  const currentYear = new Date().getFullYear();
  for (let i = 0; i < count; i += 1) {
    const gender: "MALE" | "FEMALE" = rnd() < 0.5 ? "MALE" : "FEMALE";
    // Ages 25-95; distributed so roughly half are 65+.
    const age = rnd() < 0.5 ? 25 + Math.floor(rnd() * 40) : 65 + Math.floor(rnd() * 30);
    const birthYear = currentYear - age;
    const month = String(1 + Math.floor(rnd() * 12)).padStart(2, "0");
    const day = String(1 + Math.floor(rnd() * 28)).padStart(2, "0");
    const careType = pick<CareType>(["ELDERLY", "DISABLED", "BOTH"]);
    const disabilityType =
      careType === "ELDERLY" ? null : pick(["PHYSICAL", "MENTAL", "BOTH"] as const);
    const status = pick<PatientStatus>(["ACTIVE", "ACTIVE", "ACTIVE", "ACTIVE", "DISCHARGED", "TRANSFERRED"]);
    patients.push({
      firstName: gender === "MALE" ? pick(firstNamesMale) : pick(firstNamesFemale),
      lastName: pick(lastNames),
      birthDate: `${birthYear}-${month}-${day}`,
      gender,
      careType,
      disabilityType,
      roomNumber: `${1 + Math.floor(rnd() * 40)}${pick(["A", "B", "C", "D"])}`,
      status,
      mobilityLevel: pick<MobilityLevel>(["INDEPENDENT", "ASSISTED", "ASSISTED", "BEDRIDDEN"])
    });
  }
  return patients;
}

const patientSeed = buildPatientSeed(45);

// Document expiry distribution (days): red / yellow / green / no-expiry / expired.
const expiryPool: Array<number | null> = [10, 20, 28, 45, 60, 80, 120, 200, 400, null, null, -5, -30];
const documentPriorities: DocumentPriority[] = ["RED", "YELLOW", "GREEN"];

function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

async function main(): Promise<void> {
  // Safety guard: the seed creates accounts with well-known default passwords
  // (e.g. "Admin123!") and demo patient data. It must never run against production.
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PROD_SEED !== "true") {
    throw new Error(
      "The seed cannot be run in production (it creates demo accounts with default passwords). " +
        "If you really want to, set ALLOW_PROD_SEED=true."
    );
  }

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
    throw new Error("Could not create the admin seed user");
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

  const documentTypes = [];
  for (const [order, name] of documentTypeSeed.entries()) {
    documentTypes.push(
      await prisma.documentType.upsert({
        where: { name },
        update: { sortOrder: order, isSystem: true, isActive: true },
        create: { name, sortOrder: order, isSystem: true }
      })
    );
  }

  for (const [index, seed] of patientSeed.entries()) {
    const { firstName, lastName, birthDate, gender, careType, disabilityType, roomNumber, status, mobilityLevel } = seed;
    const tcSuffix = String(index + 1).padStart(4, "0");
    const patient = await prisma.patient.create({
      data: {
        firstName,
        lastName,
        birthDate: new Date(birthDate),
        gender,
        tcNumberEncrypted: encryptionService.encryptTc(`1000000${tcSuffix}`),
        careType,
        disabilityType,
        roomNumber,
        admissionDate: daysAgo(700 - index * 12),
        status,
        diagnosis: "Hypertension and age-related monitoring needs",
        allergies: "Penisilin, Aspirin",
        currentMedications: "Metformin 500mg, Lisinopril 10mg",
        mobilityLevel,
        dietaryNeeds: "Az tuzlu beslenme",
        emergencyContactName: `${lastName} Relative`,
        emergencyContactPhone: "05321234567",
        emergencyContactRelation: "Aile",
        notes: "Needs regular monitoring",
        createdById: admin.id
      }
    });

    for (let updateIndex = 0; updateIndex < 4; updateIndex += 1) {
      const employee = employees[(index + updateIndex) % employees.length];
      if (!employee) {
        throw new Error("Staff seed data is missing");
      }
      const updateType = updateTypes[(index + updateIndex) % updateTypes.length] ?? "OBSERVATION";
      const updateData: Prisma.PatientUpdateUncheckedCreateInput = {
        patientId: patient.id,
        employeeId: employee.id,
        updateType,
        content: `A ${updateType} record was entered for ${firstName} ${lastName}. General condition monitored.`,
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
        carePerformed: updateType === "CARE" ? ["Bathing assistance", "Feeding assistance"] : [],
        patientMood: updateIndex % 3 === 0 ? "GOOD" : updateIndex % 3 === 1 ? "MODERATE" : "BAD",
        ...(updateIndex === 2 ? { nextActionRequired: "Doctor evaluation scheduled" } : {}),
        isUrgent: updateIndex === 3 && index % 2 === 0,
        createdAt: daysAgo(updateIndex + (index % 7))
      };
      await prisma.patientUpdate.create({
        data: updateData
      });
    }

    // Give each patient a random subset of document types (2-6) → leave gaps for the "missing document" filter.
    const typeCount = 2 + Math.floor(rnd() * 5);
    const assignedTypes = pickN(documentTypes, Math.min(typeCount, documentTypes.length));
    for (const [documentIndex, docType] of assignedTypes.entries()) {
      const employee = employees[(index + documentIndex) % employees.length];
      if (!employee) {
        throw new Error("Staff seed data is missing");
      }
      const file = documentIndex % 2 === 0 ? dummyPdf(`${firstName} ${lastName}`) : dummyJpeg();
      const encrypted = encryptionService.encryptFile(file.buffer);
      const storedFileName = `${cryptoRandomName()}.${file.ext}`;
      await storageService.uploadFile(storedFileName, encrypted.encrypted, "application/octet-stream");
      const expiryOffset = pick(expiryPool);
      await prisma.document.create({
        data: {
          patientId: patient.id,
          uploadedById: employee.id,
          documentTypeId: docType.id,
          fileName: `${firstName.toLowerCase()}-${docType.name.split(" ")[0]?.toLowerCase() ?? "evrak"}.${file.ext}`,
          storedFileName,
          fileSize: BigInt(file.buffer.length),
          mimeType: file.mimeType,
          priority: pick(documentPriorities),
          expiresAt: expiryOffset === null ? null : daysFromNow(expiryOffset),
          encryptionKey: encryptionService.packDocumentKey(encrypted.key, encrypted.iv, encrypted.authTag),
          checksum: encrypted.checksum,
          uploadedAt: daysAgo(10 + documentIndex * 5)
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

  console.log("Seed data created.");
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
    const message = error instanceof Error ? error.message : "Unknown seed error";
    console.error(message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
