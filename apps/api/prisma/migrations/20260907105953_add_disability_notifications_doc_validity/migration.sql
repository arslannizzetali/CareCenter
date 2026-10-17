-- CreateEnum
CREATE TYPE "DisabilityType" AS ENUM ('PHYSICAL', 'MENTAL', 'BOTH');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('DOCUMENT_EXPIRING');

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "expires_at" TIMESTAMP(3),
ADD COLUMN     "validity_months" INTEGER;

-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "disability_type" "DisabilityType";

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT NOT NULL,
    "patient_id" TEXT,
    "document_id" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_is_read_created_at_idx" ON "notifications"("is_read", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_patient_id_idx" ON "notifications"("patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_type_document_id_key" ON "notifications"("type", "document_id");

-- CreateIndex
CREATE INDEX "documents_expires_at_idx" ON "documents"("expires_at");

-- CreateIndex
CREATE INDEX "patients_disability_type_idx" ON "patients"("disability_type");

-- CreateIndex
CREATE INDEX "patients_birth_date_idx" ON "patients"("birth_date");
