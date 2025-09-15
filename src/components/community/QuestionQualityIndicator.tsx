'use client';

import { useState, useEffect } from 'react';

interface QualityAnalysis {
  score: number;
  suggestions: string[];
}

interface QuestionQualityIndicatorProps {
  title: string;
  content: string;
  className?: string;
}

export default function QuestionQualityIndicator({
  title,
  content,
  className = ''
}: QuestionQualityIndicatorProps) {
  const [quality, setQuality] = useState<QualityAnalysis>({ score: 0, suggestions: [] });
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Calculate quality in real-time as user types
    const analysis = analyzeQuestionQuality(title, content);
    setQuality(analysis);
  }, [title, content]);

  const analyzeQuestionQuality = (title: string, content: string): QualityAnalysis => {
    const issues: string[] = [];
    let score = 100;

    // Intent Recognition - Check if this is actually a question or request for help
    const intentData = detectQuestionIntent(title, content);

    // Title analysis
    if (title.length < 10) {
      issues.push('Title is too short. Consider adding more details.');
      score -= 15;
    }
    if (title.length > 100) {
      issues.push('Title is too long. Keep it concise and focused.');
      score -= 10;
    }

    // Smart Intent-based assessment instead of rigid format rules
    if (!intentData.isQuestion) {
      // Only penalize if it's genuinely not a question/request for help
      if (intentData.confidence < 0.3) {
        issues.push('Consider clarifying what specific help or information you need.');
        score -= 8; // Reduced penalty from 15
      }
    } else {
      // BONUS: Reward clear intent even without question marks
      if (intentData.confidence > 0.7) {
        score += 5;
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
    if (!hasContext && content.length > 20) {
      issues.push('Include relevant context (dog age, breed, duration of issue, etc.).');
      score -= 15;
    }

    return {
      score: Math.max(Math.min(score, 100), 0), // Cap at 100
      suggestions: issues
    };
  };

  // Enhanced Intent Recognition Function - V2.0 with Indian Context
  const detectQuestionIntent = (title: string, content: string): { 
    isQuestion: boolean; 
    confidence: number; 
    type: string; 
    indicators: string[];
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
    // Better normalization based on pattern analysis
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
    const isQuestion = confidence > 0.2; // Lowered threshold for more inclusive detection
    
    return { 
      isQuestion, 
      confidence: Math.round(confidence * 100) / 100,
      type: detectedType,
      indicators: foundIndicators.slice(0, 3) // Top 3 indicators
    };
  };

  const getQualityColor = (score: number) => {
    if (score >= 80) return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' };
    if (score >= 60) return { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' };
    return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' };
  };

  const getQualityText = (score: number) => {
    if (score >= 80) return 'Great question!';
    if (score >= 60) return 'Good question';
    if (score >= 40) return 'Needs improvement';
    return 'Poor quality';
  };

  const getQualityIcon = (score: number) => {
    if (score >= 80) return '✅';
    if (score >= 60) return '👍';
    if (score >= 40) return '⚠️';
    return '❌';
  };

  // Don't show for empty content
  if (!title.trim() && !content.trim()) {
    return null;
  }

  const colors = getQualityColor(quality.score);

  return (
    <div className={`rounded-lg border p-4 ${colors.bg} ${colors.border} ${className}`}>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center">
          <span className="mr-2">{getQualityIcon(quality.score)}</span>
          <div className="text-left">
            <div className={`font-medium text-sm ${colors.text}`}>
              Question Quality: {quality.score}%
            </div>
            <div className={`text-xs ${colors.text} opacity-75`}>
              {getQualityText(quality.score)}
            </div>
          </div>
        </div>
        <div className="flex items-center">
          {quality.suggestions.length > 0 && (
            <span className={`text-xs ${colors.text} opacity-75 mr-2`}>
              {quality.suggestions.length} suggestion{quality.suggestions.length !== 1 ? 's' : ''}
            </span>
          )}
          <span className={`transition-transform ${isExpanded ? 'rotate-180' : ''} ${colors.text}`}>
            ▼
          </span>
        </div>
      </button>

      {isExpanded && quality.suggestions.length > 0 && (
        <div className="mt-3 pt-3 border-t border-current border-opacity-20">
          <div className={`text-xs font-medium ${colors.text} mb-2`}>
            Suggestions to improve your question:
          </div>
          <ul className="space-y-1">
            {quality.suggestions.map((suggestion, index) => (
              <li key={index} className={`text-xs ${colors.text} opacity-75 flex items-start`}>
                <span className="mr-1 mt-0.5">•</span>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}

      {isExpanded && quality.suggestions.length === 0 && (
        <div className="mt-3 pt-3 border-t border-current border-opacity-20">
          <div className={`text-xs ${colors.text} opacity-75`}>
            Your question looks good! No improvements needed.
          </div>
        </div>
      )}

      {/* Quality Bar */}
      <div className="mt-3">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              quality.score >= 80 ? 'bg-green-500' :
              quality.score >= 60 ? 'bg-yellow-500' :
              quality.score >= 40 ? 'bg-orange-500' : 'bg-red-500'
            }`}
            style={{ width: `${quality.score}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}