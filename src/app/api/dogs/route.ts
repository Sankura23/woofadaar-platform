import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getTokenFromRequest, verifyToken, isPetParent } from '@/lib/auth';
import { dogProfileSchema, sanitizeInput, ValidationError, DatabaseError } from '@/lib/validation';
import { logError, logInfo, logDatabaseOperation, createRequestLog } from '@/lib/logger';
import { createDogRateLimiter, withRateLimit } from '@/lib/rateLimiter';

// POST /api/dogs - Create a new dog profile with enhanced security and validation
export const POST = withRateLimit(async (request: NextRequest) => {
  const startTime = Date.now();
  const requestLog = createRequestLog('POST', '/api/dogs');
  
  try {
    // Verify authentication
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({
        success: false,
        message: 'Authentication required'
      }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || !isPetParent(payload)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid authentication'
      }, { status: 401 });
    }

    const userId = payload.userId;
    requestLog.userId = userId;

    // Apply rate limiting specifically for dog creation
    const rateLimitResult = await createDogRateLimiter(request);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    const body = await request.json();
    
    // Sanitize and convert inputs
    const sanitizedData = {
      ...body,
      name: sanitizeInput(body.name || ''),
      breed: sanitizeInput(body.breed || ''),
      location: sanitizeInput(body.location || ''),
      emergency_contact: sanitizeInput(body.emergency_contact || ''),
      emergency_phone: sanitizeInput(body.emergency_phone || ''),
      medical_notes: body.medical_notes ? sanitizeInput(body.medical_notes) : undefined,
      microchip_id: body.microchip_id ? sanitizeInput(body.microchip_id) : undefined,
      // Convert string numbers to actual numbers
      age_months: body.age_months ? Number(body.age_months) : 0,
      weight_kg: body.weight_kg ? Number(body.weight_kg) : 0,
      spayed_neutered: Boolean(body.spayed_neutered),
      // Handle arrays
      personality_traits: Array.isArray(body.personality_traits) ? body.personality_traits : []
    };

    // Validate using Zod schema
    const validationResult = dogProfileSchema.safeParse(sanitizedData);
    if (!validationResult.success) {
      const errors = validationResult.error.issues;
      logInfo('Dog profile validation failed', {
        ...requestLog,
        errors: errors,
        inputData: { ...sanitizedData, emergency_phone: '[REDACTED]' }
      });
      
      // Return all validation errors for better debugging
      return NextResponse.json({
        success: false,
        message: 'Validation failed',
        errors: errors.map(error => ({
          field: error.path.join('.'),
          message: error.message,
          code: error.code
        })),
        // Include detailed error for frontend debugging
        details: errors.length === 1 ? 
          `${errors[0].path.join('.')}: ${errors[0].message}` : 
          `Multiple validation errors: ${errors.map(e => e.path.join('.')).join(', ')}`
      }, { status: 400 });
    }

    const validatedData = validationResult.data;

    // Generate secure health ID if not provided
    let finalHealthId = validatedData.health_id;
    if (!finalHealthId) {
      const timestamp = Date.now().toString().slice(-6);
      const namePrefix = validatedData.name.substring(0, 2).toUpperCase();
      const breedCode = validatedData.breed.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
      finalHealthId = `WOF${namePrefix}${breedCode}${timestamp}`;
    }

    // Check if health ID already exists
    const existingHealthId = await prisma.dog.findFirst({
      where: { health_id: finalHealthId }
    });

    if (existingHealthId) {
      // Regenerate with additional randomness
      const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
      finalHealthId = `${finalHealthId}${randomSuffix}`;
    }

    // Use database transaction for data consistency
    const dbStartTime = Date.now();
    
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Create dog profile (let Prisma generate IDs)
        const dog = await tx.dog.create({
          data: {
            user_id: userId,
            name: validatedData.name,
            breed: validatedData.breed,
            age_months: validatedData.age_months,
            weight_kg: validatedData.weight_kg,
            gender: validatedData.gender,
            photo_url: validatedData.photo_url || null,
            medical_notes: validatedData.medical_notes || null,
            health_id: finalHealthId,
            emergency_contact: validatedData.emergency_contact,
            emergency_phone: validatedData.emergency_phone,
            personality_traits: validatedData.personality_traits || [],
            vaccination_status: validatedData.vaccination_status,
            spayed_neutered: validatedData.spayed_neutered,
            microchip_id: validatedData.microchip_id || null,
            location: validatedData.location
          }
        });

        // Create initial health log if weight is provided
        if (validatedData.weight_kg) {
          await tx.healthLog.create({
            data: {
              dog_id: dog.id,
              user_id: userId,
              log_date: new Date(),
              weight_kg: validatedData.weight_kg,
              notes: 'Initial weight recorded during profile creation'
            }
          });
        }

        return dog;
      });

      const dbDuration = Date.now() - dbStartTime;
      logDatabaseOperation('dog_creation', 'dogs', dbDuration, true);

      // Log successful creation
      logInfo('Dog profile created successfully', {
        ...requestLog,
        dogId: result.id,
        healthId: finalHealthId,
        duration: Date.now() - startTime
      });

      // Return success response
      return NextResponse.json({
        success: true,
        message: 'Dog profile created successfully',
        data: {
          dog: {
            ...result,
            personality_traits: result.personality_traits || []
          }
        }
      }, { status: 201 });

    } catch (dbError) {
      const dbDuration = Date.now() - dbStartTime;
      logDatabaseOperation('dog_creation', 'dogs', dbDuration, false, dbError as Error);
      throw new DatabaseError('dog creation', dbError as Error);
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    
    if (error instanceof ValidationError) {
      logError('Validation error in dog creation', error, {
        ...requestLog,
        duration
      });
      return NextResponse.json({
        success: false,
        message: error.message
      }, { status: 400 });
    }

    if (error instanceof DatabaseError) {
      logError('Database error in dog creation', error, {
        ...requestLog,
        duration
      });
      // Surface prisma error detail in development to help debugging
      const isDev = process.env.NODE_ENV === 'development';
      return NextResponse.json({
        success: false,
        message: 'Failed to create dog profile. Please try again.',
        ...(isDev && { error: (error as any)?.cause?.message })
      }, { status: 500 });
    }

    // Generic error handling
    logError('Unexpected error in dog creation', error as Error, {
      ...requestLog,
      duration
    });

    const isDev = process.env.NODE_ENV === 'development';
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      ...(isDev && { error: (error as Error).message })
    }, { status: 500 });
  }
}, createDogRateLimiter);

