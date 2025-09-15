// Week 19 Phase 3: Answer Quality Scoring System
// Multi-factor assessment of answer quality and usefulness

export interface QualityScore {
  overallScore: number;
  factors: {
    contentQuality: number;
    expertCredibility: number;
    communityEngagement: number;
    timeliness: number;
    completeness: number;
  };
  recommendations: string[];
  tier: 'poor' | 'fair' | 'good' | 'excellent' | 'outstanding';
}

export interface AnswerAnalysis {
  wordCount: number;
  hasStructuredInfo: boolean;
  hasEvidence: boolean;
  hasPersonalExperience: boolean;
  addressesQuestion: boolean;
  languageQuality: number;
  readabilityScore: number;
}

// Analyze answer content quality
export const analyzeAnswerContent = (
  answerContent: string,
  questionTitle: string,
  questionContent: string
): AnswerAnalysis => {
  
  const text = answerContent.toLowerCase();
  const questionText = `${questionTitle} ${questionContent}`.toLowerCase();

  // Basic metrics
  const wordCount = answerContent.trim().split(/\s+/).length;
  
  // Structure indicators
  const hasStructuredInfo = /\d+[\.\)]\s|•\s|-\s|\*\s/.test(answerContent); // Lists, bullets
  
  // Evidence indicators
  const evidenceKeywords = [
    'research shows', 'studies indicate', 'according to', 'veterinarians recommend',
    'experience shows', 'proven method', 'clinical trials', 'scientific evidence'
  ];
  const hasEvidence = evidenceKeywords.some(keyword => text.includes(keyword));

  // Personal experience indicators
  const experienceKeywords = [
    'i have', 'my dog', 'in my experience', 'i found that', 'worked for me',
    'i recommend', 'i suggest', 'similar situation', 'same issue'
  ];
  const hasPersonalExperience = experienceKeywords.some(keyword => text.includes(keyword));

  // Question addressing analysis
  const questionKeywords = questionText.split(/\s+/).filter(word => 
    word.length > 3 && !['what', 'when', 'where', 'why', 'how', 'does', 'will', 'should'].includes(word)
  );
  
  const addressedKeywords = questionKeywords.filter(keyword => 
    text.includes(keyword)
  ).length;
  const addressesQuestion = addressedKeywords / Math.max(questionKeywords.length, 1) > 0.3;

  // Language quality assessment (simplified)
  const languageQuality = Math.min(
    1.0,
    0.5 + (wordCount > 30 ? 0.2 : 0) + (hasStructuredInfo ? 0.15 : 0) + 
    (!/\b(ur|u|r|plz|thx|lol)\b/.test(text) ? 0.15 : 0)
  );

  // Readability score (simplified Flesch-like calculation)
  const sentences = answerContent.split(/[.!?]+/).length;
  const avgWordsPerSentence = wordCount / Math.max(sentences, 1);
  const readabilityScore = Math.max(0, Math.min(1, 1 - (avgWordsPerSentence - 15) / 20));

  return {
    wordCount,
    hasStructuredInfo,
    hasEvidence,
    hasPersonalExperience,
    addressesQuestion,
    languageQuality,
    readabilityScore
  };
};

// Calculate expert credibility score
export const calculateExpertCredibility = (
  isVerifiedExpert: boolean,
  expertProfile?: {
    verification_status: string;
    specializations: string[];
    rating_average: number;
    experience_years?: number;
    response_rate: number;
  },
  questionCategory?: string
): number => {
  
  let credibilityScore = 0.5; // Base score for regular users

  if (isVerifiedExpert && expertProfile) {
    // Verification status (40% weight)
    const verificationScores = {
      verified: 1.0,
      pending: 0.6,
      rejected: 0.2
    };
    credibilityScore += (verificationScores[expertProfile.verification_status as keyof typeof verificationScores] || 0.2) * 0.4;

    // Specialization relevance (30% weight)
    if (questionCategory && expertProfile.specializations.includes(questionCategory)) {
      credibilityScore += 0.3;
    } else if (expertProfile.specializations.includes('general')) {
      credibilityScore += 0.15;
    }

    // Expert rating (20% weight)
    credibilityScore += (expertProfile.rating_average / 5) * 0.2;

    // Experience (10% weight)
    if (expertProfile.experience_years) {
      const experienceScore = Math.min(expertProfile.experience_years / 10, 1);
      credibilityScore += experienceScore * 0.1;
    }
  }

  return Math.min(credibilityScore, 1.0);
};

