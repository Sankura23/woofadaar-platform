import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
    // In a real app, you would verify the JWT token here
    // For now, we'll return mock data
    
    // Mock partner stats
    const mockStats = {
      totalAppointments: 45,
      completedAppointments: 38,
      pendingAppointments: 7,
      totalRevenue: 125000,
      averageRating: 4.7,
      totalReviews: 23
    };

    return NextResponse.json(mockStats);
  } catch (error) {
    console.error('Error fetching partner dashboard stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}