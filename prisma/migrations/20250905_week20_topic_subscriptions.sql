-- Migration: Week 20 Phase 3 - Topic Subscriptions and Bookmarks
-- Add support for users to subscribe to forum topics and bookmark posts

-- Create TopicSubscription table for forum topic following
CREATE TABLE "TopicSubscription" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (cuid()),
  "user_id" TEXT NOT NULL,
  "forum_post_id" TEXT NOT NULL,
  "notification_enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "TopicSubscription_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TopicSubscription_forum_post_id_fkey" 
    FOREIGN KEY ("forum_post_id") REFERENCES "ForumPost"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create unique constraint to prevent duplicate subscriptions
CREATE UNIQUE INDEX "TopicSubscription_user_id_forum_post_id_key" ON "TopicSubscription"("user_id", "forum_post_id");

-- Add indexes for performance
CREATE INDEX "TopicSubscription_user_id_idx" ON "TopicSubscription"("user_id");
CREATE INDEX "TopicSubscription_forum_post_id_idx" ON "TopicSubscription"("forum_post_id");
CREATE INDEX "TopicSubscription_notification_enabled_idx" ON "TopicSubscription"("notification_enabled");

-- Create PostBookmark table for bookmarking posts
CREATE TABLE "PostBookmark" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (cuid()),
  "user_id" TEXT NOT NULL,
  "forum_post_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "PostBookmark_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PostBookmark_forum_post_id_fkey" 
    FOREIGN KEY ("forum_post_id") REFERENCES "ForumPost"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create unique constraint to prevent duplicate bookmarks
CREATE UNIQUE INDEX "PostBookmark_user_id_forum_post_id_key" ON "PostBookmark"("user_id", "forum_post_id");

-- Add indexes for performance
CREATE INDEX "PostBookmark_user_id_idx" ON "PostBookmark"("user_id");
CREATE INDEX "PostBookmark_forum_post_id_idx" ON "PostBookmark"("forum_post_id");