// Week 10: AI Service Integration with External AI Services
// This service handles AI-powered health analysis, recommendations, and predictions

interface HealthAnalysisInput {
  dogProfile: {
    breed: string;
    age_months: number;
    weight_kg: number;
    gender: string;
  };
  healthLogs: Array<{
    log_date: string;
    activity_level: string;
    appetite: string;
    mood: string;
    physical_condition: string;
    notes?: string;
  }>;
  symptoms?: string[];
  medicalHistory?: string[];
}

interface HealthPrediction {
  prediction_type: 'risk_assessment' | 'health_trend' | 'anomaly_detection';
  predicted_condition?: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  confidence_score: number; // 0.0 to 1.0
  recommendations: string[];
  prediction_data: any;
}

interface AIRecommendation {
  type: 'health_alert' | 'expert_suggestion' | 'content' | 'partner_match';
  title: string;
  description: string;
  confidence_score: number;
  data_sources: string[];
  action_url?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

class AIService {
  private static instance: AIService;
  private readonly API_KEY = process.env.OPENAI_API_KEY || '';
  private readonly API_BASE_URL = 'https://api.openai.com/v1';

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  // Analyze health patterns using AI
  async analyzeHealthPatterns(input: HealthAnalysisInput): Promise<HealthPrediction[]> {
    try {
      // Prepare data for AI analysis
      const analysisPrompt = this.buildHealthAnalysisPrompt(input);
      
      const response = await fetch(`${this.API_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: `You are a veterinary AI assistant specializing in dog health analysis. 
                       Analyze health patterns and provide predictions based on breed-specific knowledge.
                       Always respond with valid JSON containing predictions array.`
            },
            {
              role: 'user',
              content: analysisPrompt
            }
          ],
          temperature: 0.3,
          max_tokens: 1500
        })
      });

      if (!response.ok) {
        throw new Error(`AI API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0]?.message?.content;

      // Parse AI response and validate
      const predictions = this.parseHealthPredictions(aiResponse);
      
      // Apply rule-based validation and adjustments
      return this.validateAndEnhancePredictions(predictions, input);

    } catch (error) {
      console.error('AI Health Analysis Error:', error);
      // Fallback to rule-based analysis
      return this.fallbackHealthAnalysis(input);
    }
  }

