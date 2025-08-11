import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Check if categories already exist
    const existingCategories = await prisma.forumCategory.count();
    
    if (existingCategories > 0) {
      return NextResponse.json({
        success: true,
        message: 'Community already initialized'
      });
    }

    // Create default forum categories
    const defaultCategories = [
      {
        name: 'General Discussion',
        description: 'General topics about dogs and pet care',
        slug: 'general',
        icon: '🐕',
        color: '#3bbca8',
        sort_order: 1
      },
      {
        name: 'Health & Wellness',
        description: 'Health issues, vet advice, and wellness tips',
        slug: 'health',
        icon: '🏥',
        color: '#e05a37',
        sort_order: 2
      },
      {
        name: 'Training & Behavior',
        description: 'Training tips, behavior issues, and obedience',
        slug: 'training',
        icon: '🎾',
        color: '#76519f',
        sort_order: 3
      },
      {
        name: 'Nutrition & Feeding',
        description: 'Diet advice, food recommendations, and feeding tips',
        slug: 'nutrition',
        icon: '🍖',
        color: '#ffa602',
        sort_order: 4
      },
      {
        name: 'Breed Specific',
        description: 'Breed-specific discussions and advice',
        slug: 'breeds',
        icon: '🐾',
        color: '#3bbca8',
        sort_order: 5
      },
      {
        name: 'Local Community',
        description: 'Local events, meetups, and area-specific discussions',
        slug: 'local',
        icon: '📍',
        color: '#76519f',
        sort_order: 6
      },
      {
        name: 'Adoption & Rescue',
        description: 'Adoption stories, rescue organizations, and fostering',
        slug: 'adoption',
        icon: '❤️',
        color: '#e05a37',
        sort_order: 7
      },
      {
        name: 'Grooming & Care',
        description: 'Grooming tips, care routines, and maintenance',
        slug: 'grooming',
        icon: '✂️',
        color: '#ffa602',
        sort_order: 8
      }
    ];

    const createdCategories = await prisma.forumCategory.createMany({
      data: defaultCategories
    });

    return NextResponse.json({
      success: true,
      message: 'Community initialized successfully',
      data: {
        categoriesCreated: createdCategories.count
      }
    });
  } catch (error) {
    console.error('Error initializing community:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to initialize community' },
      { status: 500 }
    );
  }
} 