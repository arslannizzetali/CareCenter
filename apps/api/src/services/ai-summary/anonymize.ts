import { z } from "zod";
import { AppError } from "../../utils/errors.js";

// Everything in this module is pure: no DB, no env. It decides exactly which bytes may
// leave the API for an LLM, so it is unit-tested in isolation.
//
// Strategy is an ALLOWLIST: only the fields listed in `AnonymizableUpdate` are ever
// serialized. A personal-data column added to the schema later is not sent by default.

export const MAX_RECORDS = 200;
const MAX_FIELD_LENGTH = 2000;

export const PATIENT_PLACEHOLDER = "Patient";
const NAME_PLACEHOLDER = "[name]";
const NUMBER_PLACEHOLDER = "[number]";
const DATE_PLACEHOLDER = "[date]";

/** Identity data of the patient. Used ONLY to find and mask it — never serialized. */
export interface PatientIdentity {
  firstName: string;
  lastName: string;
  birthDate: Date;
  roomNumber: string | null;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

export interface AnonymizableUpdate {
  createdAt: Date;
  updateType: string;
  content: string;
  medicationsGiven: unknown;
  vitalSigns: unknown;
  carePerformed: string[];
  patientMood: string;
  nextActionRequired: string | null;
  isUrgent: boolean;
}

export interface AnonymizeInput {
  patient: PatientIdentity;
  updates: AnonymizableUpdate[];
  hours: number;
  /** Full names ("First Last") of every patient and staff member, masked wherever they appear in free text. */
  knownNames: string[];
}

export class PiiDetectedError extends AppError {
  constructor() {
    super(
      422,
      "AI_PII_BLOCKED",
      "Personal data that could not be masked was detected in the records. The summary was not generated for security reasons."
    );
  }
}

const updateTypeLabels: Record<string, string> = {
  MEDICATION: "Medication given",
  CARE: "Care performed",
  OBSERVATION: "Observation",
  STATUS_CHANGE: "Status change",
  VITAL_SIGNS: "Vital signs",
  INCIDENT: "Incident/accident"
};

const moodLabels: Record<string, string> = { GOOD: "Good", MODERATE: "Moderate", BAD: "Poor" };

const medicationSchema = z.array(
  z.object({
    name: z.string(),
    dosage: z.string().optional(),
    route: z.string().optional(),
    givenAt: z.union([z.string(), z.date()]).optional()
  })
);

const vitalSignsSchema = z.object({
  bloodPressure: z.string().optional(),
  heartRate: z.number().optional(),
  temperature: z.number().optional(),
  oxygenSaturation: z.number().optional(),
  weight: z.number().optional(),
  bloodSugar: z.number().optional()
});

// 10+ digits, optionally separated by spaces/dashes/parentheses: phone numbers, national IDs.
// Dots/slashes/colons are not separators, so dates, times and "120/80" survive.
const LONG_NUMBER = /\+?\d(?:[\s\-()]*\d){9,}/g;
const TC_LIKE = /(?<!\d)\d{11}(?!\d)/;

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Istanbul",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit"
});

/** Builds the anonymized text that is sent to the LLM. */
export function buildAnonymizedPrompt(input: AnonymizeInput): { text: string; recordCount: number; truncated: boolean } {
  const mask = createMasker(input.patient, input.knownNames);
  const records = input.updates.slice(0, MAX_RECORDS);
  const truncated = input.updates.length > MAX_RECORDS;
  // Oldest first reads naturally for a shift handover.
  const chronological = [...records].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const header = [
    `${PATIENT_PLACEHOLDER} — Room: ${input.patient.roomNumber ? mask(input.patient.roomNumber) : "not specified"}`,
    `Time range: last ${input.hours} hours`,
    `Record count: ${records.length}${truncated ? ` (only the most recent ${MAX_RECORDS} records)` : ""}`
  ].join("\n");

  const body = chronological.map((update, index) => serializeUpdate(update, index + 1, mask)).join("\n");

  return {
    text: `${header}\n\n<records>\n${body}\n</records>`,
    recordCount: records.length,
    truncated
  };
}

/**
 * Last line of defence before data leaves the API: if any identity value or a
 * national-ID/phone-shaped number is still present, the request is refused (fail-secure).
 */
export function assertNoPii(text: string, patient: PatientIdentity): void {
  if (TC_LIKE.test(text) || new RegExp(LONG_NUMBER.source).test(text)) {
    throw new PiiDetectedError();
  }

  const identityTerms = [
    ...nameParts(patient.firstName),
    ...nameParts(patient.lastName),
    ...nameParts(patient.emergencyContactName),
    ...birthDateForms(patient.birthDate)
  ];
  for (const term of identityTerms) {
    if (termPattern(term).test(text)) {
      throw new PiiDetectedError();
    }
  }
}

