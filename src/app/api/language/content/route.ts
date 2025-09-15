import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { contentLanguageManager } from '@/lib/content-language-manager';

// GET /api/language/content - Get content in user's preferred language
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
    const contentId = searchParams.get('contentId');
    const preferredLanguage = searchParams.get('preferredLanguage') as 'en' | 'hi' | null;

    if (!contentId) {
      return NextResponse.json(
        { success: false, error: 'Content ID is required' },
        { status: 400 }
      );
    }

    // Get content in user's preferred language
    const content = await contentLanguageManager.getContentInPreferredLanguage(
      contentId,
      user.id,
      preferredLanguage || undefined
    );

    return NextResponse.json({
      success: true,
      data: {
        contentId,
        content: content.content,
        language: content.language,
        isTranslated: content.isTranslated,
        translationMethod: content.translationMethod,
        confidence: content.confidence
      }
    });

  } catch (error) {
    console.error('Error getting content in preferred language:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve content' },
      { status: 500 }
    );
  }
}

// POST /api/language/content - Process new content with language analysis
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
    const { content, contentType, expectedLanguage } = body;

    if (!content || !contentType) {
      return NextResponse.json(
        { success: false, error: 'Content and content type are required' },
        { status: 400 }
      );
    }

    // Valid content types
    const validContentTypes = ['question', 'answer', 'comment', 'story', 'post'];
    if (!validContentTypes.includes(contentType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid content type' },
        { status: 400 }
      );
    }

    // Process content with language analysis
    const analysis = await contentLanguageManager.processNewContent(
      content,
      user.id,
      contentType,
      expectedLanguage
    );

    return NextResponse.json({
      success: true,
      data: {
        contentId: analysis.contentId,
        languageAnalysis: {
          detectedLanguage: analysis.languageAnalysis.detectedLanguage,
          confidence: analysis.languageAnalysis.confidence,
          needsTranslation: analysis.languageAnalysis.needsTranslation,
          moderationFlags: analysis.languageAnalysis.moderationFlags
        },
        recommendations: analysis.recommendedActions
      }
    });

  } catch (error) {
    console.error('Error processing content language:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process content' },
      { status: 500 }
    );
  }
}

// GET /api/language/stats - Get language statistics (admin only)
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
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') as 'day' | 'week' | 'month' || 'week';

    // Get language statistics
    const stats = await contentLanguageManager.getContentLanguageStats(timeframe);

    // Calculate additional insights
    const insights = {
      dominantLanguage: stats.languageBreakdown.english > stats.languageBreakdown.hindi ? 'english' : 'hindi',
      translationNeeded: Math.round((stats.translationCoverage.needsTranslation / stats.totalContent) * 100),
      qualityScore: Math.round(stats.qualityMetrics.averageDetectionConfidence * 100),
      communityEngagement: stats.qualityMetrics.communityTranslations > 0 ? 'active' : 'inactive'
    };

    return NextResponse.json({
      success: true,
      data: {
        stats,
        insights,
        timeframe
      }
    });

  } catch (error) {
    console.error('Error getting language statistics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve statistics' },
      { status: 500 }
    );
  }
}