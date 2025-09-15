import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// Simple text similarity algorithm (can be enhanced with better NLP)
function calculateTextSimilarity(text1: string, text2: string): number {
  const normalize = (text: string) => text.toLowerCase().trim();
  const getWords = (text: string) => normalize(text).split(/\s+/);
  
  const words1 = getWords(text1);
  const words2 = getWords(text2);
  
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  
  const intersection = new Set([...set1].filter(word => set2.has(word)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size; // Jaccard similarity
}

function calculateTitleSimilarity(title1: string, title2: string): number {
  // Higher weight for title similarity
  const titleSim = calculateTextSimilarity(title1, title2);
  
  // Check for exact phrase matches
  const phrases1 = title1.toLowerCase().split(/[.!?]/);
  const phrases2 = title2.toLowerCase().split(/[.!?]/);
  
  let phraseMatches = 0;
  for (const phrase1 of phrases1) {
    for (const phrase2 of phrases2) {
      if (phrase1.trim() && phrase2.trim() && 
          (phrase1.includes(phrase2.trim()) || phrase2.includes(phrase1.trim()))) {
        phraseMatches++;
      }
    }
  }
  
  return Math.min(1.0, titleSim + (phraseMatches * 0.2));
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const body = await request.json();
    const { title, content, category, tags } = body;

    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: 'Title and content are required' },
        { status: 400 }
      );
    }

    // Find potential duplicates based on category and tags first
    const where: any = {
      status: 'active'
    };

    if (category) where.category = category;
    if (tags && tags.length > 0) {
      where.tags = { hasSome: tags };
    }

    // Get questions from similar category/tags for efficiency
    const potentialDuplicates = await prisma.communityQuestion.findMany({
      where,
      select: {
        id: true,
        title: true,
        content: true,
        tags: true,
        upvotes: true,
        answer_count: true,
        has_accepted_answer: true,
        created_at: true,
        user: {
          select: {
            id: true,
            name: true,
            profile_image_url: true
          }
        }
      },
      orderBy: { created_at: 'desc' },
      take: 100 // Limit for performance
    });

    const similarQuestions: Array<{
      question: any;
      titleSimilarity: number;
      contentSimilarity: number;
      overallSimilarity: number;
    }> = [];

    for (const question of potentialDuplicates) {
      const titleSim = calculateTitleSimilarity(title, question.title);
      const contentSim = calculateTextSimilarity(content, question.content);
      
      // Weight title more heavily than content
      const overallSim = (titleSim * 0.7) + (contentSim * 0.3);
      
      // Consider tag overlap
      let tagSimilarity = 0;
      if (tags && tags.length > 0 && question.tags.length > 0) {
        const tagIntersection = tags.filter(tag => question.tags.includes(tag));
        tagSimilarity = tagIntersection.length / Math.max(tags.length, question.tags.length);
      }
      
      const finalSimilarity = (overallSim * 0.8) + (tagSimilarity * 0.2);
      
      if (finalSimilarity > 0.3) { // Threshold for similarity
        similarQuestions.push({
          question,
          titleSimilarity: Math.round(titleSim * 100) / 100,
          contentSimilarity: Math.round(contentSim * 100) / 100,
          overallSimilarity: Math.round(finalSimilarity * 100) / 100
        });
      }
    }

    // Sort by similarity score
    similarQuestions.sort((a, b) => b.overallSimilarity - a.overallSimilarity);

    // Take top 5 similar questions
    const topSimilar = similarQuestions.slice(0, 5);

    // Determine if it's likely a duplicate
    const likelyDuplicate = topSimilar.length > 0 && topSimilar[0].overallSimilarity > 0.7;

    return NextResponse.json({
      success: true,
      data: {
        similarQuestions: topSimilar,
        likelyDuplicate,
        duplicateThreshold: 0.7,
        recommendations: likelyDuplicate ? [
          'Consider reviewing similar questions before posting',
          'You might find your answer in existing discussions',
          'If your question is unique, please explain how it differs'
        ] : [
          'Your question appears to be unique',
          'Consider adding relevant tags to help others find it'
        ]
      }
    });
  } catch (error) {
    console.error('Error detecting duplicates:', error);
    return NextResponse.json(
      { success: false, error: 'Duplicate detection failed' },
      { status: 500 }
    );
  }
}

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
    const { questionId, duplicateOfId, action } = body; // action: 'mark_duplicate' | 'not_duplicate'

    if (!questionId || !action) {
      return NextResponse.json(
        { success: false, error: 'Question ID and action are required' },
        { status: 400 }
      );
    }

    // Only partners or moderators can mark duplicates
    if (!('partnerId' in user) && user.userType !== 'moderator') {
      return NextResponse.json(
        { success: false, error: 'Only partners and moderators can mark duplicates' },
        { status: 403 }
      );
    }

    if (action === 'mark_duplicate') {
      if (!duplicateOfId) {
        return NextResponse.json(
          { success: false, error: 'Duplicate of ID is required' },
          { status: 400 }
        );
      }

      // Update the question as duplicate
      const updatedQuestion = await prisma.communityQuestion.update({
        where: { id: questionId },
        data: {
          duplicate_of_id: duplicateOfId,
          status: 'duplicate'
        }
      });

      // Create similarity record
      await prisma.questionSimilarity.upsert({
        where: {
          question_id_similar_question_id: {
            question_id: questionId,
            similar_question_id: duplicateOfId
          }
        },
        update: {
          similarity_score: 1.0,
          algorithm_used: 'manual_review'
        },
        create: {
          question_id: questionId,
          similar_question_id: duplicateOfId,
          similarity_score: 1.0,
          algorithm_used: 'manual_review'
        }
      });

      return NextResponse.json({
        success: true,
        data: { question: updatedQuestion }
      });
    } else if (action === 'not_duplicate') {
      // Mark as reviewed and not duplicate
      await prisma.communityQuestion.update({
        where: { id: questionId },
        data: {
          duplicate_of_id: null,
          status: 'active'
        }
      });

      return NextResponse.json({
        success: true,
        data: { message: 'Question marked as not duplicate' }
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error managing duplicate status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update duplicate status' },
      { status: 500 }
    );
  }
}