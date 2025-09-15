// Week 23: Advanced Content Analysis System
// AI-like algorithms using pure JavaScript/TypeScript

export interface SpamAnalysis {
  spamScore: number;
  isSpam: boolean;
  confidence: number;
  flags: string[];
  analysis: {
    keywordMatches: string[];
    urlCount: number;
    capsRatio: number;
    wordCount: number;
    languageQuality: number;
    repetitiveScore: number;
    promotionalScore: number;
  };
}

export interface QualityAnalysis {
  qualityScore: number;
  readabilityScore: number;
  feedback: string[];
  metrics: {
    wordCount: number;
    sentenceCount: number;
    avgWordsPerSentence: number;
    meaningfulRatio: number;
    grammarScore: number;
    coherenceScore: number;
  };
}

export interface ToxicityAnalysis {
  toxicityScore: number;
  isToxic: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  flags: string[];
  categories: {
    harassment: number;
    threats: number;
    profanity: number;
    animalAbuse: number;
    misinformation: number;
  };
}

export interface ComprehensiveAnalysis {
  spam: SpamAnalysis;
  quality: QualityAnalysis;
  toxicity: ToxicityAnalysis;
  overallScore: number;
  recommendation: 'approve' | 'flag' | 'review' | 'block';
  processingTime: number;
}

export class AdvancedSpamDetector {
  private spamKeywords = {
    english: [
      'buy now', 'click here', 'limited offer', 'guaranteed', 'earn money',
      'work from home', 'free gift', 'act now', 'special deal', 'discount',
      'make money fast', 'no experience needed', 'urgent', 'congratulations',
      'winner', 'selected', 'claim now', 'risk free', 'call now', 'apply now'
    ],
    hindi: [
      'paisa kamao', 'ghar baithe kaam', 'free mein', 'jaldi karo', 'offer',
      'discount mil raha', 'click karo', 'guarantee', 'easy money', 'kamao',
      'rupaye', 'muft', 'jeetna', 'prize', 'gift', 'winner'
    ],
    hinglish: [
      'paisa earn karo', 'ghar se work', 'free offer', 'easy income',
      'click kar', 'apply kar', 'join kar', 'money kamao'
    ]
  };

