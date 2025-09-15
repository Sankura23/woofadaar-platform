import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { 
  getPersonalizedRecommendations, 
  getSimilarQuestions, 
  updateUserInterests 
} from '@/lib/recommendation-engine';

// GET - Get personalized question recommendations
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'personalized'; // personalized, trending, similar
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '10');
    const questionId = searchParams.get('questionId'); // For similar questions

    const userId = 'userId' in user ? user.userId : user.partnerId;

    if (type === 'similar' && questionId) {
      // Get similar questions for a specific question
      // This would normally fetch the question details first
      const mockQuestionData = {
        title: 'Sample question title',
        content: 'Sample question content',
        category: category || 'general',
        tags: ['sample', 'tag']
      };

      const similarQuestions = await getSimilarQuestions(
        mockQuestionData.title,
        mockQuestionData.content,
        mockQuestionData.category,
        mockQuestionData.tags,
        limit
      );

      return NextResponse.json({
        success: true,
        data: {
          type: 'similar',
          questions: similarQuestions,
          total: similarQuestions.length,
          reference_question_id: questionId
        }
      });
    }

    // Get personalized recommendations
    const recommendations = await getPersonalizedRecommendations(
      userId,
      {
        ...(category && { categories: [category] }),
        excludeViewed: true,
        minScore: 0.2
      },
      limit
    );

    return NextResponse.json({
      success: true,
      data: {
        type,
        personalized: recommendations.recommendations,
        trending: recommendations.trending,
        categories: recommendations.categories,
        user_id: userId
      }
    });

  } catch (error) {
    console.error('Error fetching question recommendations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch recommendations' },
      { status: 500 }
    );
  }
}

// POST - Track user interaction for recommendation learning
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
    const { 
      action, 
      questionId, 
      category, 
      tags,
      interactionType = 'implicit' // implicit, explicit
    } = body;

    if (!action || !questionId) {
      return NextResponse.json(
        { success: false, error: 'Action and question ID are required' },
        { status: 400 }
      );
    }

    const validActions = ['view', 'upvote', 'downvote', 'answer', 'bookmark', 'share'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action type' },
        { status: 400 }
      );
    }

    const userId = 'userId' in user ? user.userId : user.partnerId;

    // Update user interests based on interaction
    if (category && tags) {
      await updateUserInterests(userId, action, category, tags);
    }

    console.log(`User interaction tracked: ${userId} ${action} on question ${questionId}`);

    return NextResponse.json({
      success: true,
      message: 'Interaction tracked for personalization',
      data: {
        user_id: userId,
        action,
        question_id: questionId,
        will_improve_recommendations: true
      }
    });

  } catch (error) {
    console.error('Error tracking user interaction:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to track interaction' },
      { status: 500 }
    );
  }
}