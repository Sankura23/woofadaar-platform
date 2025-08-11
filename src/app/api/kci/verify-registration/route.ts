import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';

interface DecodedToken {
  userId?: string;
  partnerId?: string;
  email: string;
  userType?: string;
}

async function verifyToken(request: NextRequest): Promise<{ userId?: string; partnerId?: string } | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    return {
      userId: decoded.userId,
      partnerId: decoded.partnerId
    };
  } catch (error) {
    return null;
  }
}

// Mock KCI API integration - In production, this would connect to actual KCI database
async function verifyWithKCI(registrationId: string, breed: string, dogName?: string) {
  // Simulate KCI API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock KCI database responses based on common patterns
  const mockKCIData = {
    // Valid registrations (for demo purposes)
    'KCI001234': {
      registration_id: 'KCI001234',
      breed: 'Labrador Retriever',
      dog_name: 'Champion Buddy',
      owner_name: 'John Smith',
      registration_date: '2023-05-15',
      pedigree_verified: true,
      status: 'active'
    },
    'KCI567890': {
      registration_id: 'KCI567890',
      breed: 'German Shepherd',
      dog_name: 'Royal Max',
      owner_name: 'Sarah Johnson', 
      registration_date: '2023-08-20',
      pedigree_verified: true,
      status: 'active'
    },
    'KCI112233': {
      registration_id: 'KCI112233',
      breed: 'Golden Retriever',
      dog_name: 'Golden Star',
      owner_name: 'Raj Patel',
      registration_date: '2023-03-10',
      pedigree_verified: true,
      status: 'active'
    }
  };

  const kciData = mockKCIData[registrationId as keyof typeof mockKCIData];
  
  if (!kciData) {
    return {
      success: false,
      error: 'KCI registration not found',
      status: 'invalid'
    };
  }

  // Validate breed matching if provided
  if (breed && kciData.breed.toLowerCase() !== breed.toLowerCase()) {
    return {
      success: false,
      error: 'Breed mismatch with KCI records',
      status: 'invalid'
    };
  }

  return {
    success: true,
    data: kciData,
    status: 'verified'
  };
}

// POST /api/kci/verify-registration - Verify KCI registration number
export async function POST(request: NextRequest) {
  const auth = await verifyToken(request);
  
  if (!auth || (!auth.userId && !auth.partnerId)) {
    return NextResponse.json({ 
      success: false,
      message: 'Unauthorized - Valid authentication required' 
    }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { kci_registration_id, breed, dog_name, dog_id, partner_id } = body;

    // Validation
    if (!kci_registration_id) {
      return NextResponse.json({
        success: false,
        message: 'KCI registration ID is required'
      }, { status: 400 });
    }

    if (!breed) {
      return NextResponse.json({
        success: false,
        message: 'Breed information is required'
      }, { status: 400 });
    }

    // Check if this KCI registration is already verified
    const existingVerification = await prisma.kCIVerification.findUnique({
      where: { kci_registration_id }
    });

    if (existingVerification && existingVerification.verification_status === 'verified') {
      return NextResponse.json({
        success: true,
        message: 'KCI registration already verified',
        data: existingVerification,
        status: 'already_verified'
      });
    }

    // Verify with KCI API
    const kciResult = await verifyWithKCI(kci_registration_id, breed, dog_name);

    // Create or update KCI verification record
    const verificationData = {
      kci_registration_id,
      breed,
      dog_name: dog_name || kciResult.data?.dog_name || null,
      owner_name: kciResult.data?.owner_name || null,
      registration_date: kciResult.data?.registration_date ? new Date(kciResult.data.registration_date) : null,
      verification_status: kciResult.status,
      verification_data: kciResult.data || null,
      verified_at: kciResult.success ? new Date() : null,
      partner_id: partner_id || auth.partnerId || null,
      dog_id: dog_id || null
    };

    let verification;
    if (existingVerification) {
      verification = await prisma.kCIVerification.update({
        where: { id: existingVerification.id },
        data: verificationData
      });
    } else {
      verification = await prisma.kCIVerification.create({
        data: verificationData
      });
    }

    // If verified and dog_id provided, update dog's KCI status
    if (kciResult.success && dog_id) {
      await prisma.dog.findUnique({
        where: { id: dog_id }
      }).then(dog => {
        if (dog && dog.breed.toLowerCase() === breed.toLowerCase()) {
          // Could add KCI verification flag to dog model in future
          console.log(`Dog ${dog_id} KCI verified successfully`);
        }
      }).catch(err => {
        console.log('Dog not found or breed mismatch:', err);
      });
    }

    // Update partner's KCI verification status if partner_id provided
    if (kciResult.success && (partner_id || auth.partnerId)) {
      const partnerIdToUpdate = partner_id || auth.partnerId;
      await prisma.partner.update({
        where: { id: partnerIdToUpdate },
        data: {
          kci_verified: true,
          kci_registration_id: kci_registration_id
        }
      }).catch(err => {
        console.log('Partner not found:', err);
      });
    }

    return NextResponse.json({
      success: kciResult.success,
      message: kciResult.success ? 'KCI registration verified successfully' : kciResult.error,
      data: {
        verification,
        kci_data: kciResult.data
      },
      features: kciResult.success ? [
        'Verified pedigree information',
        'Breed authenticity confirmed',
        'Official KCI registration validated',
        'Enhanced profile credibility'
      ] : []
    });

  } catch (error) {
    console.error('KCI verification error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error during KCI verification'
    }, { status: 500 });
  }
}

// GET /api/kci/verify-registration - Get KCI verification status
export async function GET(request: NextRequest) {
  const auth = await verifyToken(request);
  
  if (!auth || (!auth.userId && !auth.partnerId)) {
    return NextResponse.json({ 
      success: false,
      message: 'Unauthorized' 
    }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const kci_registration_id = searchParams.get('kci_registration_id');
    const dog_id = searchParams.get('dog_id');
    const partner_id = searchParams.get('partner_id');

    let whereClause: any = {};

    if (kci_registration_id) {
      whereClause.kci_registration_id = kci_registration_id;
    } else if (dog_id) {
      whereClause.dog_id = dog_id;
    } else if (partner_id || auth.partnerId) {
      whereClause.partner_id = partner_id || auth.partnerId;
    } else {
      return NextResponse.json({
        success: false,
        message: 'Please provide kci_registration_id, dog_id, or partner_id'
      }, { status: 400 });
    }

    const verifications = await prisma.kCIVerification.findMany({
      where: whereClause,
      orderBy: { created_at: 'desc' },
      include: {
        partner: {
          select: {
            id: true,
            name: true,
            business_name: true,
            partner_type: true
          }
        },
        dog: {
          select: {
            id: true,
            name: true,
            breed: true,
            health_id: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: verifications,
      count: verifications.length
    });

  } catch (error) {
    console.error('KCI verification fetch error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}