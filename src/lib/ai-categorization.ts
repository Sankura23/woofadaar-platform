// Week 19 Phase 1: AI-Powered Question Categorization Service
// Automatically categorizes questions and suggests relevant tags

export interface CategorySuggestion {
  category: string;
  confidence: number;
  reason: string;
}

export interface TagSuggestion {
  tag: string;
  relevance: number;
}

export interface CategorizationResult {
  primaryCategory: CategorySuggestion;
  secondaryCategories: CategorySuggestion[];
  suggestedTags: TagSuggestion[];
  overallConfidence: number;
  method: 'ai' | 'keyword' | 'template' | 'semantic_ai' | 'enhanced_keyword';
  intentData?: {
    isQuestion: boolean;
    confidence: number;
    type: string;
    indicators: string[];
  };
}

// Category definitions with keywords and patterns
const CATEGORY_DEFINITIONS = {
  health: {
    keywords: [
      'sick', 'illness', 'disease', 'symptom', 'vet', 'veterinarian', 'medicine', 'medication',
      'injury', 'wound', 'infection', 'fever', 'vomiting', 'diarrhea', 'appetite', 'eating',
      'drinking', 'urination', 'breathing', 'cough', 'sneeze', 'limping', 'swelling',
      'vaccine', 'vaccination', 'checkup', 'examination', 'treatment', 'surgery', 'pain',
      'weight loss', 'weight gain', 'lethargy', 'energy', 'sleep', 'rash', 'itching', 'scratching'
    ],
    patterns: [
      /(?:my|our) dog (?:is|seems|looks) sick/i,
      /dog (?:won't|can't|doesn't) eat/i,
      /(?:strange|weird|unusual) behavior/i,
      /vet(?:erinarian)? (?:visit|appointment|recommend)/i
    ],
    weight: 1.0
  },
  behavior: {
    keywords: [
      'behavior', 'training', 'aggression', 'aggressive', 'biting', 'barking', 'howling',
      'jumping', 'pulling', 'leash', 'walk', 'obedience', 'commands', 'sit', 'stay',
      'come', 'heel', 'house training', 'potty', 'toilet', 'discipline', 'punishment',
      'reward', 'treat', 'positive reinforcement', 'socialization', 'fearful', 'anxiety',
      'separation anxiety', 'destructive', 'chewing', 'digging', 'escape', 'running away'
    ],
    patterns: [
      /dog (?:is|being) (?:aggressive|naughty|destructive)/i,
      /(?:train|teach) (?:my|our) dog/i,
      /dog (?:won't|doesn't) (?:listen|obey)/i,
      /barking (?:too much|excessively|constantly)/i
    ],
    weight: 1.0
  },
  food: {
    keywords: [
      'food', 'feeding', 'diet', 'nutrition', 'kibble', 'wet food', 'dry food', 'treats',
      'snacks', 'homemade', 'raw diet', 'barf', 'portion', 'amount', 'frequency',
      'meal', 'breakfast', 'dinner', 'lunch', 'hungry', 'appetite', 'picky eater',
      'allergies', 'food allergy', 'ingredient', 'protein', 'grain free', 'organic',
      'supplements', 'vitamins', 'calcium', 'overweight', 'underweight', 'puppy food',
      'senior food', 'digestive', 'sensitive stomach'
    ],
    patterns: [
      /(?:what|how) (?:to|should) (?:feed|give)/i,
      /dog (?:food|diet|nutrition)/i,
      /(?:recommend|suggest) food/i,
      /(?:best|good) food for/i
    ],
    weight: 1.0
  },
  training: {
    keywords: [
      'training', 'train', 'teach', 'learn', 'command', 'trick', 'obedience', 'puppy training',
      'basic training', 'advanced training', 'agility', 'competition', 'show dog', 'trainer',
      'class', 'school', 'session', 'practice', 'exercise', 'mental stimulation',
      'puzzle', 'game', 'activity', 'socialization', 'puppy socialization', 'dog park',
      'meet other dogs', 'confidence', 'fearful', 'shy', 'timid', 'bold', 'energetic'
    ],
    patterns: [
      /(?:training|teach|learn) (?:tips|advice|help)/i,
      /(?:how to|ways to) train/i,
      /dog training (?:class|program|method)/i,
      /(?:puppy|basic|advanced) training/i
    ],
    weight: 1.0
  },
  local: {
    keywords: [
      'local', 'nearby', 'area', 'city', 'location', 'mumbai', 'delhi', 'bangalore', 'kolkata',
      'pune', 'hyderabad', 'chennai', 'ahmedabad', 'jaipur', 'lucknow', 'kanpur', 'nagpur',
      'indore', 'thane', 'bhopal', 'visakhapatnam', 'pimpri', 'patna', 'vadodara', 'ghaziabad',
      'ludhiana', 'agra', 'nashik', 'faridabad', 'meerut', 'rajkot', 'kalyan', 'vasai',
      'varanasi', 'srinagar', 'aurangabad', 'dhanbad', 'amritsar', 'navi mumbai', 'allahabad',
      'ranchi', 'howrah', 'coimbatore', 'jabalpur', 'gwalior', 'vijayawada', 'jodhpur',
      'madurai', 'raipur', 'kota', 'guwahati', 'chandigarh', 'solapur', 'hubballi', 'tiruchirappalli',
      'bareilly', 'mysuru', 'tiruppur', 'gurgaon', 'aligarh', 'jalandhar', 'bhubaneswar',
      'salem', 'warangal', 'guntur', 'bhiwandi', 'saharanpur', 'gorakhpur', 'bikaner', 'amravati'
    ],
    patterns: [
      /(?:in|near|around) (?:mumbai|delhi|bangalore|pune|hyderabad)/i,
      /(?:local|nearby) (?:vet|trainer|groomer|pet store)/i,
      /(?:best|good) (?:vet|trainer) in/i,
      /(?:where|which) (?:city|area|location)/i
    ],
    weight: 1.0
  },
  general: {
    keywords: [
      'general', 'advice', 'tip', 'help', 'question', 'doubt', 'confusion', 'beginner',
      'new dog owner', 'first time', 'puppy owner', 'adopt', 'adoption', 'rescue',
      'breed', 'choosing', 'selection', 'comparison', 'personality', 'temperament',
      'size', 'apartment', 'family', 'children', 'kids', 'elderly', 'senior citizen',
      'experience', 'lifestyle', 'time', 'commitment', 'responsibility', 'cost', 'budget'
    ],
    patterns: [
      /(?:new|first time) dog owner/i,
      /(?:thinking|planning) (?:to|of) (?:get|adopt)/i,
      /(?:which|what) breed/i,
      /general (?:advice|question|help)/i
    ],
    weight: 0.5
  }
};

// Enhanced categorization algorithm with semantic understanding
export const categorizeQuestion = async (
  title: string,
  content: string
): Promise<CategorizationResult> => {
  const text = `${title} ${content}`.toLowerCase();
  const categoryScores: Record<string, number> = {};
  
  // First check intent to understand the question better
  const intentData = detectQuestionIntent(title, content);
  
  // Calculate category scores based on keywords, patterns, and semantic analysis
  for (const [category, definition] of Object.entries(CATEGORY_DEFINITIONS)) {
    let score = 0;
    
    // Keyword matching with weighted scoring
    for (const keyword of definition.keywords) {
      const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'g');
      const matches = text.match(regex);
      if (matches) {
        score += matches.length * 0.1;
      }
    }
    
    // Pattern matching with higher weight
    for (const pattern of definition.patterns) {
      if (pattern.test(text)) {
        score += 0.5;
      }
    }
    
    // Semantic context scoring - understand the meaning beyond keywords
    const contextScore = calculateSemanticCategoryScore(title, content, category, intentData);
    score += contextScore;
    
    // Apply category weight
    score *= definition.weight;
    
    if (score > 0) {
      categoryScores[category] = score;
    }
  }
  
  // Sort categories by score
  const sortedCategories = Object.entries(categoryScores)
    .sort(([, a], [, b]) => b - a)
    .map(([category, score]) => ({
      category,
      confidence: Math.min(score, 1.0),
      reason: generateSemanticCategoryReason(category, score, intentData)
    }));
  
  // Generate tag suggestions
  const suggestedTags = generateTagSuggestions(title, content, sortedCategories[0]?.category);
  
  // Calculate overall confidence with intent boost
  const baseConfidence = sortedCategories.length > 0 ? sortedCategories[0].confidence : 0.1;
  const overallConfidence = intentData.isQuestion ? 
    Math.min(baseConfidence + (intentData.confidence * 0.1), 1.0) : 
    baseConfidence;
  
  return {
    primaryCategory: sortedCategories[0] || {
      category: 'general',
      confidence: 0.1,
      reason: 'Default category assigned'
    },
    secondaryCategories: sortedCategories.slice(1, 3),
    suggestedTags,
    overallConfidence,
    method: overallConfidence > 0.6 ? 'semantic_ai' : 'enhanced_keyword',
    intentData // Include intent analysis for debugging
  };
};

