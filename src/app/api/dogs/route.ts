import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';

interface DecodedToken {
  userId: string;
  email: string;
}

async function verifyToken(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    return decoded.userId;
  } catch (error) {
    return null;
  }
}

// POST /api/dogs - Create a new dog profile
export async function POST(request: NextRequest) {
  const userId = await verifyToken(request);
  
  if (!userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    
    const {
      name,
      breed,
      age_months,
      weight_kg,
      gender,
      photo_url,
      medical_notes,
      health_id,
      kennel_club_registration,
      emergency_contact,
      emergency_phone,
      personality_traits,
      vaccination_status,
      spayed_neutered,
      microchip_id,
      location
    } = body;

    // Validation
    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { message: 'Name must be at least 2 characters long' },
        { status: 400 }
      );
    }

    if (!breed || breed.trim().length === 0) {
      return NextResponse.json(
        { message: 'Breed is required' },
        { status: 400 }
      );
    }

    if (!age_months || age_months <= 0) {
      return NextResponse.json(
        { message: 'Age must be greater than 0' },
        { status: 400 }
      );
    }

    if (!weight_kg || weight_kg <= 0) {
      return NextResponse.json(
        { message: 'Weight must be greater than 0' },
        { status: 400 }
      );
    }

    if (!gender || !['male', 'female'].includes(gender)) {
      return NextResponse.json(
        { message: 'Gender must be either male or female' },
        { status: 400 }
      );
    }

    if (!location || location.trim().length === 0) {
      return NextResponse.json(
        { message: 'Location is required' },
        { status: 400 }
      );
    }

    if (!emergency_contact || emergency_contact.trim().length === 0) {
      return NextResponse.json(
        { message: 'Emergency contact name is required' },
        { status: 400 }
      );
    }

    if (!emergency_phone || emergency_phone.trim().length === 0) {
      return NextResponse.json(
        { message: 'Emergency phone number is required' },
        { status: 400 }
      );
    }

    // Basic phone validation
    const phoneRegex = /^[0-9+\-\s()]{10,15}$/;
    if (!phoneRegex.test(emergency_phone)) {
      return NextResponse.json(
        { message: 'Please enter a valid phone number' },
        { status: 400 }
      );
    }

    // Generate health ID if not provided
    let finalHealthId = health_id;
    if (!finalHealthId && name && breed && location) {
      const timestamp = Date.now().toString().slice(-6);
      const namePrefix = name.substring(0, 2).toUpperCase();
      const breedCode = breed.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
      finalHealthId = `WOF${namePrefix}${breedCode}${timestamp}`;
    }

    const dog = await prisma.dog.create({
      data: {
        id: `dog_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user_id: userId,
        name: name.trim(),
        breed: breed.trim(),
        age_months: parseInt(age_months),
        weight_kg: parseFloat(weight_kg),
        gender,
        photo_url: photo_url || null,
        medical_notes: medical_notes ? medical_notes.trim() : null,
        health_id: finalHealthId || null,
        kennel_club_registration: kennel_club_registration ? kennel_club_registration.trim() : null,
        emergency_contact: emergency_contact.trim(),
        emergency_phone: emergency_phone.trim(),
        personality_traits: personality_traits ? JSON.stringify(personality_traits) : JSON.stringify([]),
        vaccination_status: vaccination_status || 'up_to_date',
        spayed_neutered: spayed_neutered || false,
        microchip_id: microchip_id ? microchip_id.trim() : null,
        location: location.trim(),
        created_at: new Date()
      }
    });

    // Parse personality_traits from JSON string to array for response
    const dogWithParsedTraits = {
      ...dog,
      personality_traits: dog.personality_traits ? JSON.parse(dog.personality_traits) : []
    };

    return NextResponse.json({
      message: 'Dog profile created successfully',
      dog: dogWithParsedTraits
    }, { status: 201 });

  } catch (error) {
    console.error('Database error:', error);
    const errorMessage = (error instanceof Error) ? error.message : String(error);
    return NextResponse.json(
      { message: 'Internal server error', error: errorMessage },
      { status: 500 }
    );
  }
}

// GET /api/dogs - Get all dogs for the authenticated user
export async function GET(request: NextRequest) {
  const userId = await verifyToken(request);
  
  if (!userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await prisma.dog.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' }
    });

    // Parse personality_traits from JSON string to array
    const dogsWithParsedTraits = result.map(dog => ({
      ...dog,
      personality_traits: dog.personality_traits ? JSON.parse(dog.personality_traits) : []
    }));

    return NextResponse.json({ dogs: dogsWithParsedTraits });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}