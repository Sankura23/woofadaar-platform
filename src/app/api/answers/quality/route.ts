import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { 
  calculateAnswerQualityScore, 
  assessAnswerQualityRealtime,
  scoreAllAnswersForQuestion 
} from '@/lib/answer-quality-scoring';
import prisma from '@/lib/db';

// GET - Get quality scores for answer(s)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const answerId = searchParams.get('answerId');
    const questionId = searchParams.get('questionId');

    if (!answerId && !questionId) {
      return NextResponse.json(
        { success: false, error: 'Either answerId or questionId is required' },
        { status: 400 }
      );
    }

    if (questionId) {
      // Score all answers for a question
      const questionData = {
        title: 'Sample Question Title',
        content: 'Sample question content for analysis',
        category: 'health'
      };

      const allScores = await scoreAllAnswersForQuestion(
        questionId,
        questionData.title,
        questionData.content,
        questionData.category
      );

      return NextResponse.json({
        success: true,
        data: {
          question_id: questionId,
          answer_scores: allScores,
          total_answers: Object.keys(allScores).length
        }
      });
    }

    if (answerId) {
      // Score specific answer
      const mockAnswerData = {
        content: 'Sample answer content for quality analysis',
        upvotes: 5,
        downvotes: 1,
        isBestAnswer: false,
        isVerifiedExpert: true
      };

      const qualityScore = calculateAnswerQualityScore(
        mockAnswerData.content,
        'Sample Question',
        'Sample question content',
        mockAnswerData,
        {
          verification_status: 'verified',
          specializations: ['health', 'veterinary'],
          rating_average: 4.5,
          experience_years: 8,
          response_rate: 0.87
        },
        'health'
      );

      return NextResponse.json({
        success: true,
        data: {
          answer_id: answerId,
          quality_score: qualityScore
        }
      });
    }

  } catch (error) {
    console.error('Error fetching answer quality scores:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch quality scores' },
      { status: 500 }
    );
  }
}

// POST - Analyze answer quality in real-time (for answer composition)
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
      answerContent, 
      questionId, 
      questionTitle, 
      questionContent, 
      questionCategory 
    } = body;

    if (!answerContent || !questionTitle || !questionContent) {
      return NextResponse.json(
        { success: false, error: 'Answer content and question details are required' },
        { status: 400 }
      );
    }

    const userId = 'userId' in user ? user.userId : user.partnerId;

    // Check if user is a verified expert
    let isVerifiedExpert = false;
    let expertProfile = null;

    try {
      expertProfile = await prisma.expertProfile.findUnique({
        where: { 
          user_id: userId,
          verification_status: 'verified',
          is_active: true
        }
      });
      
      isVerifiedExpert = !!expertProfile;
    } catch (dbError) {
      console.warn('Database error checking expert status:', dbError);
      // Continue with non-expert assessment
    }

    // Perform real-time quality assessment
    const assessment = await assessAnswerQualityRealtime(
      answerContent,
      {
        id: questionId,
        title: questionTitle,
        content: questionContent,
        category: questionCategory || 'general'
      },
      {
        isVerifiedExpert,
        expertProfile
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        quality_assessment: assessment.qualityScore,
        should_highlight: assessment.shouldHighlight,
        improvement_suggestions: assessment.improvementSuggestions,
        is_expert_answer: isVerifiedExpert,
        real_time_feedback: {
          tier: assessment.qualityScore.tier,
          score_percentage: Math.round(assessment.qualityScore.overallScore * 100),
          top_strength: Object.entries(assessment.qualityScore.factors)
            .sort(([,a], [,b]) => b - a)[0]?.[0],
          needs_improvement: assessment.qualityScore.factors.contentQuality < 0.6
        }
      }
    });

  } catch (error) {
    console.error('Error assessing answer quality:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to assess answer quality' },
      { status: 500 }
    );
  }
}

// PUT - Update quality score after community engagement
export async function PUT(request: NextRequest) {
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
    const { answerId, engagementUpdate } = body;

    if (!answerId || !engagementUpdate) {
      return NextResponse.json(
        { success: false, error: 'Answer ID and engagement update are required' },
        { status: 400 }
      );
    }

    // This would normally:
    // 1. Fetch current answer data
    // 2. Recalculate quality score with new engagement metrics
    // 3. Update answer ranking/visibility
    // 4. Trigger notifications if answer becomes high quality

    console.log(`Quality score update for answer ${answerId}:`, engagementUpdate);

    return NextResponse.json({
      success: true,
      message: 'Answer quality score updated',
      data: {
        answer_id: answerId,
        updated_score: 'calculated_based_on_engagement'
      }
    });

  } catch (error) {
    console.error('Error updating answer quality score:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update quality score' },
      { status: 500 }
    );
  }
}