// New function: Calculate semantic category score based on context and intent
const calculateSemanticCategoryScore = (
  title: string, 
  content: string, 
  category: string, 
  intentData: any
): number => {
  const text = `${title} ${content}`.toLowerCase();
  let semanticScore = 0;
  
  // Context-based scoring for different categories
  const semanticIndicators = {
    health: [
      { phrase: /\b(sick|illness|symptoms|vet|medical|treatment|medication|disease|infection|pain|injury)\b/g, score: 0.3 },
      { phrase: /\b(not eating|vomiting|diarrhea|limping|breathing|temperature|fever|swelling)\b/g, score: 0.4 },
      { phrase: /\b(emergency|urgent|serious|worried|concerned)\b/g, score: 0.2 }
    ],
    behavior: [
      { phrase: /\b(aggressive|barking|biting|jumping|pulling|destructive|anxiety|fearful)\b/g, score: 0.3 },
      { phrase: /\b(training|obedience|commands|socialization|calm|reactive)\b/g, score: 0.4 },
      { phrase: /\b(won't listen|doesn't come|ignores|stubborn|difficult)\b/g, score: 0.3 }
    ],
    food: [
      { phrase: /\b(food|diet|eating|nutrition|meal|treats|appetite|weight|hungry)\b/g, score: 0.3 },
      { phrase: /\b(won't eat|picky eater|allergies|overweight|underweight|portion)\b/g, score: 0.4 },
      { phrase: /\b(brand|recipe|homemade|raw diet|kibble|wet food)\b/g, score: 0.2 }
    ],
    training: [
      { phrase: /\b(teach|learn|command|trick|housebreak|potty|leash|walk)\b/g, score: 0.3 },
      { phrase: /\b(puppy training|basic commands|house training|crate training)\b/g, score: 0.4 },
      { phrase: /\b(how to train|training tips|methods|techniques)\b/g, score: 0.3 }
    ]
  };
  
  const indicators = semanticIndicators[category as keyof typeof semanticIndicators];
  if (indicators) {
    indicators.forEach(({ phrase, score }) => {
      const matches = text.match(phrase);
      if (matches) {
        semanticScore += matches.length * score;
      }
    });
  }
  
  // Boost based on intent type
  if (intentData.type === 'problem_statement' && ['health', 'behavior'].includes(category)) {
    semanticScore += 0.2;
  }
  if (intentData.type === 'help_request' && ['training', 'food'].includes(category)) {
    semanticScore += 0.15;
  }
  
  return Math.min(semanticScore, 0.8); // Cap semantic boost
};

// New semantic reason generator
const generateSemanticCategoryReason = (category: string, score: number, intentData: any): string => {
  const baseReasons = {
    health: 'Health-related query detected',
    behavior: 'Behavioral concern identified',
    food: 'Nutrition or feeding topic detected',
    training: 'Training or learning request identified',
    local: 'Location-specific question detected',
    general: 'General pet care question'
  };

  const intentContext = intentData.type === 'problem_statement' ? 'problem requiring help' :
                       intentData.type === 'help_request' ? 'direct help request' :
                       intentData.type === 'seeking_guidance' ? 'guidance needed' :
                       'question detected';

  const confidence = score > 0.7 ? 'High confidence' : score > 0.4 ? 'Moderate confidence' : 'Low confidence';
  
  return `${confidence}: ${baseReasons[category as keyof typeof baseReasons]} - ${intentContext}`;
};

// Generate reason for category assignment (legacy)
const generateCategoryReason = (category: string, score: number): string => {
  const reasons = {
    health: 'Contains health-related keywords and medical terminology',
    behavior: 'Discusses behavioral issues or training needs',
    food: 'Focuses on diet, nutrition, or feeding concerns',
    training: 'Related to dog training, commands, or learning',
    local: 'Seeking location-specific information or services',
    general: 'General dog care inquiry or broad topic'
  };
  
  return reasons[category as keyof typeof reasons] || 'Based on content analysis';
};

// Generate smart tag suggestions
const generateTagSuggestions = (
  title: string, 
  content: string, 
  primaryCategory?: string
): TagSuggestion[] => {
  const text = `${title} ${content}`.toLowerCase();
  const suggestions: TagSuggestion[] = [];
  
  // Breed detection
  const breedKeywords = [
    'golden retriever', 'labrador', 'german shepherd', 'poodle', 'bulldog', 'beagle',
    'rottweiler', 'siberian husky', 'boxer', 'dachshund', 'cocker spaniel', 'border collie',
    'shih tzu', 'pomeranian', 'yorkshire terrier', 'chihuahua', 'great dane', 'doberman',
    'indian pariah', 'rajapalayam', 'chippiparai', 'kombai', 'kanni', 'rampur hound'
  ];
  
  for (const breed of breedKeywords) {
    if (text.includes(breed)) {
      suggestions.push({
        tag: breed.replace(/\s+/g, '-').toLowerCase(),
        relevance: 0.9
      });
    }
  }
  
  // Age-based tags
  const ageKeywords = {
    puppy: ['puppy', 'puppies', 'young dog', '8 weeks', '12 weeks', '4 months', '6 months'],
    adult: ['adult dog', 'mature dog', '1 year', '2 years', '3 years'],
    senior: ['senior dog', 'old dog', 'elderly dog', '7 years', '8 years', '10 years']
  };
  
  for (const [ageTag, keywords] of Object.entries(ageKeywords)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        suggestions.push({
          tag: ageTag,
          relevance: 0.8
        });
        break;
      }
    }
  }
  
  // Emergency/urgency tags
  const urgentKeywords = ['urgent', 'emergency', 'help', 'asap', 'immediately', 'serious'];
  for (const keyword of urgentKeywords) {
    if (text.includes(keyword)) {
      suggestions.push({
        tag: 'urgent',
        relevance: 1.0
      });
      break;
    }
  }
  
  // Category-specific tags
  if (primaryCategory) {
    const categoryTags = {
      health: ['medical', 'symptoms', 'diagnosis', 'treatment'],
      behavior: ['training-needed', 'behavioral-issue', 'socialization'],
      food: ['nutrition', 'diet-advice', 'food-recommendation'],
      training: ['obedience', 'tricks', 'commands', 'puppy-training'],
      local: ['location-specific', 'service-recommendation'],
      general: ['advice-needed', 'beginner-friendly']
    };
    
    const tags = categoryTags[primaryCategory as keyof typeof categoryTags];
    if (tags) {
      suggestions.push(...tags.map(tag => ({
        tag,
        relevance: 0.6
      })));
    }
  }
  
  // Remove duplicates and sort by relevance
  const uniqueTags = suggestions
    .filter((suggestion, index, arr) => 
      arr.findIndex(s => s.tag === suggestion.tag) === index
    )
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 5); // Limit to top 5 suggestions
  
  return uniqueTags;
};

