import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';
import { randomUUID } from 'crypto';

// POST /api/dogs - Create a new dog profile (simplified version)
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        message: 'Authentication required'
      }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key-for-development';

    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret) as any;
    } catch (error) {
      return NextResponse.json({
        success: false,
        message: 'Invalid authentication'
      }, { status: 401 });
    }

    if (!decoded.userId || decoded.userType !== 'pet-parent') {
      return NextResponse.json({
        success: false,
        message: 'Invalid user token'
      }, { status: 401 });
    }

    const userId = decoded.userId;
    const body = await request.json();

    // Basic validation
    if (!body.name || !body.breed) {
      return NextResponse.json({
        success: false,
        message: 'Name and breed are required'
      }, { status: 400 });
    }

    // Generate health ID
    const timestamp = Date.now().toString().slice(-6);
    const namePrefix = body.name.substring(0, 2).toUpperCase();
    const breedCode = body.breed.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
    const finalHealthId = `WOF${namePrefix}${breedCode}${timestamp}`;

    // Create dog profile
    try {
      const dog = await prisma.dog.create({
        data: {
          id: randomUUID(),
          user_id: userId,
          name: body.name,
          breed: body.breed,
          age_months: body.age_months ? Number(body.age_months) : 0,
          weight_kg: body.weight_kg ? Number(body.weight_kg) : 0,
          gender: body.gender || 'unknown',
          photo_url: body.photo_url || null,
          medical_notes: body.medical_notes || null,
          health_id: finalHealthId,
          emergency_contact: body.emergency_contact || '',
          emergency_phone: body.emergency_phone || '',
          personality_traits: body.personality_traits || [],
          vaccination_status: body.vaccination_status || 'unknown',
          spayed_neutered: Boolean(body.spayed_neutered),
          microchip_id: body.microchip_id || null,
          location: body.location || ''
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Dog profile created successfully',
        data: { dog }
      }, { status: 201 });

    } catch (dbError) {
      console.error('Database connection error creating dog:', dbError);
      return NextResponse.json({
        success: false,
        message: 'Unable to save dog profile. Please check your connection and try again.'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error creating dog:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to create dog profile'
    }, { status: 500 });
  }
}

// GET /api/dogs - Get all dogs for the authenticated user using demo storage
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        message: 'Authentication required'
      }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key-for-development';
    
    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret) as any;
    } catch (error) {
      return NextResponse.json({
        success: false,
        message: 'Invalid authentication'
      }, { status: 401 });
    }

    if (!decoded.userId || decoded.userType !== 'pet-parent') {
      return NextResponse.json({
        success: false,
        message: 'Invalid user token'
      }, { status: 401 });
    }

    const userId = decoded.userId;

    // Get user's dogs from database
    try {
      const userDogs = await prisma.dog.findMany({
        where: {
          user_id: userId
        },
        select: {
          id: true,
          name: true,
          breed: true,
          age_months: true,
          weight_kg: true,
          gender: true,
          photo_url: true,
          medical_notes: true,
          health_id: true,
          emergency_contact: true,
          personality_traits: true,
          vaccination_status: true,
          spayed_neutered: true,
          microchip_id: true,
          location: true,
          created_at: true,
          updated_at: true
          // Note: emergency_phone excluded for security
        },
        orderBy: {
          created_at: 'desc'
        }
      });

      // Format response to match expected format
      const formattedDogs = userDogs.map(dog => ({
        ...dog,
        personality_traits: dog.personality_traits || []
      }));

      console.log(`Retrieved ${userDogs.length} dogs for user ${userId} via /api/dogs:`,
        userDogs.map(d => ({ id: d.id, name: d.name }))
      );

      return NextResponse.json({
        success: true,
        data: {
          dogs: formattedDogs,
          total: userDogs.length
        }
      });

    } catch (dbError) {
      console.error('Database connection error retrieving dogs:', dbError);
      return NextResponse.json({
        success: false,
        message: 'Unable to retrieve dog profiles. Please check your connection and try again.'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error retrieving dogs:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve dog profiles'
    }, { status: 500 });
  }
}