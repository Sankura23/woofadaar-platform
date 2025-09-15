// Week 19 Phase 2: Content Moderation Service
// Automated content filtering and moderation queue management

export interface ModerationResult {
  shouldFlag: boolean;
  flagReasons: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  autoAction: 'allow' | 'flag' | 'remove' | 'require_review';
  suggestedTags?: string[];
}

export interface ContentAnalysis {
  contentType: 'question' | 'answer' | 'comment';
  wordCount: number;
  hasLinks: boolean;
  hasEmails: boolean;
  hasPhones: boolean;
  languageQuality: number;
  sentimentScore: number;
  topicRelevance: number;
}

// Comprehensive content analysis for moderation
export const analyzeContent = (
  content: string,
  contentType: 'question' | 'answer' | 'comment'
): ContentAnalysis => {
  
  const analysis: ContentAnalysis = {
    contentType,
    wordCount: content.trim().split(/\s+/).length,
    hasLinks: /https?:\/\/|www\./i.test(content),
    hasEmails: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(content),
    hasPhones: /\b\d{10}\b|\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/.test(content),
    languageQuality: 0.8, // Simplified - would use NLP in production
    sentimentScore: 0.7,   // Simplified - would use sentiment analysis
    topicRelevance: 0.8    // Simplified - would use topic modeling
  };

  return analysis;
};

// Advanced spam detection algorithm
export const detectSpam = (content: string, analysis: ContentAnalysis): {
  isSpam: boolean;
  confidence: number;
  reasons: string[];
} => {
  
  const reasons: string[] = [];
  let spamScore = 0;

  // Excessive capitalization
  const capsCount = (content.match(/[A-Z]/g) || []).length;
  const capsRatio = capsCount / content.length;
  if (capsRatio > 0.3) {
    reasons.push('Excessive capitalization');
    spamScore += 0.2;
  }

  // Repeated characters or words
  const repeatedChars = /(.)\1{4,}/g.test(content);
  const repeatedWords = /\b(\w+)\s+\1\b/gi.test(content);
  if (repeatedChars || repeatedWords) {
    reasons.push('Repeated characters or words');
    spamScore += 0.15;
  }

  // Suspicious links
  if (analysis.hasLinks) {
    const suspiciousLinkPatterns = [
      /bit\.ly|tinyurl|goo\.gl/i,
      /\.tk$|\.ml$|\.ga$/i,
      /free.*download|click.*here|limited.*time/i
    ];
    
    if (suspiciousLinkPatterns.some(pattern => pattern.test(content))) {
      reasons.push('Suspicious links detected');
      spamScore += 0.3;
    }
  }

  // Contact information in inappropriate contexts
  if (analysis.hasEmails || analysis.hasPhones) {
    if (analysis.contentType === 'question' || 
        (analysis.contentType === 'comment' && analysis.wordCount < 20)) {
      reasons.push('Inappropriate contact information sharing');
      spamScore += 0.25;
    }
  }

  // Low-effort content
  if (analysis.wordCount < 5 && analysis.contentType !== 'comment') {
    reasons.push('Extremely short content');
    spamScore += 0.2;
  }

  // Commercial keywords clustering
  const commercialKeywords = [
    'sell', 'buy', 'price', 'discount', 'offer', 'deal', 'sale', 'business',
    'service', 'company', 'website', 'promotion', 'advertisement'
  ];
  
  const commercialCount = commercialKeywords.filter(keyword => 
    content.toLowerCase().includes(keyword)
  ).length;
  
  if (commercialCount >= 3) {
    reasons.push('Commercial content detected');
    spamScore += 0.25;
  }

  // Poor language quality indicators
  if (analysis.languageQuality < 0.3) {
    reasons.push('Poor language quality');
    spamScore += 0.1;
  }

  return {
    isSpam: spamScore > 0.4,
    confidence: Math.min(spamScore, 1.0),
    reasons
  };
};