// Content analysis for question quality with Intent Recognition
export const analyzeQuestionQuality = (title: string, content: string): {
  score: number;
  suggestions: string[];
} => {
  const issues: string[] = [];
  let score = 100;
  
  // Intent Recognition - Check if this is actually a question or request for help
  const intentAnalysis = detectQuestionIntent(title, content);
  
  // Title analysis
  if (title.length < 10) {
    issues.push('Title is too short. Consider adding more details.');
    score -= 15;
  }
  if (title.length > 100) {
    issues.push('Title is too long. Keep it concise and focused.');
    score -= 10;
  }
  
  // Intent-based assessment instead of rigid format rules
  if (!intentAnalysis.isQuestion) {
    // Only penalize if it's genuinely not a question/request for help
    if (intentAnalysis.confidence < 0.3) {
      issues.push('Consider clarifying what specific help or information you need.');
      score -= 8; // Reduced penalty from 15
    }
  }
  
  // Content analysis
  if (content.length < 20) {
    issues.push('Add more details about your situation for better answers.');
    score -= 20;
  }
  if (content.length > 2000) {
    issues.push('Consider breaking down your question into smaller, focused questions.');
    score -= 10;
  }
  
  // Context analysis
  const contextIndicators = ['age', 'breed', 'symptoms', 'duration', 'when', 'how long'];
  const hasContext = contextIndicators.some(indicator => 
    content.toLowerCase().includes(indicator)
  );
  if (!hasContext) {
    issues.push('Include relevant context (dog age, breed, duration of issue, etc.).');
    score -= 15;
  }
  
  // Boost score for clear intent, even without question marks
  if (intentAnalysis.isQuestion && intentAnalysis.confidence > 0.7) {
    score += 5; // Reward clear intent
  }
  
  return {
    score: Math.max(score, 0),
    suggestions: issues,
    intentAnalysis // Include intent data for debugging
  };
};

