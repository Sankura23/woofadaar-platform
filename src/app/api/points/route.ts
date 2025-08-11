import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const userId = await verifyToken(request);

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
    const body = await request.json();

    const { points_amount, transaction_type, source, source_id, description } = body;

    const userPoints = await prisma.userPoints.findUnique({
      where: { user_id: userId }
    });

    if (!userPoints) {
      await prisma.userPoints.create({
        data: {
          user_id: userId,
          points_earned: transaction_type === 'earned' ? points_amount : 0,
          points_spent: transaction_type === 'spent' ? Math.abs(points_amount) : 0,
          current_balance: transaction_type === 'earned' ? points_amount : -Math.abs(points_amount),
          total_lifetime_points: transaction_type === 'earned' ? points_amount : 0
        }
      });
    } else {
      const currentBalance = userPoints.current_balance;
      const newBalance = transaction_type === 'earned' 
        ? currentBalance + points_amount 
        : currentBalance - Math.abs(points_amount);

      await prisma.userPoints.update({
        where: { user_id: userId },
        data: {
          points_earned: transaction_type === 'earned' 
            ? userPoints.points_earned + points_amount 
            : userPoints.points_earned,
          points_spent: transaction_type === 'spent' 
            ? userPoints.points_spent + Math.abs(points_amount) 
            : userPoints.points_spent,
          current_balance: newBalance,
          total_lifetime_points: transaction_type === 'earned' 
            ? userPoints.total_lifetime_points + points_amount 
            : userPoints.total_lifetime_points
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
      data: { transaction }
    });

  } catch (error) {
    console.error('Error creating point transaction:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create point transaction' },
      { status: 500 }
    );
  }
}