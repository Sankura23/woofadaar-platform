// Week 24 Phase 2: Pure JavaScript Language Detection System
// No external APIs - uses browser features and pattern matching

interface LanguageDetectionResult {
  detectedLanguage: 'en' | 'hi' | 'mixed';
  confidence: number;
  reasons: string[];
  script?: 'latin' | 'devanagari' | 'mixed';
  suggestedLanguage?: 'en' | 'hi';
}

interface BrowserLanguageInfo {
  primary: string;
  all: string[];
  region?: string;
  preferredIndianLanguage?: 'hi' | 'en';
}

export class LanguageDetectionEngine {
  // Hindi Devanagari Unicode ranges
  private readonly hindiUnicodeRanges = [
    [0x0900, 0x097F], // Devanagari
    [0xA8E0, 0xA8FF], // Devanagari Extended
  ];

  // Common Hindi words for pattern matching
  private readonly commonHindiWords = [
    'और', 'का', 'की', 'के', 'में', 'से', 'पर', 'को', 'है', 'हैं', 'था', 'थे', 'एक', 'यह', 'वह',
    'कुत्ता', 'कुत्ते', 'डॉग', 'पेट', 'स्वास्थ्य', 'खाना', 'दवा', 'पशु', 'चिकित्सक', 'नस्ल'
  ];

  // Common English words
  private readonly commonEnglishWords = [
    'the', 'and', 'of', 'to', 'in', 'for', 'with', 'on', 'at', 'by', 'is', 'are', 'was', 'were',
    'dog', 'pet', 'health', 'food', 'medicine', 'vet', 'breed', 'puppy', 'training', 'care'
  ];

  // Indian English patterns (Hinglish indicators)
  private readonly hinglishPatterns = [
    /\b(bhi|hai|kar|kya|nahi|haan|achha|thik|bhai|yaar|dekho|suno|kaise|kaisa|kitna)\b/gi,
    /\b(actually|basically|simply|definitely|obviously|literally)\b/gi, // Indian English emphasis
    /\b(itself|only|na|yaar|bhai|dude|man)\b/gi // Indian English particles
  ];

  // Regional Indian city/state patterns
  private readonly indianLocationPatterns = [
    /\b(mumbai|delhi|bangalore|bengaluru|hyderabad|chennai|kolkata|pune|ahmedabad|jaipur|surat)\b/gi,
    /\b(maharashtra|gujarat|rajasthan|karnataka|telangana|tamil nadu|west bengal|uttar pradesh)\b/gi
  ];

  /**
   * Detect browser language preferences
   */
  public detectBrowserLanguage(): BrowserLanguageInfo {
    const languages = navigator.languages || [navigator.language];
    const primary = languages[0] || 'en-US';
    
    // Extract language and region
    const [lang, region] = primary.toLowerCase().split('-');
    
    let preferredIndianLanguage: 'hi' | 'en' = 'en';
    
    // Check if user has Hindi preference
    if (languages.some(l => l.toLowerCase().startsWith('hi'))) {
      preferredIndianLanguage = 'hi';
    }
    
    // Check for Indian regions that might prefer Hindi
    const indianHindiRegions = ['in', 'ind'];
    if (region && indianHindiRegions.includes(region)) {
      // Additional heuristics for Hindi vs English preference in India
      const hasEnglishFirst = languages.some(l => l.toLowerCase().startsWith('en'));
      const hasHindiExplicit = languages.some(l => l.toLowerCase().startsWith('hi'));
      
      if (hasHindiExplicit && !hasEnglishFirst) {
        preferredIndianLanguage = 'hi';
      }
    }

    return {
      primary: lang,
      all: languages,
      region,
      preferredIndianLanguage
    };
  }