// Enhanced Intent Recognition Function - V2.0 with Indian Context  
export const detectQuestionIntent = (title: string, content: string): { 
  isQuestion: boolean; 
  confidence: number; 
  type: string; 
  indicators: string[] 
} => {
  const text = `${title} ${content}`.toLowerCase();
  const foundIndicators: string[] = [];
  
  // Early exit for explicit questions - performance optimization
  if (text.includes('?')) {
    return { 
      isQuestion: true, 
      confidence: 1.0, 
      type: 'explicit_question', 
      indicators: ['question mark'] 
    };
  }
  
  // FALSE POSITIVE PREVENTION - Exclusion patterns
  const exclusionPatterns = [
    // Appreciation messages
    /\b(thank you|thanks|grateful|appreciate|great job|well done)\b/g,
    // Information sharing
    /\b(here is|here are|sharing|update|announcement|fyi|just to inform)\b/g,
    // Celebrations
    /\b(congratulations|congrats|happy birthday|celebration|hooray|yay)\b/g,
    // Statements of fact
    /\b(i am|i was|i have been|yesterday i|today i|this morning)\b/g
  ];
  
  let exclusionScore = 0;
  exclusionPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      exclusionScore += matches.length * 0.3;
    }
  });
  
  // ENHANCED QUESTION PATTERN DETECTION
  const questionPatterns = [
    // HIGH CONFIDENCE PATTERNS (0.8-1.0)
    { pattern: /\b(what|when|where|why|how|who|which)\b/g, weight: 0.9, type: 'interrogative', desc: 'question word' },
    { pattern: /\b(urgent|emergency|immediately|asap|critical|serious)\b/g, weight: 0.85, type: 'urgent_request', desc: 'urgency indicator' },
    
    // MEDIUM-HIGH CONFIDENCE (0.7-0.8)  
    { pattern: /\b(help|advice|suggest|recommend|tips?|guidance)\b/g, weight: 0.8, type: 'help_request', desc: 'help request' },
    { pattern: /\b(should I|can I|will this|is this|would it|could I)\b/g, weight: 0.8, type: 'seeking_guidance', desc: 'seeking guidance' },
    { pattern: /\b(need|want|looking for|seeking|require)\b/g, weight: 0.75, type: 'need_statement', desc: 'need statement' },
    
    // COMPARISON & SELECTION QUERIES
    { pattern: /\b(best|better|compare|vs|versus|which is|top|recommended)\b/g, weight: 0.7, type: 'comparison_request', desc: 'comparison query' },
    { pattern: /\b(brands?|types?|options?|varieties|choices|alternatives)\b/g, weight: 0.6, type: 'selection_query', desc: 'selection query' },
    
    // LOCATION-BASED QUERIES
    { pattern: /\b(near me|nearby|contact|address|location|phone|clinic|hospital)\b/g, weight: 0.7, type: 'location_query', desc: 'location query' },
    { pattern: /\b(mumbai|delhi|bangalore|chennai|pune|hyderabad|ahmedabad|kolkata|gurgaon|noida|in india)\b/g, weight: 0.6, type: 'location_query', desc: 'Indian city' },
    
    // EXPERIENCE & VALIDATION REQUESTS
    { pattern: /\b(anyone tried|reviews?|feedback|opinions?|experience|worth it|good idea)\b/g, weight: 0.65, type: 'experience_request', desc: 'experience request' },
    { pattern: /\b(safe|works?|effective|reliable|trustworthy|legit)\b/g, weight: 0.55, type: 'validation_seeking', desc: 'validation seeking' },
    
    // PROBLEM STATEMENTS
    { pattern: /\b(problem|issue|trouble|struggling|difficulty|confused|stuck)\b/g, weight: 0.6, type: 'problem_statement', desc: 'problem statement' },
    { pattern: /\b(not working|doesn't work|won't|isn't|can't)\b/g, weight: 0.55, type: 'malfunction', desc: 'malfunction' },
    { pattern: /\b(my dog|dog is|dog has|dog won't|dog doesn't|puppy is)\b/g, weight: 0.7, type: 'pet_issue', desc: 'pet issue' },
    
    // HINGLISH & INDIAN CONTEXT PATTERNS
    { pattern: /\b(kya|kaise|kyun|kahan|kab|kaun|kya karna|batao|suggest karo)\b/g, weight: 0.8, type: 'hinglish_question', desc: 'Hinglish question' },
    { pattern: /\b(chahiye|hona chahiye|karna chahiye|milega|kaise kare)\b/g, weight: 0.75, type: 'hinglish_need', desc: 'Hinglish need' },
    { pattern: /\b(bhaiya|sir|doctor sahab|veterinary wala|clinic main|hospital main)\b/g, weight: 0.6, type: 'indian_cultural', desc: 'Indian context' },
    { pattern: /\b(koi|kuch|achha|samjho|pata hai|malum hai)\b/g, weight: 0.5, type: 'hinglish_misc', desc: 'Hinglish misc' }
  ];
  
  let totalScore = 0;
  let detectedType = 'unknown';
  let highestWeight = 0;
  
  // Process all patterns
  questionPatterns.forEach(({ pattern, weight, type, desc }) => {
    const matches = text.match(pattern);
    if (matches) {
      const score = matches.length * weight;
      totalScore += score;
      foundIndicators.push(desc);
      
      // Track the most significant pattern type
      if (weight > highestWeight) {
        highestWeight = weight;
        detectedType = type;
      }
    }
  });
  
  // Apply exclusion penalty
  totalScore = Math.max(0, totalScore - exclusionScore);
  
  // OPTIMIZED CONFIDENCE CALCULATION
  let confidence = 0;
  if (totalScore > 0) {
    // Scale confidence based on total score
    if (totalScore >= 1.5) confidence = Math.min(totalScore / 2.5, 1.0);
    else if (totalScore >= 0.8) confidence = totalScore / 2.0;
    else confidence = totalScore / 3.0;
  }
  
  // Boost confidence for multiple indicators
  if (foundIndicators.length > 1) {
    confidence = Math.min(confidence * 1.15, 1.0);
  }
  
  // Final decision threshold
  const isQuestion = confidence > 0.2;
  
  return {
    isQuestion,
    confidence: Math.round(confidence * 100) / 100,
    type: detectedType,
    indicators: foundIndicators.slice(0, 3)
  };
};

