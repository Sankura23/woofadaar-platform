-- Migration: Week 20 - Enhanced Threaded Comments and User Mentions
-- Add support for nested comment replies and user mentions in forum discussions

-- Add new columns to CommunityComment table for threading and mentions
ALTER TABLE "CommunityComment" 
ADD COLUMN "parent_comment_id" TEXT,
ADD COLUMN "mentioned_users" TEXT[] DEFAULT '{}',
ADD COLUMN "reply_count" INTEGER DEFAULT 0;

-- Add foreign key constraint for parent-child comment relationship
ALTER TABLE "CommunityComment" 
ADD CONSTRAINT "CommunityComment_parent_comment_id_fkey" 
FOREIGN KEY ("parent_comment_id") REFERENCES "CommunityComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add indexes for better performance
CREATE INDEX "CommunityComment_parent_comment_id_idx" ON "CommunityComment"("parent_comment_id");
CREATE INDEX "CommunityComment_mentioned_users_idx" ON "CommunityComment" USING GIN("mentioned_users");

-- Update existing comments to ensure they have proper reply counts
-- This will be calculated based on existing child comments
UPDATE "CommunityComment" 
SET "reply_count" = (
  SELECT COUNT(*) 
  FROM "CommunityComment" AS child 
  WHERE child."parent_comment_id" = "CommunityComment"."id"
);