  /**
   * Detect language of text content
   */
  public detectTextLanguage(text: string): LanguageDetectionResult {
    if (!text || text.trim().length === 0) {
      return {
        detectedLanguage: 'en',
        confidence: 0,
        reasons: ['Empty text'],
        script: 'latin'
      };
    }

    const cleanText = text.trim().toLowerCase();
    const reasons: string[] = [];
    let confidence = 0;
    
    // Script detection
    const scriptResult = this.detectScript(text);
    reasons.push(`Script detected: ${scriptResult.script}`);
    
    // Character-based detection
    const charResult = this.analyzeCharacters(text);
    confidence += charResult.confidence;
    reasons.push(...charResult.reasons);
    
    // Word pattern detection
    const wordResult = this.analyzeWordPatterns(cleanText);
    confidence += wordResult.confidence;
    reasons.push(...wordResult.reasons);
    
    // Hinglish detection
    const hinglishResult = this.detectHinglish(cleanText);
    if (hinglishResult.isHinglish) {
      confidence += hinglishResult.confidence;
      reasons.push(...hinglishResult.reasons);
    }
    
    // Indian context detection
    const indianResult = this.detectIndianContext(cleanText);
    if (indianResult.hasIndianContext) {
      confidence += indianResult.confidence;
      reasons.push(...indianResult.reasons);
    }

    // Final language determination
    let detectedLanguage: 'en' | 'hi' | 'mixed' = 'en';
    let suggestedLanguage: 'en' | 'hi' = 'en';

    if (scriptResult.script === 'devanagari') {
      detectedLanguage = 'hi';
      suggestedLanguage = 'hi';
      confidence = Math.max(confidence, 0.9);
    } else if (scriptResult.script === 'mixed') {
      detectedLanguage = 'mixed';
      suggestedLanguage = confidence > 0.5 ? 'hi' : 'en';
    } else if (hinglishResult.isHinglish) {
      detectedLanguage = 'mixed';
      suggestedLanguage = 'hi'; // Assume Hindi preference for Hinglish users
    } else if (wordResult.hindiScore > wordResult.englishScore) {
      detectedLanguage = 'hi';
      suggestedLanguage = 'hi';
    } else {
      detectedLanguage = 'en';
      suggestedLanguage = 'en';
    }

    // Normalize confidence to 0-1 range
    confidence = Math.min(1, Math.max(0, confidence));

    return {
      detectedLanguage,
      confidence,
      reasons,
      script: scriptResult.script,
      suggestedLanguage
    };
  }

  private detectScript(text: string): { script: 'latin' | 'devanagari' | 'mixed' } {
    let hindiChars = 0;
    let latinChars = 0;
    let totalChars = 0;

    for (const char of text) {
      const code = char.charCodeAt(0);
      
      if (this.isDevanagariChar(code)) {
        hindiChars++;
        totalChars++;
      } else if (this.isLatinChar(code)) {
        latinChars++;
        totalChars++;
      }
    }

    if (totalChars === 0) return { script: 'latin' };

    const hindiRatio = hindiChars / totalChars;
    const latinRatio = latinChars / totalChars;

    if (hindiRatio > 0.7) return { script: 'devanagari' };
    if (latinRatio > 0.7) return { script: 'latin' };
    return { script: 'mixed' };
  }

  private isDevanagariChar(charCode: number): boolean {
    return this.hindiUnicodeRanges.some(
      ([start, end]) => charCode >= start && charCode <= end
    );
  }

  private isLatinChar(charCode: number): boolean {
    return (
      (charCode >= 65 && charCode <= 90) ||   // A-Z
      (charCode >= 97 && charCode <= 122)     // a-z
    );
  }

  private analyzeCharacters(text: string): { confidence: number; reasons: string[] } {
    const hindiCharCount = Array.from(text).filter(char => 
      this.isDevanagariChar(char.charCodeAt(0))
    ).length;
    
    const totalChars = text.length;
    const hindiRatio = hindiCharCount / totalChars;

    const reasons: string[] = [];
    let confidence = 0;

    if (hindiRatio > 0.5) {
      confidence += 0.4;
      reasons.push(`High Devanagari character ratio: ${(hindiRatio * 100).toFixed(1)}%`);
    } else if (hindiRatio > 0.2) {
      confidence += 0.2;
      reasons.push(`Moderate Devanagari character presence: ${(hindiRatio * 100).toFixed(1)}%`);
    }

    return { confidence, reasons };
  }

  private analyzeWordPatterns(text: string): {
    confidence: number;
    reasons: string[];
    hindiScore: number;
    englishScore: number;
  } {
    const words = text.split(/\s+/).filter(word => word.length > 2);
    
    let hindiMatches = 0;
    let englishMatches = 0;

    for (const word of words) {
      if (this.commonHindiWords.some(hw => hw.includes(word) || word.includes(hw))) {
        hindiMatches++;
      }
      if (this.commonEnglishWords.some(ew => ew.includes(word) || word.includes(ew))) {
        englishMatches++;
      }
    }

    const reasons: string[] = [];
    let confidence = 0;

    if (hindiMatches > englishMatches) {
      confidence += 0.3;
      reasons.push(`Hindi word patterns detected: ${hindiMatches} matches`);
    } else if (englishMatches > hindiMatches) {
      confidence += 0.1;
      reasons.push(`English word patterns detected: ${englishMatches} matches`);
    }

    return {
      confidence,
      reasons,
      hindiScore: hindiMatches,
      englishScore: englishMatches
    };
  }

