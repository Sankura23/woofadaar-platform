import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { contentAnalyzer } from '@/lib/advanced-content-analyzer';

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
    const { content, contentType, contentId, analysisType } = body;

    if (!content || !contentType) {
      return NextResponse.json(
        { success: false, error: 'Content and contentType are required' },
        { status: 400 }
      );
    }

    const validTypes = ['question', 'answer', 'comment', 'forum_post', 'story'];
    if (!validTypes.includes(contentType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid content type' },
        { status: 400 }
      );
    }

    let analysisResult;
    const startTime = Date.now();

    switch (analysisType) {
      case 'spam':
        analysisResult = await contentAnalyzer.spamDetector.analyzeSpam(content);
        break;
      case 'quality':
        analysisResult = await contentAnalyzer.qualityAnalyzer.analyzeQuality(content);
        break;
      case 'toxicity':
        analysisResult = await contentAnalyzer.toxicityDetector.analyzeToxicity(content);
        break;
      case 'comprehensive':
      default:
        analysisResult = await contentAnalyzer.analyzeContent(content);
        break;
    }

    const processingTime = Date.now() - startTime;

    // If contentId is provided and this is a comprehensive analysis, store the results
    if (contentId && analysisType === 'comprehensive') {
      try {
        await prisma.contentQualityScore.upsert({
          where: {
            content_type_content_id: {
              content_type: contentType,
              content_id: contentId
            }
          },
          update: {
            quality_score: analysisResult.quality.qualityScore,
            spam_likelihood: analysisResult.spam.spamScore,
            toxicity_score: analysisResult.toxicity.toxicityScore,
            readability_score: analysisResult.quality.readabilityScore,
            engagement_score: Math.min(analysisResult.overallScore, 100),
            ai_confidence: (analysisResult.spam.confidence + analysisResult.toxicity.toxicityScore / 100) / 2,
            flags: [
              ...analysisResult.spam.flags,
              ...analysisResult.toxicity.flags,
              ...(analysisResult.quality.qualityScore < 50 ? ['low_quality'] : [])
            ],
            analysis_data: {
              spam: analysisResult.spam,
              quality: analysisResult.quality,
              toxicity: analysisResult.toxicity,
              recommendation: analysisResult.recommendation,
              processingTime: analysisResult.processingTime
            },
            last_analyzed: new Date()
          },
          create: {
            content_type: contentType,
            content_id: contentId,
            quality_score: analysisResult.quality.qualityScore,
            spam_likelihood: analysisResult.spam.spamScore,
            toxicity_score: analysisResult.toxicity.toxicityScore,
            readability_score: analysisResult.quality.readabilityScore,
            engagement_score: Math.min(analysisResult.overallScore, 100),
            ai_confidence: (analysisResult.spam.confidence + analysisResult.toxicity.toxicityScore / 100) / 2,
            flags: [
              ...analysisResult.spam.flags,
              ...analysisResult.toxicity.flags,
              ...(analysisResult.quality.qualityScore < 50 ? ['low_quality'] : [])
            ],
            analysis_data: {
              spam: analysisResult.spam,
              quality: analysisResult.quality,
              toxicity: analysisResult.toxicity,
              recommendation: analysisResult.recommendation,
              processingTime: analysisResult.processingTime
            },
            last_analyzed: new Date()
          }
        });

        // Log the analysis for monitoring
        await prisma.autoModerationLog.create({
          data: {
            content_type: contentType,
            content_id: contentId,
            check_type: analysisType || 'comprehensive',
            result: analysisResult.recommendation === 'approve' ? 'passed' : 'flagged',
            confidence: analysisType === 'comprehensive' ? 
              (analysisResult.spam.confidence + analysisResult.toxicity.toxicityScore / 100) / 2 :
              analysisResult.confidence || 0.5,
            flags_detected: analysisType === 'comprehensive' ? 
              [...analysisResult.spam.flags, ...analysisResult.toxicity.flags] :
              analysisResult.flags || [],
            raw_scores: analysisResult,
            processing_time: processingTime
          }
        });

      } catch (dbError) {
        console.error('Error storing analysis results:', dbError);
        // Continue anyway, don't fail the API call
      }
    }

    // Prepare response with additional metadata
    const response = {
      success: true,
      data: {
        analysis: analysisResult,
        metadata: {
          analysisType: analysisType || 'comprehensive',
          contentType,
          contentId: contentId || null,
          processingTime,
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      }
    };

    // Add recommendations for improvement if quality is low
    if (analysisType === 'comprehensive' && analysisResult.quality.qualityScore < 60) {
      response.data.recommendations = [
        'Consider adding more detail to your content',
        'Check for proper grammar and punctuation',
        'Make sure your content is relevant to pet care',
        'Use clear, simple language that\'s easy to understand'
      ];
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error analyzing content:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to analyze content',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

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
    const contentType = searchParams.get('contentType');
    const contentId = searchParams.get('contentId');
    const minScore = parseInt(searchParams.get('minScore') || '0');
    const maxScore = parseInt(searchParams.get('maxScore') || '100');
    const hasFlags = searchParams.get('hasFlags') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause for quality scores
    const where: any = {};
    
    if (contentType) where.content_type = contentType;
    if (contentId) where.content_id = contentId;
    
    // Score range filtering
    if (minScore > 0 || maxScore < 100) {
      where.quality_score = {
        gte: minScore,
        lte: maxScore
      };
    }
    
    // Filter by flagged content
    if (hasFlags) {
      where.flags = {
        not: { equals: [] }
      };
    }

    const scores = await prisma.contentQualityScore.findMany({
      where,
      orderBy: { last_analyzed: 'desc' },
      take: limit,
      skip: offset
    });

    const total = await prisma.contentQualityScore.count({ where });

    // Get aggregated statistics
    const stats = await prisma.contentQualityScore.aggregate({
      where,
      _avg: {
        quality_score: true,
        spam_likelihood: true,
        toxicity_score: true,
        readability_score: true,
        engagement_score: true,
        ai_confidence: true
      },
      _min: {
        quality_score: true,
        spam_likelihood: true,
        toxicity_score: true
      },
      _max: {
        quality_score: true,
        spam_likelihood: true,
        toxicity_score: true
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        scores,
        statistics: {
          total,
          averages: {
            qualityScore: Math.round(stats._avg.quality_score || 0),
            spamLikelihood: Math.round(stats._avg.spam_likelihood || 0),
            toxicityScore: Math.round(stats._avg.toxicity_score || 0),
            readabilityScore: Math.round(stats._avg.readability_score || 0),
            engagementScore: Math.round(stats._avg.engagement_score || 0),
            aiConfidence: Math.round((stats._avg.ai_confidence || 0) * 100)
          },
          ranges: {
            qualityScore: {
              min: stats._min.quality_score || 0,
              max: stats._max.quality_score || 100
            },
            spamLikelihood: {
              min: stats._min.spam_likelihood || 0,
              max: stats._max.spam_likelihood || 100
            },
            toxicityScore: {
              min: stats._min.toxicity_score || 0,
              max: stats._max.toxicity_score || 100
            }
          }
        },
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      }
    });

  } catch (error) {
    console.error('Error fetching content analysis:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analysis data' },
      { status: 500 }
    );
  }
}