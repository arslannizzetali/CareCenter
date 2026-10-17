import bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";
import type { CareType, DocumentPriority, MobilityLevel, PatientStatus, Prisma, Role, UpdateType } from "@prisma/client";
import { prisma } from "../src/config/database.js";
import { encryptionService } from "../src/services/encryption.service.js";
import { storageService } from "../src/services/storage.service.js";

const users = [
  { email: "admin@carecenter.app", password: "Admin123!", role: "ADMIN", firstName: "Admin", lastName: "User" },
  { email: "john@carecenter.app", password: "Employee123!", role: "EMPLOYEE", firstName: "John", lastName: "Carter" },
  { email: "emily@carecenter.app", password: "Employee123!", role: "EMPLOYEE", firstName: "Emily", lastName: "Brooks" },
  { email: "michael@carecenter.app", password: "Employee123!", role: "EMPLOYEE", firstName: "Michael", lastName: "Reed" }
] satisfies Array<{ email: string; password: string; role: Role; firstName: string; lastName: string }>;

const documentTypeSeed = [
  "Disability Health Report",
  "Medical Board Report",
  "ID Copy",
  "Guardianship / Power of Attorney",
  "Proof of Residence",
  "Income Statement"
];

// --- Test data generator: enough variety to exercise the filters and printing ---

const firstNamesMale = ["James", "Robert", "William", "David", "Richard", "Thomas", "Charles", "George", "Edward", "Henry", "Arthur", "Walter", "Frank", "Peter", "Daniel", "Samuel"];
const firstNamesFemale = ["Mary", "Margaret", "Dorothy", "Helen", "Ruth", "Alice", "Grace", "Rose", "Evelyn", "Florence", "Martha", "Clara", "Edith", "Irene", "Lucy", "Sarah"];
const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Wilson", "Taylor", "Anderson", "Thomas", "Moore", "Martin", "Clark", "Lewis", "Walker", "Hall", "Allen", "Young", "King", "Wright", "Scott", "Green", "Baker"];

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
    // Age 25-95; roughly half are 65+.
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

const diagnoses = [
  "Hypertension, age-related monitoring",
  "Type 2 diabetes",
  "Early-stage Alzheimer's disease",
  "Cerebral palsy",
  "Post-stroke hemiplegia",
  "Down syndrome",
  "Parkinson's disease"
];

// Realistic shift stories for the AI handover demo. Every entry is placed relative to
// the time the seed runs, so the last 12/24/48 hours always contain records.
// Re-run the seed (db reset) shortly before a demo to keep them fresh.
type SeedEntry = {
  hoursAgo: number;
  type: UpdateType;
  content: string;
  mood: "GOOD" | "MODERATE" | "BAD";
  urgent?: boolean;
  meds?: Array<{ name: string; dosage: string; route: string }>;
  vitals?: { bloodPressure?: string; heartRate?: number; temperature?: number; oxygenSaturation?: number; bloodSugar?: number };
  care?: string[];
  next?: string;
};

