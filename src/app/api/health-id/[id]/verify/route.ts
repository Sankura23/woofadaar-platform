import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: healthId } = await params;
    const { searchParams } = new URL(request.url);
    const partner_email = searchParams.get('partner_email');

    if (!partner_email) {
      return NextResponse.json(
        { error: 'Partner email is required for Health ID verification' },
        { status: 400 }
      );
    }

    try {
      // Verify partner exists and has health ID access
      const partner = await prisma.partner.findUnique({
        where: { email: partner_email },
        select: {
          id: true,
          name: true,
          partner_type: true,
          business_name: true,
          verified: true,
          health_id_access: true,
          status: true
        }
      });

      if (!partner) {
        return NextResponse.json(
          { error: 'Partner not found' },
          { status: 404 }
        );
      }

      if (partner.status !== 'approved') {
        return NextResponse.json(
          { error: 'Partner is not approved for Health ID access' },
          { status: 403 }
        );
      }

      if (!partner.health_id_access) {
        return NextResponse.json(
          { error: 'Partner does not have Health ID access permissions' },
          { status: 403 }
        );
      }

      // Find dog by health ID
      const dog = await prisma.dog.findUnique({
        where: { health_id: healthId },
        select: {
          id: true,
          name: true,
          breed: true,
          age_months: true,
          weight_kg: true,
          gender: true,
          medical_history: true,
          vaccination_status: true,
          spayed_neutered: true,
          microchip_id: true,
          emergency_contact: true,
          emergency_phone: true,
          medical_notes: true,
          personality_traits: true,
          created_at: true,
          User: {
            select: {
              name: true,
              location: true
            }
          }
        }
      });

      if (!dog) {
        return NextResponse.json(
          { error: 'Health ID not found' },
          { status: 404 }
        );
      }

      // Log the verification
      await prisma.healthIdVerification.create({
        data: {
          partner_id: partner.id,
          health_id: healthId,
          dog_id: dog.id,
          verified_by: partner_email,
          purpose: 'health_check' // Default purpose
        }
      });

      return NextResponse.json({
        success: true,
        health_id: healthId,
        dog: {
          ...dog,
          owner: dog.User
        },
        partner: {
          name: partner.name,
          type: partner.partner_type,
          business_name: partner.business_name,
          verified: partner.verified
        },
        verification_timestamp: new Date().toISOString()
      });

    } catch (dbError) {
      console.error('Database error in Health ID verification:', dbError);
      return NextResponse.json(
        { error: 'Database temporarily unavailable' },
        { status: 503 }
      );
    }

  } catch (error) {
    console.error('Health ID verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: healthId } = await params;
    const body = await request.json();
    const { partner_email, purpose, notes } = body;

    if (!partner_email) {
      return NextResponse.json(
        { error: 'Partner email is required' },
        { status: 400 }
      );
    }

    try {
      // Verify partner has access
      const partner = await prisma.partner.findUnique({
        where: { email: partner_email },
        select: {
          id: true,
          name: true,
          health_id_access: true,
          status: true
        }
      });

      if (!partner || partner.status !== 'approved' || !partner.health_id_access) {
        return NextResponse.json(
          { error: 'Unauthorized for Health ID access' },
          { status: 403 }
        );
      }

      // Find dog
      const dog = await prisma.dog.findUnique({
        where: { health_id: healthId },
        select: { id: true }
      });

      if (!dog) {
        return NextResponse.json(
          { error: 'Health ID not found' },
          { status: 404 }
        );
      }

      // Create verification record with purpose and notes
      const verification = await prisma.healthIdVerification.create({
        data: {
          partner_id: partner.id,
          health_id: healthId,
          dog_id: dog.id,
          verified_by: partner_email,
          purpose: purpose || 'general_access',
          notes
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Health ID verification logged successfully',
        verification_id: verification.id
      });

    } catch (dbError) {
      console.error('Database error in Health ID verification logging:', dbError);
      return NextResponse.json(
        { error: 'Database temporarily unavailable' },
        { status: 503 }
      );
    }

  } catch (error) {
    console.error('Health ID verification logging error:', error);
    return NextResponse.json(
      { error: 'Invalid request format' },
      { status: 400 }
    );
  }
}