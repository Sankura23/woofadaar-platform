import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { languageDetection } from '@/lib/language-detection';
import { contentLanguageManager } from '@/lib/content-language-manager';

// POST /api/language/detect - Detect language of text content
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    const body = await request.json();
    const { text, contentType, expectedLanguage } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Text content is required' },
        { status: 400 }
      );
    }

    // Detect browser language preferences
    const userAgent = request.headers.get('user-agent') || '';
    const acceptLanguage = request.headers.get('accept-language') || 'en-US,en;q=0.9';
    
    // Parse accept-language header
    const browserLanguages = acceptLanguage
      .split(',')
      .map(lang => lang.split(';')[0].trim());

    // Perform language detection
    const detection = languageDetection.detectTextLanguage(text);
    const browserInfo = languageDetection.detectBrowserLanguage();
    
    // If user is authenticated, process content with user context
    let contentAnalysis = null;
    let userId = null;

    if (token) {
      try {
        const user = await verifyToken(token);
        if (user) {
          userId = user.id;
          
          // Process content with user context if contentType is provided
          if (contentType) {
            const analysis = await contentLanguageManager.processNewContent(
              text,
              userId,
              contentType,
              expectedLanguage
            );
            contentAnalysis = analysis;
          }
        }
      } catch (authError) {
        // Continue without user context if auth fails
        console.log('Auth failed, continuing with basic detection');
      }
    }

    // Generate language suggestion
    const optimalLanguage = languageDetection.suggestOptimalLanguage(
      browserInfo,
      detection,
      userId ? { previousLanguage: expectedLanguage } : undefined
    );

    // Prepare response
    const response = {
      success: true,
      data: {
        detection: {
          detectedLanguage: detection.detectedLanguage,
          confidence: detection.confidence,
          script: detection.script,
          reasons: detection.reasons
        },
        suggestions: {
          suggestedLanguage: detection.suggestedLanguage,
          optimalLanguage,
          shouldTranslate: detection.detectedLanguage !== optimalLanguage
        },
        browserInfo: {
          primary: browserInfo.primary,
          preferred: browserInfo.preferredIndianLanguage,
          languages: browserLanguages
        },
        ...(contentAnalysis && {
          contentAnalysis: {
            contentId: contentAnalysis.contentId,
            needsTranslation: contentAnalysis.languageAnalysis.needsTranslation,
            moderationFlags: contentAnalysis.languageAnalysis.moderationFlags,
            recommendations: contentAnalysis.recommendedActions
          }
        })
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in language detection API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to detect language' },
      { status: 500 }
    );
  }
}

// GET /api/language/detect - Auto-detect optimal language for user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get('location');
    const sampleText = searchParams.get('sampleText');

    // Get browser language info
    const acceptLanguage = request.headers.get('accept-language') || 'en-US,en;q=0.9';
    const browserLanguages = acceptLanguage
      .split(',')
      .map(lang => lang.split(';')[0].trim());

    // Auto-detect optimal language
    const autoDetection = await languageDetection.autoDetectAndSetLanguage();
    
    // Get suggestion for new user
    const newUserSuggestion = await contentLanguageManager.suggestLanguageForNewUser(
      browserLanguages,
      location || undefined,
      sampleText || undefined
    );

    return NextResponse.json({
      success: true,
      data: {
        autoDetection: {
          detectedLanguage: autoDetection.detectedLanguage,
          confidence: autoDetection.confidence,
          method: autoDetection.method,
          shouldPromptUser: autoDetection.shouldPromptUser
        },
        newUserSuggestion: {
          suggestedLanguage: newUserSuggestion.suggestedLanguage,
          confidence: newUserSuggestion.confidence,
          reasoning: newUserSuggestion.reasoning,
          shouldPromptUser: newUserSuggestion.shouldPromptUser
        },
        browserLanguages
      }
    });

  } catch (error) {
    console.error('Error in auto language detection:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to auto-detect language' },
      { status: 500 }
    );
  }
}