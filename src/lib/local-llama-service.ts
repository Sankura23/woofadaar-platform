export interface LocalLlamaAnalysisResult {
  overallScore: number;
  clarity: number;
  urgency: number;
  completeness: number;
  category: string;
  suggestedTags: string[];
  feedback: string[];
  confidenceLevel: 'high' | 'medium' | 'low';
}

export interface QuestionData {
  title: string;
  content: string;
  category: string;
}

export class LocalLlamaService {
  private baseUrl = 'http://localhost:11434';

  async analyzeQuestion(questionData: QuestionData): Promise<LocalLlamaAnalysisResult> {
    try {
      const prompt = this.createDogAnalysisPrompt(questionData);

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3.2:3b',
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.3, // Lower temperature for more consistent analysis
            top_p: 0.9,
            stop: ['###', 'Human:', 'Assistant:']
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = await response.json();
      const analysis = this.parseAnalysisResponse(data.response);

      return analysis;
    } catch (error) {
      console.error('Local Llama analysis failed:', error);
      throw error;
    }
  }

  private createDogAnalysisPrompt(questionData: QuestionData): string {
    return `You are an expert dog behaviorist and veterinary consultant. Analyze this dog-related question and provide scores and feedback.

QUESTION TITLE: "${questionData.title}"
QUESTION CONTENT: "${questionData.content}"
CURRENT CATEGORY: "${questionData.category}"

Please analyze this question and respond with ONLY a valid JSON object in this exact format:

{
  "overallScore": 85,
  "clarity": 90,
  "urgency": 70,
  "completeness": 80,
  "category": "health",
  "suggestedTags": ["emergency", "puppy", "veterinary"],
  "feedback": [
    "This is a clear and urgent question",
    "Consider mentioning your dog's age and breed",
    "Contact a veterinarian immediately for emergency symptoms"
  ],
  "confidenceLevel": "high"
}

SCORING GUIDELINES:
- overallScore (1-100): Overall question quality considering all factors
- clarity (1-100): How clear and well-written the question is
- urgency (1-100): How urgent the situation seems (high urgency = needs immediate vet attention)
- completeness (1-100): How much relevant information is provided

CATEGORY OPTIONS: health, behavior, training, feeding, local, general

URGENCY INDICATORS:
- HIGH (80-100): Emergency symptoms like vomiting blood, seizures, difficulty breathing, poisoning, severe injuries
- MEDIUM (40-79): Concerning symptoms like lethargy, loss of appetite, mild vomiting, behavioral changes
- LOW (1-39): General questions about care, training, routine health

SUGGESTED TAGS: Choose 2-4 relevant tags like: emergency, puppy, senior, training, veterinary, behavior, feeding, health, etc.

FEEDBACK: Provide 1-3 actionable suggestions to improve the question or address the concern.

CONFIDENCE LEVELS:
- "high": Question is clear, complete, and easy to categorize
- "medium": Question is understandable but missing some details
- "low": Question is unclear or very incomplete

Respond with ONLY the JSON object, no other text:`;
  }

  private parseAnalysisResponse(response: string): LocalLlamaAnalysisResult {
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate and sanitize the response
      return {
        overallScore: Math.max(1, Math.min(100, parseInt(parsed.overallScore) || 50)),
        clarity: Math.max(1, Math.min(100, parseInt(parsed.clarity) || 50)),
        urgency: Math.max(1, Math.min(100, parseInt(parsed.urgency) || 20)),
        completeness: Math.max(1, Math.min(100, parseInt(parsed.completeness) || 50)),
        category: this.validateCategory(parsed.category),
        suggestedTags: Array.isArray(parsed.suggestedTags) ? parsed.suggestedTags.slice(0, 5) : [],
        feedback: Array.isArray(parsed.feedback) ? parsed.feedback.slice(0, 3) : ['Analysis completed'],
        confidenceLevel: ['high', 'medium', 'low'].includes(parsed.confidenceLevel) ? parsed.confidenceLevel : 'medium'
      };
    } catch (error) {
      console.error('Failed to parse Llama response:', error);
      console.error('Raw response:', response);

      // Return fallback analysis
      return {
        overallScore: 60,
        clarity: 60,
        urgency: 30,
        completeness: 50,
        category: 'general',
        suggestedTags: ['general'],
        feedback: ['Question analyzed with fallback method'],
        confidenceLevel: 'medium'
      };
    }
  }

  private validateCategory(category: string): string {
    const validCategories = ['health', 'behavior', 'training', 'feeding', 'local', 'general'];
    return validCategories.includes(category) ? category : 'general';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        timeout: 2000 // 2 second timeout
      });

      if (response.ok) {
        const data = await response.json();
        // Check if llama3.2:3b is available
        return data.models?.some((model: any) => model.name.includes('llama3.2:3b'));
      }
      return false;
    } catch (error) {
      return false;
    }
  }
}

export const localLlamaService = new LocalLlamaService();