-- Week 11 Part 3: Medical Record Sharing Network Migration
-- Creates HIPAA-compliant data sharing system for veterinarians

-- Medical record sharing permissions and access control
CREATE TABLE "MedicalRecordShare" (
    "id" TEXT NOT NULL,
    "dog_id" TEXT NOT NULL,
    "shared_by_user_id" TEXT NOT NULL,
    "shared_with_partner_id" TEXT,
    "shared_with_email" TEXT,
    "share_type" TEXT NOT NULL, -- 'specific_records', 'full_access', 'emergency_only', 'time_limited'
    "access_level" TEXT NOT NULL DEFAULT 'read_only', -- 'read_only', 'read_write', 'full_access'
    "record_ids" JSONB DEFAULT '[]', -- Specific medical record IDs if share_type is 'specific_records'
    "permissions" JSONB NOT NULL DEFAULT '{}', -- Detailed permissions object
    "share_token" TEXT UNIQUE,
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "consent_given" BOOLEAN NOT NULL DEFAULT false,
    "consent_timestamp" TIMESTAMP(3),
    "consent_ip_address" TEXT,
    "revoked_at" TIMESTAMP(3),
    "revoked_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalRecordShare_pkey" PRIMARY KEY ("id")
);

-- Medical record access audit trail for HIPAA compliance
CREATE TABLE "MedicalRecordAccess" (
    "id" TEXT NOT NULL,
    "share_id" TEXT NOT NULL,
    "dog_id" TEXT NOT NULL,
    "accessor_partner_id" TEXT,
    "accessor_email" TEXT,
    "access_type" TEXT NOT NULL, -- 'view', 'download', 'share', 'update', 'delete'
    "record_id" TEXT,
    "record_type" TEXT,
    "data_accessed" JSONB DEFAULT '{}',
    "access_reason" TEXT,
    "consent_verified" BOOLEAN NOT NULL DEFAULT false,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "session_id" TEXT,
    "compliance_flags" JSONB DEFAULT '{}',
    "access_duration_seconds" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicalRecordAccess_pkey" PRIMARY KEY ("id")
);

-- Secure data sharing with encryption
CREATE TABLE "SecureDataVault" (
    "id" TEXT NOT NULL,
    "dog_id" TEXT NOT NULL,
    "data_type" TEXT NOT NULL, -- 'medical_record', 'lab_result', 'image', 'document'
    "original_filename" TEXT,
    "file_type" TEXT,
    "file_size_bytes" INTEGER,
    "encryption_key_id" TEXT NOT NULL,
    "encrypted_data" BYTEA, -- Encrypted file content
    "encrypted_metadata" JSONB, -- Encrypted additional metadata
    "checksum" TEXT NOT NULL,
    "access_count" INTEGER DEFAULT 0,
    "last_accessed" TIMESTAMP(3),
    "retention_policy" TEXT DEFAULT 'indefinite', -- 'indefinite', '1_year', '5_years', '10_years'
    "compliance_level" TEXT DEFAULT 'hipaa', -- 'hipaa', 'gdpr', 'standard'
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecureDataVault_pkey" PRIMARY KEY ("id")
);

-- Partner network for medical record sharing
CREATE TABLE "PartnerNetworkConnection" (
    "id" TEXT NOT NULL,
    "requesting_partner_id" TEXT NOT NULL,
    "target_partner_id" TEXT NOT NULL,
    "connection_type" TEXT NOT NULL, -- 'referral', 'collaboration', 'consultation', 'emergency'
    "status" TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'blocked'
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "trust_level" INTEGER DEFAULT 50, -- 0-100 trust score
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "last_interaction" TIMESTAMP(3),
    "interaction_count" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerNetworkConnection_pkey" PRIMARY KEY ("id")
);

