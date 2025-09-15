-- Week 22 Phase 1: Progressive Achievement Chains Migration

-- Achievement Chains table
CREATE TABLE "achievement_chains" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "total_levels" INTEGER NOT NULL,
    "chain_data" JSONB DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "achievement_chains_pkey" PRIMARY KEY ("id")
);

-- Chain Progress table
CREATE TABLE "chain_progress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "chain_id" TEXT NOT NULL,
    "current_level" INTEGER NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMP(3),
    "progress_data" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chain_progress_pkey" PRIMARY KEY ("id")
);

-- Enhanced Achievements table (extends existing system)
CREATE TABLE "enhanced_achievements" (
    "id" TEXT NOT NULL,
    "chain_id" TEXT,
    "level" INTEGER DEFAULT 1,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "achievement_type" TEXT NOT NULL DEFAULT 'standard',
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "discovery_hint" TEXT,
    "requirements" JSONB NOT NULL DEFAULT '{}',
    "rewards" JSONB NOT NULL DEFAULT '{}',
    "points_reward" INTEGER NOT NULL DEFAULT 0,
    "rarity" TEXT NOT NULL DEFAULT 'common',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enhanced_achievements_pkey" PRIMARY KEY ("id")
);

-- User Achievement Progress table (detailed tracking)
CREATE TABLE "user_achievement_progress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "achievement_id" TEXT NOT NULL,
    "progress_percentage" INTEGER NOT NULL DEFAULT 0,
    "current_values" JSONB DEFAULT '{}',
    "unlocked_at" TIMESTAMP(3),
    "is_discovered" BOOLEAN NOT NULL DEFAULT false,
    "discovered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_achievement_progress_pkey" PRIMARY KEY ("id")
);

-- Hidden Achievement Discoveries table
CREATE TABLE "hidden_achievement_discoveries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "achievement_id" TEXT NOT NULL,
    "discovered_through" TEXT,
    "discovery_context" JSONB DEFAULT '{}',
    "discovered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hidden_achievement_discoveries_pkey" PRIMARY KEY ("id")
);

-- Create unique constraints
ALTER TABLE "chain_progress" ADD CONSTRAINT "chain_progress_user_id_chain_id_key" UNIQUE ("user_id", "chain_id");
ALTER TABLE "user_achievement_progress" ADD CONSTRAINT "user_achievement_progress_user_id_achievement_id_key" UNIQUE ("user_id", "achievement_id");
ALTER TABLE "hidden_achievement_discoveries" ADD CONSTRAINT "hidden_achievement_discoveries_user_id_achievement_id_key" UNIQUE ("user_id", "achievement_id");

-- Create indexes
CREATE INDEX "achievement_chains_category_idx" ON "achievement_chains"("category");
CREATE INDEX "achievement_chains_is_active_idx" ON "achievement_chains"("is_active");

CREATE INDEX "chain_progress_user_id_idx" ON "chain_progress"("user_id");
CREATE INDEX "chain_progress_chain_id_idx" ON "chain_progress"("chain_id");
CREATE INDEX "chain_progress_current_level_idx" ON "chain_progress"("current_level");

CREATE INDEX "enhanced_achievements_chain_id_idx" ON "enhanced_achievements"("chain_id");
CREATE INDEX "enhanced_achievements_category_idx" ON "enhanced_achievements"("category");
CREATE INDEX "enhanced_achievements_achievement_type_idx" ON "enhanced_achievements"("achievement_type");
CREATE INDEX "enhanced_achievements_is_hidden_idx" ON "enhanced_achievements"("is_hidden");
CREATE INDEX "enhanced_achievements_rarity_idx" ON "enhanced_achievements"("rarity");

CREATE INDEX "user_achievement_progress_user_id_idx" ON "user_achievement_progress"("user_id");
CREATE INDEX "user_achievement_progress_achievement_id_idx" ON "user_achievement_progress"("achievement_id");
CREATE INDEX "user_achievement_progress_progress_percentage_idx" ON "user_achievement_progress"("progress_percentage");
CREATE INDEX "user_achievement_progress_unlocked_at_idx" ON "user_achievement_progress"("unlocked_at");

CREATE INDEX "hidden_achievement_discoveries_user_id_idx" ON "hidden_achievement_discoveries"("user_id");
CREATE INDEX "hidden_achievement_discoveries_achievement_id_idx" ON "hidden_achievement_discoveries"("achievement_id");
CREATE INDEX "hidden_achievement_discoveries_discovered_at_idx" ON "hidden_achievement_discoveries"("discovered_at");

-- Add foreign key constraints
ALTER TABLE "chain_progress" ADD CONSTRAINT "chain_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chain_progress" ADD CONSTRAINT "chain_progress_chain_id_fkey" FOREIGN KEY ("chain_id") REFERENCES "achievement_chains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "enhanced_achievements" ADD CONSTRAINT "enhanced_achievements_chain_id_fkey" FOREIGN KEY ("chain_id") REFERENCES "achievement_chains"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "user_achievement_progress" ADD CONSTRAINT "user_achievement_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_achievement_progress" ADD CONSTRAINT "user_achievement_progress_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "enhanced_achievements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "hidden_achievement_discoveries" ADD CONSTRAINT "hidden_achievement_discoveries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "hidden_achievement_discoveries" ADD CONSTRAINT "hidden_achievement_discoveries_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "enhanced_achievements"("id") ON DELETE CASCADE ON UPDATE CASCADE;