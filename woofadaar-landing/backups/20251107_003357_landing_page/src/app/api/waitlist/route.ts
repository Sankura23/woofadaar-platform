import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      name,
      email,
      phone,
      location,
      dogName,
      dogBreed,
      dogAge,
      excitement,
      weeklyTips
    } = body;

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existing = await prisma.waitlist.findUnique({
      where: { email }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'This email is already on the waitlist' },
        { status: 409 }
      );
    }

    // Get current waitlist count for position
    const count = await prisma.waitlist.count();

    // Prepare interests field (combine dog info and excitement into a JSON string)
    const interests = JSON.stringify({
      dogName: dogName || null,
      dogBreed: dogBreed || null,
      dogAge: dogAge || null,
      excitement: excitement || null,
      weeklyTips: weeklyTips || false
    });

    // Create waitlist entry
    const waitlistEntry = await prisma.waitlist.create({
      data: {
        id: randomBytes(16).toString('hex'),
        email,
        name,
        phone: phone || null,
        location: location || null,
        dog_owner: !!(dogName || dogBreed || dogAge),
        interests,
        position: count + 1,
        updated_at: new Date(),
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Successfully added to waitlist',
      position: waitlistEntry.position
    }, { status: 201 });

  } catch (error) {
    console.error('Waitlist API Error:', error);
    return NextResponse.json(
      { error: 'Failed to add to waitlist. Please try again.' },
      { status: 500 }
    );
  }
}
