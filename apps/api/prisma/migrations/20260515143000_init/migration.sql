-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "CareType" AS ENUM ('ELDERLY', 'DISABLED', 'BOTH');

-- CreateEnum
CREATE TYPE "PatientStatus" AS ENUM ('ACTIVE', 'DISCHARGED', 'TRANSFERRED');

-- CreateEnum
CREATE TYPE "MobilityLevel" AS ENUM ('INDEPENDENT', 'ASSISTED', 'BEDRIDDEN');

-- CreateEnum
CREATE TYPE "UpdateType" AS ENUM ('MEDICATION', 'CARE', 'OBSERVATION', 'STATUS_CHANGE', 'VITAL_SIGNS', 'INCIDENT');

-- CreateEnum
CREATE TYPE "PatientMood" AS ENUM ('GOOD', 'MODERATE', 'BAD');

-- CreateEnum
CREATE TYPE "DocumentPriority" AS ENUM ('RED', 'YELLOW', 'GREEN');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" VARCHAR(50) NOT NULL,
    "last_name" VARCHAR(50) NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'EMPLOYEE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" TEXT,
    "last_login_at" TIMESTAMP(3),
    "last_login_ip" VARCHAR(45),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "first_name" VARCHAR(50) NOT NULL,
    "last_name" VARCHAR(50) NOT NULL,
    "birth_date" TIMESTAMP(3) NOT NULL,
    "gender" VARCHAR(10) NOT NULL,
    "tc_number_encrypted" TEXT,
    "care_type" "CareType" NOT NULL,
    "room_number" VARCHAR(20),
    "admission_date" TIMESTAMP(3) NOT NULL,
    "status" "PatientStatus" NOT NULL DEFAULT 'ACTIVE',
    "diagnosis" TEXT,
    "allergies" TEXT,
    "current_medications" TEXT,
    "mobility_level" "MobilityLevel" NOT NULL,
    "dietary_needs" TEXT,
    "emergency_contact_name" VARCHAR(100) NOT NULL,
    "emergency_contact_phone" VARCHAR(15) NOT NULL,
    "emergency_contact_relation" VARCHAR(50) NOT NULL,
    "notes" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_updates" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "update_type" "UpdateType" NOT NULL,
    "content" TEXT NOT NULL,
    "medications_given" JSONB,
    "vital_signs" JSONB,
    "care_performed" TEXT[],
    "patient_mood" "PatientMood" NOT NULL,
    "next_action_required" TEXT,
    "is_urgent" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "uploaded_by_id" TEXT NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "stored_file_name" VARCHAR(255) NOT NULL,
    "file_size" BIGINT NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "priority" "DocumentPriority" NOT NULL,
    "encryption_key" TEXT NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "deleted_by_id" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_retention_policies" (
    "id" TEXT NOT NULL,
    "priority" VARCHAR(10) NOT NULL,
    "retention_days" INTEGER NOT NULL,
    "auto_delete_enabled" BOOLEAN NOT NULL,
    "updated_by_id" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_retention_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" VARCHAR(100) NOT NULL,
    "resource_type" VARCHAR(50) NOT NULL,
    "resource_id" TEXT NOT NULL,
    "metadata" JSONB,
    "ip_address" VARCHAR(45) NOT NULL,
    "user_agent" TEXT,
    "performed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "patients_first_name_last_name_idx" ON "patients"("first_name", "last_name");

-- CreateIndex
CREATE INDEX "patients_status_idx" ON "patients"("status");

-- CreateIndex
CREATE INDEX "patients_care_type_idx" ON "patients"("care_type");

-- CreateIndex
CREATE INDEX "patients_room_number_idx" ON "patients"("room_number");

-- CreateIndex
CREATE INDEX "patient_updates_patient_id_created_at_idx" ON "patient_updates"("patient_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "patient_updates_employee_id_idx" ON "patient_updates"("employee_id");

-- CreateIndex
CREATE INDEX "patient_updates_is_urgent_idx" ON "patient_updates"("is_urgent");

-- CreateIndex
CREATE INDEX "patient_updates_created_at_idx" ON "patient_updates"("created_at" DESC);

-- CreateIndex
CREATE INDEX "documents_patient_id_is_deleted_idx" ON "documents"("patient_id", "is_deleted");

-- CreateIndex
CREATE INDEX "documents_uploaded_by_id_idx" ON "documents"("uploaded_by_id");

-- CreateIndex
CREATE INDEX "documents_priority_idx" ON "documents"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "document_retention_policies_priority_key" ON "document_retention_policies"("priority");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_performed_at_idx" ON "audit_logs"("performed_at" DESC);

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_updates" ADD CONSTRAINT "patient_updates_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_updates" ADD CONSTRAINT "patient_updates_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