// GET /api/dogs - Get all dogs for the authenticated user with optimized query
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const requestLog = createRequestLog('GET', '/api/dogs');

  try {
    // Verify authentication
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({
        success: false,
        message: 'Authentication required'
      }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || !isPetParent(payload)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid authentication'
      }, { status: 401 });
    }

    const userId = payload.userId;
    requestLog.userId = userId;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const includeHealth = searchParams.get('include_health') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100); // Max 100

    const dbStartTime = Date.now();

    try {
      // Optimized query with conditional includes
      const dogs = await prisma.dog.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        take: limit
      });

      const dbDuration = Date.now() - dbStartTime;
      logDatabaseOperation('dogs_fetch', 'dogs', dbDuration, true);

      // Format response
      const formattedDogs = dogs.map(dog => ({
        ...dog,
        personality_traits: dog.personality_traits || [],
        // Don't expose sensitive data
        emergency_phone: undefined
      }));

      logInfo('Dogs retrieved successfully', {
        ...requestLog,
        count: dogs.length,
        includeHealth,
        duration: Date.now() - startTime
      });

      const response = NextResponse.json({
        success: true,
        data: { 
          dogs: formattedDogs,
          total: dogs.length,
          includeHealth
        }
      });

      // Add caching headers for better performance
      response.headers.set('Cache-Control', 'private, max-age=60');
      
      return response;

    } catch (dbError) {
      const dbDuration = Date.now() - dbStartTime;
      logDatabaseOperation('dogs_fetch', 'dogs', dbDuration, false, dbError as Error);
      throw new DatabaseError('dogs fetch', dbError as Error);
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    
    logError('Error retrieving dogs', error as Error, {
      ...requestLog,
      duration
    });

    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve dog profiles'
    }, { status: 500 });
  }
}