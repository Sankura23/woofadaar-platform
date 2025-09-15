import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { categorizeQuestion } from '@/lib/ai-categorization';
import { processQuestionForExperts } from '@/lib/expert-notification-service';
import { moderateContent } from '@/lib/moderation-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const tags = searchParams.get('tags')?.split(',');
    const isResolved = searchParams.get('isResolved');
    const status = searchParams.get('status') || 'active';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build where clause
    const where: any = { status };
    
    if (category) where.category = category;
    if (tags && tags.length > 0) where.tags = { hasSome: tags };
    if (isResolved !== null) where.is_resolved = isResolved === 'true';
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { tags: { hasSome: [search] } }
      ];
    }

    // Build order by clause
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const questions = await prisma.communityQuestion.findMany({
      where,
      select: {
        id: true,
        user_id: true,
        dog_id: true,
        title: true,
        content: true,
        tags: true,
        category: true,
        is_resolved: true,
        best_answer_id: true,
        view_count: true,
        upvotes: true,
        downvotes: true,
        answer_count: true,
        is_pinned: true,
        is_featured: true,
        status: true,
        photo_url: true,
        location: true,
        created_at: true,
        updated_at: true,
        user: {
          select: {
            id: true,
            name: true,
            profile_image_url: true
          }
        },
        dog: {
          select: {
            id: true,
            name: true,
            breed: true,
            photo_url: true
          }
        },
        answers: {
          where: { status: 'active' },
          select: {
            id: true,
            is_best_answer: true,
            upvotes: true,
            downvotes: true,
            is_verified_expert: true,
            user: {
              select: {
                id: true,
                name: true,
                profile_image_url: true
              }
            }
          }
        },
        comments: {
          where: { status: 'active' },
          select: {
            id: true,
            content: true,
            created_at: true,
            user: {
              select: {
                id: true,
                name: true,
                profile_image_url: true
              }
            }
          },
          orderBy: { created_at: 'asc' },
          take: 3 // Limit to first 3 comments on homepage
        },
        // Week 18 enhancements will be added after schema migration
        _count: {
          select: {
            answers: true,
            comments: true,
            // views: true  // This field needs to be added to schema
          }
        }
      },
      orderBy,
      take: limit,
      skip: offset
    });

    const total = await prisma.communityQuestion.count({ where });

    return NextResponse.json({
      success: true,
      data: {
        questions,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      }
    });
  } catch (error) {
    console.error('Error fetching community questions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch questions' },
      { status: 500 }
    );
  }
}

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
      title, 
      content, 
      tags, 
      category, 
      dogId, 
      photoUrl, 
      location,
      // Week 19 Phase 1 enhancements
      templateId,
      templateData,
      // Week 18 enhancements
      // imageUrls - not implemented in current schema
      videoUrl,
      isUrgent
    } = body;

    if (!title || !content || !category) {
      return NextResponse.json(
        { success: false, error: 'Title, content, and category are required' },
        { status: 400 }
      );
    }

    // Validate category
    const validCategories = ['health', 'behavior', 'feeding', 'training', 'local', 'general'];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { success: false, error: 'Invalid category' },
        { status: 400 }
      );
    }

    // Create the question with Week 19 enhancements
    const questionData: any = {
      user_id: 'userId' in user ? user.userId : user.partnerId,
      dog_id: dogId || null,
      title,
      content,
      tags: tags || [],
      category,
      photo_url: photoUrl || null,
      location: location || null,
      // Note: Week 18 enhancements will be added after schema migration
    };

    // Add template data if provided (Week 19 Phase 1)
    if (templateData && Object.keys(templateData).length > 0) {
      questionData.template_data = templateData;
    }

    const question = await prisma.communityQuestion.create({
      data: questionData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profile_image_url: true
          }
        },
        dog: {
          select: {
            id: true,
            name: true,
            breed: true,
            photo_url: true
          }
        }
      }
    });

    // Run AI categorization and store results (Week 19 Phase 1)
    try {
      const categorization = await categorizeQuestion(title, content);
      
      await prisma.questionCategorization.create({
        data: {
          question_id: question.id,
          suggested_category: categorization.primaryCategory.category,
          suggested_tags: categorization.suggestedTags.map(t => t.tag),
          confidence_score: categorization.overallConfidence,
          categorization_method: categorization.method,
          is_approved: categorization.overallConfidence > 0.8 // Auto-approve high confidence
        }
      });
      
      console.log(`AI categorization completed for question ${question.id}: ${categorization.primaryCategory.category} (${Math.round(categorization.overallConfidence * 100)}%)`);
    } catch (categorizationError) {
      console.warn('AI categorization failed, but question was created:', categorizationError);
      // Continue without categorization - question creation succeeded
    }

    // Run content moderation (Week 19 Phase 2)
    try {
      const moderationResult = await moderateContent(
        `${title} ${content}`,
        'question',
        'userId' in user ? user.userId : user.partnerId,
        question.id
      );

      if (moderationResult.shouldFlag) {
        console.log(`Question ${question.id} flagged for moderation: ${moderationResult.flagReasons.join(', ')}`);
      }
    } catch (moderationError) {
      console.warn('Content moderation failed:', moderationError);
      // Continue without moderation - question creation succeeded
    }

    // Notify matching experts (Week 19 Phase 2)
    try {
      const expertResult = await processQuestionForExperts(
        question.id,
        title,
        content,
        category,
        tags || [],
        false // isUrgent - would come from form data
      );

      console.log(`Expert notification processing completed: ${expertResult.notificationsScheduled} experts notified`);
    } catch (expertError) {
      console.warn('Expert notification failed:', expertError);
      // Continue without expert notifications - question creation succeeded
    }

    // Award points for posting a question
    await prisma.userEngagement.create({
      data: {
        user_id: 'userId' in user ? user.userId : user.partnerId,
        action_type: 'question_posted',
        points_earned: 10,
        description: `Posted question: ${title}`,
        related_id: question.id,
        related_type: 'question'
      }
    });

    // Check for first question badge
    const questionCount = await prisma.communityQuestion.count({
      where: { user_id: 'userId' in user ? user.userId : user.partnerId }
    });

    if (questionCount === 1) {
      await prisma.userBadge.create({
        data: {
          user_id: 'userId' in user ? user.userId : user.partnerId,
          badge_type: 'first_question',
          badge_name: 'First Question',
          badge_description: 'Asked your first community question',
          badge_icon: '❓',
          badge_color: '#3B82F6'
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: { question }
    });
  } catch (error) {
    console.error('Error creating community question:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create question' },
      { status: 500 }
    );
  }
} 