  private suspiciousPatterns = [
    /(.)\1{4,}/g,              // Repeated characters (aaaaa)
    /[A-Z]{5,}/g,              // Excessive caps (HELLO)
    /\d{10,}/g,                // Long numbers
    /[!@#$%^&*]{3,}/g,         // Excessive symbols
    /https?:\/\/[^\s]+/g,      // URLs
    /\b\d+\s*(rs|rupees|₹)\b/gi, // Money mentions
    /\b(whatsapp|telegram|instagram)\b/gi, // Social media
    /\b\d{10}\b/g,             // Phone numbers
    /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi // Emails
  ];

  public analyzeSpam(content: string): SpamAnalysis {
    const startTime = Date.now();
    let spamScore = 0;
    const flags: string[] = [];
    
    // Normalize content
    const normalizedContent = content.toLowerCase().trim();
    const words = normalizedContent.split(/\s+/);
    const wordCount = words.length;
    
    // 1. Keyword Analysis
    const keywordMatches: string[] = [];
    Object.values(this.spamKeywords).flat().forEach(keyword => {
      if (normalizedContent.includes(keyword)) {
        keywordMatches.push(keyword);
        spamScore += 15;
      }
    });
    
    if (keywordMatches.length > 0) {
      flags.push('spam_keywords');
    }
    if (keywordMatches.length > 3) {
      spamScore += 25;
      flags.push('excessive_spam_keywords');
    }

    // 2. Pattern Analysis
    let repetitiveScore = 0;
    this.suspiciousPatterns.forEach((pattern, index) => {
      const matches = content.match(pattern);
      if (matches) {
        const count = matches.length;
        const weight = [20, 15, 25, 10, 20, 15, 30, 35, 25][index] || 10;
        const score = Math.min(count * weight, 50);
        spamScore += score;
        repetitiveScore += score;
        
        const flagNames = [
          'repeated_chars', 'excessive_caps', 'long_numbers', 'excessive_symbols',
          'multiple_urls', 'money_mentions', 'social_media_promo', 'phone_numbers', 'email_addresses'
        ];
        flags.push(flagNames[index]);
      }
    });

    // 3. Content Structure Analysis
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Too short but promotional
    if (wordCount < 5 && (keywordMatches.length > 0 || repetitiveScore > 0)) {
      spamScore += 30;
      flags.push('short_promotional');
    }
    
    // Single sentence with many words (typical spam)
    if (sentences.length === 1 && wordCount > 25) {
      spamScore += 20;
      flags.push('run_on_sentence');
    }

    // 4. Language Quality Assessment
    const languageQuality = this.assessLanguageQuality(content, words);
    if (languageQuality < 0.4) {
      spamScore += 15;
      flags.push('poor_language_quality');
    }

    // 5. Caps Analysis
    const capsCount = (content.match(/[A-Z]/g) || []).length;
    const capsRatio = capsCount / content.length;
    if (capsRatio > 0.3) {
      spamScore += Math.min(capsRatio * 50, 30);
      flags.push('excessive_capitalization');
    }

    // 6. URL Density
    const urls = content.match(/https?:\/\/[^\s]+/g) || [];
    if (urls.length > 1) {
      spamScore += urls.length * 15;
      flags.push('multiple_links');
    }

    // 7. Promotional Content Score
    const promotionalWords = [
      'buy', 'sell', 'discount', 'offer', 'deal', 'sale', 'price', 'cheap',
      'business', 'service', 'company', 'website', 'promotion', 'advertisement'
    ];
    const promotionalCount = promotionalWords.filter(word => 
      normalizedContent.includes(word)
    ).length;
    
    let promotionalScore = 0;
    if (promotionalCount >= 3) {
      promotionalScore = Math.min(promotionalCount * 8, 40);
      spamScore += promotionalScore;
      flags.push('promotional_content');
    }

    const finalScore = Math.min(spamScore, 100);
    const confidence = Math.min(finalScore / 100, 1.0);
    
    return {
      spamScore: finalScore,
      isSpam: finalScore > 50,
      confidence,
      flags,
      analysis: {
        keywordMatches,
        urlCount: urls.length,
        capsRatio: Math.round(capsRatio * 100) / 100,
        wordCount,
        languageQuality: Math.round(languageQuality * 100) / 100,
        repetitiveScore,
        promotionalScore
      }
    };
  }

  private assessLanguageQuality(content: string, words: string[]): number {
    let qualityScore = 1.0;
    
    // Check for proper sentence structure
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgWordsPerSentence = words.length / Math.max(sentences.length, 1);
    
    if (avgWordsPerSentence < 2) qualityScore -= 0.3;
    if (avgWordsPerSentence > 50) qualityScore -= 0.2;
    
    // Check for basic grammar patterns
    const hasCapitalStart = /^[A-Z]/.test(content.trim());
    const hasProperEnding = /[.!?]$/.test(content.trim());
    
    if (!hasCapitalStart && content.length > 10) qualityScore -= 0.2;
    if (!hasProperEnding && content.length > 20) qualityScore -= 0.1;
    
    // Check for excessive repetition
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    const uniqueRatio = uniqueWords.size / words.length;
    if (uniqueRatio < 0.6) qualityScore -= 0.3;
    
    return Math.max(0, qualityScore);
  }
}

export class AdvancedQualityAnalyzer {
  private meaningfulWords = new Set([
    // Exclude common stop words and filler words
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'this', 'that', 'these', 'those', 'i', 'you', 'he',
    'she', 'it', 'we', 'they', 'is', 'are', 'was', 'were', 'be', 'been',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'very', 'really', 'just', 'only',
    'also', 'even', 'still', 'well', 'now', 'then', 'here', 'there'
  ]);

