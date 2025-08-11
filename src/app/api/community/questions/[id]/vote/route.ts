import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// POST /api/community/questions/[id]/vote - Vote on a question
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
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

    const params = await context.params;
    const questionId = params.id;
    const userId = 'userId' in user ? user.userId : user.partnerId;
    const body = await request.json();
    const { type } = body; // 'up' or 'down'

    if (!['up', 'down'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid vote type. Must be "up" or "down"' },
        { status: 400 }
      );
    }

    // Check if question exists
    const question = await prisma.communityQuestion.findFirst({
      where: { 
        id: questionId,
        status: 'active'
      }
    });

    if (!question) {
      return NextResponse.json(
        { success: false, error: 'Question not found' },
        { status: 404 }
      );
    }

    // Check if user already voted
    const existingVote = await prisma.communityVote.findFirst({
      where: {
        user_id: userId,
        question_id: questionId
      }
    });

    let upvotes = question.upvotes;
    let downvotes = question.downvotes;
    let userVote: 'up' | 'down' | null = null;

    await prisma.$transaction(async (tx) => {
      if (existingVote) {
        // User has already voted
        if (existingVote.vote_type === type) {
          // Same vote - remove it (toggle off)
          await tx.communityVote.delete({
            where: { id: existingVote.id }
          });
          
          if (type === 'up') {
            upvotes = Math.max(0, upvotes - 1);
          } else {
            downvotes = Math.max(0, downvotes - 1);
          }
          userVote = null;
        } else {
          // Different vote - update it
          await tx.communityVote.update({
            where: { id: existingVote.id },
            data: { 
              vote_type: type,
              created_at: new Date()
            }
          });
          
          if (type === 'up') {
            upvotes = upvotes + 1;
            downvotes = Math.max(0, downvotes - 1);
          } else {
            upvotes = Math.max(0, upvotes - 1);
            downvotes = downvotes + 1;
          }
          userVote = type as 'up' | 'down';
        }
      } else {
        // New vote
        await tx.communityVote.create({
          data: {
            user_id: userId,
            question_id: questionId,
            vote_type: type
          }
        });
        
        if (type === 'up') {
          upvotes = upvotes + 1;
        } else {
          downvotes = downvotes + 1;
        }
        userVote = type as 'up' | 'down';
      }

      // Update question vote counts
      await tx.communityQuestion.update({
        where: { id: questionId },
        data: {
          upvotes,
          downvotes,
          updated_at: new Date()
        }
      });
    });

    // Award/deduct points for voting
    if (userVote) {
      await prisma.userEngagement.create({
        data: {
          user_id: userId,
          action_type: type === 'up' ? 'upvoted' : 'downvoted',
          points_earned: 1,
          description: `${type === 'up' ? 'Upvoted' : 'Downvoted'} a question`,
          related_id: questionId,
          related_type: 'question'
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        upvotes,
        downvotes,
        userVote
      }
    });
  } catch (error) {
    console.error('Error voting on question:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to vote on question' },
      { status: 500 }
    );
  }
}