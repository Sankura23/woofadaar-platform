-- Week 12: Enhanced Partner Dog ID Verification System Migration

-- Create PartnerDogVerification table
CREATE TABLE "PartnerDogVerification" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "dog_id" TEXT NOT NULL,
    "verification_type" TEXT NOT NULL,
    "access_level" TEXT NOT NULL DEFAULT 'read_only',
    "granted_by" TEXT NOT NULL,
    "verification_method" TEXT NOT NULL,
    "location_verified" TEXT,
    "session_id" TEXT,
    "verified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "last_accessed" TIMESTAMP(3),
    "access_count" INTEGER NOT NULL DEFAULT 0,
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "verification_notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "revoked_at" TIMESTAMP(3),
    "revoked_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerDogVerification_pkey" PRIMARY KEY ("id")
);

-- Create VetAppointmentEnhanced table
CREATE TABLE "VetAppointmentEnhanced" (
    "id" TEXT NOT NULL,
    "dog_id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "appointment_date" TIMESTAMP(3) NOT NULL,
    "appointment_type" TEXT NOT NULL DEFAULT 'consultation',
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "duration_minutes" INTEGER NOT NULL DEFAULT 60,
    "consultation_fee" DOUBLE PRECISION,
    "payment_status" TEXT NOT NULL DEFAULT 'pending',
    "meeting_type" TEXT NOT NULL DEFAULT 'in_person',
    "meeting_link" TEXT,
    "dog_id_verified" BOOLEAN NOT NULL DEFAULT false,
    "dog_id_access_granted" TIMESTAMP(3),
    "medical_history_loaded" BOOLEAN NOT NULL DEFAULT false,
    "reason_for_visit" TEXT NOT NULL,
    "symptoms" JSONB NOT NULL DEFAULT '[]',
    "urgency_level" TEXT NOT NULL DEFAULT 'normal',
    "diagnosis" TEXT,
    "treatment_plan" TEXT,
    "medications_prescribed" JSONB NOT NULL DEFAULT '[]',
    "follow_up_required" BOOLEAN NOT NULL DEFAULT false,
    "follow_up_date" TIMESTAMP(3),
    "medical_notes" TEXT,
    "documents_shared" JSONB NOT NULL DEFAULT '[]',
    "photos_shared" JSONB NOT NULL DEFAULT '[]',
    "reminder_sent" BOOLEAN NOT NULL DEFAULT false,
    "confirmation_sent" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VetAppointmentEnhanced_pkey" PRIMARY KEY ("id")
);

-- Create MedicalRecordEnhanced table
CREATE TABLE "MedicalRecordEnhanced" (
    "id" TEXT NOT NULL,
    "dog_id" TEXT NOT NULL,
    "partner_id" TEXT,
    "user_id" TEXT NOT NULL,
    "record_type" TEXT NOT NULL,
    "record_data" JSONB NOT NULL,
    "is_emergency_accessible" BOOLEAN NOT NULL DEFAULT false,
    "emergency_priority" INTEGER NOT NULL DEFAULT 0,
    "shared_with_partners" JSONB NOT NULL DEFAULT '[]',
    "sharing_permissions" JSONB NOT NULL DEFAULT '{}',
    "consent_obtained" BOOLEAN NOT NULL DEFAULT false,
    "created_by_partner" BOOLEAN NOT NULL DEFAULT false,
    "last_accessed_by" TEXT,
    "access_count" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "tags" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicalRecordEnhanced_pkey" PRIMARY KEY ("id")
);

-- Create EmergencyContact table
CREATE TABLE "EmergencyContact" (
    "id" TEXT NOT NULL,
    "dog_id" TEXT NOT NULL,
    "contact_name" TEXT NOT NULL,
    "contact_phone" TEXT NOT NULL,
    "contact_email" TEXT,
    "relationship" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_emergency_vet" BOOLEAN NOT NULL DEFAULT false,
    "available_24_7" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "priority_order" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmergencyContact_pkey" PRIMARY KEY ("id")
);