// Enhanced quality assessment for better user experience
export const assessQuestionQuality = (title: string, content: string): { score: number; suggestions: string[] } => {
  // Use the new smart quality analysis
  const result = analyzeQuestionQuality(title, content);
  return {
    score: result.score,
    suggestions: result.suggestions
  };
};

// Main categorization function that integrates with database
export const processCategorization = async (
  questionId: string,
  title: string,
  content: string
): Promise<CategorizationResult> => {
  try {
    // Run AI categorization
    const result = await categorizeQuestion(title, content);
    
    // Store categorization result in database
    // This will be implemented when we create the API endpoint
    
    return result;
  } catch (error) {
    console.error('Error in question categorization:', error);
    
    // Fallback to simple categorization
    return {
      primaryCategory: {
        category: 'general',
        confidence: 0.1,
        reason: 'Fallback categorization due to processing error'
      },
      secondaryCategories: [],
      suggestedTags: [],
      overallConfidence: 0.1,
      method: 'keyword'
    };
  }
};

// Template matching for structured questions
export const findMatchingTemplate = async (
  category: string,
  title: string,
  content: string
): Promise<{
  template: any | null;
  matchScore: number;
}> => {
  // This will integrate with the QuestionTemplate model
  // For now, return basic template matching logic
  
  const templatePatterns = {
    health: {
      symptom_check: {
        pattern: /(?:symptom|sick|not feeling well)/i,
        fields: ['symptoms', 'duration', 'severity', 'dog_age', 'breed']
      },
      medication: {
        pattern: /(?:medicine|medication|drug)/i,
        fields: ['medication_name', 'dosage', 'duration', 'side_effects']
      }
    },
    behavior: {
      training_issue: {
        pattern: /(?:won't listen|doesn't obey|misbehaving)/i,
        fields: ['behavior_description', 'frequency', 'triggers', 'training_attempted']
      },
      aggression: {
        pattern: /(?:aggressive|biting|attacking)/i,
        fields: ['aggression_triggers', 'severity', 'target', 'safety_concerns']
      }
    }
  };
  
  const text = `${title} ${content}`;
  const categoryTemplates = templatePatterns[category as keyof typeof templatePatterns];
  
  if (!categoryTemplates) {
    return { template: null, matchScore: 0 };
  }
  
  for (const [templateName, template] of Object.entries(categoryTemplates)) {
    if (template.pattern.test(text)) {
      return {
        template: {
          name: templateName,
          fields: template.fields,
          category
        },
        matchScore: 0.8
      };
    }
  }
  
  return { template: null, matchScore: 0 };
};