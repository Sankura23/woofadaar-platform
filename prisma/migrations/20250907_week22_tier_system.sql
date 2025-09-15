-- Week 22 Phase 3: Tier System, Referrals & Social Sharing Migration

-- User Tier System table
CREATE TABLE "user_tiers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "current_tier" TEXT NOT NULL DEFAULT 'bronze',
    "tier_points" INTEGER NOT NULL DEFAULT 0,
    "tier_start" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "next_tier_points" INTEGER,
    "tier_benefits" JSONB DEFAULT '{}',
    "monthly_tier_points" INTEGER NOT NULL DEFAULT 0,
    "tier_history" JSONB DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_tiers_pkey" PRIMARY KEY ("id")
);

-- Referral Rewards table
CREATE TABLE "referral_rewards" (
    "id" TEXT NOT NULL,
    "referrer_id" TEXT NOT NULL,
    "referred_id" TEXT NOT NULL,
    "referral_code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "points_awarded" INTEGER NOT NULL DEFAULT 0,
    "milestone_reached" TEXT,
    "referral_tier" INTEGER NOT NULL DEFAULT 1,
    "bonus_multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rewarded_at" TIMESTAMP(3),

    CONSTRAINT "referral_rewards_pkey" PRIMARY KEY ("id")
);

-- Social Sharing table
CREATE TABLE "social_shares" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "share_type" TEXT NOT NULL,
    "share_content" JSONB NOT NULL DEFAULT '{}',
    "platform" TEXT NOT NULL,
    "engagement_score" INTEGER NOT NULL DEFAULT 0,
    "points_earned" INTEGER NOT NULL DEFAULT 0,
    "share_url" TEXT,
    "share_metadata" JSONB DEFAULT '{}',
    "shared_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_shares_pkey" PRIMARY KEY ("id")
);

-- User Referral Codes table
CREATE TABLE "user_referral_codes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "referral_code" TEXT NOT NULL,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "max_usage" INTEGER DEFAULT 100,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_referral_codes_pkey" PRIMARY KEY ("id")
);

-- Tier Benefits Redemption table
CREATE TABLE "tier_benefit_redemptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "benefit_type" TEXT NOT NULL,
    "benefit_name" TEXT NOT NULL,
    "tier_required" TEXT NOT NULL,
    "points_cost" INTEGER NOT NULL DEFAULT 0,
    "redemption_data" JSONB DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "redeemed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "tier_benefit_redemptions_pkey" PRIMARY KEY ("id")
);

-- Social Share Templates table
CREATE TABLE "social_share_templates" (
    "id" TEXT NOT NULL,
    "share_type" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "template_name" TEXT NOT NULL,
    "template_content" TEXT NOT NULL,
    "image_template_url" TEXT,
    "variables" JSONB DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_share_templates_pkey" PRIMARY KEY ("id")
);

-- Dog Milestone Celebrations table
CREATE TABLE "dog_milestones" (
    "id" TEXT NOT NULL,
    "dog_id" TEXT NOT NULL,
    "milestone_type" TEXT NOT NULL,
    "milestone_name" TEXT NOT NULL,
    "milestone_date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "celebration_points" INTEGER NOT NULL DEFAULT 0,
    "is_celebrated" BOOLEAN NOT NULL DEFAULT false,
    "celebration_data" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "celebrated_at" TIMESTAMP(3),

    CONSTRAINT "dog_milestones_pkey" PRIMARY KEY ("id")
);

-- Create unique constraints
ALTER TABLE "user_tiers" ADD CONSTRAINT "user_tiers_user_id_key" UNIQUE ("user_id");
ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_referrer_id_referred_id_key" UNIQUE ("referrer_id", "referred_id");
ALTER TABLE "user_referral_codes" ADD CONSTRAINT "user_referral_codes_user_id_key" UNIQUE ("user_id");
ALTER TABLE "user_referral_codes" ADD CONSTRAINT "user_referral_codes_referral_code_key" UNIQUE ("referral_code");

-- Create indexes
CREATE INDEX "user_tiers_current_tier_idx" ON "user_tiers"("current_tier");
CREATE INDEX "user_tiers_tier_points_idx" ON "user_tiers"("tier_points");
CREATE INDEX "user_tiers_updated_at_idx" ON "user_tiers"("updated_at");

CREATE INDEX "referral_rewards_referrer_id_idx" ON "referral_rewards"("referrer_id");
CREATE INDEX "referral_rewards_referred_id_idx" ON "referral_rewards"("referred_id");
CREATE INDEX "referral_rewards_status_idx" ON "referral_rewards"("status");
CREATE INDEX "referral_rewards_referral_code_idx" ON "referral_rewards"("referral_code");
CREATE INDEX "referral_rewards_created_at_idx" ON "referral_rewards"("created_at");

CREATE INDEX "social_shares_user_id_idx" ON "social_shares"("user_id");
CREATE INDEX "social_shares_share_type_idx" ON "social_shares"("share_type");
CREATE INDEX "social_shares_platform_idx" ON "social_shares"("platform");
CREATE INDEX "social_shares_shared_at_idx" ON "social_shares"("shared_at");

CREATE INDEX "user_referral_codes_referral_code_idx" ON "user_referral_codes"("referral_code");
CREATE INDEX "user_referral_codes_is_active_idx" ON "user_referral_codes"("is_active");

CREATE INDEX "tier_benefit_redemptions_user_id_idx" ON "tier_benefit_redemptions"("user_id");
CREATE INDEX "tier_benefit_redemptions_benefit_type_idx" ON "tier_benefit_redemptions"("benefit_type");
CREATE INDEX "tier_benefit_redemptions_status_idx" ON "tier_benefit_redemptions"("status");
CREATE INDEX "tier_benefit_redemptions_redeemed_at_idx" ON "tier_benefit_redemptions"("redeemed_at");

CREATE INDEX "social_share_templates_share_type_idx" ON "social_share_templates"("share_type");
CREATE INDEX "social_share_templates_platform_idx" ON "social_share_templates"("platform");
CREATE INDEX "social_share_templates_is_active_idx" ON "social_share_templates"("is_active");

CREATE INDEX "dog_milestones_dog_id_idx" ON "dog_milestones"("dog_id");
CREATE INDEX "dog_milestones_milestone_type_idx" ON "dog_milestones"("milestone_type");
CREATE INDEX "dog_milestones_milestone_date_idx" ON "dog_milestones"("milestone_date");
CREATE INDEX "dog_milestones_is_celebrated_idx" ON "dog_milestones"("is_celebrated");

-- Add foreign key constraints
ALTER TABLE "user_tiers" ADD CONSTRAINT "user_tiers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_referred_id_fkey" FOREIGN KEY ("referred_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "social_shares" ADD CONSTRAINT "social_shares_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_referral_codes" ADD CONSTRAINT "user_referral_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tier_benefit_redemptions" ADD CONSTRAINT "tier_benefit_redemptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "dog_milestones" ADD CONSTRAINT "dog_milestones_dog_id_fkey" FOREIGN KEY ("dog_id") REFERENCES "Dog"("id") ON DELETE CASCADE ON UPDATE CASCADE;