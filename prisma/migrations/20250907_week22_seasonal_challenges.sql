-- Week 22 Phase 2: Seasonal Challenges & Contest System Migration

-- Seasonal Challenges table
CREATE TABLE "seasonal_challenges" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "challenge_type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "point_reward" INTEGER NOT NULL DEFAULT 0,
    "max_participants" INTEGER,
    "rules" JSONB NOT NULL DEFAULT '{}',
    "prizes" JSONB DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seasonal_challenges_pkey" PRIMARY KEY ("id")
);

-- Challenge Participation table
CREATE TABLE "challenge_participation" (
    "id" TEXT NOT NULL,
    "challenge_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "completion_score" INTEGER,
    "progress_data" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "challenge_participation_pkey" PRIMARY KEY ("id")
);

-- Challenge Submissions table
CREATE TABLE "challenge_submissions" (
    "id" TEXT NOT NULL,
    "challenge_id" TEXT NOT NULL,
    "participation_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "submission_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "media_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "submission_data" JSONB DEFAULT '{}',
    "votes_count" INTEGER NOT NULL DEFAULT 0,
    "likes_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" TEXT,
    "reviewer_comments" TEXT,

    CONSTRAINT "challenge_submissions_pkey" PRIMARY KEY ("id")
);

-- Submission Votes table
CREATE TABLE "submission_votes" (
    "id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "vote_type" TEXT NOT NULL DEFAULT 'like',
    "vote_value" INTEGER DEFAULT 1,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_votes_pkey" PRIMARY KEY ("id")
);

-- Challenge Templates table (for recurring challenges)
CREATE TABLE "challenge_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "challenge_type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "duration_days" INTEGER NOT NULL DEFAULT 7,
    "rules" JSONB NOT NULL DEFAULT '{}',
    "requirements" JSONB NOT NULL DEFAULT '{}',
    "rewards" JSONB DEFAULT '{}',
    "recurrence" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "challenge_templates_pkey" PRIMARY KEY ("id")
);

-- Community Events table
CREATE TABLE "community_events" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "point_multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "special_rewards" JSONB DEFAULT '{}',
    "participation_fee" INTEGER NOT NULL DEFAULT 0,
    "max_participants" INTEGER,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_events_pkey" PRIMARY KEY ("id")
);

-- Event Participation table
CREATE TABLE "event_participation" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "points_spent" INTEGER NOT NULL DEFAULT 0,
    "points_earned" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "participation_data" JSONB DEFAULT '{}',

    CONSTRAINT "event_participation_pkey" PRIMARY KEY ("id")
);

-- Create unique constraints
ALTER TABLE "challenge_participation" ADD CONSTRAINT "challenge_participation_challenge_id_user_id_key" UNIQUE ("challenge_id", "user_id");
ALTER TABLE "submission_votes" ADD CONSTRAINT "submission_votes_submission_id_user_id_vote_type_key" UNIQUE ("submission_id", "user_id", "vote_type");
ALTER TABLE "event_participation" ADD CONSTRAINT "event_participation_event_id_user_id_key" UNIQUE ("event_id", "user_id");

-- Create indexes
CREATE INDEX "seasonal_challenges_challenge_type_idx" ON "seasonal_challenges"("challenge_type");
CREATE INDEX "seasonal_challenges_category_idx" ON "seasonal_challenges"("category");
CREATE INDEX "seasonal_challenges_start_date_idx" ON "seasonal_challenges"("start_date");
CREATE INDEX "seasonal_challenges_end_date_idx" ON "seasonal_challenges"("end_date");
CREATE INDEX "seasonal_challenges_is_active_idx" ON "seasonal_challenges"("is_active");
CREATE INDEX "seasonal_challenges_is_featured_idx" ON "seasonal_challenges"("is_featured");

CREATE INDEX "challenge_participation_challenge_id_idx" ON "challenge_participation"("challenge_id");
CREATE INDEX "challenge_participation_user_id_idx" ON "challenge_participation"("user_id");
CREATE INDEX "challenge_participation_status_idx" ON "challenge_participation"("status");
CREATE INDEX "challenge_participation_joined_at_idx" ON "challenge_participation"("joined_at");

CREATE INDEX "challenge_submissions_challenge_id_idx" ON "challenge_submissions"("challenge_id");
CREATE INDEX "challenge_submissions_user_id_idx" ON "challenge_submissions"("user_id");
CREATE INDEX "challenge_submissions_submission_type_idx" ON "challenge_submissions"("submission_type");
CREATE INDEX "challenge_submissions_status_idx" ON "challenge_submissions"("status");
CREATE INDEX "challenge_submissions_votes_count_idx" ON "challenge_submissions"("votes_count");
CREATE INDEX "challenge_submissions_submitted_at_idx" ON "challenge_submissions"("submitted_at");

CREATE INDEX "submission_votes_submission_id_idx" ON "submission_votes"("submission_id");
CREATE INDEX "submission_votes_user_id_idx" ON "submission_votes"("user_id");
CREATE INDEX "submission_votes_vote_type_idx" ON "submission_votes"("vote_type");

CREATE INDEX "challenge_templates_challenge_type_idx" ON "challenge_templates"("challenge_type");
CREATE INDEX "challenge_templates_category_idx" ON "challenge_templates"("category");
CREATE INDEX "challenge_templates_recurrence_idx" ON "challenge_templates"("recurrence");
CREATE INDEX "challenge_templates_is_active_idx" ON "challenge_templates"("is_active");

CREATE INDEX "community_events_event_type_idx" ON "community_events"("event_type");
CREATE INDEX "community_events_start_date_idx" ON "community_events"("start_date");
CREATE INDEX "community_events_end_date_idx" ON "community_events"("end_date");
CREATE INDEX "community_events_is_featured_idx" ON "community_events"("is_featured");

CREATE INDEX "event_participation_event_id_idx" ON "event_participation"("event_id");
CREATE INDEX "event_participation_user_id_idx" ON "event_participation"("user_id");
CREATE INDEX "event_participation_status_idx" ON "event_participation"("status");

-- Add foreign key constraints
ALTER TABLE "seasonal_challenges" ADD CONSTRAINT "seasonal_challenges_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "challenge_participation" ADD CONSTRAINT "challenge_participation_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "seasonal_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "challenge_participation" ADD CONSTRAINT "challenge_participation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "challenge_submissions" ADD CONSTRAINT "challenge_submissions_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "seasonal_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "challenge_submissions" ADD CONSTRAINT "challenge_submissions_participation_id_fkey" FOREIGN KEY ("participation_id") REFERENCES "challenge_participation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "challenge_submissions" ADD CONSTRAINT "challenge_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "challenge_submissions" ADD CONSTRAINT "challenge_submissions_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "submission_votes" ADD CONSTRAINT "submission_votes_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "challenge_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "submission_votes" ADD CONSTRAINT "submission_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "community_events" ADD CONSTRAINT "community_events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "event_participation" ADD CONSTRAINT "event_participation_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "community_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_participation" ADD CONSTRAINT "event_participation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;