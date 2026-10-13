import type { AuditLog, Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";

// Raw audit logs are technical (action codes, UUIDs). This module turns each
// log into a plain English sentence an admin can read, e.g.
// "Stephen King, gave medication to patient Jordan Smith: Parol 500 mg (oral)."

type AuditLogWithUser = AuditLog & {
  user: { id: string; firstName: string; lastName: string; email: string; role: "ADMIN" | "EMPLOYEE" } | null;
};

export type AuditCategory = "CARE" | "PATIENT" | "DOCUMENT" | "USER" | "LOGIN" | "SYSTEM";

export interface DescribedAuditLog {
  id: string;
  performedAt: Date;
  action: string;
  category: AuditCategory;
  isUrgent: boolean;
  actorName: string;
  actorRole: "ADMIN" | "EMPLOYEE" | null;
  description: string;
  ipAddress: string;
}

type Meta = Record<string, unknown>;

interface Lookups {
  patients: Map<string, string>;
  users: Map<string, string>;
  documents: Map<string, { fileName: string; patientId: string; typeName: string | null }>;
  updates: Map<string, { patientId: string; medications: string[]; care: string[]; vitals: string[]; content: string }>;
}

const priorityLabels: Record<string, string> = { RED: "Red", YELLOW: "Yellow", GREEN: "Green" };

function asMeta(value: Prisma.JsonValue | null): Meta {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Meta) : {};
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function shorten(text: string, max = 80): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function fullName(person: { firstName: string; lastName: string }): string {
  return `${person.firstName} ${person.lastName}`.trim();
}

function describeVitals(value: Prisma.JsonValue | null): string[] {
  const v = asMeta(value);
  const parts: string[] = [];
  if (str(v.bloodPressure)) parts.push(`BP ${String(v.bloodPressure)}`);
  if (typeof v.heartRate === "number") parts.push(`HR ${v.heartRate}`);
  if (typeof v.temperature === "number") parts.push(`Temp ${v.temperature}°C`);
  if (typeof v.oxygenSaturation === "number") parts.push(`Oxygen ${v.oxygenSaturation}%`);
  if (typeof v.bloodSugar === "number") parts.push(`Blood sugar ${v.bloodSugar} mg/dL`);
  if (typeof v.weight === "number") parts.push(`Weight ${v.weight} kg`);
  return parts;
}

function describeMedications(value: Prisma.JsonValue | null): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const m = asMeta(item as Prisma.JsonValue);
    const name = str(m.name);
    if (!name) return [];
    const dosage = str(m.dosage);
    const route = str(m.route);
    return [`${name}${dosage ? ` ${dosage}` : ""}${route ? ` (${route})` : ""}`];
  });
}

function patientIdOf(log: AuditLog, meta: Meta): string | undefined {
  if (log.resourceType === "Patient" && log.resourceId !== "list") return log.resourceId;
  return str(meta.patientId);
}

async function buildLookups(logs: AuditLogWithUser[]): Promise<Lookups> {
  const patientIds = new Set<string>();
  const userIds = new Set<string>();
  const documentIds = new Set<string>();
  const updateIds = new Set<string>();

  for (const log of logs) {
    const meta = asMeta(log.metadata);
    const patientId = patientIdOf(log, meta);
    if (patientId) patientIds.add(patientId);
    if (log.resourceType === "User") userIds.add(log.resourceId);
    if (log.resourceType === "Document") documentIds.add(log.resourceId);
    if (log.resourceType === "PatientUpdate") updateIds.add(log.resourceId);
  }

  const isUuid = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

  const [updates, documents] = await Promise.all([
    prisma.patientUpdate.findMany({
      where: { id: { in: [...updateIds] } },
      select: { id: true, patientId: true, medicationsGiven: true, vitalSigns: true, carePerformed: true, content: true }
    }),
    prisma.document.findMany({
      where: { id: { in: [...documentIds] } },
      select: { id: true, fileName: true, patientId: true, documentType: { select: { name: true } } }
    })
  ]);

  for (const update of updates) patientIds.add(update.patientId);
  for (const document of documents) patientIds.add(document.patientId);

  const [patients, users] = await Promise.all([
    prisma.patient.findMany({
      where: { id: { in: [...patientIds].filter(isUuid) } },
      select: { id: true, firstName: true, lastName: true }
    }),
    prisma.user.findMany({
      where: { id: { in: [...userIds].filter(isUuid) } },
      select: { id: true, firstName: true, lastName: true }
    })
  ]);

  return {
    patients: new Map(patients.map((p) => [p.id, fullName(p)])),
    users: new Map(users.map((u) => [u.id, fullName(u)])),
    documents: new Map(
      documents.map((d) => [d.id, { fileName: d.fileName, patientId: d.patientId, typeName: d.documentType?.name ?? null }])
    ),
    updates: new Map(
      updates.map((u) => [
        u.id,
        {
          patientId: u.patientId,
          medications: describeMedications(u.medicationsGiven),
          care: u.carePerformed,
          vitals: describeVitals(u.vitalSigns),
          content: u.content
        }
      ])
    )
  };
}

