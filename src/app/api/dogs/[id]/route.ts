// src/app/api/dogs/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';

// Helper functions
function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

function verifyToken(token: string): any {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key-for-development');
  } catch {
    return null;
  }
}

function isPetParent(payload: any): boolean {
  return payload?.userId && payload?.userType === 'pet-parent';
}

// GET /api/dogs/[id] - Get a specific dog using demo storage
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key-for-development';
    
    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret) as any;
    } catch (error) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    if (!decoded.userId || decoded.userType !== 'pet-parent') {
      return NextResponse.json({ message: 'Invalid user token' }, { status: 401 });
    }

    const userId = decoded.userId;
    const { id } = await params;

    // Get dog from database
    try {
      const dog = await prisma.dog.findFirst({
        where: {
          id: id,
          user_id: userId
        },
        select: {
          id: true,
          name: true,
          breed: true,
          age_months: true,
          weight_kg: true,
          gender: true,
          vaccination_status: true,
          spayed_neutered: true,
          microchip_id: true,
          emergency_contact: true,
          emergency_phone: true,
          medical_notes: true,
          personality_traits: true,
          location: true,
          photo_url: true,
          health_id: true,
          created_at: true,
          updated_at: true
        }
      });

      if (!dog) {
        return NextResponse.json({ message: 'Dog not found' }, { status: 404 });
      }

      // Ensure personality_traits is an array
      const dogWithParsedTraits = {
        ...dog,
        personality_traits: dog.personality_traits || []
      };

      console.log(`Retrieved dog ${id} for user ${userId}:`, { name: dog.name, breed: dog.breed });

      return NextResponse.json({ dog: dogWithParsedTraits });
    } catch (dbError) {
      console.error('Database error fetching dog:', dbError);
      return NextResponse.json({ message: 'Database error occurred' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error fetching dog:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/dogs/[id] - Update a specific dog
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getTokenFromRequest(request);
  const payload = token ? verifyToken(token) : null;
  const userId = payload && isPetParent(payload) ? payload.userId : null;
  
  if (!userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const {
      name,
      breed,
      age_months,
      weight_kg,
      gender,
      health_id,
      vaccination_status,
      spayed_neutered,
      microchip_id,
      emergency_contact,
      emergency_phone,
      medical_notes,
      personality_traits,
      location,
      photo_url
    } = body;

    // Validation - only require core dog info
    if (!name || !breed || !age_months || !weight_kg) {
      return NextResponse.json(
        { message: 'Missing required fields: name, breed, age_months, weight_kg' },
        { status: 400 }
      );
    }

    // Check if dog belongs to user
    const checkResult = await prisma.dog.findFirst({
      where: {
        id: id,
        user_id: userId
      }
    });

    if (!checkResult) {
      return NextResponse.json({ message: 'Dog not found' }, { status: 404 });
    }

    const result = await prisma.dog.update({
      where: {
        id: id,
        user_id: userId
      },
      data: {
        name,
        breed,
        age_months,
        weight_kg,
        gender,
        health_id,
        vaccination_status,
        spayed_neutered,
        microchip_id: microchip_id || null,
        emergency_contact: emergency_contact || null,
        emergency_phone: emergency_phone || null,
        medical_notes: medical_notes || null,
        personality_traits: personality_traits || [],
        location,
        photo_url: photo_url || null
      }
    });

    // Parse personality_traits from JSON string to array
    const updatedDog = {
      ...result,
      personality_traits: result.personality_traits || []
    };

    return NextResponse.json({
      message: 'Dog profile updated successfully',
      dog: updatedDog
    });

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/dogs/[id] - Delete a specific dog
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getTokenFromRequest(request);
  const payload = token ? verifyToken(token) : null;
  const userId = payload && isPetParent(payload) ? payload.userId : null;
  
  if (!userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    // Check if dog belongs to user
    const checkResult = await prisma.dog.findFirst({
      where: {
        id: id,
        user_id: userId
      }
    });

    if (!checkResult) {
      return NextResponse.json({ message: 'Dog not found' }, { status: 404 });
    }

    // Delete the dog
    await prisma.dog.delete({
      where: {
        id: id,
        user_id: userId
      }
    });

    return NextResponse.json({
      message: 'Dog profile deleted successfully'
    });

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}