// Calculate community engagement score
export const calculateCommunityEngagement = (
  upvotes: number,
  downvotes: number,
  isBestAnswer: boolean,
  responseTime?: number, // Minutes since question was posted
  answerRank?: number    // Order of answer (1st, 2nd, etc.)
): number => {
  
  let engagementScore = 0.5; // Base score

  // Voting ratio (40% weight)
  const totalVotes = upvotes + downvotes;
  if (totalVotes > 0) {
    const voteRatio = upvotes / totalVotes;
    engagementScore += voteRatio * 0.4;
  }

  // Upvote quantity bonus (20% weight)
  const upvoteBonus = Math.min(upvotes * 0.05, 0.2);
  engagementScore += upvoteBonus;

  // Best answer bonus (25% weight)
  if (isBestAnswer) {
    engagementScore += 0.25;
  }

  // Timeliness bonus (10% weight)
  if (responseTime) {
    // Faster responses get higher scores, with diminishing returns
    const timelinessScore = Math.max(0, 1 - (responseTime / (24 * 60))); // 24 hour decay
    engagementScore += timelinessScore * 0.1;
  }

  // Answer order bonus (5% weight)
  if (answerRank && answerRank <= 3) {
    const orderBonus = (4 - answerRank) / 10; // First answer gets 0.3, second gets 0.2, third gets 0.1
    engagementScore += orderBonus * 0.05;
  }

  return Math.min(engagementScore, 1.0);
};

// Main function to calculate comprehensive answer quality score
export const calculateAnswerQualityScore = (
  answerContent: string,
  questionTitle: string,
  questionContent: string,
  engagementData: {
    upvotes: number;
    downvotes: number;
    isBestAnswer: boolean;
    isVerifiedExpert: boolean;
    responseTimeMinutes?: number;
    answerRank?: number;
  },
  expertProfile?: {
    verification_status: string;
    specializations: string[];
    rating_average: number;
    experience_years?: number;
    response_rate: number;
  },
  questionCategory?: string
): QualityScore => {
  
  try {
    // Analyze content quality
    const contentAnalysis = analyzeAnswerContent(answerContent, questionTitle, questionContent);
    
    // Calculate individual factor scores
    const factors = {
      contentQuality: calculateContentQualityScore(contentAnalysis),
      expertCredibility: calculateExpertCredibility(
        engagementData.isVerifiedExpert,
        expertProfile,
        questionCategory
      ),
      communityEngagement: calculateCommunityEngagement(
        engagementData.upvotes,
        engagementData.downvotes,
        engagementData.isBestAnswer,
        engagementData.responseTimeMinutes,
        engagementData.answerRank
      ),
      timeliness: calculateTimeliness(engagementData.responseTimeMinutes),
      completeness: calculateCompleteness(contentAnalysis, questionContent)
    };

    // Calculate weighted overall score
    const weights = {
      contentQuality: 0.35,
      expertCredibility: 0.25,
      communityEngagement: 0.20,
      timeliness: 0.10,
      completeness: 0.10
    };

    const overallScore = Object.entries(factors).reduce((sum, [factor, score]) => {
      return sum + (score * weights[factor as keyof typeof weights]);
    }, 0);

    // Generate improvement recommendations
    const recommendations = generateQualityRecommendations(factors, contentAnalysis);

    // Determine quality tier
    const tier = getQualityTier(overallScore);

    const qualityScore: QualityScore = {
      overallScore: Math.round(overallScore * 100) / 100,
      factors,
      recommendations,
      tier
    };

    console.log(`Answer quality assessment:`, {
      overallScore: Math.round(overallScore * 100),
      tier,
      topFactors: Object.entries(factors)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 2)
        .map(([factor]) => factor)
    });

    return qualityScore;

  } catch (error) {
    console.error('Error calculating answer quality score:', error);
    
    // Return basic fallback score
    return {
      overallScore: 0.5,
      factors: {
        contentQuality: 0.5,
        expertCredibility: 0.5,
        communityEngagement: 0.5,
        timeliness: 0.5,
        completeness: 0.5
      },
      recommendations: ['Unable to analyze answer quality'],
      tier: 'fair'
    };
  }
};