function describeOne(log: AuditLogWithUser, lookups: Lookups): Omit<DescribedAuditLog, "id" | "performedAt" | "action" | "ipAddress"> {
  const meta = asMeta(log.metadata);
  const actorName = log.user ? fullName(log.user) : "System";
  const actorRole = log.user?.role ?? null;

  const update = log.resourceType === "PatientUpdate" ? lookups.updates.get(log.resourceId) : undefined;
  const document = log.resourceType === "Document" ? lookups.documents.get(log.resourceId) : undefined;
  const patientId = patientIdOf(log, meta) ?? update?.patientId ?? document?.patientId;
  const patientName = patientId ? lookups.patients.get(patientId) : undefined;
  const engelli = patientName ? `patient ${patientName}` : "a deleted patient";
  const targetUser = log.resourceType === "User" ? lookups.users.get(log.resourceId) ?? "a deleted user" : "";
  const docTitle = document ? `"${document.typeName ?? document.fileName}"` : "";
  const doc = document
    ? { nom: `the ${docTitle} document`, acc: `the ${docTitle} document`, gen: `the ${docTitle} document` }
    : { nom: "a document", acc: "a document", gen: "a document" };
  const isUrgent = meta.isUrgent === true;

  const result = (category: AuditCategory, text: string) => ({
    category,
    isUrgent,
    actorName,
    actorRole,
    description: `${actorName}, ${text}`
  });

  switch (log.action) {
    case "PATIENT_UPDATE_CREATED": {
      const type = str(meta.updateType);
      const detail = update?.content ? ` Not: "${shorten(update.content)}"` : "";
      switch (type) {
        case "MEDICATION": {
          const meds = update?.medications.length ? `: ${update.medications.join(", ")}` : "";
          return result("CARE", `gave medication to ${engelli}${meds}.${detail}`);
        }
        case "CARE": {
          const care = update?.care.length ? `: ${update.care.join(", ")}` : "";
          return result("CARE", `performed care for ${engelli}${care}.${detail}`);
        }
        case "VITAL_SIGNS": {
          const vitals = update?.vitals.length ? ` (${update.vitals.join(", ")})` : "";
          return result("CARE", `measured vital signs for ${engelli}${vitals}.${detail}`);
        }
        case "STATUS_CHANGE":
          return result("CARE", `reported a status change for ${engelli}.${detail}`);
        case "INCIDENT":
          return result("CARE", `reported an incident involving ${engelli}.${detail}`);
        default:
          return result("CARE", `observed ${engelli} and added a note.${detail}`);
      }
    }
    case "PATIENT_UPDATE_EDITED":
      return result("CARE", `edited a care record for ${engelli}.`);
    case "PATIENT_UPDATE_DELETED":
      return result("CARE", `deleted a care record for ${engelli}.`);

    case "PATIENT_CREATED":
      return result("PATIENT", `registered ${patientName ? `patient ${patientName}` : "a new patient"} in the system.`);
    case "PATIENT_VIEWED":
      return result("PATIENT", `viewed ${engelli}'s file.`);
    case "PATIENT_SEARCHED": {
      const search = str(asMeta(meta.query as Prisma.JsonValue).search);
      return result("PATIENT", search ? `searched the patient list for "${search}".` : "viewed the patient list.");
    }
    case "PATIENT_UPDATED":
      return result("PATIENT", `updated ${engelli}'s information.`);
    case "PATIENT_DELETED":
      return result("PATIENT", `moved ${engelli}'s record to the archive.`);
    case "PATIENT_RESTORED":
      return result("PATIENT", `restored ${engelli}'s record from the archive.`);
    case "PATIENT_PURGED":
      return result("PATIENT", "permanently deleted an archived patient's record.");

    case "DOCUMENT_UPLOADED":
      return result("DOCUMENT", `uploaded ${doc.nom} for ${engelli}.`);
    case "DOCUMENT_VIEWED":
      return result("DOCUMENT", `viewed ${doc.acc} belonging to ${engelli}.`);
    case "DOCUMENT_DOWNLOADED":
      return result("DOCUMENT", `downloaded ${doc.acc} belonging to ${engelli}.`);
    case "DOCUMENT_META_UPDATED":
      return result("DOCUMENT", `updated the details of ${doc.gen} belonging to ${engelli}.`);
    case "DOCUMENT_PRIORITY_CHANGED": {
      const from = priorityLabels[String(meta.oldPriority)] ?? "?";
      const to = priorityLabels[String(meta.newPriority)] ?? "?";
      return result("DOCUMENT", `changed the priority of ${doc.gen} belonging to ${engelli} from ${from} → ${to}.`);
    }
    case "DOCUMENT_DELETED":
      return meta.reason === "AUTO_DELETE"
        ? { ...result("DOCUMENT", ""), description: `The system automatically deleted ${doc.acc} belonging to ${engelli} because its retention period expired.` }
        : result("DOCUMENT", `deleted ${doc.acc} belonging to ${engelli}.`);

    case "USER_CREATED":
      return result("USER", `created a new ${meta.role === "ADMIN" ? "administrator" : "staff"} account for ${targetUser}.`);
    case "USER_UPDATED":
      return result("USER", `updated the account of ${targetUser}.`);
    case "USER_DELETED":
      return result("USER", `deactivated the account of ${targetUser}.`);
    case "USER_RESTORED":
      return result("USER", `reactivated the account of ${targetUser}.`);

    case "USER_LOGIN":
      return result("LOGIN", "signed in.");
    case "USER_LOGOUT":
      return result("LOGIN", "signed out.");
    case "USER_LOGIN_FAILED": {
      const who = log.user ? actorName : lookups.users.get(log.resourceId) ?? log.resourceId;
      const reason = meta.reason === "INACTIVE_ACCOUNT" ? " (account disabled)" : " (wrong password)";
      return { ...result("LOGIN", ""), description: `${who} — failed sign-in attempt${reason}.` };
    }
    case "TOKEN_REUSE_DETECTED":
      return result("LOGIN", "suspicious activity was detected in their session; the session was closed for security.");

    case "RETENTION_POLICY_UPDATED":
      return result("SYSTEM", "changed the document auto-deletion settings.");
    case "SETTINGS_CHANGED":
      return result("SYSTEM", "changed the system settings.");
    case "AI_SUMMARY_GENERATED": {
      const hours = typeof meta.hours === "number" ? meta.hours : null;
      const range = hours ? ` (last ${hours} hours)` : "";
      return result("CARE", `generated an AI handover summary for ${engelli}${range}.`);
    }

    default:
      return result("SYSTEM", `performed an action (${log.action}).`);
  }
}