-- Data sharing analytics and insights
CREATE TABLE "SharingAnalytics" (
    "id" TEXT NOT NULL,
    "dog_id" TEXT,
    "partner_id" TEXT,
    "share_id" TEXT,
    "metric_type" TEXT NOT NULL, -- 'share_created', 'access_granted', 'data_viewed', 'consent_given'
    "metric_value" INTEGER DEFAULT 1,
    "metadata" JSONB DEFAULT '{}',
    "date" DATE NOT NULL,
    "hour" INTEGER, -- 0-23 for hourly analytics
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SharingAnalytics_pkey" PRIMARY KEY ("id")
);

-- HIPAA compliance tracking
CREATE TABLE "ComplianceAudit" (
    "id" TEXT NOT NULL,
    "audit_type" TEXT NOT NULL, -- 'data_access', 'consent_verification', 'encryption_check', 'retention_policy'
    "entity_type" TEXT NOT NULL, -- 'user', 'partner', 'dog', 'share'
    "entity_id" TEXT NOT NULL,
    "compliance_status" TEXT NOT NULL, -- 'compliant', 'warning', 'violation', 'remediated'
    "audit_details" JSONB NOT NULL DEFAULT '{}',
    "risk_score" INTEGER DEFAULT 0, -- 0-100 risk assessment
    "remediation_required" BOOLEAN DEFAULT false,
    "remediation_deadline" TIMESTAMP(3),
    "remediated_at" TIMESTAMP(3),
    "auditor_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceAudit_pkey" PRIMARY KEY ("id")
);

-- Consent management for HIPAA compliance
CREATE TABLE "DataSharingConsent" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "dog_id" TEXT NOT NULL,
    "consent_type" TEXT NOT NULL, -- 'general_sharing', 'emergency_access', 'research_participation', 'marketing'
    "consent_status" TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'granted', 'denied', 'revoked'
    "consent_text" TEXT NOT NULL,
    "consent_version" TEXT NOT NULL,
    "granted_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "ip_address" TEXT,
    "user_agent" TEXT,
    "digital_signature" TEXT,
    "witness_partner_id" TEXT,
    "expiry_date" TIMESTAMP(3),
    "auto_renewal" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataSharingConsent_pkey" PRIMARY KEY ("id")
);

-- Create indexes for performance and compliance
CREATE INDEX "MedicalRecordShare_dog_id_active_idx" ON "MedicalRecordShare"("dog_id", "is_active");
CREATE INDEX "MedicalRecordShare_partner_id_idx" ON "MedicalRecordShare"("shared_with_partner_id");
CREATE INDEX "MedicalRecordShare_token_idx" ON "MedicalRecordShare"("share_token");
CREATE INDEX "MedicalRecordShare_expires_at_idx" ON "MedicalRecordShare"("expires_at");

CREATE INDEX "MedicalRecordAccess_share_id_created_at_idx" ON "MedicalRecordAccess"("share_id", "created_at");
CREATE INDEX "MedicalRecordAccess_dog_id_created_at_idx" ON "MedicalRecordAccess"("dog_id", "created_at");
CREATE INDEX "MedicalRecordAccess_partner_id_idx" ON "MedicalRecordAccess"("accessor_partner_id");
CREATE INDEX "MedicalRecordAccess_access_type_idx" ON "MedicalRecordAccess"("access_type");

CREATE INDEX "SecureDataVault_dog_id_data_type_idx" ON "SecureDataVault"("dog_id", "data_type");
CREATE INDEX "SecureDataVault_encryption_key_id_idx" ON "SecureDataVault"("encryption_key_id");
CREATE INDEX "SecureDataVault_created_at_idx" ON "SecureDataVault"("created_at");

CREATE INDEX "PartnerNetworkConnection_requesting_partner_idx" ON "PartnerNetworkConnection"("requesting_partner_id");
CREATE INDEX "PartnerNetworkConnection_target_partner_idx" ON "PartnerNetworkConnection"("target_partner_id");
CREATE INDEX "PartnerNetworkConnection_status_idx" ON "PartnerNetworkConnection"("status");

CREATE INDEX "SharingAnalytics_date_metric_type_idx" ON "SharingAnalytics"("date", "metric_type");
CREATE INDEX "SharingAnalytics_dog_id_date_idx" ON "SharingAnalytics"("dog_id", "date");
CREATE INDEX "SharingAnalytics_partner_id_date_idx" ON "SharingAnalytics"("partner_id", "date");

