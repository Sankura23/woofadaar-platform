import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getDogsForUser, getDogById } from '@/lib/demo-storage';

interface DecodedToken {
  userId?: string;
  partnerId?: string;
  email: string;
  userType?: string;
}

async function verifyToken(request: NextRequest): Promise<{ userId?: string; partnerId?: string; userType?: string } | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key-for-development';
  
  try {
    const decoded = jwt.verify(token, jwtSecret) as DecodedToken;
    return {
      userId: decoded.userId,
      partnerId: decoded.partnerId,
      userType: decoded.userType
    };
  } catch (error) {
    return null;
  }
}

// GET /api/dog-id/access - Get user's dog IDs
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyToken(request);
    
    if (!auth || !auth.userId || auth.userType !== 'pet-parent') {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized - Pet parent authentication required'
      }, { status: 401 });
    }

    const userId = auth.userId;

    // Get user's dogs from demo storage
    const userDogs = await getDogsForUser(userId);

    // Transform dogs into dog IDs
    const dogIds = userDogs.map((dog, index) => ({
      id: `dogid_${dog.id}`,
      dog_id: dog.id,
      dog_name: dog.name,
      dog_id_number: dog.health_id || `DOG${String(index + 1).padStart(6, '0')}`,
      verification_level: 'basic',
      created_at: dog.created_at || new Date().toISOString(),
      last_updated: dog.updated_at || new Date().toISOString(),
      is_active: true
    }));

    console.log(`Retrieved ${dogIds.length} dog IDs for user ${userId}:`, 
      dogIds.map(d => ({ name: d.dog_name, id: d.dog_id_number }))
    );

    return NextResponse.json({
      success: true,
      message: 'Dog IDs retrieved successfully',
      data: {
        dog_ids: dogIds,
        total_count: dogIds.length
      }
    });

  } catch (error) {
    console.error('Dog ID access error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve dog IDs'
    }, { status: 500 });
  }
}

// POST /api/dog-id/access - Create new dog ID
export async function POST(request: NextRequest) {
  const auth = await verifyToken(request);
  
  if (!auth || !auth.userId || auth.userType !== 'pet-parent') {
    return NextResponse.json({ 
      success: false,
      message: 'Unauthorized - Pet parent authentication required' 
    }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { dog_id, verification_level = 'basic' } = body;

    if (!dog_id) {
      return NextResponse.json({
        success: false,
        message: 'Dog ID is required'
      }, { status: 400 });
    }

    // Verify the dog belongs to the user using demo storage
    const dog = await getDogById(auth.userId, dog_id);

    if (!dog) {
      return NextResponse.json({
        success: false,
        message: 'Dog not found or does not belong to authenticated user'
      }, { status: 404 });
    }

    // Generate dog ID number
    const dogIdNumber = `DOG${Date.now().toString().slice(-6)}`;

    // For demo purposes, we'll return success without actually creating in DB
    // In a real implementation, you'd create a DogID record
    const newDogId = {
      id: `dogid_${dog_id}`,
      dog_id: dog_id,
      dog_name: dog.name,
      dog_id_number: dogIdNumber,
      verification_level,
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString(),
      is_active: true
    };

    return NextResponse.json({
      success: true,
      message: 'Dog ID created successfully',
      data: newDogId
    });

  } catch (error) {
    console.error('Dog ID creation error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to create dog ID'
    }, { status: 500 });
  }
}