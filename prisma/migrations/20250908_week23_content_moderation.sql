-- Week 23: Enhanced Content Moderation System Migration
-- This migration adds comprehensive moderation tables for AI-powered content analysis

-- Content Reports Table
CREATE TABLE "content_reports" (
    "id" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "reported_by" TEXT NOT NULL,
    "report_category" TEXT NOT NULL,
    "report_reason" TEXT NOT NULL,
    "description" TEXT,
    "evidence_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "assigned_to" TEXT,
    "resolved_by" TEXT,
    "resolution" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_reports_pkey" PRIMARY KEY ("id")
);

-- Content Moderation Actions Table
CREATE TABLE "content_moderation_actions" (
    "id" TEXT NOT NULL,
    "report_id" TEXT,
    "content_type" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "moderator_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "duration" INTEGER,
    "expires_at" TIMESTAMP(3),
    "is_automated" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_moderation_actions_pkey" PRIMARY KEY ("id")
);

-- Content Quality Scores Table
CREATE TABLE "content_quality_scores" (
    "id" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "quality_score" INTEGER NOT NULL,
    "spam_likelihood" INTEGER NOT NULL,
    "toxicity_score" INTEGER NOT NULL,
    "readability_score" INTEGER NOT NULL,
    "engagement_score" INTEGER NOT NULL,
    "ai_confidence" DOUBLE PRECISION NOT NULL,
    "flags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "analysis_data" JSONB,
    "last_analyzed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_quality_scores_pkey" PRIMARY KEY ("id")
);

-- User Reputation Scores Table
CREATE TABLE "user_reputation_scores" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "overall_reputation" INTEGER NOT NULL DEFAULT 100,
    "content_quality_avg" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "community_helpfulness" INTEGER NOT NULL DEFAULT 0,
    "spam_reports_count" INTEGER NOT NULL DEFAULT 0,
    "valid_reports_made" INTEGER NOT NULL DEFAULT 0,
    "false_reports_made" INTEGER NOT NULL DEFAULT 0,
    "moderation_strikes" INTEGER NOT NULL DEFAULT 0,
    "positive_feedback" INTEGER NOT NULL DEFAULT 0,
    "negative_feedback" INTEGER NOT NULL DEFAULT 0,
    "trust_level" TEXT NOT NULL DEFAULT 'new',
    "restriction_level" TEXT NOT NULL DEFAULT 'none',
    "last_calculated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_reputation_scores_pkey" PRIMARY KEY ("id")
);

-- Moderation Rules Table
CREATE TABLE "moderation_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rule_type" TEXT NOT NULL,
    "conditions" JSONB NOT NULL,
    "actions" JSONB NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "auto_apply" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "moderation_rules_pkey" PRIMARY KEY ("id")
);

-- Rule Triggers Table
CREATE TABLE "rule_triggers" (
    "id" TEXT NOT NULL,
    "rule_id" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "triggered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action_taken" TEXT,
    "was_accurate" BOOLEAN,

    CONSTRAINT "rule_triggers_pkey" PRIMARY KEY ("id")
);

-- Auto Moderation Log Table
CREATE TABLE "auto_moderation_logs" (
    "id" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "check_type" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "flags_detected" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "raw_scores" JSONB,
    "processing_time" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auto_moderation_logs_pkey" PRIMARY KEY ("id")
);

-- Moderator Roles Table
CREATE TABLE "moderator_roles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role_name" TEXT NOT NULL DEFAULT 'moderator',
    "permissions" TEXT[] DEFAULT ARRAY['review', 'hide', 'warn']::TEXT[],
    "assigned_areas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "assigned_by" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_active" TIMESTAMP(3),

    CONSTRAINT "moderator_roles_pkey" PRIMARY KEY ("id")
);

-- Advanced Moderation Queue Table
CREATE TABLE "advanced_moderation_queue" (
    "id" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "queue_type" TEXT NOT NULL DEFAULT 'review',
    "priority" INTEGER NOT NULL DEFAULT 5,
    "assigned_to" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "added_reason" TEXT NOT NULL,
    "added_by" TEXT NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "advanced_moderation_queue_pkey" PRIMARY KEY ("id")
);

-- Create Unique Constraints
CREATE UNIQUE INDEX "content_quality_scores_content_type_content_id_key" ON "content_quality_scores"("content_type", "content_id");
CREATE UNIQUE INDEX "user_reputation_scores_user_id_key" ON "user_reputation_scores"("user_id");
CREATE UNIQUE INDEX "moderator_roles_user_id_key" ON "moderator_roles"("user_id");

