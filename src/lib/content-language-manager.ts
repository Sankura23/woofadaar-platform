// Week 24 Phase 2: Content Language Management System
// Handles multilingual content storage, retrieval, and user-generated content language detection

import prisma from './db';
import { languageDetection, LanguageDetectionEngine } from './language-detection';

export interface MultilingualContent {
  id: string;
  contentType: 'question' | 'answer' | 'comment' | 'story' | 'post';
  primaryLanguage: 'en' | 'hi' | 'mixed';
  detectedLanguage: 'en' | 'hi' | 'mixed';
  confidence: number;
  translations?: {
    en?: string;
    hi?: string;
  };
  originalText: string;
  translatedBy?: 'ai' | 'community' | 'user';
  needsTranslation: boolean;
  moderationFlags?: {
    languageMismatch?: boolean;
    inappropriateLanguage?: boolean;
    needsTranslationReview?: boolean;
  };
}

export interface ContentLanguageStats {
  totalContent: number;
  languageBreakdown: {
    english: number;
    hindi: number;
    mixed: number;
  };
  translationCoverage: {
    fullyTranslated: number;
    partiallyTranslated: number;
    needsTranslation: number;
  };
  qualityMetrics: {
    averageDetectionConfidence: number;
    communityTranslations: number;
    aiTranslations: number;
  };
}

export class ContentLanguageManager {
  private detectionEngine: LanguageDetectionEngine;

  constructor() {
    this.detectionEngine = languageDetection;
  }

