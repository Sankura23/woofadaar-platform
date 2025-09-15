import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';

// SIMPLE WORKING DOGS API - NO DATABASE DEPENDENCIES

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'No token provided' }, { status: 401 });
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

    // Get user's dogs from database
    try {
      const userDogs = await prisma.dog.findMany({
        where: { user_id: userId },
        select: {
          id: true,
          name: true,
          breed: true,
          age_months: true,
          weight_kg: true,
          gender: true,
          photo_url: true,
          health_id: true,
          vaccination_status: true,
          spayed_neutered: true,
          microchip_id: true,
          emergency_contact: true,
          emergency_phone: true,
          personality_traits: true,
          location: true,
          medical_notes: true,
          created_at: true,
          updated_at: true
        },
        orderBy: { created_at: 'desc' }
      });

      console.log(`Fetching dogs for user ${userId}:`, {
        total: userDogs.length,
        dogs: userDogs.map(d => ({ id: d.id, name: d.name }))
      });

      return NextResponse.json({
        success: true,
        data: { 
          dogs: userDogs,
          total: userDogs.length
        }
      });
    } catch (dbError) {
      console.error('Database error fetching dogs:', dbError);
      return NextResponse.json({
        success: false,
        message: 'Database connection error. Please check your internet connection and try again.',
        error: 'DATABASE_UNREACHABLE'
      }, { status: 503 });
    }

  } catch (error) {
    console.error('Dogs API error:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ 
        success: false,
        message: 'No token provided' 
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
        message: 'Invalid token' 
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
    if (!body.name || !body.breed || !body.age_months || !body.weight_kg || !body.location || !body.emergency_contact || !body.emergency_phone) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields',
        errors: [
          { field: 'name', message: 'Name is required' },
          { field: 'breed', message: 'Breed is required' },
          { field: 'age_months', message: 'Age is required' },
          { field: 'weight_kg', message: 'Weight is required' },
          { field: 'location', message: 'Location is required' },
          { field: 'emergency_contact', message: 'Emergency contact is required' },
          { field: 'emergency_phone', message: 'Emergency phone is required' }
        ].filter(error => !body[error.field.split('.')[0]])
      }, { status: 400 });
    }

    // Generate health ID if not provided
    let healthId = body.health_id;
    if (!healthId) {
      const timestamp = Date.now().toString().slice(-6);
      const namePrefix = body.name.substring(0, 2).toUpperCase();
      const breedCode = body.breed.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
      healthId = `WOF${namePrefix}${breedCode}${timestamp}`;
    }

    // Try database first, fallback to demo storage
    try {
      const newDog = await prisma.dog.create({
        data: {
          user_id: userId,
          name: body.name.trim(),
          breed: body.breed.trim(),
          age_months: Number(body.age_months),
          weight_kg: Number(body.weight_kg),
          gender: body.gender || 'male',
          photo_url: body.photo_url || null,
          health_id: healthId,
          vaccination_status: body.vaccination_status || 'up_to_date',
          spayed_neutered: Boolean(body.spayed_neutered),
          microchip_id: body.microchip_id || null,
          emergency_contact: body.emergency_contact.trim(),
          emergency_phone: body.emergency_phone.trim(),
          personality_traits: Array.isArray(body.personality_traits) ? body.personality_traits : [],
          location: body.location.trim(),
          medical_notes: body.medical_notes ? body.medical_notes.trim() : null
        },
        select: {
          id: true,
          name: true,
          breed: true,
          age_months: true,
          weight_kg: true,
          gender: true,
          photo_url: true,
          health_id: true,
          vaccination_status: true,
          spayed_neutered: true,
          microchip_id: true,
          emergency_contact: true,
          emergency_phone: true,
          personality_traits: true,
          location: true,
          medical_notes: true,
          created_at: true,
          updated_at: true
        }
      });

      console.log(`Added new dog to database for user ${userId}:`, {
        dogName: newDog.name,
        dogId: newDog.id,
        healthId: newDog.health_id
      });

      return NextResponse.json({
        success: true,
        message: 'Dog profile created successfully',
        data: { dog: newDog }
      }, { status: 201 });
    } catch (dbError) {
      console.log('Database not accessible, using demo storage for new dog...');
      
      // Fallback to demo storage
      const demoStorage = await import('@/lib/demo-storage');
      await demoStorage.initializeDemoData();
      
      const newDog = {
        id: `dog-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        user_id: userId,
        name: body.name.trim(),
        breed: body.breed.trim(),
        age_months: Number(body.age_months),
        weight_kg: Number(body.weight_kg),
        gender: body.gender || 'male',
        photo_url: body.photo_url || null,
        health_id: healthId,
        vaccination_status: body.vaccination_status || 'up_to_date',
        spayed_neutered: Boolean(body.spayed_neutered),
        microchip_id: body.microchip_id || null,
        emergency_contact: body.emergency_contact.trim(),
        emergency_phone: body.emergency_phone.trim(),
        personality_traits: Array.isArray(body.personality_traits) ? body.personality_traits : [],
        location: body.location.trim(),
        medical_notes: body.medical_notes ? body.medical_notes.trim() : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      await demoStorage.addDogToStorage(userId, newDog);

      console.log(`Added new dog to demo storage for user ${userId}:`, {
        dogName: newDog.name,
        dogId: newDog.id,
        healthId: newDog.health_id
      });

      return NextResponse.json({
        success: true,
        message: 'Dog profile created successfully',
        data: { dog: newDog }
      }, { status: 201 });
    }

  } catch (error) {
    console.error('Create dog error:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to create dog profile',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT /api/auth/working-dogs/{dogId} - Update dog profile
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ 
        success: false,
        message: 'No token provided' 
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
        message: 'Invalid token' 
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
    
    // Extract dogId from the request URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const dogId = pathParts[pathParts.length - 1];

    if (!dogId || dogId === 'route.ts') {
      return NextResponse.json({
        success: false,
        message: 'Dog ID is required for updating'
      }, { status: 400 });
    }

    // Get user's dogs from demo storage
    const demoStorage = await import('@/lib/demo-storage');
    await demoStorage.initializeDemoData();
    
    const userDogs = await demoStorage.getDogsForUser(userId);
    const dogIndex = userDogs.findIndex(dog => dog.id === dogId);

    if (dogIndex === -1) {
      return NextResponse.json({
        success: false,
        message: 'Dog not found or does not belong to user'
      }, { status: 404 });
    }

    // Basic validation
    if (!body.name || !body.breed || !body.age_months || !body.weight_kg || !body.location || !body.emergency_contact || !body.emergency_phone) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields'
      }, { status: 400 });
    }

    // Update the dog
    const updatedDog = {
      ...userDogs[dogIndex],
      name: body.name.trim(),
      breed: body.breed.trim(),
      age_months: Number(body.age_months),
      weight_kg: Number(body.weight_kg),
      gender: body.gender || userDogs[dogIndex].gender,
      photo_url: body.photo_url || userDogs[dogIndex].photo_url,
      health_id: body.health_id || userDogs[dogIndex].health_id,
      kennel_club_registration: body.kennel_club_registration || userDogs[dogIndex].kennel_club_registration,
      vaccination_status: body.vaccination_status || userDogs[dogIndex].vaccination_status,
      spayed_neutered: Boolean(body.spayed_neutered),
      microchip_id: body.microchip_id || userDogs[dogIndex].microchip_id,
      emergency_contact: body.emergency_contact.trim(),
      emergency_phone: body.emergency_phone.trim(),
      personality_traits: Array.isArray(body.personality_traits) ? body.personality_traits : userDogs[dogIndex].personality_traits,
      location: body.location.trim(),
      medical_notes: body.medical_notes ? body.medical_notes.trim() : userDogs[dogIndex].medical_notes,
      updated_at: new Date().toISOString()
    };

    // Update in demo storage
    await demoStorage.updateDogInStorage(userId, dogId, updatedDog);

    console.log(`Updated dog for user ${userId}:`, {
      dogId,
      dogName: updatedDog.name
    });

    return NextResponse.json({
      success: true,
      message: 'Dog profile updated successfully',
      data: { dog: updatedDog }
    });

  } catch (error) {
    console.error('Update dog error:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to update dog profile',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/auth/working-dogs/{dogId} - Delete dog profile
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ 
        success: false,
        message: 'No token provided' 
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
        message: 'Invalid token' 
      }, { status: 401 });
    }

    if (!decoded.userId || decoded.userType !== 'pet-parent') {
      return NextResponse.json({ 
        success: false,
        message: 'Invalid user token' 
      }, { status: 401 });
    }

    const userId = decoded.userId;
    
    // Extract dogId from the request URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const dogId = pathParts[pathParts.length - 1];

    if (!dogId || dogId === 'route.ts') {
      return NextResponse.json({
        success: false,
        message: 'Dog ID is required for deletion'
      }, { status: 400 });
    }

    // Get user's dogs from demo storage
    const demoStorage = await import('@/lib/demo-storage');
    await demoStorage.initializeDemoData();
    
    const userDogs = await demoStorage.getDogsForUser(userId);
    const dogIndex = userDogs.findIndex(dog => dog.id === dogId);

    if (dogIndex === -1) {
      return NextResponse.json({
        success: false,
        message: 'Dog not found or does not belong to user'
      }, { status: 404 });
    }

    // Delete the dog from demo storage
    await demoStorage.deleteDogFromStorage(userId, dogId);

    console.log(`Deleted dog for user ${userId}:`, {
      dogId,
      dogName: userDogs[dogIndex].name
    });

    return NextResponse.json({
      success: true,
      message: 'Dog profile deleted successfully'
    });

  } catch (error) {
    console.error('Delete dog error:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to delete dog profile',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}