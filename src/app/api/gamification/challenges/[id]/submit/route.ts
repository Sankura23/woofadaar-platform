import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await verifyToken(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const challengeId = params.id;

    // Get user's participation in this challenge
    const participation = await prisma.$queryRaw`
      SELECT cp.*, sc.name as challenge_name, sc.rules, sc.end_date
      FROM challenge_participation cp
      JOIN seasonal_challenges sc ON sc.id = cp.challenge_id
      WHERE cp.challenge_id = ${challengeId} AND cp.user_id = ${userId} AND cp.status = 'active'
    ` as any[];

    if (participation.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Not participating in this challenge or challenge is not active' },
        { status: 404 }
      );
    }

    const participationData = participation[0];

    // Check if challenge is still open for submissions
    const now = new Date();
    if (new Date(participationData.end_date) < now) {
      return NextResponse.json(
        { success: false, error: 'Challenge submission period has ended' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      submissionType,
      title,
      content,
      mediaUrls = [],
      submissionData = {}
    } = body;

    // Validate required fields
    if (!submissionType || !title || !content) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: submissionType, title, content' },
        { status: 400 }
      );
    }

    // Validate submission against challenge rules
    const rules = participationData.rules || {};
    const validationResult = validateSubmission(rules, {
      submissionType,
      title,
      content,
      mediaUrls,
      submissionData
    });

    if (!validationResult.isValid) {
      return NextResponse.json(
        { success: false, error: `Submission validation failed: ${validationResult.errors.join(', ')}` },
        { status: 400 }
      );
    }

    // Check if user already has a submission for this challenge
    const existingSubmission = await prisma.$queryRaw`
      SELECT id FROM challenge_submissions 
      WHERE participation_id = ${participationData.id}
    ` as any[];

    if (existingSubmission.length > 0) {
      return NextResponse.json(
        { success: false, error: 'You have already submitted for this challenge' },
        { status: 409 }
      );
    }

    // Create submission
    const submissionId = generateId();
    await prisma.$executeRaw`
      INSERT INTO challenge_submissions (
        id, challenge_id, participation_id, user_id, submission_type,
        title, content, media_urls, submission_data, status
      ) VALUES (
        ${submissionId}, ${challengeId}, ${participationData.id}, ${userId},
        ${submissionType}, ${title}, ${content}, 
        ${JSON.stringify(mediaUrls)}, ${JSON.stringify(submissionData)}, 'pending'
      )
    `;

    // Update participation status
    await prisma.$executeRaw`
      UPDATE challenge_participation 
      SET status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${participationData.id}
    `;

    // Award completion points
    await fetch('/api/points/award', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'challenge_submit',
        sourceType: 'challenge_submission',
        sourceId: submissionId,
        pointsAmount: 100, // Base submission points
        metadata: {
          challengeName: participationData.challenge_name,
          submissionType,
          title
        }
      })
    });

    // Get the created submission
    const submission = await prisma.$queryRaw`
      SELECT cs.*, sc.name as challenge_name, sc.category
      FROM challenge_submissions cs
      JOIN seasonal_challenges sc ON sc.id = cs.challenge_id
      WHERE cs.id = ${submissionId}
    ` as any[];

    const submissionData_result = submission[0];

    return NextResponse.json({
      success: true,
      data: {
        submission: {
          id: submissionData_result.id,
          title: submissionData_result.title,
          content: submissionData_result.content,
          submissionType: submissionData_result.submission_type,
          mediaUrls: submissionData_result.media_urls,
          status: submissionData_result.status,
          submittedAt: submissionData_result.submitted_at,
          challengeName: submissionData_result.challenge_name,
          category: submissionData_result.category
        },
        message: `Submission "${title}" created successfully! Earned 100 points for completing the challenge.`
      }
    });

  } catch (error) {
    console.error('Error creating submission:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create submission' },
      { status: 500 }
    );
  }
}

// Get user's submission for a challenge
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await verifyToken(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const challengeId = params.id;

    // Get user's submission
    const submission = await prisma.$queryRaw`
      SELECT cs.*, sc.name as challenge_name, sc.category,
             cp.status as participation_status
      FROM challenge_submissions cs
      JOIN seasonal_challenges sc ON sc.id = cs.challenge_id
      JOIN challenge_participation cp ON cp.id = cs.participation_id
      WHERE cs.challenge_id = ${challengeId} AND cs.user_id = ${userId}
    ` as any[];

    if (submission.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No submission found for this challenge' },
        { status: 404 }
      );
    }

    const submissionData = submission[0];

    return NextResponse.json({
      success: true,
      data: {
        submission: {
          id: submissionData.id,
          title: submissionData.title,
          content: submissionData.content,
          submissionType: submissionData.submission_type,
          mediaUrls: submissionData.media_urls,
          submissionData: submissionData.submission_data,
          votesCount: submissionData.votes_count,
          likesCount: submissionData.likes_count,
          status: submissionData.status,
          submittedAt: submissionData.submitted_at,
          reviewedAt: submissionData.reviewed_at,
          reviewerComments: submissionData.reviewer_comments,
          challengeName: submissionData.challenge_name,
          category: submissionData.category,
          participationStatus: submissionData.participation_status
        }
      }
    });

  } catch (error) {
    console.error('Error fetching submission:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch submission' },
      { status: 500 }
    );
  }
}

function validateSubmission(rules: any, submission: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const requirements = rules.requirements || {};

  // Check minimum words requirement
  if (requirements.minimumWords && submission.content) {
    const wordCount = submission.content.trim().split(/\s+/).length;
    if (wordCount < requirements.minimumWords) {
      errors.push(`Content must be at least ${requirements.minimumWords} words (current: ${wordCount})`);
    }
  }

  // Check photo requirements
  if (requirements.photoRequired && submission.mediaUrls.length === 0) {
    errors.push('At least one photo is required');
  }

  if (requirements.maxPhotos && submission.mediaUrls.length > requirements.maxPhotos) {
    errors.push(`Maximum ${requirements.maxPhotos} photos allowed`);
  }

  // Check required tags
  if (requirements.tags && requirements.tags.length > 0) {
    const content = submission.content.toLowerCase();
    const missingTags = requirements.tags.filter((tag: string) => 
      !content.includes(tag.toLowerCase())
    );
    
    if (missingTags.length > 0) {
      errors.push(`Content must include tags: ${missingTags.join(', ')}`);
    }
  }

  // Check submission type matches requirements
  if (requirements.submissionType && submission.submissionType !== requirements.submissionType) {
    errors.push(`Submission type must be ${requirements.submissionType}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

function generateId(): string {
  return 'submission_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}