  public analyzeQuality(content: string): QualityAnalysis {
    let qualityScore = 100;
    const feedback: string[] = [];
    
    const words = content.trim().split(/\s+/);
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const wordCount = words.length;
    const sentenceCount = sentences.length;

    // 1. Length Analysis
    if (wordCount < 5) {
      qualityScore -= 35;
      feedback.push('Content too short for meaningful discussion');
    } else if (wordCount < 10) {
      qualityScore -= 15;
      feedback.push('Content could be more detailed');
    } else if (wordCount > 500) {
      qualityScore -= 10;
      feedback.push('Content very long - consider breaking into sections');
    }

    // 2. Sentence Structure Analysis
    const avgWordsPerSentence = wordCount / Math.max(sentenceCount, 1);
    if (avgWordsPerSentence < 3) {
      qualityScore -= 25;
      feedback.push('Sentences too short - lacks detail');
    } else if (avgWordsPerSentence > 40) {
      qualityScore -= 20;
      feedback.push('Sentences too long - hard to read');
    }

    // 3. Punctuation and Grammar
    const questionMarks = (content.match(/\?/g) || []).length;
    const periods = (content.match(/\./g) || []).length;
    const exclamations = (content.match(/!/g) || []).length;
    const commas = (content.match(/,/g) || []).length;

    let grammarScore = 100;
    
    if (exclamations > 3) {
      qualityScore -= 15;
      grammarScore -= 15;
      feedback.push('Too many exclamation marks');
    }

    // Check for proper sentence endings
    if (sentenceCount > 1 && periods + questionMarks + exclamations < sentenceCount * 0.8) {
      qualityScore -= 10;
      grammarScore -= 20;
      feedback.push('Missing proper sentence endings');
    }

    // 4. Content Meaningfulness
    const meaningfulWordCount = words.filter(word => 
      word.length > 3 && 
      !this.meaningfulWords.has(word.toLowerCase()) &&
      !/^\d+$/.test(word)
    ).length;
    
    const meaningfulRatio = meaningfulWordCount / wordCount;
    if (meaningfulRatio < 0.3) {
      qualityScore -= 30;
      feedback.push('Low content value - too many filler words');
    } else if (meaningfulRatio < 0.5) {
      qualityScore -= 15;
      feedback.push('Could include more specific, meaningful content');
    }

    // 5. Readability Assessment
    const readabilityScore = this.calculateReadability(content, words, sentences);
    if (readabilityScore < 40) {
      qualityScore -= 20;
      feedback.push('Difficult to read - consider simpler language');
    }

    // 6. Coherence Analysis
    const coherenceScore = this.analyzeCoherence(content, words, sentences);
    if (coherenceScore < 0.5) {
      qualityScore -= 25;
      feedback.push('Content lacks coherence - ideas not well connected');
    }

    // 7. Pet Care Context Bonus (Indian context)
    const petKeywords = [
      'dog', 'puppy', 'pet', 'vet', 'health', 'feeding', 'training', 'breed',
      'vaccination', 'grooming', 'exercise', 'behavior', 'nutrition', 'care'
    ];
    const petKeywordCount = petKeywords.filter(keyword => 
      content.toLowerCase().includes(keyword)
    ).length;
    
    if (petKeywordCount > 0) {
      qualityScore += Math.min(petKeywordCount * 2, 10);
    }

    return {
      qualityScore: Math.max(0, Math.min(100, qualityScore)),
      readabilityScore: Math.round(readabilityScore),
      feedback,
      metrics: {
        wordCount,
        sentenceCount,
        avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
        meaningfulRatio: Math.round(meaningfulRatio * 100) / 100,
        grammarScore: Math.max(0, grammarScore),
        coherenceScore: Math.round(coherenceScore * 100) / 100
      }
    };
  }

  private calculateReadability(content: string, words: string[], sentences: any[]): number {
    // Simplified Flesch Reading Ease formula adaptation
    const avgWordsPerSentence = words.length / Math.max(sentences.length, 1);
    const avgSyllablesPerWord = words.reduce((acc, word) => 
      acc + this.estimateSyllables(word), 0) / words.length;
    
    // Modified formula for better results
    let readabilityScore = 120 - (avgWordsPerSentence * 1.2) - (avgSyllablesPerWord * 35);
    
    // Bonus for simple, clear language
    const simpleWords = words.filter(word => word.length <= 6).length;
    const simpleRatio = simpleWords / words.length;
    readabilityScore += simpleRatio * 20;
    
    return Math.max(0, Math.min(100, readabilityScore));
  }

