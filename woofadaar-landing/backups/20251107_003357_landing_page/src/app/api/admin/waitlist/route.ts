import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Simple password protection
    const authHeader = request.headers.get('authorization');
    const password = process.env.ADMIN_PASSWORD || 'woofadaar2024';

    if (!authHeader || authHeader !== `Bearer ${password}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all waitlist entries, ordered by creation date
    const entries = await prisma.waitlist.findMany({
      orderBy: {
        created_at: 'desc'
      }
    });

    // Parse interests field for each entry
    const formattedEntries = entries.map(entry => {
      let parsedInterests = null;
      try {
        parsedInterests = entry.interests ? JSON.parse(entry.interests) : null;
      } catch (e) {
        parsedInterests = null;
      }

      return {
        id: entry.id,
        email: entry.email,
        name: entry.name,
        phone: entry.phone,
        location: entry.location,
        dog_owner: entry.dog_owner,
        position: entry.position,
        status: entry.status,
        created_at: entry.created_at,
        ...parsedInterests
      };
    });

    return NextResponse.json({
      success: true,
      count: entries.length,
      entries: formattedEntries
    });

  } catch (error) {
    console.error('Admin Waitlist API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch waitlist entries' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Simple password protection
    const authHeader = request.headers.get('authorization');
    const password = process.env.ADMIN_PASSWORD || 'woofadaar2024';

    if (!authHeader || authHeader !== `Bearer ${password}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { format = 'json' } = await request.json();

    // Get all waitlist entries
    const entries = await prisma.waitlist.findMany({
      orderBy: {
        created_at: 'desc'
      }
    });

    // Parse interests for export
    const formattedEntries = entries.map(entry => {
      let parsedInterests = null;
      try {
        parsedInterests = entry.interests ? JSON.parse(entry.interests) : null;
      } catch (e) {
        parsedInterests = null;
      }

      return {
        id: entry.id,
        email: entry.email,
        name: entry.name,
        phone: entry.phone || '',
        location: entry.location || '',
        dog_owner: entry.dog_owner,
        position: entry.position,
        status: entry.status,
        created_at: entry.created_at,
        dogName: parsedInterests?.dogName || '',
        dogBreed: parsedInterests?.dogBreed || '',
        dogAge: parsedInterests?.dogAge || '',
        excitement: parsedInterests?.excitement || '',
        weeklyTips: parsedInterests?.weeklyTips || false
      };
    });

    if (format === 'csv') {
      // Generate CSV
      const headers = [
        'ID', 'Email', 'Name', 'Phone', 'Location',
        'Dog Owner', 'Position', 'Status', 'Created At',
        'Dog Name', 'Dog Breed', 'Dog Age', 'Excitement', 'Weekly Tips'
      ];

      const rows = formattedEntries.map(entry => [
        entry.id,
        entry.email,
        entry.name,
        entry.phone,
        entry.location,
        entry.dog_owner,
        entry.position,
        entry.status,
        entry.created_at,
        entry.dogName,
        entry.dogBreed,
        entry.dogAge,
        entry.excitement,
        entry.weeklyTips
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="waitlist-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    // Return JSON by default
    return NextResponse.json({
      success: true,
      count: entries.length,
      entries: formattedEntries
    });

  } catch (error) {
    console.error('Admin Export API Error:', error);
    return NextResponse.json(
      { error: 'Failed to export waitlist entries' },
      { status: 500 }
    );
  }
}
