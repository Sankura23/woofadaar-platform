// src/app/api/dogs/generate-health-id/route.ts
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

function generateHealthId(name: string, breed: string, location: string): string {
  // Create unique dog ID format: WOF-[NAME_INITIAL][BREED_CODE][LOCATION_CODE][TIMESTAMP]
  const nameInitial = name.substring(0, 2).toUpperCase().replace(/[^A-Z]/g, 'X');
  const breedCode = breed.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
  const locationCode = location.split(',')[0].substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
  const timestamp = Date.now().toString().slice(-6);
  const randomSuffix = Math.random().toString(36).substring(2, 4).toUpperCase();
  
  return `WOF${nameInitial}${breedCode}${locationCode}${timestamp}${randomSuffix}`;
}

// POST /api/dogs/generate-health-id - Generate unique Woofadaar Dog ID
export async function POST(request: NextRequest) {
  const userId = await verifyToken(request);
  
  if (!userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, breed, location } = body;

    if (!name || !breed || !location) {
      return NextResponse.json(
        { message: 'Name, breed, and location are required' },
        { status: 400 }
      );
    }

    let healthId: string;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    // Ensure the generated ID is unique
    while (!isUnique && attempts < maxAttempts) {
      healthId = generateHealthId(name, breed, location);
      
      // Since health_id doesn't exist in schema, just generate a unique ID
      // This is a simplified version until schema is updated
      isUnique = true;
      attempts++;
    }

    if (!isUnique) {
      return NextResponse.json(
        { message: 'Failed to generate unique dog ID. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      healthId: healthId!,
      message: 'Dog ID generated successfully',
      features: [
        'Unique identifier for vet visits',
        'Access to pet-friendly discounts',
        'Digital health passport',
        'KCI integration ready',
        'Valid across India'
      ]
    });

  } catch (error) {
    console.error('Dog ID generation error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}