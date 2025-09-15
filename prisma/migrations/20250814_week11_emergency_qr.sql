-- Week 11 Part 2: Emergency QR Access System Migration
-- Creates offline emergency information and GPS vet finder

-- Emergency QR codes for offline access
CREATE TABLE "EmergencyQRCode" (
    "id" TEXT NOT NULL,
    "dog_id" TEXT NOT NULL,
    "qr_code" TEXT NOT NULL,
    "emergency_data" JSONB NOT NULL,
    "access_count" INTEGER NOT NULL DEFAULT 0,
    "last_accessed" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmergencyQRCode_pkey" PRIMARY KEY ("id")
);

-- Emergency vet locations and GPS data
CREATE TABLE "EmergencyVetLocation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "emergency_phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "is_24_hours" BOOLEAN NOT NULL DEFAULT false,
    "services" JSONB NOT NULL DEFAULT '[]',
    "rating" DECIMAL(3,2),
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "emergency_capacity" INTEGER DEFAULT 0,
    "current_wait_time" INTEGER DEFAULT 0,
    "accepts_emergency" BOOLEAN NOT NULL DEFAULT true,
    "partner_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmergencyVetLocation_pkey" PRIMARY KEY ("id")
);

-- Emergency access logs for tracking and security
CREATE TABLE "EmergencyAccessLog" (
    "id" TEXT NOT NULL,
    "qr_code_id" TEXT NOT NULL,
    "dog_id" TEXT NOT NULL,
    "access_type" TEXT NOT NULL, -- 'qr_scan', 'emergency_search', 'vet_lookup'
    "accessor_info" JSONB NOT NULL DEFAULT '{}',
    "location_data" JSONB,
    "emergency_level" TEXT NOT NULL DEFAULT 'normal', -- 'normal', 'urgent', 'critical'
    "vet_contacted" TEXT,
    "resolution_status" TEXT DEFAULT 'pending', -- 'pending', 'resolved', 'escalated'
    "access_timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    "user_agent" TEXT,

    CONSTRAINT "EmergencyAccessLog_pkey" PRIMARY KEY ("id")
);

-- Emergency vet availability schedule
CREATE TABLE "VetEmergencySchedule" (
    "id" TEXT NOT NULL,
    "vet_location_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL, -- 0-6 (Sunday-Saturday)
    "open_time" TIME,
    "close_time" TIME,
    "is_24_hours" BOOLEAN NOT NULL DEFAULT false,
    "emergency_only" BOOLEAN NOT NULL DEFAULT false,
    "max_capacity" INTEGER DEFAULT 10,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VetEmergencySchedule_pkey" PRIMARY KEY ("id")
);

-- Real-time emergency status updates
CREATE TABLE "EmergencyAlert" (
    "id" TEXT NOT NULL,
    "dog_id" TEXT NOT NULL,
    "qr_code_id" TEXT,
    "alert_type" TEXT NOT NULL, -- 'lost', 'injured', 'medical_emergency', 'found'
    "severity" TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    "location_latitude" DECIMAL(10,7),
    "location_longitude" DECIMAL(10,7),
    "location_description" TEXT,
    "description" TEXT NOT NULL,
    "contact_info" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'active', -- 'active', 'resolved', 'cancelled'
    "assigned_vet_id" TEXT,
    "resolution_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "EmergencyAlert_pkey" PRIMARY KEY ("id")
);

-- Create unique indexes
CREATE UNIQUE INDEX "EmergencyQRCode_qr_code_key" ON "EmergencyQRCode"("qr_code");
CREATE UNIQUE INDEX "EmergencyQRCode_dog_id_key" ON "EmergencyQRCode"("dog_id");
CREATE INDEX "EmergencyQRCode_is_active_expires_at_idx" ON "EmergencyQRCode"("is_active", "expires_at");

CREATE INDEX "EmergencyVetLocation_city_state_idx" ON "EmergencyVetLocation"("city", "state");
CREATE INDEX "EmergencyVetLocation_latitude_longitude_idx" ON "EmergencyVetLocation"("latitude", "longitude");
CREATE INDEX "EmergencyVetLocation_is_24_hours_accepts_emergency_idx" ON "EmergencyVetLocation"("is_24_hours", "accepts_emergency");

CREATE INDEX "EmergencyAccessLog_qr_code_id_idx" ON "EmergencyAccessLog"("qr_code_id");
CREATE INDEX "EmergencyAccessLog_dog_id_access_timestamp_idx" ON "EmergencyAccessLog"("dog_id", "access_timestamp");
CREATE INDEX "EmergencyAccessLog_emergency_level_idx" ON "EmergencyAccessLog"("emergency_level");

CREATE INDEX "VetEmergencySchedule_vet_location_id_day_of_week_idx" ON "VetEmergencySchedule"("vet_location_id", "day_of_week");

CREATE INDEX "EmergencyAlert_dog_id_status_idx" ON "EmergencyAlert"("dog_id", "status");
CREATE INDEX "EmergencyAlert_alert_type_severity_idx" ON "EmergencyAlert"("alert_type", "severity");
CREATE INDEX "EmergencyAlert_location_latitude_longitude_idx" ON "EmergencyAlert"("location_latitude", "location_longitude");

