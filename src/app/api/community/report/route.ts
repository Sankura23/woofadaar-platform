import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { contentId, contentType, reason, description } = body;

    if (!contentId || !contentType || !reason) {
      return NextResponse.json(
        { success: false, error: 'Content ID, type, and reason are required' },
        { status: 400 }
      );
    }

    const validContentTypes = ['forum_post', 'comment', 'question', 'answer'];
    if (!validContentTypes.includes(contentType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid content type' },
        { status: 400 }
      );
    }

    const userId = 'userId' in user ? user.userId : user.partnerId;

    // Check if user has already reported this content
    const existingReport = await prisma.communityFlag.findFirst({
      where: {
        user_id: userId,
        [`${contentType === 'forum_post' ? 'forum_post_id' : contentType}_id`]: contentId
      }
    });

    if (existingReport) {
      return NextResponse.json(
        { success: false, error: 'You have already reported this content' },
        { status: 400 }
      );
    }

    // Verify the content exists
    let contentExists = false;
    try {
      switch (contentType) {
        case 'forum_post':
          const forumPost = await prisma.forumPost.findUnique({
            where: { id: contentId }
          });
          contentExists = !!forumPost;
          break;
        case 'comment':
          const comment = await prisma.communityComment.findUnique({
            where: { id: contentId }
          });
          contentExists = !!comment;
          break;
        case 'question':
          const question = await prisma.communityQuestion.findUnique({
            where: { id: contentId }
          });
          contentExists = !!question;
          break;
        case 'answer':
          const answer = await prisma.communityAnswer.findUnique({
            where: { id: contentId }
          });
          contentExists = !!answer;
          break;
      }
    } catch (error) {
      console.error('Error checking content existence:', error);
      return NextResponse.json(
        { success: false, error: 'Content not found' },
        { status: 404 }
      );
    }

    if (!contentExists) {
      return NextResponse.json(
        { success: false, error: 'Content not found' },
        { status: 404 }
      );
    }

    // Determine severity based on reason
    const getSeverity = (reason: string) => {
      switch (reason) {
        case 'harassment':
        case 'inappropriate':
          return 'high';
        case 'spam':
        case 'misinformation':
          return 'medium';
        case 'off_topic':
        case 'duplicate':
          return 'low';
        case 'copyright':
          return 'high';
        default:
          return 'medium';
      }
    };

    // Create the flag report
    const flagData: any = {
      user_id: userId,
      reason: reason,
      description: description || null
    };

    // Set the appropriate content ID field
    switch (contentType) {
      case 'forum_post':
        flagData.forum_post_id = contentId;
        break;
      case 'comment':
        flagData.comment_id = contentId;
        break;
      case 'question':
        flagData.question_id = contentId;
        break;
      case 'answer':
        flagData.answer_id = contentId;
        break;
    }

    const flag = await prisma.communityFlag.create({
      data: flagData
    });

    // Add to moderation queue
    await prisma.moderationQueue.create({
      data: {
        item_id: contentId,
        item_type: contentType,
        reason: reason,
        severity: getSeverity(reason),
        reported_by: userId,
        auto_flagged: false
      }
    });

    return NextResponse.json({
      success: true,
      data: { flag },
      message: 'Content reported successfully. Thank you for helping keep our community safe.'
    });
  } catch (error) {
    console.error('Error creating content report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit report' },
      { status: 500 }
    );
  }
}