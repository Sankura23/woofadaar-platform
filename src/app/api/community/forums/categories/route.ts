import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');

    // Build where clause
    const where: any = {};
    if (isActive !== null) where.is_active = isActive === 'true';

    const categories = await prisma.forumCategory.findMany({
      where,
      orderBy: [
        { sort_order: 'asc' },
        { name: 'asc' }
      ]
    });

    return NextResponse.json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    console.error('Error fetching forum categories:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch forum categories' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is admin (you can implement your own logic here)
    // For now, we'll allow creation without strict admin check

    const body = await request.json();
    const { name, description, slug, icon, color, sortOrder } = body;

    if (!name || !description || !slug || !icon || !color) {
      return NextResponse.json(
        { success: false, error: 'Name, description, slug, icon, and color are required' },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const existingCategory = await prisma.forumCategory.findUnique({
      where: { slug }
    });

    if (existingCategory) {
      return NextResponse.json(
        { success: false, error: 'Category slug already exists' },
        { status: 400 }
      );
    }

    // Create the category
    const category = await prisma.forumCategory.create({
      data: {
        name,
        description,
        slug,
        icon,
        color,
        sort_order: sortOrder || 0
      }
    });

    return NextResponse.json({
      success: true,
      data: { category }
    });
  } catch (error) {
    console.error('Error creating forum category:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create forum category' },
      { status: 500 }
    );
  }
} 