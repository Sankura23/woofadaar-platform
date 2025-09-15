import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { PointsManager, POINTS_CONFIG, INDIAN_CONTEXT } from '@/lib/points-system';

export async function GET(request: NextRequest) {
  try {
    const userId = await verifyToken(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userPoints = await prisma.userPoints.findUnique({
      where: { user_id: userId },
      include: {
        point_transactions: {
          orderBy: { created_at: 'desc' },
          take: 20
        }
      }
    });

    if (!userPoints) {
      const newUserPoints = await prisma.userPoints.create({
        data: {
          user_id: userId,
          points_earned: 0,
          current_balance: 0
        },
        include: {
          point_transactions: {
            orderBy: { created_at: 'desc' },
            take: 20
          }
        }
      });

      return NextResponse.json({
        success: true,
        data: { userPoints: newUserPoints }
      });
    }

    return NextResponse.json({
      success: true,
      data: { userPoints }
    });

  } catch (error) {
    console.error('Error fetching user points:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user points' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await verifyToken(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();

    const { 
      action, 
      source, 
      source_id, 
      description, 
      userContext = {},
      indianContext = {}
    } = body;

    // Calculate points using Week 21 system
    let points_amount: number;
    let multiplierApplied: number;
    
    if (action && POINTS_CONFIG.basePoints[action as keyof typeof POINTS_CONFIG.basePoints]) {
      const pointsCalc = PointsManager.calculatePoints(
        action as keyof typeof POINTS_CONFIG.basePoints,
        userContext
      );
      
      const indianBonus = PointsManager.getIndianContextBonus(indianContext);
      
      points_amount = Math.round(pointsCalc.points * indianBonus);
      multiplierApplied = pointsCalc.multiplier * indianBonus;
    } else {
      // Fallback to manual points if action not recognized
      points_amount = body.points_amount || 0;
      multiplierApplied = 1.0;
    }

    const transaction_type = 'earned';

    const userPoints = await prisma.userPoints.findUnique({
      where: { user_id: userId }
    });

    // Calculate level and experience points
    const newTotalLifetimePoints = (userPoints?.total_lifetime_points || 0) + points_amount;
    const levelInfo = PointsManager.calculateLevel(newTotalLifetimePoints);

    if (!userPoints) {
      await prisma.userPoints.create({
        data: {
          user_id: userId,
          points_earned: points_amount,
          points_spent: 0,
          current_balance: points_amount,
          total_lifetime_points: points_amount,
          level: levelInfo.level,
          experience_points: newTotalLifetimePoints
        }
      });
    } else {
      const currentBalance = userPoints.current_balance;
      const newBalance = currentBalance + points_amount;

      await prisma.userPoints.update({
        where: { user_id: userId },
        data: {
          points_earned: userPoints.points_earned + points_amount,
          current_balance: newBalance,
          total_lifetime_points: newTotalLifetimePoints,
          level: levelInfo.level,
          experience_points: newTotalLifetimePoints
        }
      });
    }

    const transaction = await prisma.pointTransaction.create({
      data: {
        user_id: userId,
        points_amount,
        transaction_type,
        source,
        source_id,
        description
      }
    });

    return NextResponse.json({
      success: true,
      data: { 
        transaction,
        pointsAwarded: points_amount,
        multiplierApplied,
        newLevel: levelInfo.level,
        pointsToNextLevel: levelInfo.pointsToNext
      }
    });

  } catch (error) {
    console.error('Error creating point transaction:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create point transaction' },
      { status: 500 }
    );
  }
}