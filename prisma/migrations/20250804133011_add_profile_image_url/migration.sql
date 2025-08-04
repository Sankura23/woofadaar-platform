-- CreateTable
CREATE TABLE "public"."Answer" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "is_expert_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Dog" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "breed" TEXT NOT NULL,
    "age_months" INTEGER NOT NULL,
    "weight_kg" DOUBLE PRECISION NOT NULL,
    "gender" TEXT NOT NULL,
    "photo_url" TEXT,
    "medical_history" TEXT,
    "health_id" TEXT,
    "kennel_club_registration" TEXT,
    "emergency_contact" TEXT,
    "emergency_phone" TEXT,
    "medical_notes" TEXT,
    "personality_traits" TEXT,
    "vaccination_status" TEXT NOT NULL DEFAULT 'up_to_date',
    "spayed_neutered" BOOLEAN NOT NULL DEFAULT false,
    "microchip_id" TEXT,
    "location" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HealthLog" (
    "id" TEXT NOT NULL,
    "dog_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "log_date" TIMESTAMP(3) NOT NULL,
    "food_amount" TEXT,
    "water_intake" TEXT,
    "exercise_minutes" INTEGER,
    "bathroom_frequency" INTEGER,
    "mood" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Question" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "dog_id" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "is_urgent" BOOLEAN NOT NULL DEFAULT false,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "answer_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "location" TEXT,
    "experience_level" TEXT NOT NULL DEFAULT 'beginner',
    "barks_points" INTEGER NOT NULL DEFAULT 0,
    "is_premium" BOOLEAN NOT NULL DEFAULT false,
    "profile_image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "preferred_language" TEXT NOT NULL DEFAULT 'en',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Waitlist" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "phone" TEXT,
    "dog_owner" BOOLEAN NOT NULL DEFAULT false,
    "preferred_language" TEXT NOT NULL DEFAULT 'en',
    "referral_source" TEXT,
    "interests" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "position" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Waitlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Partner" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "partner_type" TEXT NOT NULL,
    "business_name" TEXT,
    "license_number" TEXT,
    "specialization" TEXT,
    "experience_years" INTEGER,
    "location" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT NOT NULL,
    "website" TEXT,
    "bio" TEXT,
    "services_offered" TEXT,
    "consultation_fee" TEXT,
    "availability_hours" TEXT,
    "languages_spoken" TEXT,
    "certifications" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verification_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "admin_notes" TEXT,
    "health_id_access" BOOLEAN NOT NULL DEFAULT false,
    "profile_image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HealthIdVerification" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "health_id" TEXT NOT NULL,
    "dog_id" TEXT,
    "verification_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "purpose" TEXT,
    "notes" TEXT,
    "verified_by" TEXT NOT NULL,

    CONSTRAINT "HealthIdVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Dog_health_id_key" ON "public"."Dog"("health_id");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Waitlist_email_key" ON "public"."Waitlist"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_email_key" ON "public"."Partner"("email");

-- CreateIndex
CREATE INDEX "Partner_partner_type_idx" ON "public"."Partner"("partner_type");

-- CreateIndex
CREATE INDEX "Partner_location_idx" ON "public"."Partner"("location");

-- CreateIndex
CREATE INDEX "Partner_verified_idx" ON "public"."Partner"("verified");

-- CreateIndex
CREATE INDEX "Partner_status_idx" ON "public"."Partner"("status");

-- CreateIndex
CREATE INDEX "HealthIdVerification_health_id_idx" ON "public"."HealthIdVerification"("health_id");

-- CreateIndex
CREATE INDEX "HealthIdVerification_partner_id_idx" ON "public"."HealthIdVerification"("partner_id");

-- CreateIndex
CREATE INDEX "HealthIdVerification_verification_date_idx" ON "public"."HealthIdVerification"("verification_date");

-- AddForeignKey
ALTER TABLE "public"."Answer" ADD CONSTRAINT "Answer_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Answer" ADD CONSTRAINT "Answer_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Dog" ADD CONSTRAINT "Dog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HealthLog" ADD CONSTRAINT "HealthLog_dog_id_fkey" FOREIGN KEY ("dog_id") REFERENCES "public"."Dog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HealthLog" ADD CONSTRAINT "HealthLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Question" ADD CONSTRAINT "Question_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HealthIdVerification" ADD CONSTRAINT "HealthIdVerification_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HealthIdVerification" ADD CONSTRAINT "HealthIdVerification_dog_id_fkey" FOREIGN KEY ("dog_id") REFERENCES "public"."Dog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