function serializeUpdate(update: AnonymizableUpdate, index: number, mask: (value: string) => string): string {
  const lines = [
    `<record no="${index}">`,
    `Time: ${timeFormatter.format(update.createdAt)}`,
    `Type: ${updateTypeLabels[update.updateType] ?? "Other"}${update.isUrgent ? " — URGENT" : ""}`,
    `Mood: ${moodLabels[update.patientMood] ?? "-"}`,
    `Note: ${mask(update.content)}`
  ];

  const medications = medicationSchema.safeParse(update.medicationsGiven);
  if (medications.success && medications.data.length) {
    const items = medications.data.map((medication) => {
      const givenAt = medication.givenAt ? new Date(medication.givenAt) : null;
      const time = givenAt && !Number.isNaN(givenAt.getTime()) ? timeFormatter.format(givenAt) : null;
      return [medication.name, medication.dosage, medication.route, time].filter(Boolean).map((part) => mask(String(part))).join(" — ");
    });
    lines.push(`Medications given: ${items.join("; ")}`);
  }

  const vitals = vitalSignsSchema.safeParse(update.vitalSigns);
  if (vitals.success) {
    const v = vitals.data;
    const parts = [
      v.bloodPressure ? `BP ${mask(v.bloodPressure)}` : null,
      v.heartRate !== undefined ? `HR ${v.heartRate}/min` : null,
      v.temperature !== undefined ? `Temp ${v.temperature}°C` : null,
      v.oxygenSaturation !== undefined ? `SpO2 ${v.oxygenSaturation}%` : null,
      v.weight !== undefined ? `Weight ${v.weight} kg` : null,
      v.bloodSugar !== undefined ? `Blood sugar ${v.bloodSugar} mg/dL` : null
    ].filter(Boolean);
    if (parts.length) {
      lines.push(`Vital signs: ${parts.join(", ")}`);
    }
  }

  if (update.carePerformed.length) {
    lines.push(`Care performed: ${update.carePerformed.map(mask).join(", ")}`);
  }
  if (update.nextActionRequired) {
    lines.push(`Next step: ${mask(update.nextActionRequired)}`);
  }
  lines.push("</record>");
  return lines.join("\n");
}

function createMasker(patient: PatientIdentity, knownNames: string[]): (value: string) => string {
  const patientTerms = [...nameParts(patient.firstName), ...nameParts(patient.lastName)];
  // Other people's names need 3+ letters: very short names ("Su", "Ay") are also common
  // words and would garble the notes. The patient's own names are masked from 2 letters.
  const otherTerms = [
    ...nameParts(patient.emergencyContactName),
    ...knownNames.flatMap((name) => nameParts(name, 3))
  ].filter(
    (term) => !patientTerms.includes(term)
  );
  // Full names are masked as one unit BEFORE single parts. Otherwise a staff member who
  // shares the patient's surname ("Fatma Şahin" vs "Bülent Şahin") would come out as
  // "[name] Patient" and the model could attribute her actions to the patient.
  const patientFullName = `${patient.firstName} ${patient.lastName}`;
  const patientKey = normalizeName(patientFullName);
  const otherFullNames = unique([patient.emergencyContactName, ...knownNames])
    .filter((name) => nameParts(name).length > 1 && normalizeName(name) !== patientKey);

  // Longest first so "Ayşe Nur" is not left half-masked by a shorter overlapping name.
  const byLength = (a: string, b: string) => b.length - a.length;
  const otherFullPatterns = otherFullNames.sort(byLength).map(fullNamePattern);
  const patientFullPattern = fullNamePattern(patientFullName);
  const patientPatterns = unique(patientTerms).sort(byLength).map(termPattern);
  const otherPatterns = unique(otherTerms).sort(byLength).map(termPattern);
  const datePatterns = birthDateForms(patient.birthDate).map(termPattern);

  return (raw: string) => {
    let value = raw.slice(0, MAX_FIELD_LENGTH);
    value = value.replace(LONG_NUMBER, NUMBER_PLACEHOLDER);
    for (const pattern of datePatterns) value = value.replace(pattern, DATE_PLACEHOLDER);
    for (const pattern of otherFullPatterns) value = value.replace(pattern, NAME_PLACEHOLDER);
    value = value.replace(patientFullPattern, PATIENT_PLACEHOLDER);
    for (const pattern of patientPatterns) value = value.replace(pattern, PATIENT_PLACEHOLDER);
    for (const pattern of otherPatterns) value = value.replace(pattern, NAME_PLACEHOLDER);
    value = value.replace(/Patient(?:\s+Patient)+/g, PATIENT_PLACEHOLDER);
    // Records sit between <record> delimiters; free text must not be able to close them.
    return value.replace(/</g, "‹").replace(/>/g, "›").replace(/\s+/g, " ").trim();
  };
}

function nameParts(fullName: string, minLength = 2): string[] {
  return fullName
    .split(/[\s\-']+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= minLength);
}

function birthDateForms(date: Date): string[] {
  const d = String(date.getUTCDate()).padStart(2, "0");
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const y = String(date.getUTCFullYear());
  return [`${d}.${m}.${y}`, `${d}/${m}/${y}`, `${y}-${m}-${d}`];
}

/**
 * Case-insensitive match that also handles Turkish İ/ı/I/i. Only a leading word
 * boundary is required so suffixed forms ("Ahmet'in", "Ahmetin") are masked too —
 * over-masking is the safe direction.
 */
function termPattern(term: string): RegExp {
  const body = [...term].map(charClass).join("");
  return new RegExp(`(?<![\\p{L}\\p{N}])${body}`, "gu");
}

/** "Fatma Şahin" → matches "fatma  şahin", "FATMA-ŞAHİN" etc. as a single unit. */
function fullNamePattern(fullName: string): RegExp {
  const body = nameParts(fullName, 1)
    .map((part) => [...part].map(charClass).join(""))
    .join("[\\s\\-']+");
  return new RegExp(`(?<![\\p{L}\\p{N}])${body}`, "gu");
}

function normalizeName(name: string): string {
  return nameParts(name, 1).join(" ").toLocaleLowerCase("tr");
}

function charClass(char: string): string {
  const variants = new Set(
    [char, char.toLocaleLowerCase("tr"), char.toLocaleUpperCase("tr"), char.toLowerCase(), char.toUpperCase()].filter(
      (variant) => [...variant].length === 1
    )
  );
  if (/[iıİI]/.test(char)) {
    ["i", "ı", "İ", "I"].forEach((variant) => variants.add(variant));
  }
  const escaped = [...variants].map((variant) => variant.replace(/[\\\]^-]/g, "\\$&"));
  return escaped.length === 1 ? escapeRegex(char) : `[${escaped.join("")}]`;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
