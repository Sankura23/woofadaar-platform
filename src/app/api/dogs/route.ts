import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import query from '@/lib/db';

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
    if (!name || !breed || !age_months || !weight_kg || !gender) {
      return NextResponse.json(
        { message: 'Missing required fields: name, breed, age_months, weight_kg, gender' },
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

    const dog = await query.dog.create({
      data: {
        user_id: userId,
        name,
        breed,
        age_months: parseInt(age_months),
        weight_kg: parseFloat(weight_kg),
        gender,
        photo_url: photo_url || null,
        medical_notes: medical_notes || null,
        health_id: finalHealthId || null,
        kennel_club_registration: kennel_club_registration || null,
        emergency_contact: emergency_contact || null,
        emergency_phone: emergency_phone || null,
        personality_traits: personality_traits ? JSON.stringify(personality_traits) : JSON.stringify([]),
        vaccination_status: vaccination_status || 'up_to_date',
        spayed_neutered: spayed_neutered || false,
        microchip_id: microchip_id || null,
        location: location || null,
        created_at: new Date()
      }
    });

    return NextResponse.json({
      message: 'Dog profile created successfully',
      dog
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
    const result = await query.dog.findMany({
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