// Helper functions

const calculateContentQualityScore = (analysis: AnswerAnalysis): number => {
  let score = 0.4; // Increased base score for more inclusive assessment

  // Helpfulness factors (prioritized over format)
  
  // 1. Does it address the question? (Highest weight)
  if (analysis.addressesQuestion) score += 0.25; // Increased from 0.2
  
  // 2. Provides evidence or experience (Very important)
  if (analysis.hasEvidence) score += 0.15;
  if (analysis.hasPersonalExperience) score += 0.1;
  
  // 3. Content depth (More flexible thresholds)
  if (analysis.wordCount >= 30) score += 0.1; // Lowered from 50
  if (analysis.wordCount >= 80) score += 0.1; // Lowered from 100
  
  // 4. Structure factor (Helpful but not required)
  if (analysis.hasStructuredInfo) score += 0.08; // Reduced from 0.15
  
  // 5. Language quality (Focus on clarity, not perfection)
  const languageBonus = analysis.languageQuality * 0.07; // Reduced from 0.1
  score += languageBonus;

  // 6. Helpfulness bonus for practical advice
  const practicalAdviceKeywords = [
    'try', 'recommend', 'suggest', 'works well', 'helpful', 
    'steps', 'approach', 'method', 'tip', 'solution'
  ];
  // Note: This is a simplified check - in real implementation we'd check the actual answer content
  // For now, we'll assume this is captured in other factors

  return Math.min(score, 1.0);
};

const calculateTimeliness = (responseTimeMinutes?: number): number => {
  if (!responseTimeMinutes) return 0.5;
  
  // Faster responses score higher, with diminishing returns
  if (responseTimeMinutes <= 60) return 1.0;        // 1 hour
  if (responseTimeMinutes <= 360) return 0.8;       // 6 hours  
  if (responseTimeMinutes <= 1440) return 0.6;      // 24 hours
  if (responseTimeMinutes <= 4320) return 0.4;      // 3 days
  return 0.2;
};

const calculateCompleteness = (analysis: AnswerAnalysis, questionContent: string): number => {
  let score = 0.4; // Base score

  // Content depth
  if (analysis.wordCount >= 100) score += 0.2;

  // Addresses question thoroughly
  if (analysis.addressesQuestion) score += 0.2;

  // Has actionable advice
  const actionableKeywords = [
    'try', 'do', 'avoid', 'consider', 'recommend', 'suggest',
    'should', 'could', 'might', 'steps', 'approach'
  ];
  const hasActionableAdvice = actionableKeywords.some(keyword => 
    analysis.wordCount > 0 && new RegExp(`\\b${keyword}\\b`, 'i').test(analysis.wordCount.toString())
  );
  
  if (hasActionableAdvice) score += 0.2;

  return Math.min(score, 1.0);
};

const generateQualityRecommendations = (
  factors: QualityScore['factors'],
  analysis: AnswerAnalysis
): string[] => {
  
  const recommendations: string[] = [];

  if (factors.contentQuality < 0.6) {
    if (analysis.wordCount < 50) {
      recommendations.push('Provide more detailed explanation');
    }
    if (!analysis.hasStructuredInfo) {
      recommendations.push('Use bullet points or numbered lists for clarity');
    }
    if (!analysis.addressesQuestion) {
      recommendations.push('Address the specific question asked');
    }
  }

  if (factors.expertCredibility < 0.7) {
    recommendations.push('Consider getting expert verification to increase credibility');
  }

  if (factors.communityEngagement < 0.5) {
    recommendations.push('Provide more actionable and helpful advice');
  }

  if (factors.completeness < 0.6) {
    recommendations.push('Include step-by-step instructions or examples');
    if (!analysis.hasEvidence) {
      recommendations.push('Support your advice with sources or evidence');
    }
  }

  if (recommendations.length === 0) {
    recommendations.push('Great answer! Consider sharing more of your expertise');
  }

  return recommendations.slice(0, 3); // Limit to top 3 recommendations
};

