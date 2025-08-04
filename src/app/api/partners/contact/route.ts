import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { sendPartnerRegistrationEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      email,
      name,
      partner_type,
      business_name,
      license_number,
      specialization,
      experience_years,
      location,
      address,
      phone,
      website,
      bio,
      services_offered,
      consultation_fee,
      availability_hours,
      languages_spoken,
      certifications
    } = body;

    // Validation
    if (!email || !name || !partner_type || !location || !phone) {
      return NextResponse.json(
        { error: 'Email, name, partner type, location, and phone are required' },
        { status: 400 }
      );
    }

    // Validate partner type
    const validPartnerTypes = ['veterinarian', 'trainer', 'corporate'];
    if (!validPartnerTypes.includes(partner_type)) {
      return NextResponse.json(
        { error: 'Invalid partner type. Must be veterinarian, trainer, or corporate' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    try {
      // Check if partner already exists
      const existingPartner = await prisma.partner.findUnique({
        where: { email }
      });

      if (existingPartner) {
        return NextResponse.json(
          { error: 'A partnership application with this email already exists' },
          { status: 409 }
        );
      }

      // Create new partner application
      const partner = await prisma.partner.create({
        data: {
          email,
          name,
          partner_type,
          business_name,
          license_number,
          specialization,
          experience_years: experience_years ? parseInt(experience_years) : null,
          location,
          address,
          phone,
          website,
          bio,
          services_offered,
          consultation_fee,
          availability_hours,
          languages_spoken,
          certifications,
          status: 'pending',
          verified: false,
          health_id_access: false
        }
      });

      // Send partner registration email
      try {
        await sendPartnerRegistrationEmail(email, name, partner_type);
      } catch (emailError) {
        console.error('Failed to send partner registration email:', emailError);
        // Don't fail the request if email fails
      }

      return NextResponse.json({
        success: true,
        message: 'Partnership application submitted successfully!',
        partner_id: partner.id
      });

    } catch (dbError) {
      console.error('Database error in partner registration:', dbError);
      return NextResponse.json(
        { error: 'Database temporarily unavailable. Please try again later.' },
        { status: 503 }
      );
    }

  } catch (error) {
    console.error('Partnership registration error:', error);
    return NextResponse.json(
      { error: 'Invalid request format' },
      { status: 400 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isAdmin = request.headers.get('authorization') === 'Bearer admin-token';
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    try {
      const partners = await prisma.partner.findMany({
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          partner_type: true,
          business_name: true,
          location: true,
          phone: true,
          status: true,
          verified: true,
          created_at: true
        }
      });

      const stats = {
        total: partners.length,
        pending: partners.filter(p => p.status === 'pending').length,
        approved: partners.filter(p => p.status === 'approved').length,
        veterinarians: partners.filter(p => p.partner_type === 'veterinarian').length,
        trainers: partners.filter(p => p.partner_type === 'trainer').length,
        corporate: partners.filter(p => p.partner_type === 'corporate').length
      };

      return NextResponse.json({ partners, stats });
    } catch (dbError) {
      console.error('Database error in partner listing:', dbError);
      return NextResponse.json(
        { error: 'Database temporarily unavailable' },
        { status: 503 }
      );
    }

  } catch (error) {
    console.error('Partner listing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}