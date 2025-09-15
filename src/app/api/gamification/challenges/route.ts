import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { SeasonalChallengeManager } from '@/lib/seasonal-challenges';

// Get all active challenges
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
    const category = searchParams.get('category');
    const type = searchParams.get('type');
    const featured = searchParams.get('featured') === 'true';
    const includeParticipation = searchParams.get('participation') === 'true';

    // Get active challenges from database
    const currentDate = new Date();
    let whereClause: any = {
      is_active: true,
      start_date: { lte: currentDate },
      end_date: { gte: currentDate }
    };

    if (category) {
      whereClause.category = category;
    }

    if (type) {
      whereClause.challenge_type = type;
    }

    if (featured) {
      whereClause.is_featured = true;
    }

    const challenges = await prisma.$queryRaw`
      SELECT sc.*, 
             u.name as creator_name,
             COUNT(cp.id)::int as participants_count,
             COUNT(CASE WHEN cp.user_id = ${userId} THEN 1 END)::int as user_participating
      FROM seasonal_challenges sc
      LEFT JOIN "User" u ON u.id = sc.created_by
      LEFT JOIN challenge_participation cp ON cp.challenge_id = sc.id
      WHERE sc.is_active = true 
        AND sc.start_date <= ${currentDate}
        AND sc.end_date >= ${currentDate}
        ${category ? `AND sc.category = ${category}` : ''}
        ${type ? `AND sc.challenge_type = ${type}` : ''}
        ${featured ? `AND sc.is_featured = true` : ''}
      GROUP BY sc.id, u.name
      ORDER BY sc.is_featured DESC, sc.start_date DESC
    ` as any[];

    // Get user participation data if requested
    let userParticipations: any[] = [];
    if (includeParticipation) {
      userParticipations = await prisma.$queryRaw`
        SELECT cp.*, cs.id as submission_id, cs.status as submission_status
        FROM challenge_participation cp
        LEFT JOIN challenge_submissions cs ON cs.participation_id = cp.id
        WHERE cp.user_id = ${userId}
        AND cp.challenge_id IN (${challenges.map((c: any) => c.id).join(',') || 'NULL'})
      ` as any[];
    }

    // Format response
    const formattedChallenges = challenges.map((challenge: any) => {
      const userParticipation = userParticipations.find(up => up.challenge_id === challenge.id);
      
      return {
        id: challenge.id,
        name: challenge.name,
        description: challenge.description,
        challengeType: challenge.challenge_type,
        category: challenge.category,
        startDate: challenge.start_date,
        endDate: challenge.end_date,
        pointReward: challenge.point_reward,
        maxParticipants: challenge.max_participants,
        rules: challenge.rules,
        prizes: challenge.prizes,
        isFeatured: challenge.is_featured,
        createdBy: {
          id: challenge.created_by,
          name: challenge.creator_name
        },
        stats: {
          participantsCount: challenge.participants_count,
          userParticipating: challenge.user_participating > 0,
          daysRemaining: Math.ceil((new Date(challenge.end_date).getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))
        },
        userParticipation: userParticipation ? {
          id: userParticipation.id,
          status: userParticipation.status,
          joinedAt: userParticipation.joined_at,
          completedAt: userParticipation.completed_at,
          completionScore: userParticipation.completion_score,
          progressData: userParticipation.progress_data,
          hasSubmission: !!userParticipation.submission_id,
          submissionStatus: userParticipation.submission_status
        } : null
      };
    });

    // Get challenge templates for recommendations
    const activeTemplates = SeasonalChallengeManager.getActiveChallenges();
    const recommendations = activeTemplates
      .filter(template => !challenges.some((c: any) => c.name.includes(template.name.split(' ')[0])))
      .slice(0, 3)
      .map(template => ({
        id: `template_${template.id}`,
        name: template.name,
        description: template.description,
        category: template.category,
        challengeType: template.challengeType,
        estimatedReward: template.rewards.participation.points,
        isTemplate: true
      }));

    return NextResponse.json({
      success: true,
      data: {
        challenges: formattedChallenges,
        recommendations,
        stats: {
          totalActive: challenges.length,
          userParticipating: formattedChallenges.filter(c => c.stats.userParticipating).length,
          featuredCount: formattedChallenges.filter(c => c.isFeatured).length,
          categories: Array.from(new Set(formattedChallenges.map(c => c.category)))
        }
      }
    });

  } catch (error) {
    console.error('Error fetching challenges:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch challenges' },
      { status: 500 }
    );
  }
}

// Create new challenge (admin only for now)
export async function POST(request: NextRequest) {
  try {
    const userId = await verifyToken(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is admin or has permission to create challenges
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { is_admin: true, is_partner: true }
    });

    if (!user?.is_admin && !user?.is_partner) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      challengeType,
      category,
      startDate,
      endDate,
      pointReward,
      maxParticipants,
      rules,
      prizes,
      isFeatured
    } = body;

    // Validate required fields
    if (!name || !description || !challengeType || !category || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create challenge
    const challenge = await prisma.$executeRaw`
      INSERT INTO seasonal_challenges (
        id, name, description, challenge_type, category, start_date, end_date,
        point_reward, max_participants, rules, prizes, is_featured, created_by
      ) VALUES (
        ${generateId()}, ${name}, ${description}, ${challengeType}, ${category},
        ${new Date(startDate)}, ${new Date(endDate)}, ${pointReward || 100},
        ${maxParticipants}, ${JSON.stringify(rules || {})}, ${JSON.stringify(prizes || {})},
        ${isFeatured || false}, ${userId}
      )
    `;

    // Fetch the created challenge
    const createdChallenge = await prisma.$queryRaw`
      SELECT * FROM seasonal_challenges WHERE created_by = ${userId} ORDER BY created_at DESC LIMIT 1
    ` as any[];

    if (createdChallenge.length === 0) {
      throw new Error('Challenge creation failed');
    }

    const newChallenge = createdChallenge[0];

    return NextResponse.json({
      success: true,
      data: {
        challenge: {
          id: newChallenge.id,
          name: newChallenge.name,
          description: newChallenge.description,
          challengeType: newChallenge.challenge_type,
          category: newChallenge.category,
          startDate: newChallenge.start_date,
          endDate: newChallenge.end_date,
          pointReward: newChallenge.point_reward,
          maxParticipants: newChallenge.max_participants,
          rules: newChallenge.rules,
          prizes: newChallenge.prizes,
          isFeatured: newChallenge.is_featured,
          createdAt: newChallenge.created_at
        }
      }
    });

  } catch (error) {
    console.error('Error creating challenge:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create challenge' },
      { status: 500 }
    );
  }
}

function generateId(): string {
  return 'challenge_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}