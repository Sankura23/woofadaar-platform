import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const userId = await verifyToken(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json(
        { success: false, error: 'Date parameter required' },
        { status: 400 }
      );
    }

    // Check if user has daily login for this date
    const startOfDay = new Date(date + 'T00:00:00.000Z');
    const endOfDay = new Date(date + 'T23:59:59.999Z');

    const existingLogin = await prisma.pointTransaction.findFirst({
      where: {
        user_id: userId,
        source: 'login',
        source_id: date,
        created_at: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        alreadyLogged: !!existingLogin,
        date
      }
    });

  } catch (error) {
    console.error('Error checking daily login:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check daily login' },
      { status: 500 }
    );
  }
}