const shiftScenarios: SeedEntry[][] = [
  [
    { hoursAgo: 22, type: "MEDICATION", content: "Evening medication given after dinner. Took all tablets without difficulty.", mood: "GOOD", meds: [{ name: "Lisinopril", dosage: "10mg", route: "oral" }], vitals: { bloodPressure: "138/86", heartRate: 76 } },
    { hoursAgo: 16, type: "OBSERVATION", content: "Restless during the night, called the nurse twice and said they could not sleep. Settled after a warm drink around 02:30.", mood: "MODERATE" },
    { hoursAgo: 11, type: "INCIDENT", content: "Found sitting on the floor next to the bed at 05:10, says they slipped while trying to reach the bathroom alone. No visible injury, mild pain in the right hip. Night nurse informed.", mood: "BAD", urgent: true, next: "Doctor to examine right hip this morning; check hip pain every 2 hours" },
    { hoursAgo: 8, type: "VITAL_SIGNS", content: "Vital signs check after the fall. Blood pressure higher than usual.", mood: "MODERATE", vitals: { bloodPressure: "152/94", heartRate: 88, temperature: 36.9, oxygenSaturation: 96 } },
    { hoursAgo: 6, type: "CARE", content: "Assisted with washing and dressing; walked to breakfast with a frame and support. Ate about half of the meal.", mood: "MODERATE", care: ["Bathing assistance", "Feeding assistance", "Change of clothes"] },
    { hoursAgo: 3, type: "OBSERVATION", content: "Doctor examined the hip: bruising only, no fracture suspected. Bed alarm turned on for the night.", mood: "GOOD", next: "Keep bed alarm on; escort to the bathroom at night" }
  ],
  [
    { hoursAgo: 20, type: "VITAL_SIGNS", content: "Routine evening check. Blood sugar slightly high after dinner.", mood: "GOOD", vitals: { bloodPressure: "128/80", heartRate: 72, bloodSugar: 212 } },
    { hoursAgo: 19, type: "MEDICATION", content: "Evening insulin given as prescribed.", mood: "GOOD", meds: [{ name: "Insulin glargine", dosage: "18 units", route: "subcutaneous" }] },
    { hoursAgo: 9, type: "VITAL_SIGNS", content: "Fasting blood sugar low before breakfast; resident felt shaky and sweaty. Given orange juice, rechecked after 15 minutes: 96 mg/dL.", mood: "BAD", urgent: true, vitals: { bloodSugar: 58, heartRate: 98 }, next: "Inform the doctor about the morning hypoglycemia; review evening insulin dose" },
    { hoursAgo: 7, type: "CARE", content: "Breakfast eaten completely. Foot check done, small blister on the left heel cleaned and dressed.", mood: "GOOD", care: ["Feeding assistance", "Wound care"] },
    { hoursAgo: 4, type: "MEDICATION", content: "Morning metformin given with lunch.", mood: "GOOD", meds: [{ name: "Metformin", dosage: "500mg", route: "oral" }] },
    { hoursAgo: 1, type: "OBSERVATION", content: "Joined the afternoon music group and chatted with other residents. In good spirits.", mood: "GOOD" }
  ],
  [
    { hoursAgo: 21, type: "OBSERVATION", content: "Confused in the evening, kept asking for their late wife and tried to leave the unit twice. Calmed down when looking at family photos.", mood: "BAD" },
    { hoursAgo: 18, type: "MEDICATION", content: "Evening dose given; resident first refused, accepted after 20 minutes with gentle encouragement.", mood: "MODERATE", meds: [{ name: "Donepezil", dosage: "10mg", route: "oral" }] },
    { hoursAgo: 13, type: "OBSERVATION", content: "Slept from 23:00 to 04:00, then awake and walking in the corridor. Guided back to the room.", mood: "MODERATE" },
    { hoursAgo: 7, type: "CARE", content: "Needed full help with dressing today. Ate breakfast slowly with prompting; drank only one glass of water.", mood: "MODERATE", care: ["Change of clothes", "Feeding assistance"], next: "Encourage fluids; record intake at every meal" },
    { hoursAgo: 2, type: "VITAL_SIGNS", content: "Vital signs within normal range. Slight temperature rise, possibly from low fluid intake.", mood: "GOOD", vitals: { bloodPressure: "124/78", heartRate: 80, temperature: 37.6, oxygenSaturation: 97 }, next: "Recheck temperature at 18:00" }
  ],
  [
    { hoursAgo: 23, type: "CARE", content: "Repositioned every 2 hours through the evening. Small red area noticed on the sacrum.", mood: "MODERATE", care: ["Wound care"], next: "Continue 2-hourly turns; inspect sacrum each shift" },
    { hoursAgo: 15, type: "MEDICATION", content: "Night pain relief given for back spasms.", mood: "MODERATE", meds: [{ name: "Baclofen", dosage: "10mg", route: "oral" }] },
    { hoursAgo: 10, type: "VITAL_SIGNS", content: "Oxygen saturation lower than usual, breathing a bit fast. Head of the bed raised, saturation improved to 95%.", mood: "BAD", urgent: true, vitals: { heartRate: 102, temperature: 38.1, oxygenSaturation: 91 }, next: "Doctor informed — chest examination requested today" },
    { hoursAgo: 6, type: "CARE", content: "Bed bath given, sacrum dressing changed. Tolerated soft breakfast.", mood: "MODERATE", care: ["Bathing assistance", "Wound care", "Feeding assistance"] },
    { hoursAgo: 2, type: "OBSERVATION", content: "Doctor visited, started antibiotics for a suspected chest infection. Family informed by phone.", mood: "MODERATE", next: "Give first antibiotic dose at 16:00; monitor temperature 4-hourly" }
  ],
  [
    { hoursAgo: 20, type: "OBSERVATION", content: "Watched a film with other residents and went to bed on time.", mood: "GOOD" },
    { hoursAgo: 12, type: "OBSERVATION", content: "Slept through the night without waking.", mood: "GOOD" },
    { hoursAgo: 7, type: "MEDICATION", content: "Morning medication given with breakfast.", mood: "GOOD", meds: [{ name: "Levothyroxine", dosage: "50mcg", route: "oral" }] },
    { hoursAgo: 5, type: "CARE", content: "Physical therapy session completed: 15 minutes of walking exercises with the therapist.", mood: "GOOD", care: ["Physical therapy", "Exercise"] },
    { hoursAgo: 2, type: "VITAL_SIGNS", content: "Routine weekly check, all values normal.", mood: "GOOD", vitals: { bloodPressure: "122/76", heartRate: 70, temperature: 36.6, oxygenSaturation: 98 } }
  ],
  [
    { hoursAgo: 22, type: "OBSERVATION", content: "Became upset after a phone call with family and refused dinner. Sat with staff for a while and talked.", mood: "BAD" },
    { hoursAgo: 17, type: "MEDICATION", content: "Evening anticoagulant given.", mood: "MODERATE", meds: [{ name: "Apixaban", dosage: "5mg", route: "oral" }] },
    { hoursAgo: 9, type: "INCIDENT", content: "Large bruise noticed on the left forearm during morning care; resident cannot remember any knock. On blood thinners.", mood: "MODERATE", urgent: true, next: "Measure and photograph the bruise daily; report to the doctor if it grows" },
    { hoursAgo: 6, type: "CARE", content: "Psychological support session with the social worker. Ate full breakfast afterwards.", mood: "GOOD", care: ["Psychological support", "Feeding assistance"] },
    { hoursAgo: 1, type: "VITAL_SIGNS", content: "Afternoon check, values stable.", mood: "GOOD", vitals: { bloodPressure: "130/82", heartRate: 74, temperature: 36.7 } }
  ]
];

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