// Detect inappropriate content
export const detectInappropriateContent = (content: string): {
  isInappropriate: boolean;
  confidence: number;
  reasons: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
} => {
  
  const reasons: string[] = [];
  let inappropriateScore = 0;
  let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';

  const text = content.toLowerCase();

  // Animal abuse/cruelty detection
  const abuseKeywords = [
    'abuse', 'cruel', 'cruelty', 'torture', 'harm', 'hurt', 'beat', 'kick',
    'neglect', 'abandon', 'starve', 'mistreat', 'violent'
  ];
  
  const abuseMatches = abuseKeywords.filter(keyword => text.includes(keyword));
  if (abuseMatches.length > 0) {
    reasons.push('Animal abuse/cruelty content');
    inappropriateScore += 0.8;
    severity = 'critical';
  }

  // Inappropriate medical advice
  const unsafeMedicalPatterns = [
    /give.*human.*medicine/i,
    /use.*household.*chemical/i,
    /force.*to.*eat/i,
    /punish.*by.*not.*feeding/i
  ];
  
  if (unsafeMedicalPatterns.some(pattern => pattern.test(content))) {
    reasons.push('Unsafe medical advice');
    inappropriateScore += 0.6;
    severity = 'high';
  }

  // Profanity detection (basic)
  const profanityPatterns = [
    /\b(damn|hell|stupid|idiot)\b/gi // Mild profanity for family-friendly platform
  ];
  
  if (profanityPatterns.some(pattern => pattern.test(content))) {
    reasons.push('Inappropriate language');
    inappropriateScore += 0.3;
    if (severity === 'low') severity = 'medium';
  }

  // Aggressive tone detection
  const aggressivePatterns = [
    /you're wrong/i,
    /shut up/i,
    /don't listen to/i,
    /terrible advice/i
  ];
  
  if (aggressivePatterns.some(pattern => pattern.test(content))) {
    reasons.push('Aggressive or hostile tone');
    inappropriateScore += 0.4;
    if (severity === 'low') severity = 'medium';
  }

  return {
    isInappropriate: inappropriateScore > 0.3,
    confidence: Math.min(inappropriateScore, 1.0),
    reasons,
    severity
  };
};

// Main moderation function
export const moderateContent = async (
  content: string,
  contentType: 'question' | 'answer' | 'comment',
  userId: string,
  contentId?: string
): Promise<ModerationResult> => {
  
  try {
    // Perform content analysis
    const analysis = analyzeContent(content, contentType);
    
    // Check for spam
    const spamCheck = detectSpam(content, analysis);
    
    // Check for inappropriate content  
    const inappropriateCheck = detectInappropriateContent(content);

    // Combine results
    const allReasons = [...spamCheck.reasons, ...inappropriateCheck.reasons];
    const maxConfidence = Math.max(spamCheck.confidence, inappropriateCheck.confidence);
    const shouldFlag = spamCheck.isSpam || inappropriateCheck.isInappropriate;

    // Determine overall severity
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (inappropriateCheck.severity === 'critical' || spamCheck.confidence > 0.8) {
      severity = 'critical';
    } else if (inappropriateCheck.severity === 'high' || spamCheck.confidence > 0.6) {
      severity = 'high';
    } else if (allReasons.length > 0) {
      severity = 'medium';
    }

    // Determine auto action
    let autoAction: 'allow' | 'flag' | 'remove' | 'require_review' = 'allow';
    
    if (severity === 'critical' && maxConfidence > 0.7) {
      autoAction = 'remove';
    } else if (severity === 'high' && maxConfidence > 0.5) {
      autoAction = 'require_review';
    } else if (shouldFlag && maxConfidence > 0.3) {
      autoAction = 'flag';
    }

    // Generate helpful tags for flagged content
    const suggestedTags = [];
    if (spamCheck.isSpam) suggestedTags.push('spam');
    if (inappropriateCheck.isInappropriate) suggestedTags.push('inappropriate');
    if (analysis.hasLinks) suggestedTags.push('contains_links');
    if (inappropriateCheck.severity === 'critical') suggestedTags.push('urgent_review');

    const result: ModerationResult = {
      shouldFlag,
      flagReasons: allReasons,
      severity,
      confidence: maxConfidence,
      autoAction,
      suggestedTags: suggestedTags.length > 0 ? suggestedTags : undefined
    };

    // Log moderation decision
    console.log(`Content moderation result for ${contentType} ${contentId}:`, {
      shouldFlag,
      severity,
      autoAction,
      confidence: Math.round(maxConfidence * 100),
      reasons: allReasons
    });

    return result;

  } catch (error) {
    console.error('Error in content moderation:', error);
    
    // Fallback to safe default
    return {
      shouldFlag: false,
      flagReasons: ['Moderation service error'],
      severity: 'low',
      confidence: 0,
      autoAction: 'allow'
    };
  }
};

// Queue item for moderation review
export const queueForModeration = async (
  itemId: string,
  itemType: 'question' | 'answer' | 'comment',
  moderationResult: ModerationResult,
  reportedBy?: string
): Promise<boolean> => {
  
  try {
    // This would normally create a ModerationQueue record
    console.log(`Queued for moderation: ${itemType} ${itemId}`, {
      reasons: moderationResult.flagReasons,
      severity: moderationResult.severity,
      autoAction: moderationResult.autoAction,
      reportedBy: reportedBy || 'auto_system'
    });

    // In production, this would:
    // 1. Create ModerationQueue record
    // 2. Notify moderators based on severity
    // 3. Update content status if needed
    // 4. Track moderation metrics

    return true;
    
  } catch (error) {
    console.error('Error queuing content for moderation:', error);
    return false;
  }
};