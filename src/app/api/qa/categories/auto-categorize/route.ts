import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { categorizeQuestion, processCategorization, analyzeQuestionQuality } from '@/lib/ai-categorization';
import prisma from '@/lib/db';

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
    const { title, content, questionId } = body;

    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: 'Title and content are required' },
        { status: 400 }
      );
    }

    // Run AI categorization
    const categorization = await categorizeQuestion(title, content);
    
    // Analyze question quality
    const qualityAnalysis = analyzeQuestionQuality(title, content);

    // If questionId is provided, store the categorization result
    if (questionId) {
      try {
        await prisma.questionCategorization.create({
          data: {
            question_id: questionId,
            suggested_category: categorization.primaryCategory.category,
            suggested_tags: categorization.suggestedTags.map(t => t.tag),
            confidence_score: categorization.overallConfidence,
            categorization_method: categorization.method,
            is_approved: categorization.overallConfidence > 0.8 // Auto-approve high confidence
          }
        });
      } catch (dbError) {
        console.warn('Failed to store categorization in database:', dbError);
        // Continue without storing - categorization still works
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        categorization,
        quality_analysis: qualityAnalysis,
        auto_approved: categorization.overallConfidence > 0.8
      }
    });

  } catch (error) {
    console.error('Auto-categorization error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to categorize question' },
      { status: 500 }
    );
  }
}