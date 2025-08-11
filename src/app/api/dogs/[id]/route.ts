// src/app/api/dogs/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromRequest, isPetParent } from '@/lib/auth';
import prisma from '@/lib/db';

// GET /api/dogs/[id] - Get a specific dog
export async function GET(
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
    const dog = await prisma.dog.findFirst({
      where: { 
        id: id,
        user_id: userId 
      }
    });

    if (!dog) {
      return NextResponse.json({ message: 'Dog not found' }, { status: 404 });
    }

    // personality_traits is already an array in the schema
    const dogWithParsedTraits = {
      ...dog,
      personality_traits: dog.personality_traits || []
    };

    return NextResponse.json({ dog: dogWithParsedTraits });
  } catch (error) {
    console.error('Database error:', error);
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

    // Validation
    if (!name || !breed || !age_months || !weight_kg || !gender || !location) {
      return NextResponse.json(
        { message: 'Missing required fields' },
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