  /**
   * Process and analyze new user-generated content
   */
  public async processNewContent(
    content: string,
    userId: string,
    contentType: 'question' | 'answer' | 'comment' | 'story' | 'post',
    expectedLanguage?: 'en' | 'hi'
  ): Promise<{
    contentId: string;
    languageAnalysis: MultilingualContent;
    recommendedActions: string[];
  }> {
    try {
      // Detect content language
      const detection = this.detectionEngine.detectTextLanguage(content);
      
      // Get user's language preference for comparison
      const userProfile = await this.getUserLanguageProfile(userId);
      
      // Determine if content needs translation
      const needsTranslation = this.shouldTranslateContent(detection, userProfile, expectedLanguage);
      
      // Generate content ID
      const contentId = `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create multilingual content record
      const multilingualContent: MultilingualContent = {
        id: contentId,
        contentType,
        primaryLanguage: detection.detectedLanguage,
        detectedLanguage: detection.detectedLanguage,
        confidence: detection.confidence,
        originalText: content,
        needsTranslation,
        moderationFlags: this.generateModerationFlags(detection, userProfile, expectedLanguage)
      };

      // Store in database (would be implemented with actual schema)
      await this.storeContentLanguageData(multilingualContent, userId);

      // Generate recommendations
      const recommendedActions = this.generateContentRecommendations(
        multilingualContent,
        userProfile,
        expectedLanguage
      );

      return {
        contentId,
        languageAnalysis: multilingualContent,
        recommendedActions
      };

    } catch (error) {
      console.error('Error processing content language:', error);
      
      // Return safe defaults
      return {
        contentId: `fallback_${Date.now()}`,
        languageAnalysis: {
          id: 'fallback',
          contentType,
          primaryLanguage: 'en',
          detectedLanguage: 'en',
          confidence: 0,
          originalText: content,
          needsTranslation: false
        },
        recommendedActions: ['Content processed with default language settings']
      };
    }
  }

  /**
   * Get user's language profile and preferences
   */
  private async getUserLanguageProfile(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          preferred_language: true,
          location: true,
          // Get recent content language patterns
          engagement_history: {
            select: {
              action_type: true,
              created_at: true
            },
            take: 10,
            orderBy: { created_at: 'desc' }
          }
        }
      });

      return {
        preferredLanguage: user?.preferred_language || 'en',
        location: user?.location,
        recentActivity: user?.engagement_history || []
      };
    } catch (error) {
      console.error('Error getting user language profile:', error);
      return {
        preferredLanguage: 'en',
        location: null,
        recentActivity: []
      };
    }
  }

  /**
   * Determine if content should be translated
   */
  private shouldTranslateContent(
    detection: any,
    userProfile: any,
    expectedLanguage?: 'en' | 'hi'
  ): boolean {
    // Always translate if detection confidence is high and languages don't match
    if (detection.confidence > 0.8 && expectedLanguage && detection.detectedLanguage !== expectedLanguage) {
      return true;
    }

    // Translate mixed language content for clarity
    if (detection.detectedLanguage === 'mixed') {
      return true;
    }

    // Translate if content language differs from user preference
    if (userProfile.preferredLanguage !== detection.detectedLanguage) {
      return true;
    }

    return false;
  }

  /**
   * Generate moderation flags based on language analysis
   */
  private generateModerationFlags(
    detection: any,
    userProfile: any,
    expectedLanguage?: 'en' | 'hi'
  ) {
    const flags: any = {};

    // Language mismatch flag
    if (expectedLanguage && detection.detectedLanguage !== expectedLanguage && detection.confidence > 0.7) {
      flags.languageMismatch = true;
    }

    // Low confidence detection needs review
    if (detection.confidence < 0.4) {
      flags.needsTranslationReview = true;
    }

    // Mixed language content might need moderation
    if (detection.detectedLanguage === 'mixed') {
      flags.needsTranslationReview = true;
    }

    return Object.keys(flags).length > 0 ? flags : undefined;
  }

  /**
   * Store content language data in database
   */
  private async storeContentLanguageData(content: MultilingualContent, userId: string) {
    try {
      // This would use the actual database schema when implemented
      // For now, store in a mock format
      
      console.log('Storing content language data:', {
        contentId: content.id,
        userId,
        detectedLanguage: content.detectedLanguage,
        confidence: content.confidence,
        needsTranslation: content.needsTranslation
      });

      // In actual implementation, this would be:
      // await prisma.contentLanguageAnalysis.create({
      //   data: {
      //     content_id: content.id,
      //     user_id: userId,
      //     content_type: content.contentType,
      //     detected_language: content.detectedLanguage,
      //     confidence: content.confidence,
      //     needs_translation: content.needsTranslation,
      //     moderation_flags: content.moderationFlags,
      //     original_text: content.originalText
      //   }
      // });

    } catch (error) {
      console.error('Error storing content language data:', error);
    }
  }

  /**
   * Generate content-specific recommendations
   */
  private generateContentRecommendations(
    content: MultilingualContent,
    userProfile: any,
    expectedLanguage?: 'en' | 'hi'
  ): string[] {
    const recommendations: string[] = [];

    if (content.confidence < 0.5) {
      recommendations.push('Language detection confidence is low - content may need manual review');
    }

    if (content.needsTranslation) {
      recommendations.push('Content should be translated for better accessibility');
    }

    if (content.moderationFlags?.languageMismatch) {
      recommendations.push('Content language differs from expected language - verify appropriateness');
    }

    if (content.detectedLanguage === 'mixed') {
      recommendations.push('Mixed language content detected - consider providing translations in both languages');
    }

    if (content.detectedLanguage !== userProfile.preferredLanguage) {
      recommendations.push(`Content is in ${content.detectedLanguage} but user prefers ${userProfile.preferredLanguage}`);
    }

    return recommendations;
  }

  /**
   * Get content in user's preferred language
   */
  public async getContentInPreferredLanguage(
    contentId: string,
    userId: string,
    preferredLanguage?: 'en' | 'hi'
  ): Promise<{
    content: string;
    language: 'en' | 'hi';
    isTranslated: boolean;
    translationMethod?: 'ai' | 'community' | 'original';
    confidence?: number;
  }> {
    try {
      // Get user's language preference if not provided
      if (!preferredLanguage) {
        const userProfile = await this.getUserLanguageProfile(userId);
        preferredLanguage = userProfile.preferredLanguage as 'en' | 'hi';
      }

      // Fetch content language data
      const contentData = await this.getStoredContentLanguageData(contentId);
      
      if (!contentData) {
        return {
          content: '',
          language: 'en',
          isTranslated: false,
          translationMethod: 'original'
        };
      }

      // If content is already in preferred language
      if (contentData.primaryLanguage === preferredLanguage) {
        return {
          content: contentData.originalText,
          language: preferredLanguage,
          isTranslated: false,
          translationMethod: 'original',
          confidence: contentData.confidence
        };
      }

      // Check if translation exists
      if (contentData.translations && contentData.translations[preferredLanguage]) {
        return {
          content: contentData.translations[preferredLanguage],
          language: preferredLanguage,
          isTranslated: true,
          translationMethod: contentData.translatedBy || 'ai',
          confidence: contentData.confidence
        };
      }

      // Return original with note about missing translation
      return {
        content: contentData.originalText,
        language: contentData.primaryLanguage,
        isTranslated: false,
        translationMethod: 'original',
        confidence: contentData.confidence
      };

    } catch (error) {
      console.error('Error getting content in preferred language:', error);
      return {
        content: '',
        language: preferredLanguage || 'en',
        isTranslated: false,
        translationMethod: 'original'
      };
    }
  }

  /**
   * Get stored content language data
   */
  private async getStoredContentLanguageData(contentId: string): Promise<MultilingualContent | null> {
    try {
      // This would query the actual database
      // For now, return mock data structure
      
      // In actual implementation:
      // const data = await prisma.contentLanguageAnalysis.findUnique({
      //   where: { content_id: contentId },
      //   include: { translations: true }
      // });
      
      return null; // Placeholder
    } catch (error) {
      console.error('Error fetching stored content language data:', error);
      return null;
    }
  }

  /**
   * Get language statistics for admin dashboard
   */
  public async getContentLanguageStats(
    timeframe: 'day' | 'week' | 'month' = 'week'
  ): Promise<ContentLanguageStats> {
    try {
      const daysBack = timeframe === 'day' ? 1 : timeframe === 'week' ? 7 : 30;
      const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

      // Mock implementation - would query actual database
      const mockStats: ContentLanguageStats = {
        totalContent: 1234,
        languageBreakdown: {
          english: 856,
          hindi: 298,
          mixed: 80
        },
        translationCoverage: {
          fullyTranslated: 445,
          partiallyTranslated: 123,
          needsTranslation: 234
        },
        qualityMetrics: {
          averageDetectionConfidence: 0.82,
          communityTranslations: 67,
          aiTranslations: 378
        }
      };

      return mockStats;
      
    } catch (error) {
      console.error('Error getting content language stats:', error);
      
      // Return empty stats
      return {
        totalContent: 0,
        languageBreakdown: { english: 0, hindi: 0, mixed: 0 },
        translationCoverage: { fullyTranslated: 0, partiallyTranslated: 0, needsTranslation: 0 },
        qualityMetrics: { averageDetectionConfidence: 0, communityTranslations: 0, aiTranslations: 0 }
      };
    }
  }

  /**
   * Auto-detect and suggest language for new user onboarding
   */
  public async suggestLanguageForNewUser(
    browserLanguages: string[],
    location?: string,
    sampleText?: string
  ): Promise<{
    suggestedLanguage: 'en' | 'hi';
    confidence: number;
    reasoning: string[];
    shouldPromptUser: boolean;
  }> {
    const reasoning: string[] = [];
    let confidence = 0;
    let suggestedLanguage: 'en' | 'hi' = 'en';

    // Browser language analysis
    const browserInfo = this.detectionEngine.detectBrowserLanguage();
    if (browserInfo.preferredIndianLanguage === 'hi') {
      suggestedLanguage = 'hi';
      confidence += 0.4;
      reasoning.push('Browser language preference indicates Hindi');
    }

    // Location-based suggestion
    if (location) {
      const hindiPreferredStates = [
        'uttar pradesh', 'bihar', 'madhya pradesh', 'rajasthan', 
        'haryana', 'himachal pradesh', 'jharkhand', 'uttarakhand'
      ];
      
      if (hindiPreferredStates.some(state => 
        location.toLowerCase().includes(state)
      )) {
        suggestedLanguage = 'hi';
        confidence += 0.3;
        reasoning.push('Location suggests Hindi preference');
      }
    }

    // Sample text analysis
    if (sampleText) {
      const textAnalysis = this.detectionEngine.detectTextLanguage(sampleText);
      if (textAnalysis.suggestedLanguage === 'hi') {
        suggestedLanguage = 'hi';
        confidence += textAnalysis.confidence * 0.3;
        reasoning.push(`Sample text analysis suggests Hindi (confidence: ${textAnalysis.confidence.toFixed(2)})`);
      }
    }

    // Determine if we should prompt user
    const shouldPromptUser = confidence < 0.7;

    if (reasoning.length === 0) {
      reasoning.push('No clear language preference detected - defaulting to English');
    }

    return {
      suggestedLanguage,
      confidence: Math.min(confidence, 1.0),
      reasoning,
      shouldPromptUser
    };
  }
}

// Export singleton instance
export const contentLanguageManager = new ContentLanguageManager();