/*
  Warnings:

  - You are about to drop the column `exercise_minutes` on the `HealthLog` table. All the data in the column will be lost.
  - You are about to drop the column `mood` on the `HealthLog` table. All the data in the column will be lost.
  - The `food_amount` column on the `HealthLog` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `water_intake` column on the `HealthLog` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "public"."HealthLog" DROP COLUMN "exercise_minutes",
DROP COLUMN "mood",
ADD COLUMN     "exercise_duration" INTEGER,
ADD COLUMN     "exercise_type" TEXT,
ADD COLUMN     "food_type" TEXT,
ADD COLUMN     "mood_score" INTEGER,
ADD COLUMN     "photos" JSONB,
ADD COLUMN     "symptoms" TEXT[],
ADD COLUMN     "temperature_celsius" DOUBLE PRECISION,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "voice_notes" JSONB,
ADD COLUMN     "weight_kg" DOUBLE PRECISION,
DROP COLUMN "food_amount",
ADD COLUMN     "food_amount" DOUBLE PRECISION,
DROP COLUMN "water_intake",
ADD COLUMN     "water_intake" INTEGER;

-- CreateTable
CREATE TABLE "public"."MedicalRecord" (
    "id" TEXT NOT NULL,
    "dog_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "record_type" TEXT NOT NULL,
    "record_date" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "vet_name" TEXT,
    "vet_clinic" TEXT,
    "vet_contact" TEXT,
    "medications" JSONB,
    "next_due_date" TIMESTAMP(3),
    "documents" JSONB,
    "photos" JSONB,
    "cost" DOUBLE PRECISION,
    "diagnosis" TEXT,
    "treatment_plan" TEXT,
    "follow_up_required" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HealthReminder" (
    "id" TEXT NOT NULL,
    "dog_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "reminder_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "medication_name" TEXT,
    "dosage" TEXT,
    "frequency" TEXT NOT NULL,
    "reminder_time" TEXT,
    "days_of_week" TEXT[],
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "next_reminder" TIMESTAMP(3) NOT NULL,
    "last_reminded" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "auto_complete" BOOLEAN NOT NULL DEFAULT false,
    "reminder_count" INTEGER NOT NULL DEFAULT 0,
    "max_reminders" INTEGER,
    "snooze_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HealthMetric" (
    "id" TEXT NOT NULL,
    "dog_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "metric_type" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "measurement_date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "measured_by" TEXT,
    "device_used" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HealthInsight" (
    "id" TEXT NOT NULL,
    "dog_id" TEXT NOT NULL,
    "insight_type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "data_points" JSONB,
    "recommendations" TEXT[],
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "is_dismissed" BOOLEAN NOT NULL DEFAULT false,
    "confidence_score" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "HealthInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HealthPhoto" (
    "id" TEXT NOT NULL,
    "dog_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "photo_url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "photo_type" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "tags" TEXT[],
    "health_log_id" TEXT,
    "medical_record_id" TEXT,
    "taken_at" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'private',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HealthExport" (
    "id" TEXT NOT NULL,
    "dog_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "export_type" TEXT NOT NULL,
    "date_range_start" TIMESTAMP(3) NOT NULL,
    "date_range_end" TIMESTAMP(3) NOT NULL,
    "data_types" TEXT[],
    "file_url" TEXT,
    "file_size" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "download_count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthExport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MedicalRecord_dog_id_idx" ON "public"."MedicalRecord"("dog_id");

-- CreateIndex
CREATE INDEX "MedicalRecord_record_type_idx" ON "public"."MedicalRecord"("record_type");

-- CreateIndex
CREATE INDEX "MedicalRecord_record_date_idx" ON "public"."MedicalRecord"("record_date");

-- CreateIndex
CREATE INDEX "MedicalRecord_next_due_date_idx" ON "public"."MedicalRecord"("next_due_date");

-- CreateIndex
CREATE INDEX "HealthReminder_dog_id_idx" ON "public"."HealthReminder"("dog_id");

-- CreateIndex
CREATE INDEX "HealthReminder_user_id_idx" ON "public"."HealthReminder"("user_id");

-- CreateIndex
CREATE INDEX "HealthReminder_reminder_type_idx" ON "public"."HealthReminder"("reminder_type");

-- CreateIndex
CREATE INDEX "HealthReminder_next_reminder_idx" ON "public"."HealthReminder"("next_reminder");

-- CreateIndex
CREATE INDEX "HealthReminder_is_active_idx" ON "public"."HealthReminder"("is_active");

-- CreateIndex
CREATE INDEX "HealthMetric_dog_id_idx" ON "public"."HealthMetric"("dog_id");

-- CreateIndex
CREATE INDEX "HealthMetric_metric_type_idx" ON "public"."HealthMetric"("metric_type");

-- CreateIndex
CREATE INDEX "HealthMetric_measurement_date_idx" ON "public"."HealthMetric"("measurement_date");

-- CreateIndex
CREATE INDEX "HealthInsight_dog_id_idx" ON "public"."HealthInsight"("dog_id");

-- CreateIndex
CREATE INDEX "HealthInsight_insight_type_idx" ON "public"."HealthInsight"("insight_type");

-- CreateIndex
CREATE INDEX "HealthInsight_category_idx" ON "public"."HealthInsight"("category");

-- CreateIndex
CREATE INDEX "HealthInsight_is_read_idx" ON "public"."HealthInsight"("is_read");

-- CreateIndex
CREATE INDEX "HealthInsight_created_at_idx" ON "public"."HealthInsight"("created_at");

-- CreateIndex
CREATE INDEX "HealthPhoto_dog_id_idx" ON "public"."HealthPhoto"("dog_id");

-- CreateIndex
CREATE INDEX "HealthPhoto_photo_type_idx" ON "public"."HealthPhoto"("photo_type");

-- CreateIndex
CREATE INDEX "HealthPhoto_taken_at_idx" ON "public"."HealthPhoto"("taken_at");

-- CreateIndex
CREATE INDEX "HealthPhoto_health_log_id_idx" ON "public"."HealthPhoto"("health_log_id");

-- CreateIndex
CREATE INDEX "HealthPhoto_medical_record_id_idx" ON "public"."HealthPhoto"("medical_record_id");

-- CreateIndex
CREATE INDEX "HealthExport_dog_id_idx" ON "public"."HealthExport"("dog_id");

-- CreateIndex
CREATE INDEX "HealthExport_user_id_idx" ON "public"."HealthExport"("user_id");

-- CreateIndex
CREATE INDEX "HealthExport_export_type_idx" ON "public"."HealthExport"("export_type");

-- CreateIndex
CREATE INDEX "HealthExport_status_idx" ON "public"."HealthExport"("status");

-- CreateIndex
CREATE INDEX "HealthExport_expires_at_idx" ON "public"."HealthExport"("expires_at");

-- CreateIndex
CREATE INDEX "HealthLog_dog_id_idx" ON "public"."HealthLog"("dog_id");

-- CreateIndex
CREATE INDEX "HealthLog_log_date_idx" ON "public"."HealthLog"("log_date");

-- CreateIndex
CREATE INDEX "HealthLog_user_id_idx" ON "public"."HealthLog"("user_id");

-- AddForeignKey
ALTER TABLE "public"."MedicalRecord" ADD CONSTRAINT "MedicalRecord_dog_id_fkey" FOREIGN KEY ("dog_id") REFERENCES "public"."Dog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MedicalRecord" ADD CONSTRAINT "MedicalRecord_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HealthReminder" ADD CONSTRAINT "HealthReminder_dog_id_fkey" FOREIGN KEY ("dog_id") REFERENCES "public"."Dog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HealthReminder" ADD CONSTRAINT "HealthReminder_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HealthMetric" ADD CONSTRAINT "HealthMetric_dog_id_fkey" FOREIGN KEY ("dog_id") REFERENCES "public"."Dog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HealthMetric" ADD CONSTRAINT "HealthMetric_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HealthInsight" ADD CONSTRAINT "HealthInsight_dog_id_fkey" FOREIGN KEY ("dog_id") REFERENCES "public"."Dog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HealthPhoto" ADD CONSTRAINT "HealthPhoto_dog_id_fkey" FOREIGN KEY ("dog_id") REFERENCES "public"."Dog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HealthPhoto" ADD CONSTRAINT "HealthPhoto_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HealthExport" ADD CONSTRAINT "HealthExport_dog_id_fkey" FOREIGN KEY ("dog_id") REFERENCES "public"."Dog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HealthExport" ADD CONSTRAINT "HealthExport_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