export async function describeAuditLogs(logs: AuditLogWithUser[]): Promise<DescribedAuditLog[]> {
  const lookups = await buildLookups(logs);
  return logs.map((log) => ({
    id: log.id,
    performedAt: log.performedAt,
    action: log.action,
    ipAddress: log.ipAddress,
    ...describeOne(log, lookups)
  }));
}

// Routine read-only actions that flood the log; hidden when admin asks for "important only".
export const ROUTINE_AUDIT_ACTIONS = ["PATIENT_VIEWED", "PATIENT_SEARCHED", "DOCUMENT_VIEWED", "USER_LOGOUT"];

export const AUDIT_CATEGORY_ACTIONS: Record<AuditCategory, string[]> = {
  CARE: ["PATIENT_UPDATE_CREATED", "PATIENT_UPDATE_EDITED", "PATIENT_UPDATE_DELETED", "AI_SUMMARY_GENERATED"],
  PATIENT: ["PATIENT_CREATED", "PATIENT_VIEWED", "PATIENT_SEARCHED", "PATIENT_UPDATED", "PATIENT_DELETED", "PATIENT_RESTORED", "PATIENT_PURGED"],
  DOCUMENT: ["DOCUMENT_UPLOADED", "DOCUMENT_VIEWED", "DOCUMENT_DOWNLOADED", "DOCUMENT_META_UPDATED", "DOCUMENT_PRIORITY_CHANGED", "DOCUMENT_DELETED"],
  USER: ["USER_CREATED", "USER_UPDATED", "USER_DELETED", "USER_RESTORED"],
  LOGIN: ["USER_LOGIN", "USER_LOGOUT", "USER_LOGIN_FAILED", "TOKEN_REUSE_DETECTED"],
  SYSTEM: ["RETENTION_POLICY_UPDATED", "SETTINGS_CHANGED"]
};
