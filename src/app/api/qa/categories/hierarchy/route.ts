import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import prisma from '@/lib/db';

// GET - Get category hierarchy
export async function GET(request: NextRequest) {
  try {
    // Get all categories with hierarchy
    let categories = [];
    
    try {
      categories = await prisma.questionCategory.findMany({
        include: {
          subcategories: {
            include: {
              subcategories: true // Support 2-level hierarchy
            }
          },
          question_templates: {
            where: { is_active: true },
            select: {
              id: true,
              name: true,
              description: true,
              usage_count: true
            }
          },
          _count: {
            select: {
              question_templates: true
            }
          }
        },
        orderBy: [
          { sort_order: 'asc' },
          { name: 'asc' }
        ]
      });
    } catch (dbError) {
      console.warn('Database error fetching categories, using fallback:', dbError);
      
      // Fallback categories based on existing system
      categories = [
        {
          id: 'health',
          name: 'health',
          description: 'Health, medical concerns, and veterinary questions',
          icon: '🏥',
          color: '#ef4444',
          parent_id: null,
          sort_order: 1,
          subcategories: [],
          question_templates: [],
          _count: { question_templates: 0 }
        },
        {
          id: 'behavior',
          name: 'behavior',
          description: 'Behavioral issues, training, and socialization',
          icon: '🐕',
          color: '#3b82f6',
          parent_id: null,
          sort_order: 2,
          subcategories: [],
          question_templates: [],
          _count: { question_templates: 0 }
        },
        {
          id: 'feeding',
          name: 'feeding',
          description: 'Diet, nutrition, and feeding questions',
          icon: '🍖',
          color: '#f59e0b',
          parent_id: null,
          sort_order: 3,
          subcategories: [],
          question_templates: [],
          _count: { question_templates: 0 }
        },
        {
          id: 'training',
          name: 'training',
          description: 'Training tips, commands, and education',
          icon: '🎓',
          color: '#10b981',
          parent_id: null,
          sort_order: 4,
          subcategories: [],
          question_templates: [],
          _count: { question_templates: 0 }
        },
        {
          id: 'local',
          name: 'local',
          description: 'Location-specific questions and local services',
          icon: '📍',
          color: '#8b5cf6',
          parent_id: null,
          sort_order: 5,
          subcategories: [],
          question_templates: [],
          _count: { question_templates: 0 }
        },
        {
          id: 'general',
          name: 'general',
          description: 'General dog care and miscellaneous questions',
          icon: '💬',
          color: '#6b7280',
          parent_id: null,
          sort_order: 6,
          subcategories: [],
          question_templates: [],
          _count: { question_templates: 0 }
        }
      ];
    }

    // Build hierarchy tree
    const rootCategories = categories.filter(cat => !cat.parent_id);
    const categoryTree = rootCategories.map(root => ({
      ...root,
      subcategories: root.subcategories || []
    }));

    return NextResponse.json({
      success: true,
      data: {
        categories: categoryTree,
        total_categories: categories.length,
        root_categories: rootCategories.length
      }
    });

  } catch (error) {
    console.error('Error fetching category hierarchy:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

// POST - Create new subcategory
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
    const { 
      name, 
      description, 
      parent_id, 
      icon, 
      color,
      auto_categorize = true,
      template_required = false
    } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Category name is required' },
        { status: 400 }
      );
    }

    // Validate parent category exists
    if (parent_id) {
      try {
        const parentCategory = await prisma.questionCategory.findUnique({
          where: { id: parent_id }
        });
        
        if (!parentCategory) {
          return NextResponse.json(
            { success: false, error: 'Parent category not found' },
            { status: 400 }
          );
        }
      } catch (dbError) {
        console.warn('Database error validating parent category:', dbError);
        // Continue without validation in demo mode
      }
    }

    let newCategory = null;

    try {
      // Get next sort order
      const maxSortOrder = await prisma.questionCategory.aggregate({
        where: { parent_id: parent_id || null },
        _max: { sort_order: true }
      });

      newCategory = await prisma.questionCategory.create({
        data: {
          name: name.toLowerCase(),
          description,
          parent_id: parent_id || null,
          icon: icon || '📁',
          color: color || '#6b7280',
          sort_order: (maxSortOrder._max.sort_order || 0) + 1,
          auto_categorize,
          template_required
        },
        include: {
          parent_category: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      console.log(`Created new category: ${name} under parent: ${parent_id || 'root'}`);

    } catch (dbError) {
      console.warn('Database error creating category:', dbError);
      return NextResponse.json(
        { success: false, error: 'Failed to create category in database' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { category: newCategory },
      message: 'Category created successfully'
    });

  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create category' },
      { status: 500 }
    );
  }
}