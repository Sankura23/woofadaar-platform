import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const category = searchParams.get('category');
    const tags = searchParams.get('tags')?.split(',');
    const hasAcceptedAnswer = searchParams.get('hasAcceptedAnswer');
    const isExpertAnswered = searchParams.get('isExpertAnswered');
    const isUrgent = searchParams.get('isUrgent');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const sortBy = searchParams.get('sortBy') || 'relevance';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!query && !category && !tags) {
      return NextResponse.json(
        { success: false, error: 'At least one search parameter is required' },
        { status: 400 }
      );
    }

    // Build where clause for advanced search
    const where: any = { status: 'active' };

    if (query) {
      where.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { content: { contains: query, mode: 'insensitive' } },
        { tags: { hasSome: [query] } }
      ];
    }

    if (category) where.category = category;
    if (tags && tags.length > 0) where.tags = { hasSome: tags };
    if (hasAcceptedAnswer !== null) where.has_accepted_answer = hasAcceptedAnswer === 'true';
    if (isUrgent !== null) where.is_urgent = isUrgent === 'true';

    if (dateFrom || dateTo) {
      where.created_at = {};
      if (dateFrom) where.created_at.gte = new Date(dateFrom);
      if (dateTo) where.created_at.lte = new Date(dateTo);
    }

    // Handle expert answered filter
    if (isExpertAnswered === 'true') {
      where.answers = {
        some: {
          is_expert_answer: true,
          status: 'active'
        }
      };
    }

    // Build order by clause
    let orderBy: any = {};
    switch (sortBy) {
      case 'newest':
        orderBy = { created_at: 'desc' };
        break;
      case 'oldest':
        orderBy = { created_at: 'asc' };
        break;
      case 'mostVoted':
        orderBy = { upvotes: 'desc' };
        break;
      case 'mostAnswered':
        orderBy = { answer_count: 'desc' };
        break;
      case 'lastActivity':
        orderBy = { last_activity_at: 'desc' };
        break;
      case 'relevance':
      default:
        // For relevance, we'll order by a combination of factors
        orderBy = [
          { is_featured: 'desc' },
          { upvotes: 'desc' },
          { created_at: 'desc' }
        ];
        break;
    }

    const questions = await prisma.communityQuestion.findMany({
      where,
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
        },
        answers: {
          where: { status: 'active' },
          select: {
            id: true,
            is_best_answer: true,
            is_expert_answer: true,
            expert_badge_type: true,
            upvotes: true,
            user: {
              select: {
                id: true,
                name: true,
                profile_image_url: true
              }
            }
          },
          orderBy: [
            { is_best_answer: 'desc' },
            { is_expert_answer: 'desc' },
            { upvotes: 'desc' }
          ],
          take: 3
        },
        similar_questions: {
          select: {
            similar_question: {
              select: {
                id: true,
                title: true
              }
            },
            similarity_score: true
          },
          take: 3,
          orderBy: { similarity_score: 'desc' }
        },
        _count: {
          select: {
            answers: true,
            comments: true,
            views: true
          }
        }
      },
      orderBy,
      take: limit,
      skip: offset
    });

    const total = await prisma.communityQuestion.count({ where });

    // Calculate search metrics for analytics
    if (query) {
      await prisma.searchAnalytics.create({
        data: {
          user_id: null, // Anonymous search for now
          search_query: query,
          search_category: 'community_questions',
          results_count: total,
          filters_applied: {
            category,
            tags,
            hasAcceptedAnswer,
            isExpertAnswered,
            isUrgent,
            dateFrom,
            dateTo,
            sortBy
          }
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        questions,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        },
        searchMeta: {
          query,
          resultsCount: total,
          searchTime: Date.now()
        }
      }
    });
  } catch (error) {
    console.error('Error searching questions:', error);
    return NextResponse.json(
      { success: false, error: 'Search failed' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { queries } = body; // Array of search queries for batch search

    if (!queries || !Array.isArray(queries) || queries.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Queries array is required' },
        { status: 400 }
      );
    }

    const results = [];

    for (const query of queries.slice(0, 10)) { // Limit to 10 queries
      const where: any = {
        status: 'active',
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
          { tags: { hasSome: [query] } }
        ]
      };

      const questions = await prisma.communityQuestion.findMany({
        where,
        select: {
          id: true,
          title: true,
          content: true,
          tags: true,
          upvotes: true,
          answer_count: true,
          created_at: true
        },
        orderBy: [
          { upvotes: 'desc' },
          { created_at: 'desc' }
        ],
        take: 5
      });

      results.push({
        query,
        results: questions,
        count: questions.length
      });
    }

    return NextResponse.json({
      success: true,
      data: { results }
    });
  } catch (error) {
    console.error('Error batch searching questions:', error);
    return NextResponse.json(
      { success: false, error: 'Batch search failed' },
      { status: 500 }
    );
  }
}