  private detectHinglish(text: string): {
    isHinglish: boolean;
    confidence: number;
    reasons: string[];
  } {
    const reasons: string[] = [];
    let matches = 0;
    let confidence = 0;

    for (const pattern of this.hinglishPatterns) {
      const patternMatches = (text.match(pattern) || []).length;
      if (patternMatches > 0) {
        matches += patternMatches;
        reasons.push(`Hinglish pattern detected: ${patternMatches} matches`);
      }
    }

    const isHinglish = matches > 0;
    if (isHinglish) {
      confidence = Math.min(0.4, matches * 0.1);
    }

    return { isHinglish, confidence, reasons };
  }

  private detectIndianContext(text: string): {
    hasIndianContext: boolean;
    confidence: number;
    reasons: string[];
  } {
    const reasons: string[] = [];
    let matches = 0;
    let confidence = 0;

    for (const pattern of this.indianLocationPatterns) {
      const patternMatches = (text.match(pattern) || []).length;
      if (patternMatches > 0) {
        matches += patternMatches;
        reasons.push(`Indian location/context detected: ${patternMatches} matches`);
      }
    }

    // Check for Indian cultural context (festivals, customs, etc.)
    const culturalPatterns = [
      /\b(diwali|holi|dussehra|eid|ganesh|durga|navratri|karwa chauth)\b/gi,
      /\b(rupee|inr|paisa|lakh|crore)\b/gi,
      /\b(ayurveda|yoga|namaste|ji|sahab|bhakt|puja|mandir)\b/gi
    ];

    for (const pattern of culturalPatterns) {
      const culturalMatches = (text.match(pattern) || []).length;
      if (culturalMatches > 0) {
        matches += culturalMatches;
        reasons.push(`Indian cultural context: ${culturalMatches} matches`);
      }
    }

    const hasIndianContext = matches > 0;
    if (hasIndianContext) {
      confidence = Math.min(0.2, matches * 0.05);
    }

    return { hasIndianContext, confidence, reasons };
  }

  /**
   * Get optimal language suggestion for user based on multiple factors
   */
  public suggestOptimalLanguage(
    browserInfo: BrowserLanguageInfo,
    contentAnalysis?: LanguageDetectionResult,
    userHistory?: { previousLanguage?: string; contentLanguagePreference?: string }
  ): 'en' | 'hi' {
    // Priority order:
    // 1. User's explicit previous choice
    // 2. User's content language preference
    // 3. Content analysis suggestion
    // 4. Browser language preference
    // 5. Default to English

    if (userHistory?.previousLanguage) {
      return userHistory.previousLanguage as 'en' | 'hi';
    }

    if (userHistory?.contentLanguagePreference) {
      return userHistory.contentLanguagePreference as 'en' | 'hi';
    }

    if (contentAnalysis?.suggestedLanguage) {
      return contentAnalysis.suggestedLanguage;
    }

    return browserInfo.preferredIndianLanguage || 'en';
  }

  /**
   * Auto-detect and set language for new users
   */
  public async autoDetectAndSetLanguage(): Promise<{
    detectedLanguage: 'en' | 'hi';
    confidence: number;
    method: string;
    shouldPromptUser: boolean;
  }> {
    const browserInfo = this.detectBrowserLanguage();
    
    // High confidence detection
    if (browserInfo.primary === 'hi' || 
        browserInfo.all.some(lang => lang.toLowerCase().startsWith('hi'))) {
      return {
        detectedLanguage: 'hi',
        confidence: 0.9,
        method: 'Browser language preference',
        shouldPromptUser: false
      };
    }

    // Medium confidence - Indian region with English
    if (browserInfo.region === 'in' && browserInfo.primary === 'en') {
      return {
        detectedLanguage: browserInfo.preferredIndianLanguage || 'en',
        confidence: 0.6,
        method: 'Indian region detection',
        shouldPromptUser: true // Ask user to confirm
      };
    }

    // Low confidence - default English
    return {
      detectedLanguage: 'en',
      confidence: 0.3,
      method: 'Default fallback',
      shouldPromptUser: true
    };
  }
}

// Export singleton instance
export const languageDetection = new LanguageDetectionEngine();