  private estimateSyllables(word: string): number {
    // More accurate syllable estimation
    const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
    if (cleanWord.length <= 3) return 1;
    
    const vowelGroups = cleanWord.match(/[aeiouy]+/g) || [];
    let syllableCount = vowelGroups.length;
    
    // Adjust for silent 'e'
    if (cleanWord.endsWith('e') && syllableCount > 1) {
      syllableCount--;
    }
    
    // Adjust for 'le' endings
    if (cleanWord.endsWith('le') && cleanWord.length > 2) {
      const beforeLe = cleanWord[cleanWord.length - 3];
      if (beforeLe && 'bcdfghjklmnpqrstvwxz'.includes(beforeLe)) {
        syllableCount++;
      }
    }
    
    return Math.max(1, syllableCount);
  }

  private analyzeCoherence(content: string, words: string[], sentences: any[]): number {
    let coherenceScore = 0.7; // Start with baseline
    
    // Check for transition words
    const transitionWords = [
      'however', 'therefore', 'moreover', 'furthermore', 'additionally',
      'consequently', 'meanwhile', 'similarly', 'likewise', 'nevertheless',
      'also', 'but', 'and', 'so', 'because', 'since', 'although', 'while'
    ];
    
    const transitionCount = transitionWords.filter(word => 
      content.toLowerCase().includes(word)
    ).length;
    
    if (transitionCount > 0) {
      coherenceScore += Math.min(transitionCount * 0.1, 0.2);
    }
    
    // Check for repetitive themes (word overlap between sentences)
    if (sentences.length > 1) {
      const sentenceWords = sentences.map(sentence => 
        sentence.toLowerCase().split(/\s+/)
      );
      
      let overlapScore = 0;
      for (let i = 1; i < sentenceWords.length; i++) {
        const prevWords = new Set(sentenceWords[i - 1]);
        const currWords = sentenceWords[i];
        const overlap = currWords.filter(word => prevWords.has(word)).length;
        overlapScore += overlap / Math.max(currWords.length, 1);
      }
      
      const avgOverlap = overlapScore / (sentenceWords.length - 1);
      coherenceScore += avgOverlap * 0.3;
    }
    
    return Math.min(1.0, coherenceScore);
  }
}

export class AdvancedToxicityDetector {
  private toxicCategories = {
    harassment: {
      keywords: [
        'stupid', 'idiot', 'dumb', 'moron', 'fool', 'loser', 'pathetic',
        'useless', 'worthless', 'disgusting', 'horrible', 'terrible'
      ],
      patterns: [
        /you\s+(are|r)\s+(stupid|dumb|idiot)/gi,
        /shut\s+up/gi,
        /get\s+lost/gi,
        /mind\s+your\s+business/gi
      ],
      severity: 'medium'
    },
    threats: {
      keywords: ['kill', 'hurt', 'harm', 'attack', 'violence', 'threat'],
      patterns: [
        /i\s+will\s+(kill|hurt|harm)/gi,
        /you\s+should\s+(die|suffer)/gi,
        /watch\s+out/gi
      ],
      severity: 'critical'
    },
    animalAbuse: {
      keywords: [
        'abuse', 'cruel', 'cruelty', 'torture', 'neglect', 'abandon',
        'starve', 'mistreat', 'violent', 'kick', 'hit', 'punish'
      ],
      patterns: [
        /beat\s+(the|your)\s+dog/gi,
        /don't\s+feed/gi,
        /let\s+(it|them)\s+starve/gi,
        /abandon\s+(the|your)\s+pet/gi
      ],
      severity: 'critical'
    },
    profanity: {
      keywords: [
        // Mild profanity for family-friendly platform
        'damn', 'hell', 'crap', 'bloody'
      ],
      patterns: [
        /what\s+the\s+hell/gi,
        /damn\s+it/gi
      ],
      severity: 'low'
    },
    misinformation: {
      keywords: [
        'chocolate is safe', 'onion is good', 'grapes are healthy',
        'human medicine', 'never vaccinate', 'vaccines are poison'
      ],
      patterns: [
        /chocolate\s+is\s+(safe|good|healthy)/gi,
        /onions?\s+(are|is)\s+(safe|good|healthy)/gi,
        /grapes?\s+(are|is)\s+(safe|good|healthy)/gi,
        /never\s+vaccinate/gi,
        /vaccines?\s+(are|is)\s+(poison|toxic|harmful)/gi
      ],
      severity: 'high'
    }
  };

