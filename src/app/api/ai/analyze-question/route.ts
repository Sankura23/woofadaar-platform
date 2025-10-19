import { NextRequest, NextResponse } from 'next/server';
import { localLlamaService } from '@/lib/local-llama-service';
import { aiAnalysisService } from '@/lib/ai-analysis-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, category } = body;

    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: 'Title and content are required' },
        { status: 400 }
      );
    }

    // Try Local Llama first (best AI analysis)
    try {
      console.log('🦙 Attempting Local Llama analysis...');

      const isLlamaAvailable = await localLlamaService.isAvailable();

      if (isLlamaAvailable) {
        const analysis = await localLlamaService.analyzeQuestion({
          title,
          content,
          category: category || 'general'
        });

        console.log('✅ Local Llama analysis successful');
        return NextResponse.json({
          success: true,
          data: {
            overallScore: analysis.overallScore,
            clarity: analysis.clarity,
            urgency: analysis.urgency,
            completeness: analysis.completeness,
            category: analysis.category,
            suggestedTags: analysis.suggestedTags,
            feedback: analysis.feedback,
            confidenceLevel: analysis.confidenceLevel
          }
        });
      } else {
        console.log('⚠️ Local Llama not available, falling back to enhanced analysis');
      }
    } catch (llamaError) {
      console.warn('🔄 Local Llama failed, using fallback:', llamaError);
    }

    // Fallback to enhanced rule-based analysis
    const analysis = await aiAnalysisService.analyzeQuestion({
      title,
      content,
      category: category || 'general'
    });

    return NextResponse.json({
      success: true,
      data: analysis
    });

  } catch (error) {
    console.error('AI Analysis API error:', error);
    return NextResponse.json(
      { success: false, error: 'Analysis failed' },
      { status: 500 }
    );
  }
}