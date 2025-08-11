import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import prisma from '@/lib/db'

interface DecodedToken {
  userId: string;
  email: string;
  userType?: string;
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

function generateDogId(name: string, breed: string, location: string): string {
  // Create unique dog ID format: WOF-[NAME_INITIAL][BREED_CODE][LOCATION_CODE][TIMESTAMP]
  const nameInitial = name.substring(0, 2).toUpperCase().replace(/[^A-Z]/g, 'X');
  const breedCode = breed.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
  const locationCode = location.substring(0, 2).toUpperCase().replace(/[^A-Z]/g, 'X');
  const timestamp = Date.now().toString().slice(-6);
  
  return `WOF-${nameInitial}${breedCode}${locationCode}${timestamp}`;
}

// POST /api/dogs/generate-dog-id - Generate unique Woofadaar Dog ID
export async function POST(request: NextRequest) {
  const userId = await verifyToken(request);
  
  if (!userId) {
    return NextResponse.json(
      { message: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { name, breed, location } = await request.json();

    if (!name || !breed || !location) {
      return NextResponse.json(
        { message: 'Name, breed, and location are required' },
        { status: 400 }
      );
    }

    let dogId: string | null = null;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    // Generate unique dog ID
    while (!isUnique && attempts < maxAttempts) {
      dogId = generateDogId(name, breed, location);
      
      // Check if dog ID already exists
      const existingDog = await prisma.dog.findUnique({
        where: { health_id: dogId }
      });

      if (!existingDog) {
        isUnique = true;
      } else {
        attempts++;
        // Add a small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    if (!isUnique) {
      return NextResponse.json(
        { message: 'Failed to generate unique dog ID. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      dogId: dogId!,
      message: 'Dog ID generated successfully',
      features: [
        'Unique identifier for vet visits',
        'Emergency contact information',
        'Medical history tracking',
        'Partner verification access'
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