  // Generate personalized recommendations
  async generateRecommendations(
    userId: string, 
    dogId: string, 
    context: any
  ): Promise<AIRecommendation[]> {
    try {
      const prompt = this.buildRecommendationPrompt(context);
      
      const response = await fetch(`${this.API_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are an AI assistant for a pet care platform. Generate personalized 
                       recommendations for dog owners based on their activity and dog's profile.
                       Focus on health, training, nutrition, and community engagement.
                       Respond with valid JSON containing recommendations array.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.5,
          max_tokens: 1000
        })
      });

      const data = await response.json();
      const aiResponse = data.choices[0]?.message?.content;
      
      return this.parseRecommendations(aiResponse);

    } catch (error) {
      console.error('AI Recommendation Error:', error);
      return this.fallbackRecommendations(context);
    }
  }

  // Detect duplicate questions in community
  async detectDuplicateQuestion(
    newQuestion: string,
    existingQuestions: Array<{id: string, title: string, content: string}>
  ): Promise<{isDuplicate: boolean, similarQuestions: string[], confidence: number}> {
    try {
      const prompt = `
        New Question: "${newQuestion}"
        
        Existing Questions:
        ${existingQuestions.map(q => `ID: ${q.id}\nTitle: ${q.title}\nContent: ${q.content}`).join('\n\n')}
        
        Determine if the new question is a duplicate or very similar to any existing questions.
        Consider semantic similarity, not just exact word matches.
      `;

      const response = await fetch(`${this.API_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are a content moderation AI. Analyze questions for semantic similarity.
                       Respond with JSON: {"isDuplicate": boolean, "similarQuestions": ["id1", "id2"], "confidence": 0.0-1.0}`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 200
        })
      });

      const data = await response.json();
      const result = JSON.parse(data.choices[0]?.message?.content || '{}');
      
      return {
        isDuplicate: result.isDuplicate || false,
        similarQuestions: result.similarQuestions || [],
        confidence: result.confidence || 0.0
      };

    } catch (error) {
      console.error('Duplicate Detection Error:', error);
      return { isDuplicate: false, similarQuestions: [], confidence: 0.0 };
    }
  }

  // Smart question categorization
  async categorizeQuestion(question: string, language: string = 'en'): Promise<{
    category: string;
    subcategory?: string;
    confidence: number;
    suggestedTags: string[];
  }> {
    try {
      const categories = {
        health: ['illness', 'symptoms', 'medical', 'vet', 'medicine', 'बीमारी', 'स्वास्थ्य'],
        training: ['behavior', 'commands', 'obedience', 'प्रशिक्षण', 'व्यवहार'],
        nutrition: ['food', 'diet', 'feeding', 'खाना', 'आहार'],
        grooming: ['bathing', 'brushing', 'nail', 'सफाई'],
        breeds: ['breed', 'genetics', 'characteristics', 'नस्ल'],
        emergency: ['emergency', 'urgent', 'critical', 'आपातकाल']
      };

      const prompt = `
        Question: "${question}"
        Language: ${language}
        
        Categories available: ${Object.keys(categories).join(', ')}
        
        Analyze this question and categorize it appropriately.
        Consider the language and context.
      `;

      const response = await fetch(`${this.API_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are a content categorization AI for a pet care platform.
                       Respond with JSON: {"category": "string", "subcategory": "string", "confidence": 0.0-1.0, "suggestedTags": ["tag1", "tag2"]}`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.2,
          max_tokens: 200
        })
      });

      const data = await response.json();
      const result = JSON.parse(data.choices[0]?.message?.content || '{}');
      
      return {
        category: result.category || 'general',
        subcategory: result.subcategory,
        confidence: result.confidence || 0.5,
        suggestedTags: result.suggestedTags || []
      };

    } catch (error) {
      console.error('Question Categorization Error:', error);
      return this.fallbackCategorization(question, language);
    }
  }

  // Expert matching for questions
  async matchExpertForQuestion(
    question: string,
    category: string,
    availableExperts: Array<{id: string, specialization: string[], experience: number}>
  ): Promise<{expertId: string, matchScore: number, reasoning: string}[]> {
    try {
      const prompt = `
        Question: "${question}"
        Category: ${category}
        
        Available Experts:
        ${availableExperts.map(exp => 
          `ID: ${exp.id}, Specializations: ${exp.specialization.join(', ')}, Experience: ${exp.experience} years`
        ).join('\n')}
        
        Match the best experts for this question based on specialization and relevance.
      `;

      const response = await fetch(`${this.API_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are an expert matching AI. Match questions with the most suitable experts.
                       Respond with JSON array: [{"expertId": "string", "matchScore": 0.0-1.0, "reasoning": "string"}]`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 300
        })
      });

      const data = await response.json();
      const matches = JSON.parse(data.choices[0]?.message?.content || '[]');
      
      return matches.sort((a: any, b: any) => b.matchScore - a.matchScore);

    } catch (error) {
      console.error('Expert Matching Error:', error);
      return this.fallbackExpertMatching(availableExperts, category);
    }
  }

  // Private helper methods

  private buildHealthAnalysisPrompt(input: HealthAnalysisInput): string {
    return `
      Analyze the health patterns for this dog:
      
      Dog Profile:
      - Breed: ${input.dogProfile.breed}
      - Age: ${input.dogProfile.age_months} months
      - Weight: ${input.dogProfile.weight_kg} kg
      - Gender: ${input.dogProfile.gender}
      
      Recent Health Logs:
      ${input.healthLogs.map(log => 
        `Date: ${log.log_date}, Activity: ${log.activity_level}, Appetite: ${log.appetite}, Mood: ${log.mood}, Condition: ${log.physical_condition}${log.notes ? `, Notes: ${log.notes}` : ''}`
      ).join('\n')}
      
      ${input.symptoms ? `Current Symptoms: ${input.symptoms.join(', ')}` : ''}
      ${input.medicalHistory ? `Medical History: ${input.medicalHistory.join(', ')}` : ''}
      
      Provide health predictions with risk assessments, considering breed-specific conditions.
    `;
  }

  private buildRecommendationPrompt(context: any): string {
    return `
      Generate personalized recommendations for this dog owner:
      
      User Context: ${JSON.stringify(context, null, 2)}
      
      Focus on actionable recommendations for health, training, nutrition, and community engagement.
      Consider the user's experience level and current needs.
    `;
  }

  private parseHealthPredictions(aiResponse: string): HealthPrediction[] {
    try {
      const parsed = JSON.parse(aiResponse);
      return parsed.predictions || [];
    } catch (error) {
      console.error('Failed to parse AI health predictions:', error);
      return [];
    }
  }

  private parseRecommendations(aiResponse: string): AIRecommendation[] {
    try {
      const parsed = JSON.parse(aiResponse);
      return parsed.recommendations || [];
    } catch (error) {
      console.error('Failed to parse AI recommendations:', error);
      return [];
    }
  }

  private validateAndEnhancePredictions(predictions: HealthPrediction[], input: HealthAnalysisInput): HealthPrediction[] {
    return predictions.map(prediction => ({
      ...prediction,
      confidence_score: Math.min(Math.max(prediction.confidence_score, 0.0), 1.0),
      prediction_data: {
        ...prediction.prediction_data,
        breed: input.dogProfile.breed,
        analysis_timestamp: new Date().toISOString()
      }
    }));
  }

  private fallbackHealthAnalysis(input: HealthAnalysisInput): HealthPrediction[] {
    // Simple rule-based fallback
    const recentLogs = input.healthLogs.slice(-7); // Last 7 days
    const lowAppetiteDays = recentLogs.filter(log => log.appetite === 'poor').length;
    const lowActivityDays = recentLogs.filter(log => log.activity_level === 'low').length;

    const predictions: HealthPrediction[] = [];

    if (lowAppetiteDays >= 3) {
      predictions.push({
        prediction_type: 'risk_assessment',
        predicted_condition: 'appetite_concern',
        risk_level: lowAppetiteDays >= 5 ? 'high' : 'medium',
        confidence_score: 0.7,
        recommendations: ['Consult with veterinarian', 'Monitor eating habits closely'],
        prediction_data: { rule: 'appetite_pattern', days_affected: lowAppetiteDays }
      });
    }

    if (lowActivityDays >= 3) {
      predictions.push({
        prediction_type: 'health_trend',
        predicted_condition: 'activity_decline',
        risk_level: 'medium',
        confidence_score: 0.6,
        recommendations: ['Increase exercise gradually', 'Check for pain or discomfort'],
        prediction_data: { rule: 'activity_pattern', days_affected: lowActivityDays }
      });
    }

    return predictions;
  }

  private fallbackRecommendations(context: any): AIRecommendation[] {
    // Simple rule-based recommendations
    return [
      {
        type: 'health_alert',
        title: 'Regular Health Check',
        description: 'Consider scheduling a routine health check with a veterinarian.',
        confidence_score: 0.8,
        data_sources: ['user_activity'],
        priority: 'medium'
      }
    ];
  }

  private fallbackCategorization(question: string, language: string): {
    category: string;
    subcategory?: string;
    confidence: number;
    suggestedTags: string[];
  } {
    const lowerQuestion = question.toLowerCase();
    
    // Simple keyword-based categorization
    if (lowerQuestion.includes('sick') || lowerQuestion.includes('ill') || lowerQuestion.includes('बीमार')) {
      return { category: 'health', confidence: 0.7, suggestedTags: ['health', 'illness'] };
    }
    
    if (lowerQuestion.includes('train') || lowerQuestion.includes('behavior') || lowerQuestion.includes('प्रशिक्षण')) {
      return { category: 'training', confidence: 0.7, suggestedTags: ['training', 'behavior'] };
    }
    
    if (lowerQuestion.includes('food') || lowerQuestion.includes('eat') || lowerQuestion.includes('खाना')) {
      return { category: 'nutrition', confidence: 0.7, suggestedTags: ['food', 'nutrition'] };
    }
    
    return { category: 'general', confidence: 0.5, suggestedTags: [] };
  }

  private fallbackExpertMatching(experts: Array<{id: string, specialization: string[], experience: number}>, category: string): 
    {expertId: string, matchScore: number, reasoning: string}[] {
    return experts
      .map(expert => ({
        expertId: expert.id,
        matchScore: expert.specialization.includes(category) ? 0.8 : 0.3,
        reasoning: expert.specialization.includes(category) ? 'Direct specialization match' : 'General expertise'
      }))
      .sort((a, b) => b.matchScore - a.matchScore);
  }
}

export default AIService;
export type { HealthAnalysisInput, HealthPrediction, AIRecommendation };