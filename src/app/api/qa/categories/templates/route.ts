import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import prisma from '@/lib/db';

// GET - Get templates for category
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    
    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Category parameter is required' },
        { status: 400 }
      );
    }

    let templates = [];

    try {
      // Find category first
      const questionCategory = await prisma.questionCategory.findUnique({
        where: { name: category },
        include: {
          question_templates: {
            where: { is_active: true },
            orderBy: { usage_count: 'desc' },
            include: {
              created_by_user: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      });

      if (questionCategory) {
        templates = questionCategory.question_templates;
      }

    } catch (dbError) {
      console.warn('Database error fetching templates, using predefined:', dbError);
      
      // Fallback to predefined templates
      templates = getPredefinedTemplates(category);
    }

    return NextResponse.json({
      success: true,
      data: {
        category,
        templates,
        total: templates.length
      }
    });

  } catch (error) {
    console.error('Error fetching question templates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

// POST - Create new template
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { category, name, description, fields } = body;

    if (!category || !name || !fields) {
      return NextResponse.json(
        { success: false, error: 'Category, name, and fields are required' },
        { status: 400 }
      );
    }

    const userId = 'userId' in user ? user.userId : user.partnerId;

    let newTemplate = null;

    try {
      // Find or create category
      let questionCategory = await prisma.questionCategory.findUnique({
        where: { name: category }
      });

      if (!questionCategory) {
        questionCategory = await prisma.questionCategory.create({
          data: {
            name: category,
            description: `Category for ${category} questions`,
            icon: getCategoryIcon(category),
            color: getCategoryColor(category)
          }
        });
      }

      // Create template
      newTemplate = await prisma.questionTemplate.create({
        data: {
          category_id: questionCategory.id,
          name,
          description,
          fields,
          created_by: userId
        },
        include: {
          category: {
            select: {
              id: true,
              name: true
            }
          },
          created_by_user: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      console.log(`Created template "${name}" for category "${category}"`);

    } catch (dbError) {
      console.warn('Database error creating template:', dbError);
      return NextResponse.json(
        { success: false, error: 'Failed to create template in database' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { template: newTemplate },
      message: 'Template created successfully'
    });

  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create template' },
      { status: 500 }
    );
  }
}

// Helper function to get predefined templates
function getPredefinedTemplates(category: string) {
  const predefinedTemplates = {
    health: [
      {
        id: 'health-symptom-template',
        name: 'Symptom Report',
        description: 'Report health symptoms or concerns',
        fields: {
          symptoms: { type: 'textarea', label: 'Symptoms observed', required: true },
          duration: { type: 'select', label: 'How long has this been happening?', options: ['Less than 1 day', '1-3 days', '4-7 days', 'Over a week'], required: true },
          severity: { type: 'select', label: 'Severity level', options: ['Mild', 'Moderate', 'Severe', 'Emergency'], required: true },
          dog_age: { type: 'text', label: 'Dog age', required: true },
          breed: { type: 'text', label: 'Dog breed', required: false },
          vet_consulted: { type: 'radio', label: 'Have you consulted a vet?', options: ['Yes', 'No', 'Planning to'], required: true }
        },
        usage_count: 0,
        created_by_user: { id: 'system', name: 'System' }
      },
      {
        id: 'health-medication-template',
        name: 'Medication Question',
        description: 'Questions about medications or treatments',
        fields: {
          medication_name: { type: 'text', label: 'Medication name', required: true },
          dosage_question: { type: 'textarea', label: 'Question about dosage or administration', required: true },
          dog_weight: { type: 'number', label: 'Dog weight (kg)', required: true },
          current_medications: { type: 'textarea', label: 'Other medications currently given', required: false },
          vet_prescribed: { type: 'radio', label: 'Is this vet prescribed?', options: ['Yes', 'No', 'Unsure'], required: true }
        },
        usage_count: 0,
        created_by_user: { id: 'system', name: 'System' }
      }
    ],
    behavior: [
      {
        id: 'behavior-training-template',
        name: 'Training Issue',
        description: 'Behavioral problems or training challenges',
        fields: {
          behavior_description: { type: 'textarea', label: 'Describe the behavior issue', required: true },
          frequency: { type: 'select', label: 'How often does this happen?', options: ['Rarely', 'Sometimes', 'Often', 'Always'], required: true },
          triggers: { type: 'textarea', label: 'What triggers this behavior?', required: false },
          training_attempted: { type: 'textarea', label: 'What training methods have you tried?', required: false },
          dog_age: { type: 'text', label: 'Dog age', required: true },
          environment: { type: 'select', label: 'Living environment', options: ['Apartment', 'House with yard', 'Large property', 'Other'], required: false }
        },
        usage_count: 0,
        created_by_user: { id: 'system', name: 'System' }
      }
    ],
    feeding: [
      {
        id: 'feeding-diet-template',
        name: 'Diet & Nutrition',
        description: 'Questions about diet, food, and nutrition',
        fields: {
          current_diet: { type: 'textarea', label: 'Current diet and feeding schedule', required: true },
          dog_age: { type: 'text', label: 'Dog age', required: true },
          dog_weight: { type: 'number', label: 'Dog weight (kg)', required: true },
          activity_level: { type: 'select', label: 'Activity level', options: ['Low', 'Moderate', 'High', 'Very High'], required: true },
          dietary_concerns: { type: 'textarea', label: 'Any dietary restrictions or allergies?', required: false },
          question_type: { type: 'select', label: 'Question type', options: ['Food recommendation', 'Portion size', 'Feeding schedule', 'Special diet', 'Treats'], required: true }
        },
        usage_count: 0,
        created_by_user: { id: 'system', name: 'System' }
      }
    ]
  };

  return predefinedTemplates[category as keyof typeof predefinedTemplates] || [];
}

// Helper functions
function getCategoryIcon(category: string): string {
  const icons = {
    health: '🏥',
    behavior: '🐕',
    feeding: '🍖',
    training: '🎓',
    local: '📍',
    general: '💬'
  };
  return icons[category as keyof typeof icons] || '📁';
}

function getCategoryColor(category: string): string {
  const colors = {
    health: '#ef4444',
    behavior: '#3b82f6',
    feeding: '#f59e0b',
    training: '#10b981',
    local: '#8b5cf6',
    general: '#6b7280'
  };
  return colors[category as keyof typeof colors] || '#6b7280';
}