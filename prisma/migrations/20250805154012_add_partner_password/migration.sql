/*
  Warnings:

  - You are about to drop the column `health_id` on the `HealthIdVerification` table. All the data in the column will be lost.
  - Made the column `dog_id` on table `HealthIdVerification` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "public"."HealthIdVerification" DROP CONSTRAINT "HealthIdVerification_dog_id_fkey";

-- DropIndex
DROP INDEX "public"."HealthIdVerification_health_id_idx";

-- AlterTable
ALTER TABLE "public"."HealthIdVerification" DROP COLUMN "health_id",
ALTER COLUMN "dog_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."Partner" ADD COLUMN     "commission_rate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "kci_registration_id" TEXT,
ADD COLUMN     "kci_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "monthly_revenue" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "partnership_tier" TEXT NOT NULL DEFAULT 'basic',
ADD COLUMN     "password" TEXT,
ADD COLUMN     "rating_average" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "rating_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "subscription_expires" TIMESTAMP(3),
ADD COLUMN     "subscription_status" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN     "total_appointments" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "public"."KCIVerification" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT,
    "dog_id" TEXT,
    "kci_registration_id" TEXT NOT NULL,
    "breed" TEXT NOT NULL,
    "dog_name" TEXT,
    "owner_name" TEXT,
    "registration_date" TIMESTAMP(3),
    "verification_status" TEXT NOT NULL DEFAULT 'pending',
    "verification_data" JSONB,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KCIVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Appointment" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "dog_id" TEXT,
    "appointment_date" TIMESTAMP(3) NOT NULL,
    "duration_minutes" INTEGER NOT NULL DEFAULT 60,
    "service_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "notes" TEXT,
    "consultation_fee" DOUBLE PRECISION,
    "payment_status" TEXT NOT NULL DEFAULT 'pending',
    "meeting_type" TEXT NOT NULL DEFAULT 'in_person',
    "meeting_link" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PartnerReview" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "dog_id" TEXT,
    "appointment_id" TEXT,
    "rating" INTEGER NOT NULL,
    "review_text" TEXT,
    "service_type" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CommissionEarning" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "appointment_id" TEXT,
    "commission_type" TEXT NOT NULL,
    "base_amount" DOUBLE PRECISION NOT NULL,
    "commission_rate" DOUBLE PRECISION NOT NULL,
    "commission_amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionEarning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CorporateEnrollment" (
    "id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "company_email" TEXT NOT NULL,
    "contact_person" TEXT NOT NULL,
    "contact_phone" TEXT NOT NULL,
    "employee_count" INTEGER NOT NULL,
    "enrolled_pets" INTEGER NOT NULL DEFAULT 0,
    "package_type" TEXT NOT NULL,
    "monthly_fee" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "billing_cycle" TEXT NOT NULL DEFAULT 'monthly',
    "next_billing_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorporateEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CorporateEmployee" (
    "id" TEXT NOT NULL,
    "corporate_enrollment_id" TEXT NOT NULL,
    "employee_email" TEXT NOT NULL,
    "employee_name" TEXT NOT NULL,
    "user_id" TEXT,
    "pets_enrolled" INTEGER NOT NULL DEFAULT 0,
    "enrollment_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "CorporateEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KCIVerification_kci_registration_id_key" ON "public"."KCIVerification"("kci_registration_id");

-- CreateIndex
CREATE INDEX "KCIVerification_kci_registration_id_idx" ON "public"."KCIVerification"("kci_registration_id");

-- CreateIndex
CREATE INDEX "KCIVerification_verification_status_idx" ON "public"."KCIVerification"("verification_status");

-- CreateIndex
CREATE INDEX "KCIVerification_breed_idx" ON "public"."KCIVerification"("breed");

-- CreateIndex
CREATE INDEX "Appointment_partner_id_idx" ON "public"."Appointment"("partner_id");

-- CreateIndex
CREATE INDEX "Appointment_user_id_idx" ON "public"."Appointment"("user_id");

-- CreateIndex
CREATE INDEX "Appointment_appointment_date_idx" ON "public"."Appointment"("appointment_date");

-- CreateIndex
CREATE INDEX "Appointment_status_idx" ON "public"."Appointment"("status");

-- CreateIndex
CREATE INDEX "PartnerReview_partner_id_idx" ON "public"."PartnerReview"("partner_id");

-- CreateIndex
CREATE INDEX "PartnerReview_rating_idx" ON "public"."PartnerReview"("rating");

-- CreateIndex
CREATE INDEX "PartnerReview_created_at_idx" ON "public"."PartnerReview"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerReview_user_id_partner_id_appointment_id_key" ON "public"."PartnerReview"("user_id", "partner_id", "appointment_id");

-- CreateIndex
CREATE INDEX "CommissionEarning_partner_id_idx" ON "public"."CommissionEarning"("partner_id");

-- CreateIndex
CREATE INDEX "CommissionEarning_status_idx" ON "public"."CommissionEarning"("status");

-- CreateIndex
CREATE INDEX "CommissionEarning_commission_type_idx" ON "public"."CommissionEarning"("commission_type");

-- CreateIndex
CREATE INDEX "CommissionEarning_created_at_idx" ON "public"."CommissionEarning"("created_at");

-- CreateIndex
CREATE INDEX "CorporateEnrollment_company_email_idx" ON "public"."CorporateEnrollment"("company_email");

-- CreateIndex
CREATE INDEX "CorporateEnrollment_status_idx" ON "public"."CorporateEnrollment"("status");

-- CreateIndex
CREATE INDEX "CorporateEnrollment_package_type_idx" ON "public"."CorporateEnrollment"("package_type");

-- CreateIndex
CREATE INDEX "CorporateEmployee_corporate_enrollment_id_idx" ON "public"."CorporateEmployee"("corporate_enrollment_id");

-- CreateIndex
CREATE INDEX "CorporateEmployee_employee_email_idx" ON "public"."CorporateEmployee"("employee_email");

-- CreateIndex
CREATE INDEX "CorporateEmployee_status_idx" ON "public"."CorporateEmployee"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CorporateEmployee_corporate_enrollment_id_employee_email_key" ON "public"."CorporateEmployee"("corporate_enrollment_id", "employee_email");

-- CreateIndex
CREATE INDEX "HealthIdVerification_dog_id_idx" ON "public"."HealthIdVerification"("dog_id");

-- CreateIndex
CREATE INDEX "Partner_partnership_tier_idx" ON "public"."Partner"("partnership_tier");

-- CreateIndex
CREATE INDEX "Partner_kci_verified_idx" ON "public"."Partner"("kci_verified");

-- CreateIndex
CREATE INDEX "Partner_rating_average_idx" ON "public"."Partner"("rating_average");

-- AddForeignKey
ALTER TABLE "public"."HealthIdVerification" ADD CONSTRAINT "HealthIdVerification_dog_id_fkey" FOREIGN KEY ("dog_id") REFERENCES "public"."Dog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KCIVerification" ADD CONSTRAINT "KCIVerification_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KCIVerification" ADD CONSTRAINT "KCIVerification_dog_id_fkey" FOREIGN KEY ("dog_id") REFERENCES "public"."Dog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Appointment" ADD CONSTRAINT "Appointment_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Appointment" ADD CONSTRAINT "Appointment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Appointment" ADD CONSTRAINT "Appointment_dog_id_fkey" FOREIGN KEY ("dog_id") REFERENCES "public"."Dog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PartnerReview" ADD CONSTRAINT "PartnerReview_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PartnerReview" ADD CONSTRAINT "PartnerReview_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PartnerReview" ADD CONSTRAINT "PartnerReview_dog_id_fkey" FOREIGN KEY ("dog_id") REFERENCES "public"."Dog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PartnerReview" ADD CONSTRAINT "PartnerReview_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CommissionEarning" ADD CONSTRAINT "CommissionEarning_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CommissionEarning" ADD CONSTRAINT "CommissionEarning_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CommissionEarning" ADD CONSTRAINT "CommissionEarning_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CorporateEmployee" ADD CONSTRAINT "CorporateEmployee_corporate_enrollment_id_fkey" FOREIGN KEY ("corporate_enrollment_id") REFERENCES "public"."CorporateEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CorporateEmployee" ADD CONSTRAINT "CorporateEmployee_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