// Document validity spread (days): red / yellow / green / unlimited / expired.
const expiryPool: Array<number | null> = [10, 20, 28, 45, 60, 80, 120, 200, 400, null, null, -5, -30];
const documentPriorities: DocumentPriority[] = ["RED", "YELLOW", "GREEN"];

function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

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

  // Demo residents are only generated once; re-running the seed must not duplicate them.
  const existingPatients = await prisma.patient.count();
  if (existingPatients > 0) {
    console.log(`Skipping demo residents: ${existingPatients} already exist.`);
    return;
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
        diagnosis: pick(diagnoses),
        allergies: pick(["Penicillin", "Aspirin", "Penicillin, Aspirin", "None known", "Latex"]),
        currentMedications: pick(["Metformin 500mg, Lisinopril 10mg", "Amlodipine 5mg", "Levothyroxine 50mcg", "Donepezil 10mg", "Baclofen 10mg"]),
        mobilityLevel,
        dietaryNeeds: pick(["Low-salt diet", "Diabetic diet", "Soft food", "Regular diet"]),
        emergencyContactName: `${pick(firstNamesFemale)} ${lastName}`,
        emergencyContactPhone: "05321234567",
        emergencyContactRelation: pick(["Daughter", "Son", "Spouse", "Sibling"]),
        notes: "Requires regular follow-up",
        createdById: admin.id
      }
    });

    // Discharged/transferred residents have no fresh shift notes.
    const scenario = status === "ACTIVE" ? shiftScenarios[index % shiftScenarios.length] ?? [] : [];
    for (const [entryIndex, entry] of scenario.entries()) {
      const employee = employees[(index + entryIndex) % employees.length];
      if (!employee) {
        throw new Error("Employee seed data is missing");
      }
      await prisma.patientUpdate.create({
        data: {
          patientId: patient.id,
          employeeId: employee.id,
          updateType: entry.type,
          content: entry.content,
          ...(entry.meds
            ? {
                medicationsGiven: entry.meds.map((med) => ({
                  ...med,
                  givenAt: hoursAgo(entry.hoursAgo).toISOString()
                })) satisfies Prisma.InputJsonValue
              }
            : {}),
          ...(entry.vitals ? { vitalSigns: entry.vitals satisfies Prisma.InputJsonValue } : {}),
          carePerformed: entry.care ?? [],
          patientMood: entry.mood,
          ...(entry.next ? { nextActionRequired: entry.next } : {}),
          isUrgent: entry.urgent ?? false,
          // Small per-resident jitter so the activity feed does not look copy-pasted.
          createdAt: hoursAgo(Math.max(0.2, entry.hoursAgo - (index % 5) * 0.25))
        }
      });
    }

    // Older history (3-9 days ago) so the timeline does not start yesterday.
    for (let historyIndex = 0; historyIndex < 2; historyIndex += 1) {
      const employee = employees[(index + historyIndex) % employees.length];
      if (!employee) {
        throw new Error("Employee seed data is missing");
      }
      await prisma.patientUpdate.create({
        data: {
          patientId: patient.id,
          employeeId: employee.id,
          updateType: "OBSERVATION",
          content: pick(["Routine day, no concerns.", "Family visited in the afternoon.", "Took part in the morning exercise group."]),
          carePerformed: [],
          patientMood: "GOOD",
          isUrgent: false,
          createdAt: daysAgo(3 + historyIndex * 3 + (index % 3))
        }
      });
    }

    // Each resident gets a random subset (2-6) of document types, leaving gaps for the "missing documents" filter.
    const typeCount = 2 + Math.floor(rnd() * 5);
    const assignedTypes = pickN(documentTypes, Math.min(typeCount, documentTypes.length));
    for (const [documentIndex, docType] of assignedTypes.entries()) {
      const employee = employees[(index + documentIndex) % employees.length];
      if (!employee) {
        throw new Error("Employee seed data is missing");
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
          fileName: `${firstName.toLowerCase()}-${docType.name.split(" ")[0]?.toLowerCase() ?? "document"}.${file.ext}`,
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