-- Create PartnerAnalytics table
CREATE TABLE "PartnerAnalytics" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "metric_type" TEXT NOT NULL,
    "metric_value" INTEGER NOT NULL,
    "metric_data" JSONB NOT NULL DEFAULT '{}',
    "date" DATE NOT NULL,
    "hour" INTEGER,
    "total_dog_ids_verified" INTEGER NOT NULL DEFAULT 0,
    "total_appointments" INTEGER NOT NULL DEFAULT 0,
    "total_revenue" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "avg_response_time" INTEGER,
    "customer_satisfaction" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerAnalytics_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "PartnerDogVerification" ADD CONSTRAINT "PartnerDogVerification_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PartnerDogVerification" ADD CONSTRAINT "PartnerDogVerification_dog_id_fkey" FOREIGN KEY ("dog_id") REFERENCES "Dog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PartnerDogVerification" ADD CONSTRAINT "PartnerDogVerification_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VetAppointmentEnhanced" ADD CONSTRAINT "VetAppointmentEnhanced_dog_id_fkey" FOREIGN KEY ("dog_id") REFERENCES "Dog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VetAppointmentEnhanced" ADD CONSTRAINT "VetAppointmentEnhanced_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VetAppointmentEnhanced" ADD CONSTRAINT "VetAppointmentEnhanced_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MedicalRecordEnhanced" ADD CONSTRAINT "MedicalRecordEnhanced_dog_id_fkey" FOREIGN KEY ("dog_id") REFERENCES "Dog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MedicalRecordEnhanced" ADD CONSTRAINT "MedicalRecordEnhanced_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MedicalRecordEnhanced" ADD CONSTRAINT "MedicalRecordEnhanced_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmergencyContact" ADD CONSTRAINT "EmergencyContact_dog_id_fkey" FOREIGN KEY ("dog_id") REFERENCES "Dog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PartnerAnalytics" ADD CONSTRAINT "PartnerAnalytics_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create indexes for PartnerDogVerification
CREATE INDEX "PartnerDogVerification_partner_id_is_active_idx" ON "PartnerDogVerification"("partner_id", "is_active");
CREATE INDEX "PartnerDogVerification_dog_id_verified_at_idx" ON "PartnerDogVerification"("dog_id", "verified_at");
CREATE INDEX "PartnerDogVerification_verification_type_idx" ON "PartnerDogVerification"("verification_type");
CREATE INDEX "PartnerDogVerification_expires_at_idx" ON "PartnerDogVerification"("expires_at");

-- Create indexes for VetAppointmentEnhanced
CREATE INDEX "VetAppointmentEnhanced_dog_id_appointment_date_idx" ON "VetAppointmentEnhanced"("dog_id", "appointment_date");
CREATE INDEX "VetAppointmentEnhanced_partner_id_status_idx" ON "VetAppointmentEnhanced"("partner_id", "status");
CREATE INDEX "VetAppointmentEnhanced_user_id_appointment_date_idx" ON "VetAppointmentEnhanced"("user_id", "appointment_date");
CREATE INDEX "VetAppointmentEnhanced_status_appointment_date_idx" ON "VetAppointmentEnhanced"("status", "appointment_date");
CREATE INDEX "VetAppointmentEnhanced_urgency_level_idx" ON "VetAppointmentEnhanced"("urgency_level");

-- Create indexes for MedicalRecordEnhanced
CREATE INDEX "MedicalRecordEnhanced_dog_id_record_type_idx" ON "MedicalRecordEnhanced"("dog_id", "record_type");
CREATE INDEX "MedicalRecordEnhanced_partner_id_created_at_idx" ON "MedicalRecordEnhanced"("partner_id", "created_at");
CREATE INDEX "MedicalRecordEnhanced_is_emergency_accessible_idx" ON "MedicalRecordEnhanced"("is_emergency_accessible");
CREATE INDEX "MedicalRecordEnhanced_created_at_idx" ON "MedicalRecordEnhanced"("created_at");

-- Create indexes for EmergencyContact
CREATE INDEX "EmergencyContact_dog_id_is_primary_idx" ON "EmergencyContact"("dog_id", "is_primary");
CREATE INDEX "EmergencyContact_dog_id_priority_order_idx" ON "EmergencyContact"("dog_id", "priority_order");
CREATE INDEX "EmergencyContact_is_emergency_vet_idx" ON "EmergencyContact"("is_emergency_vet");

-- Create indexes for PartnerAnalytics
CREATE INDEX "PartnerAnalytics_partner_id_date_idx" ON "PartnerAnalytics"("partner_id", "date");
CREATE INDEX "PartnerAnalytics_metric_type_date_idx" ON "PartnerAnalytics"("metric_type", "date");
CREATE INDEX "PartnerAnalytics_date_idx" ON "PartnerAnalytics"("date");