-- Create Indexes for Performance
CREATE INDEX "content_reports_content_type_content_id_idx" ON "content_reports"("content_type", "content_id");
CREATE INDEX "content_reports_status_idx" ON "content_reports"("status");
CREATE INDEX "content_reports_priority_idx" ON "content_reports"("priority");
CREATE INDEX "content_reports_created_at_idx" ON "content_reports"("created_at");

CREATE INDEX "content_moderation_actions_content_type_content_id_idx" ON "content_moderation_actions"("content_type", "content_id");
CREATE INDEX "content_moderation_actions_action_type_idx" ON "content_moderation_actions"("action_type");
CREATE INDEX "content_moderation_actions_moderator_id_idx" ON "content_moderation_actions"("moderator_id");
CREATE INDEX "content_moderation_actions_created_at_idx" ON "content_moderation_actions"("created_at");

CREATE INDEX "content_quality_scores_content_type_idx" ON "content_quality_scores"("content_type");
CREATE INDEX "content_quality_scores_quality_score_idx" ON "content_quality_scores"("quality_score");
CREATE INDEX "content_quality_scores_spam_likelihood_idx" ON "content_quality_scores"("spam_likelihood");
CREATE INDEX "content_quality_scores_last_analyzed_idx" ON "content_quality_scores"("last_analyzed");

CREATE INDEX "user_reputation_scores_overall_reputation_idx" ON "user_reputation_scores"("overall_reputation");
CREATE INDEX "user_reputation_scores_trust_level_idx" ON "user_reputation_scores"("trust_level");
CREATE INDEX "user_reputation_scores_restriction_level_idx" ON "user_reputation_scores"("restriction_level");

CREATE INDEX "moderation_rules_rule_type_idx" ON "moderation_rules"("rule_type");
CREATE INDEX "moderation_rules_is_active_idx" ON "moderation_rules"("is_active");
CREATE INDEX "moderation_rules_severity_idx" ON "moderation_rules"("severity");

CREATE INDEX "rule_triggers_rule_id_idx" ON "rule_triggers"("rule_id");
CREATE INDEX "rule_triggers_content_type_content_id_idx" ON "rule_triggers"("content_type", "content_id");
CREATE INDEX "rule_triggers_triggered_at_idx" ON "rule_triggers"("triggered_at");

CREATE INDEX "auto_moderation_logs_content_type_content_id_idx" ON "auto_moderation_logs"("content_type", "content_id");
CREATE INDEX "auto_moderation_logs_check_type_idx" ON "auto_moderation_logs"("check_type");
CREATE INDEX "auto_moderation_logs_result_idx" ON "auto_moderation_logs"("result");
CREATE INDEX "auto_moderation_logs_created_at_idx" ON "auto_moderation_logs"("created_at");

CREATE INDEX "moderator_roles_role_name_idx" ON "moderator_roles"("role_name");
CREATE INDEX "moderator_roles_is_active_idx" ON "moderator_roles"("is_active");

CREATE INDEX "advanced_moderation_queue_status_idx" ON "advanced_moderation_queue"("status");
CREATE INDEX "advanced_moderation_queue_priority_idx" ON "advanced_moderation_queue"("priority");
CREATE INDEX "advanced_moderation_queue_queue_type_idx" ON "advanced_moderation_queue"("queue_type");
CREATE INDEX "advanced_moderation_queue_added_at_idx" ON "advanced_moderation_queue"("added_at");

-- Add Foreign Key Constraints
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reported_by_fkey" FOREIGN KEY ("reported_by") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "content_moderation_actions" ADD CONSTRAINT "content_moderation_actions_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "content_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "content_moderation_actions" ADD CONSTRAINT "content_moderation_actions_moderator_id_fkey" FOREIGN KEY ("moderator_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_reputation_scores" ADD CONSTRAINT "user_reputation_scores_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "moderation_rules" ADD CONSTRAINT "moderation_rules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "rule_triggers" ADD CONSTRAINT "rule_triggers_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "moderation_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "moderator_roles" ADD CONSTRAINT "moderator_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "moderator_roles" ADD CONSTRAINT "moderator_roles_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "advanced_moderation_queue" ADD CONSTRAINT "advanced_moderation_queue_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;