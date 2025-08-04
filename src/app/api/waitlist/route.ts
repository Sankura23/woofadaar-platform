import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { sendWelcomeEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      email, 
      name, 
      location, 
      phone, 
      dog_owner, 
      preferred_language, 
      referral_source, 
      interests 
    } = body;

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    try {
      const existingEntry = await prisma.waitlist.findUnique({
        where: { email }
      });

      if (existingEntry) {
        return NextResponse.json(
          { error: 'Email already registered' },
          { status: 409 }
        );
      }

      const totalCount = await prisma.waitlist.count();
      const position = totalCount + 1;

      const waitlistEntry = await prisma.waitlist.create({
        data: {
          id: `waitlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          email,
          name,
          location,
          phone,
          dog_owner: dog_owner || false,
          preferred_language: preferred_language || 'en',
          referral_source,
          interests,
          position,
          updated_at: new Date()
        }
      });

      // Send welcome email
      try {
        await sendWelcomeEmail(email, name, position);
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail the request if email fails
      }

      return NextResponse.json({
        success: true,
        position: waitlistEntry.position,
        message: 'Successfully joined the waitlist!'
      });

    } catch (dbError) {
      console.error('Database error in waitlist signup:', dbError);
      return NextResponse.json(
        { error: 'Database temporarily unavailable. Please try again later.' },
        { status: 503 }
      );
    }

  } catch (error) {
    console.error('Waitlist signup error:', error);
    return NextResponse.json(
      { error: 'Invalid request format' },
      { status: 400 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (type === 'admin') {
      const isAdmin = request.headers.get('authorization') === 'Bearer admin-token';
      
      if (!isAdmin) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      try {
        const allEntries = await prisma.waitlist.findMany({
          orderBy: { created_at: 'desc' }
        });

        const stats = {
          total: allEntries.length,
          dog_owners: allEntries.filter(entry => entry.dog_owner).length,
          new_parents: allEntries.filter(entry => !entry.dog_owner).length,
          top_cities: await getTopCities(),
          recent_signups: allEntries.slice(0, 10),
          growth_this_week: await getWeeklyGrowth()
        };

        return NextResponse.json({ entries: allEntries, stats });
      } catch (dbError) {
        console.error('Database connection error for admin stats:', dbError);
        // Return empty data if database is unavailable
        return NextResponse.json({
          entries: [],
          stats: {
            total: 0,
            dog_owners: 0,
            new_parents: 0,
            top_cities: [],
            recent_signups: [],
            growth_this_week: 0
          }
        });
      }
    }

    try {
      const totalSignups = await prisma.waitlist.count();
      const dogOwners = await prisma.waitlist.count({
        where: { dog_owner: true }
      });

      return NextResponse.json({
        total_signups: totalSignups,
        dog_owners: dogOwners,
        new_parents: totalSignups - dogOwners
      });
    } catch (dbError) {
      console.error('Database connection error for public stats:', dbError);
      // Return default stats if database is unavailable
      return NextResponse.json({
        total_signups: 0,
        dog_owners: 0,
        new_parents: 0
      });
    }

  } catch (error) {
    console.error('Waitlist stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function getTopCities() {
  const cityGroups = await prisma.waitlist.groupBy({
    by: ['location'],
    _count: {
      location: true
    },
    where: {
      location: {
        not: null
      }
    },
    orderBy: {
      _count: {
        location: 'desc'
      }
    },
    take: 5
  });

  return cityGroups.map(group => ({
    city: group.location,
    count: group._count.location
  }));
}

async function getWeeklyGrowth() {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const weeklySignups = await prisma.waitlist.count({
    where: {
      created_at: {
        gte: oneWeekAgo
      }
    }
  });

  return weeklySignups;
}