import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';
import { getDogById, updateDogInStorage } from '@/lib/demo-storage';

// GET /api/auth/working-dogs/[id] - Get specific dog by ID from database
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const dogId = params.id;

    // Get dog from database
    try {
      const dog = await prisma.dog.findUnique({
        where: { 
          id: dogId,
          user_id: userId // Ensure dog belongs to authenticated user
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

      if (!dog) {
        return NextResponse.json({
          success: false,
          message: 'Dog not found or does not belong to user'
        }, { status: 404 });
      }

      console.log(`Retrieved dog ${dogId} for user ${userId}:`, {
        dogName: dog.name,
        dogBreed: dog.breed,
        hasHealthId: !!dog.health_id
      });

      return NextResponse.json({
        success: true,
        data: { dog }
      });

    } catch (dbError) {
      console.error('Database error fetching dog, trying demo storage fallback:', dbError);

      // Fallback to demo storage
      try {
        const dog = await getDogById(userId, dogId);
        if (!dog) {
          return NextResponse.json({
            success: false,
            message: 'Dog not found or does not belong to user'
          }, { status: 404 });
        }

        console.log(`Retrieved dog ${dogId} from demo storage for user ${userId}:`, {
          dogName: dog.name,
          dogBreed: dog.breed,
          hasHealthId: !!dog.health_id
        });

        return NextResponse.json({
          success: true,
          data: { dog }
        });

      } catch (storageError) {
        console.error('Demo storage fallback failed:', storageError);
        return NextResponse.json({
          success: false,
          message: 'Failed to fetch dog profile'
        }, { status: 500 });
      }
    }

  } catch (error) {
    console.error('Get dog error:', error);
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

// PUT /api/auth/working-dogs/[id] - Update dog profile in database
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const dogId = params.id;
    const body = await request.json();

    // Basic validation - only require core dog info
    if (!body.name || !body.breed || !body.age_months || !body.weight_kg) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields: name, breed, age_months, weight_kg',
        errors: [
          { field: 'name', message: 'Dog name is required' },
          { field: 'breed', message: 'Dog breed is required' },
          { field: 'age_months', message: 'Dog age is required' },
          { field: 'weight_kg', message: 'Dog weight is required' }
        ]
      }, { status: 400 });
    }

    // Update dog in database
    try {
      const updatedDog = await prisma.dog.update({
        where: { 
          id: dogId,
          user_id: userId // Ensure dog belongs to authenticated user
        },
        data: {
          name: body.name.trim(),
          breed: body.breed === 'Other' && body.customBreed ? body.customBreed.trim() : body.breed.trim(),
          age_months: Number(body.age_months),
          weight_kg: Number(body.weight_kg),
          gender: body.gender,
          photo_url: body.photo_url || null,
          vaccination_status: body.vaccination_status || 'up_to_date',
          spayed_neutered: Boolean(body.spayed_neutered),
          microchip_id: body.microchip_id || null,
          emergency_contact: body.emergency_contact ? body.emergency_contact.trim() : null,
          emergency_phone: body.emergency_phone ? body.emergency_phone.trim() : null,
          personality_traits: Array.isArray(body.personality_traits) ? body.personality_traits : [],
          location: body.location ? body.location.trim() : null,
          medical_notes: body.medical_notes ? body.medical_notes.trim() : null
        }
      });

      console.log(`Updated dog ${dogId} for user ${userId}:`, {
        dogName: updatedDog.name,
        dogBreed: updatedDog.breed
      });

      return NextResponse.json({
        success: true,
        message: 'Dog profile updated successfully',
        data: { dog: updatedDog }
      });

    } catch (dbError) {
      console.error('Database error updating dog, trying demo storage fallback:', dbError);

      // Fallback to demo storage
      try {
        // Get existing dog from demo storage
        const existingDog = await getDogById(userId, dogId);
        if (!existingDog) {
          return NextResponse.json({
            success: false,
            message: 'Dog not found'
          }, { status: 404 });
        }

        // Create updated dog object
        const updatedDog = {
          ...existingDog,
          name: body.name.trim(),
          breed: body.breed === 'Other' && body.customBreed ? body.customBreed.trim() : body.breed.trim(),
          age_months: Number(body.age_months),
          weight_kg: Number(body.weight_kg),
          gender: body.gender,
          photo_url: body.photo_url || null,
          vaccination_status: body.vaccination_status || 'up_to_date',
          spayed_neutered: Boolean(body.spayed_neutered),
          microchip_id: body.microchip_id || null,
          emergency_contact: body.emergency_contact ? body.emergency_contact.trim() : null,
          emergency_phone: body.emergency_phone ? body.emergency_phone.trim() : null,
          personality_traits: Array.isArray(body.personality_traits) ? body.personality_traits : [],
          location: body.location ? body.location.trim() : null,
          medical_notes: body.medical_notes ? body.medical_notes.trim() : null,
          updated_at: new Date().toISOString()
        };

        // Update in demo storage
        const success = await updateDogInStorage(userId, dogId, updatedDog);
        if (!success) {
          return NextResponse.json({
            success: false,
            message: 'Failed to update dog profile in storage'
          }, { status: 500 });
        }

        console.log(`Updated dog ${dogId} in demo storage for user ${userId}:`, {
          dogName: updatedDog.name,
          dogBreed: updatedDog.breed
        });

        return NextResponse.json({
          success: true,
          message: 'Dog profile updated successfully (demo storage)',
          data: { dog: updatedDog }
        });

      } catch (storageError) {
        console.error('Demo storage fallback failed:', storageError);
        return NextResponse.json({
          success: false,
          message: 'Failed to update dog profile'
        }, { status: 500 });
      }
    }

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

// DELETE /api/auth/working-dogs/[id] - Delete dog from database
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const dogId = params.id;

    // Delete dog from database
    try {
      // First verify dog belongs to user
      const dog = await prisma.dog.findUnique({
        where: { id: dogId },
        select: { id: true, name: true, user_id: true }
      });

      if (!dog) {
        return NextResponse.json({
          success: false,
          message: 'Dog not found'
        }, { status: 404 });
      }

      if (dog.user_id !== userId) {
        return NextResponse.json({
          success: false,
          message: 'Dog does not belong to authenticated user'
        }, { status: 403 });
      }

      // Delete the dog
      await prisma.dog.delete({
        where: { id: dogId }
      });

      console.log(`Deleted dog ${dogId} (${dog.name}) for user ${userId}`);

      return NextResponse.json({
        success: true,
        message: `Dog "${dog.name}" deleted successfully`
      });

    } catch (dbError) {
      console.error('Database error deleting dog:', dbError);
      return NextResponse.json({
        success: false,
        message: 'Failed to delete dog'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Delete dog error:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to delete dog',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}