-- Add foreign key constraints
ALTER TABLE "EmergencyQRCode" ADD CONSTRAINT "EmergencyQRCode_dog_id_fkey" FOREIGN KEY ("dog_id") REFERENCES "Dog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmergencyVetLocation" ADD CONSTRAINT "EmergencyVetLocation_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EmergencyAccessLog" ADD CONSTRAINT "EmergencyAccessLog_qr_code_id_fkey" FOREIGN KEY ("qr_code_id") REFERENCES "EmergencyQRCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmergencyAccessLog" ADD CONSTRAINT "EmergencyAccessLog_dog_id_fkey" FOREIGN KEY ("dog_id") REFERENCES "Dog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VetEmergencySchedule" ADD CONSTRAINT "VetEmergencySchedule_vet_location_id_fkey" FOREIGN KEY ("vet_location_id") REFERENCES "EmergencyVetLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmergencyAlert" ADD CONSTRAINT "EmergencyAlert_dog_id_fkey" FOREIGN KEY ("dog_id") REFERENCES "Dog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmergencyAlert" ADD CONSTRAINT "EmergencyAlert_qr_code_id_fkey" FOREIGN KEY ("qr_code_id") REFERENCES "EmergencyQRCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmergencyAlert" ADD CONSTRAINT "EmergencyAlert_assigned_vet_id_fkey" FOREIGN KEY ("assigned_vet_id") REFERENCES "EmergencyVetLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Insert sample emergency vet locations (Mumbai, Delhi, Bangalore)
INSERT INTO "EmergencyVetLocation" ("id", "name", "address", "city", "state", "pincode", "phone", "emergency_phone", "email", "latitude", "longitude", "is_24_hours", "services", "verified", "accepts_emergency") VALUES
('vet_mumbai_1', 'Bai Sakarbai Dinshaw Petit Hospital for Animals', 'Parel, Mumbai', 'Mumbai', 'Maharashtra', '400012', '+91-22-2414-5444', '+91-22-2414-5445', 'emergency@bsdpanimal.org', 19.0176, 72.8562, true, '["emergency", "surgery", "trauma", "critical_care", "radiology"]', true, true),
('vet_mumbai_2', 'Thane SPCA Animal Hospital', 'Thane West, Mumbai', 'Mumbai', 'Maharashtra', '400604', '+91-22-2534-7928', '+91-22-2534-7929', 'emergency@thanespca.org', 19.2183, 72.9781, true, '["emergency", "surgery", "vaccination", "general_care"]', true, true),
('vet_delhi_1', 'Friendicoes SECA Emergency Clinic', 'Jangpura Extension, Delhi', 'New Delhi', 'Delhi', '110014', '+91-11-2431-1299', '+91-11-2431-1300', 'emergency@friendicoes.org', 28.5738, 77.2431, true, '["emergency", "surgery", "trauma", "ambulance", "critical_care"]', true, true),
('vet_delhi_2', 'All Creatures Great and Small', 'Greater Kailash, Delhi', 'New Delhi', 'Delhi', '110048', '+91-11-2924-4100', '+91-11-2924-4101', 'emergency@acgas.in', 28.5494, 77.2479, false, '["emergency", "surgery", "diagnostic", "pharmacy"]', true, true),
('vet_bangalore_1', 'CUPA Emergency Veterinary Clinic', 'Hebbal, Bangalore', 'Bangalore', 'Karnataka', '560024', '+91-80-2284-9999', '+91-80-2284-9998', 'emergency@cupabangalore.org', 13.0357, 77.5946, true, '["emergency", "surgery", "trauma", "ambulance", "icu"]', true, true),
('vet_bangalore_2', 'Cessna Lifeline Veterinary Hospital', 'JP Nagar, Bangalore', 'Bangalore', 'Karnataka', '560078', '+91-80-2649-7070', '+91-80-2649-7071', 'emergency@cessnalifeline.com', 12.9116, 77.5946, true, '["emergency", "surgery", "specialist_care", "diagnostic"]', true, true);

-- Insert sample vet schedules
INSERT INTO "VetEmergencySchedule" ("id", "vet_location_id", "day_of_week", "open_time", "close_time", "is_24_hours", "emergency_only", "max_capacity") VALUES
-- Mumbai BSDP (24/7)
('sched_mumbai_1_0', 'vet_mumbai_1', 0, null, null, true, false, 15),
('sched_mumbai_1_1', 'vet_mumbai_1', 1, null, null, true, false, 15),
('sched_mumbai_1_2', 'vet_mumbai_1', 2, null, null, true, false, 15),
('sched_mumbai_1_3', 'vet_mumbai_1', 3, null, null, true, false, 15),
('sched_mumbai_1_4', 'vet_mumbai_1', 4, null, null, true, false, 15),
('sched_mumbai_1_5', 'vet_mumbai_1', 5, null, null, true, false, 15),
('sched_mumbai_1_6', 'vet_mumbai_1', 6, null, null, true, false, 15),

-- Delhi Friendicoes (24/7)
('sched_delhi_1_0', 'vet_delhi_1', 0, null, null, true, false, 12),
('sched_delhi_1_1', 'vet_delhi_1', 1, null, null, true, false, 12),
('sched_delhi_1_2', 'vet_delhi_1', 2, null, null, true, false, 12),
('sched_delhi_1_3', 'vet_delhi_1', 3, null, null, true, false, 12),
('sched_delhi_1_4', 'vet_delhi_1', 4, null, null, true, false, 12),
('sched_delhi_1_5', 'vet_delhi_1', 5, null, null, true, false, 12),
('sched_delhi_1_6', 'vet_delhi_1', 6, null, null, true, false, 12);