  public analyzeToxicity(content: string): ToxicityAnalysis {
    const normalizedContent = content.toLowerCase();
    let totalToxicity = 0;
    const flags: string[] = [];
    const categories = {
      harassment: 0,
      threats: 0,
      profanity: 0,
      animalAbuse: 0,
      misinformation: 0
    };

    Object.entries(this.toxicCategories).forEach(([category, config]) => {
      let categoryScore = 0;
      
      // Check keywords
      config.keywords.forEach(keyword => {
        if (normalizedContent.includes(keyword)) {
          const weight = config.severity === 'critical' ? 30 : 
                        config.severity === 'high' ? 20 :
                        config.severity === 'medium' ? 15 : 10;
          categoryScore += weight;
        }
      });
      
      // Check patterns
      config.patterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) {
          const weight = config.severity === 'critical' ? 40 : 
                        config.severity === 'high' ? 30 :
                        config.severity === 'medium' ? 20 : 15;
          categoryScore += matches.length * weight;
        }
      });
      
      if (categoryScore > 0) {
        flags.push(category);
      }
      
      categories[category as keyof typeof categories] = Math.min(categoryScore, 100);
      totalToxicity += categoryScore;
    });

    const toxicityScore = Math.min(totalToxicity, 100);
    const severity = toxicityScore > 70 ? 'critical' :
                    toxicityScore > 50 ? 'high' :
                    toxicityScore > 25 ? 'medium' : 'low';

    return {
      toxicityScore,
      isToxic: toxicityScore > 30,
      severity,
      flags,
      categories
    };
  }
}

export class ComprehensiveContentAnalyzer {
  private spamDetector = new AdvancedSpamDetector();
  private qualityAnalyzer = new AdvancedQualityAnalyzer();
  private toxicityDetector = new AdvancedToxicityDetector();

  public async analyzeContent(content: string): Promise<ComprehensiveAnalysis> {
    const startTime = Date.now();
    
    // Run all analyses in parallel for better performance
    const [spam, quality, toxicity] = await Promise.all([
      Promise.resolve(this.spamDetector.analyzeSpam(content)),
      Promise.resolve(this.qualityAnalyzer.analyzeQuality(content)),
      Promise.resolve(this.toxicityDetector.analyzeToxicity(content))
    ]);

    // Calculate overall score
    const overallScore = this.calculateOverallScore(spam, quality, toxicity);
    
    // Determine recommendation
    const recommendation = this.determineRecommendation(spam, quality, toxicity);
    
    const processingTime = Date.now() - startTime;

    return {
      spam,
      quality,
      toxicity,
      overallScore,
      recommendation,
      processingTime
    };
  }

  private calculateOverallScore(
    spam: SpamAnalysis, 
    quality: QualityAnalysis, 
    toxicity: ToxicityAnalysis
  ): number {
    // Weighted score calculation
    const spamWeight = 0.4;
    const qualityWeight = 0.35;
    const toxicityWeight = 0.25;

    // Invert spam and toxicity scores (lower is better)
    const spamScore = 100 - spam.spamScore;
    const qualityScore = quality.qualityScore;
    const toxicityScore = 100 - toxicity.toxicityScore;

    return Math.round(
      (spamScore * spamWeight) + 
      (qualityScore * qualityWeight) + 
      (toxicityScore * toxicityWeight)
    );
  }

  private determineRecommendation(
    spam: SpamAnalysis, 
    quality: QualityAnalysis, 
    toxicity: ToxicityAnalysis
  ): 'approve' | 'flag' | 'review' | 'block' {
    // Critical toxicity = immediate block
    if (toxicity.severity === 'critical' && toxicity.toxicityScore > 60) {
      return 'block';
    }
    
    // High spam confidence = block
    if (spam.isSpam && spam.confidence > 0.8) {
      return 'block';
    }
    
    // High toxicity or high spam = require review
    if (toxicity.severity === 'high' || (spam.isSpam && spam.confidence > 0.6)) {
      return 'review';
    }
    
    // Medium toxicity or spam = flag for moderation
    if (toxicity.severity === 'medium' || spam.confidence > 0.4) {
      return 'flag';
    }
    
    // Very low quality = flag
    if (quality.qualityScore < 30) {
      return 'flag';
    }
    
    // Otherwise approve
    return 'approve';
  }
}

// Export default analyzer instance
export const contentAnalyzer = new ComprehensiveContentAnalyzer();