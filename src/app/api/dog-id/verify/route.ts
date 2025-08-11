import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import jwt from 'jsonwebtoken';

// Helper function to get partner from JWT token
function getPartnerFromToken(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    
    // Verify this is a partner token with health_id_access
    if (decoded.userType !== 'partner') {
      return null;
    }
    
    return decoded;
  } catch (error) {
    return null;
  }
}

// POST /api/dog-id/verify - Verify a dog's ID and get health information
export async function POST(request: NextRequest) {
  try {
    const partner = getPartnerFromToken(request);
    
    if (!partner) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Partner authentication required' },
        { status: 401 }
      );
    }

    // Verify partner has health ID access
    const partnerRecord = await prisma.partner.findUnique({
      where: { id: partner.partnerId },
      select: { 
        id: true, 
        health_id_access: true, 
        status: true, 
        verified: true,
        partner_type: true,
        name: true
      }
    });

    if (!partnerRecord) {
      return NextResponse.json(
        { success: false, error: 'Partner not found' },
        { status: 404 }
      );
    }

    if (!partnerRecord.health_id_access) {
      return NextResponse.json(
        { success: false, error: 'Access denied - Health ID access not granted for this partner' },
        { status: 403 }
      );
    }

    if (partnerRecord.status !== 'approved' || !partnerRecord.verified) {
      return NextResponse.json(
        { success: false, error: 'Access denied - Partner not approved or verified' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { dog_id, verification_method, qr_code_data } = body;

    if (!dog_id) {
      return NextResponse.json(
        { success: false, error: 'Dog ID is required' },
        { status: 400 }
      );
    }

    // Find the dog and verify access
    const dog = await prisma.dog.findUnique({
      where: { id: dog_id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          }
        },
        health_records: {
          orderBy: { created_at: 'desc' },
          take: 10, // Latest 10 health records
        },
        vaccinations: {
          orderBy: { date_administered: 'desc' },
          take: 20, // Latest 20 vaccinations
        }
      }
    });

    if (!dog) {
      return NextResponse.json(
        { success: false, error: 'Dog not found' },
        { status: 404 }
      );
    }

    // Verify QR code data if provided (additional security)
    if (qr_code_data) {
      try {
        const qrData = JSON.parse(qr_code_data);
        if (qrData.dog_id !== dog_id || !qrData.timestamp) {
          return NextResponse.json(
            { success: false, error: 'Invalid QR code data' },
            { status: 400 }
          );
        }
        
        // Check if QR code is not too old (e.g., 24 hours)
        const qrTimestamp = new Date(qrData.timestamp);
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
        
        if (qrTimestamp < twentyFourHoursAgo) {
          return NextResponse.json(
            { success: false, error: 'QR code expired - please generate a new one' },
            { status: 400 }
          );
        }
      } catch (error) {
        return NextResponse.json(
          { success: false, error: 'Invalid QR code format' },
          { status: 400 }
        );
      }
    }

    // Log the access attempt
    await prisma.dogIdAccessLog.create({
      data: {
        dog_id: dog.id,
        partner_id: partner.partnerId,
        access_type: 'health_verification',
        verification_method: verification_method || 'manual',
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      }
    });

    // Prepare response data based on partner type and access level
    const responseData = {
      dog: {
        id: dog.id,
        name: dog.name,
        breed: dog.breed,
        age: dog.age,
        gender: dog.gender,
        weight: dog.weight,
        color: dog.color,
        microchip_id: dog.microchip_id,
        photo_url: dog.photo_url,
        registration_number: dog.registration_number,
        date_of_birth: dog.date_of_birth,
        special_needs: dog.special_needs,
        behavioral_notes: dog.behavioral_notes,
        dietary_restrictions: dog.dietary_restrictions,
        medical_conditions: dog.medical_conditions,
      },
      owner: {
        id: dog.user.id,
        name: dog.user.name,
        email: dog.user.email,
        phone: dog.user.phone,
      },
      health_records: dog.health_records.map(record => ({
        id: record.id,
        record_type: record.record_type,
        title: record.title,
        description: record.description,
        date: record.date,
        veterinarian: record.veterinarian,
        clinic_name: record.clinic_name,
        diagnosis: record.diagnosis,
        treatment: record.treatment,
        medications: record.medications,
        follow_up_date: record.follow_up_date,
        created_at: record.created_at,
      })),
      vaccinations: dog.vaccinations.map(vac => ({
        id: vac.id,
        vaccine_name: vac.vaccine_name,
        vaccine_type: vac.vaccine_type,
        date_administered: vac.date_administered,
        next_due_date: vac.next_due_date,
        batch_number: vac.batch_number,
        administered_by: vac.administered_by,
        clinic_name: vac.clinic_name,
        notes: vac.notes,
      })),
      verification: {
        verified_at: new Date(),
        verified_by: {
          partner_id: partner.partnerId,
          partner_name: partnerRecord.name,
          partner_type: partnerRecord.partner_type,
        },
        verification_method: verification_method || 'manual',
        access_granted: true,
      }
    };

    // Send notification to dog owner (optional)
    try {
      // In a real app, you'd send a push notification or email here
      console.log(`NOTIFICATION: ${partnerRecord.name} (${partnerRecord.partner_type}) accessed health records for ${dog.name} (${dog.id})`);
    } catch (notificationError) {
      console.error('Failed to send access notification:', notificationError);
      // Don't fail the verification if notification fails
    }

    return NextResponse.json({
      success: true,
      message: 'Dog ID verification successful',
      data: responseData
    });

  } catch (error) {
    console.error('Error verifying dog ID:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify dog ID' },
      { status: 500 }
    );
  }
}

// GET /api/dog-id/verify - Get dog basic info for verification (limited access)
export async function GET(request: NextRequest) {
  try {
    const partner = getPartnerFromToken(request);
    
    if (!partner) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Partner authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dogId = searchParams.get('dogId');

    if (!dogId) {
      return NextResponse.json(
        { success: false, error: 'Dog ID is required' },
        { status: 400 }
      );
    }

    // Verify partner has basic access
    const partnerRecord = await prisma.partner.findUnique({
      where: { id: partner.partnerId },
      select: { 
        id: true, 
        status: true, 
        verified: true,
        partner_type: true,
        name: true
      }
    });

    if (!partnerRecord || partnerRecord.status !== 'approved' || !partnerRecord.verified) {
      return NextResponse.json(
        { success: false, error: 'Access denied - Partner not approved or verified' },
        { status: 403 }
      );
    }

    // Find the dog (basic info only)
    const dog = await prisma.dog.findUnique({
      where: { id: dogId },
      select: {
        id: true,
        name: true,
        breed: true,
        age: true,
        gender: true,
        color: true,
        photo_url: true,
        user: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    if (!dog) {
      return NextResponse.json(
        { success: false, error: 'Dog not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        dog: {
          id: dog.id,
          name: dog.name,
          breed: dog.breed,
          age: dog.age,
          gender: dog.gender,
          color: dog.color,
          photo_url: dog.photo_url,
        },
        owner: {
          name: dog.user.name,
        },
        verification_available: true,
        message: 'Use POST /api/dog-id/verify with full dog ID to access complete health records'
      }
    });

  } catch (error) {
    console.error('Error getting dog info:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get dog information' },
      { status: 500 }
    );
  }
}