const getQualityTier = (score: number): 'poor' | 'fair' | 'good' | 'excellent' | 'outstanding' => {
  if (score >= 0.9) return 'outstanding';
  if (score >= 0.8) return 'excellent';
  if (score >= 0.65) return 'good';
  if (score >= 0.4) return 'fair';
  return 'poor';
};

// Batch process answer quality scores for a question
export const scoreAllAnswersForQuestion = async (
  questionId: string,
  questionTitle: string,
  questionContent: string,
  questionCategory: string
): Promise<{ [answerId: string]: QualityScore }> => {
  
  try {
    // This would normally fetch all answers for the question
    // For demo, return mock scoring results
    
    const mockAnswerScores = {
      'answer_1': calculateAnswerQualityScore(
        'Based on my 10 years as a veterinarian, this sounds like it could be an upset stomach. I recommend: 1) Withhold food for 12-24 hours, 2) Provide small amounts of water, 3) Start with bland diet (rice + boiled chicken), 4) Monitor for improvement. If symptoms persist beyond 48 hours or worsen, please see your vet immediately.',
        questionTitle,
        questionContent,
        {
          upvotes: 15,
          downvotes: 1,
          isBestAnswer: true,
          isVerifiedExpert: true,
          responseTimeMinutes: 45,
          answerRank: 1
        },
        {
          verification_status: 'verified',
          specializations: ['veterinary', 'health'],
          rating_average: 4.8,
          experience_years: 10,
          response_rate: 0.95
        },
        questionCategory
      ),
      'answer_2': calculateAnswerQualityScore(
        'My dog had same problem. Give rice and chicken. It worked for me.',
        questionTitle,
        questionContent,
        {
          upvotes: 3,
          downvotes: 0,
          isBestAnswer: false,
          isVerifiedExpert: false,
          responseTimeMinutes: 180,
          answerRank: 2
        },
        undefined,
        questionCategory
      )
    };

    console.log(`Scored ${Object.keys(mockAnswerScores).length} answers for question ${questionId}`);
    
    return mockAnswerScores;

  } catch (error) {
    console.error('Error scoring answers for question:', error);
    return {};
  }
};

// Real-time quality assessment for new answers
export const assessAnswerQualityRealtime = async (
  answerContent: string,
  questionData: {
    id: string;
    title: string;
    content: string;
    category: string;
  },
  authorData: {
    isVerifiedExpert: boolean;
    expertProfile?: any;
  }
): Promise<{
  qualityScore: QualityScore;
  shouldHighlight: boolean;
  improvementSuggestions: string[];
}> => {
  
  try {
    // Calculate quality score
    const qualityScore = calculateAnswerQualityScore(
      answerContent,
      questionData.title,
      questionData.content,
      {
        upvotes: 0, // New answer
        downvotes: 0,
        isBestAnswer: false,
        isVerifiedExpert: authorData.isVerifiedExpert,
        responseTimeMinutes: 5, // Assume quick response for new answer
        answerRank: 1
      },
      authorData.expertProfile,
      questionData.category
    );

    // Determine if answer should be highlighted
    const shouldHighlight = qualityScore.overallScore >= 0.7 || 
                           (authorData.isVerifiedExpert && qualityScore.overallScore >= 0.6);

    // Generate targeted improvement suggestions
    const improvementSuggestions = qualityScore.recommendations;

    console.log(`Real-time quality assessment for new answer:`, {
      overallScore: Math.round(qualityScore.overallScore * 100),
      tier: qualityScore.tier,
      shouldHighlight,
      isExpert: authorData.isVerifiedExpert
    });

    return {
      qualityScore,
      shouldHighlight,
      improvementSuggestions
    };

  } catch (error) {
    console.error('Error in real-time answer quality assessment:', error);
    
    return {
      qualityScore: {
        overallScore: 0.5,
        factors: {
          contentQuality: 0.5,
          expertCredibility: 0.5,
          communityEngagement: 0.5,
          timeliness: 0.5,
          completeness: 0.5
        },
        recommendations: [],
        tier: 'fair'
      },
      shouldHighlight: false,
      improvementSuggestions: ['Unable to assess answer quality']
    };
  }
};