CREATE INDEX "ComplianceAudit_entity_type_entity_id_idx" ON "ComplianceAudit"("entity_type", "entity_id");
CREATE INDEX "ComplianceAudit_compliance_status_idx" ON "ComplianceAudit"("compliance_status");
CREATE INDEX "ComplianceAudit_risk_score_idx" ON "ComplianceAudit"("risk_score");
CREATE INDEX "ComplianceAudit_created_at_idx" ON "ComplianceAudit"("created_at");

CREATE INDEX "DataSharingConsent_user_id_dog_id_idx" ON "DataSharingConsent"("user_id", "dog_id");
CREATE INDEX "DataSharingConsent_consent_type_status_idx" ON "DataSharingConsent"("consent_type", "consent_status");
CREATE INDEX "DataSharingConsent_expiry_date_idx" ON "DataSharingConsent"("expiry_date");

-- Add foreign key constraints
ALTER TABLE "MedicalRecordShare" ADD CONSTRAINT "MedicalRecordShare_dog_id_fkey" FOREIGN KEY ("dog_id") REFERENCES "Dog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MedicalRecordShare" ADD CONSTRAINT "MedicalRecordShare_shared_by_user_id_fkey" FOREIGN KEY ("shared_by_user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MedicalRecordShare" ADD CONSTRAINT "MedicalRecordShare_shared_with_partner_id_fkey" FOREIGN KEY ("shared_with_partner_id") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MedicalRecordAccess" ADD CONSTRAINT "MedicalRecordAccess_share_id_fkey" FOREIGN KEY ("share_id") REFERENCES "MedicalRecordShare"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MedicalRecordAccess" ADD CONSTRAINT "MedicalRecordAccess_dog_id_fkey" FOREIGN KEY ("dog_id") REFERENCES "Dog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MedicalRecordAccess" ADD CONSTRAINT "MedicalRecordAccess_accessor_partner_id_fkey" FOREIGN KEY ("accessor_partner_id") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SecureDataVault" ADD CONSTRAINT "SecureDataVault_dog_id_fkey" FOREIGN KEY ("dog_id") REFERENCES "Dog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PartnerNetworkConnection" ADD CONSTRAINT "PartnerNetworkConnection_requesting_partner_id_fkey" FOREIGN KEY ("requesting_partner_id") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PartnerNetworkConnection" ADD CONSTRAINT "PartnerNetworkConnection_target_partner_id_fkey" FOREIGN KEY ("target_partner_id") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PartnerNetworkConnection" ADD CONSTRAINT "PartnerNetworkConnection_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DataSharingConsent" ADD CONSTRAINT "DataSharingConsent_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DataSharingConsent" ADD CONSTRAINT "DataSharingConsent_dog_id_fkey" FOREIGN KEY ("dog_id") REFERENCES "Dog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DataSharingConsent" ADD CONSTRAINT "DataSharingConsent_witness_partner_id_fkey" FOREIGN KEY ("witness_partner_id") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add unique constraints
ALTER TABLE "PartnerNetworkConnection" ADD CONSTRAINT "PartnerNetworkConnection_partners_unique" UNIQUE ("requesting_partner_id", "target_partner_id");

-- Create view for active medical shares (for performance)
CREATE VIEW "ActiveMedicalShares" AS
SELECT 
    mrs.*,
    d.name as dog_name,
    d.breed as dog_breed,
    u.name as owner_name,
    u.email as owner_email,
    p.name as partner_name,
    p.partner_type
FROM "MedicalRecordShare" mrs
LEFT JOIN "Dog" d ON mrs.dog_id = d.id
LEFT JOIN "User" u ON mrs.shared_by_user_id = u.id
LEFT JOIN "Partner" p ON mrs.shared_with_partner_id = p.id
WHERE mrs.is_active = true 
AND (mrs.expires_at IS NULL OR mrs.expires_at > NOW());