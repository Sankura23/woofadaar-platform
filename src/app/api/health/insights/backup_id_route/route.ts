import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken, getTokenFromRequest, isPetParent } from '@/lib/auth';

// PUT /api/health/insights/[id] - Mark insight as read/unread
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload || !isPetParent(payload)) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    const userId = payload.userId;
    const { id } = params;
    const body = await request.json();
    const { is_read } = body;

    if (typeof is_read !== 'boolean') {
      return NextResponse.json(
        { error: 'is_read must be a boolean value' },
        { status: 400 }
      );
    }

    // Verify insight ownership through dog
    const insight = await prisma.healthInsight.findFirst({
      where: {
        id,
        dog: {
          user_id: userId
        }
      }
    });

    if (!insight) {
      return NextResponse.json(
        { error: 'Health insight not found or access denied' },
        { status: 404 }
      );
    }

    // Update insight
    const updatedInsight = await prisma.healthInsight.update({
      where: { id },
      data: {
        is_read,
        updated_at: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Health insight updated successfully',
      data: { insight: updatedInsight }
    });

  } catch (error) {
    console.error('Error updating health insight:', error);
    return NextResponse.json(
      { error: 'Failed to update health insight' },
      { status: 500 }
    );
  }
}

// DELETE /api/health/insights/[id] - Delete insight
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload || !isPetParent(payload)) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    const userId = payload.userId;
    const { id } = params;

    // Verify insight ownership through dog
    const insight = await prisma.healthInsight.findFirst({
      where: {
        id,
        dog: {
          user_id: userId
        }
      }
    });

    if (!insight) {
      return NextResponse.json(
        { error: 'Health insight not found or access denied' },
        { status: 404 }
      );
    }

    // Delete insight
    await prisma.healthInsight.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Health insight deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting health insight:', error);
    return NextResponse.json(
      { error: 'Failed to delete health insight' },
      { status: 500 }
    );
  }
}