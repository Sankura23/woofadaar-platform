import { NextRequest, NextResponse } from 'next/server';
import { categorizeQuestion, findMatchingTemplate } from '@/lib/ai-categorization';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, includeTemplates = false } = body;

    if (!title && !content) {
      return NextResponse.json(
        { success: false, error: 'Title or content is required' },
        { status: 400 }
      );
    }

    // Run categorization
    const categorization = await categorizeQuestion(
      title || '', 
      content || ''
    );

    let matchingTemplate = null;
    if (includeTemplates && categorization.primaryCategory.confidence > 0.5) {
      const templateMatch = await findMatchingTemplate(
        categorization.primaryCategory.category,
        title || '',
        content || ''
      );
      
      if (templateMatch.template && templateMatch.matchScore > 0.6) {
        matchingTemplate = templateMatch;
      }
    }

    // Real-time category suggestions for better UX
    const suggestions = {
      primary: categorization.primaryCategory,
      alternatives: categorization.secondaryCategories,
      tags: categorization.suggestedTags,
      confidence: categorization.overallConfidence,
      template: matchingTemplate,
      recommendations: generateRecommendations(categorization)
    };

    return NextResponse.json({
      success: true,
      data: suggestions
    });

  } catch (error) {
    console.error('Error generating category suggestions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}

// Generate actionable recommendations based on categorization
function generateRecommendations(categorization: any): string[] {
  const recommendations: string[] = [];
  const category = categorization.primaryCategory.category;
  const confidence = categorization.overallConfidence;

  // Category-specific recommendations
  if (category === 'health' && confidence > 0.7) {
    recommendations.push('Consider including your dog\'s age, breed, and symptom duration for better answers');
    if (categorization.suggestedTags.some((tag: any) => tag.tag === 'urgent')) {
      recommendations.push('This seems urgent - consider contacting a veterinarian immediately');
    }
  }

  if (category === 'behavior' && confidence > 0.7) {
    recommendations.push('Include details about when the behavior started and what triggers it');
    recommendations.push('Mention your dog\'s age and any previous training attempts');
  }

  if (category === 'feeding' && confidence > 0.7) {
    recommendations.push('Include your dog\'s age, weight, and current feeding schedule');
    recommendations.push('Mention any known allergies or dietary restrictions');
  }

  if (category === 'training' && confidence > 0.7) {
    recommendations.push('Describe your dog\'s current training level and attention span');
    recommendations.push('Include information about your training environment');
  }

  if (category === 'local' && confidence > 0.7) {
    recommendations.push('Specify your city or area for location-specific recommendations');
    recommendations.push('Mention your budget range for services');
  }

  // Low confidence recommendations
  if (confidence < 0.5) {
    recommendations.push('Consider adding more specific details to help categorize your question better');
    recommendations.push('Try to focus on one main question or concern');
  }

  // General recommendations
  if (recommendations.length === 0) {
    recommendations.push('Add relevant tags to help other users find your question');
    recommendations.push('Include photos if they would help explain your situation');
  }

  return recommendations.slice(0, 3); // Limit to top 3 recommendations
}