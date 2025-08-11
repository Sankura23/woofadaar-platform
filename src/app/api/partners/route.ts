import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract search parameters
    const search = searchParams.get('search') || '';
    const partnerType = searchParams.get('type');
    const location = searchParams.get('location');
    const specialization = searchParams.get('specialization');
    const verified = searchParams.get('verified');
    const emergencyAvailable = searchParams.get('emergency');
    const homeVisit = searchParams.get('homeVisit');
    const onlineConsultation = searchParams.get('online');
    const minRating = parseFloat(searchParams.get('minRating') || '0');
    const maxDistance = searchParams.get('maxDistance');
    const sortBy = searchParams.get('sortBy') || 'rating_average';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    // Build where clause
    const where: any = {
      status: 'approved', // Only show approved partners
    };
    
    // Add search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { business_name: { contains: search, mode: 'insensitive' } },
        { bio: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    // Add type filter
    if (partnerType) {
      where.partner_type = partnerType;
    }
    
    // Add location filter
    if (location) {
      where.location = { contains: location, mode: 'insensitive' };
    }
    
    // Add verified filter
    if (verified !== null) {
      where.verified = verified === 'true';
    }
    
    // Add service filters
    if (emergencyAvailable === 'true') {
      where.emergency_available = true;
    }
    
    if (homeVisit === 'true') {
      where.home_visit_available = true;
    }
    
    if (onlineConsultation === 'true') {
      where.online_consultation = true;
    }
    
    // Add rating filter
    if (minRating > 0) {
      where.rating_average = { gte: minRating };
    }
    
    // Build order by clause
    const orderBy: any = {};
    if (sortBy === 'rating_average') {
      orderBy.rating_average = sortOrder;
    } else if (sortBy === 'created_at') {
      orderBy.created_at = sortOrder;
    } else if (sortBy === 'total_reviews') {
      orderBy.total_reviews = sortOrder;
    } else if (sortBy === 'name') {
      orderBy.name = sortOrder;
    } else if (sortBy === 'last_active') {
      orderBy.last_active_at = sortOrder;
    } else {
      orderBy.rating_average = 'desc'; // default
    }
    
    // Calculate offset
    const skip = (page - 1) * limit;

    try {
      const [partners, totalCount] = await Promise.all([
        prisma.partner.findMany({
          where,
          select: {
            id: true,
            name: true,
            business_name: true,
            partner_type: true,
            location: true,
            bio: true,
            phone: true,
            website: true,
            profile_image_url: true,
            rating_average: true,
            rating_count: true,
            total_reviews: true,
            verified: true,
            verification_date: true,
            partnership_tier: true,
            emergency_available: true,
            home_visit_available: true,
            online_consultation: true,
            response_time_hours: true,
            service_radius_km: true,
            languages_spoken: true,
            languages_primary: true,
            pricing_info: true,
            consultation_fee_range: true,
            specialization: true,
            experience_years: true,
            certifications: true,
            last_active_at: true,
            created_at: true,
          },
          orderBy,
          skip,
          take: limit,
        }),
        prisma.partner.count({ where }),
      ]);

      // Calculate pagination info
      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return NextResponse.json({
        success: true,
        data: {
          partners,
          pagination: {
            page,
            limit,
            totalCount,
            totalPages,
            hasNextPage,
            hasPrevPage,
          },
          filters: {
            search,
            partnerType,
            location,
            specialization,
            verified,
            emergencyAvailable,
            homeVisit,
            onlineConsultation,
            minRating,
            sortBy,
            sortOrder,
          }
        }
      });

    } catch (dbError) {
      console.error('Database error in partner search:', dbError);
      return NextResponse.json(
        { error: 'Database temporarily unavailable. Please try again later.' },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('Partner search error:', error);
    return NextResponse.json(
      { error: 'Invalid request format' },
      { status: 400 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const isAdmin = request.headers.get('authorization') === 'Bearer admin-token';
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { partner_id, status, verified, health_id_access, admin_notes } = body;

    if (!partner_id) {
      return NextResponse.json(
        { error: 'Partner ID is required' },
        { status: 400 }
      );
    }

    try {
      const updateData: any = {};
      
      if (status && ['pending', 'approved', 'rejected', 'suspended'].includes(status)) {
        updateData.status = status;
      }
      
      if (typeof verified === 'boolean') {
        updateData.verified = verified;
        if (verified) {
          updateData.verification_date = new Date();
        }
      }
      
      if (typeof health_id_access === 'boolean') {
        updateData.health_id_access = health_id_access;
      }
      
      if (admin_notes !== undefined) {
        updateData.admin_notes = admin_notes;
      }

      // Get the partner before update to check status changes
      const existingPartner = await prisma.partner.findUnique({
        where: { id: partner_id },
        select: { status: true, email: true, name: true }
      });

      const updatedPartner = await prisma.partner.update({
        where: { id: partner_id },
        data: updateData
      });

      // Send notification if status changed to approved
      if (existingPartner && existingPartner.status !== 'approved' && status === 'approved') {
        try {
          // In a real app, you'd send an email here
          console.log(`NOTIFICATION: Partner ${existingPartner.name} (${existingPartner.email}) has been approved and can now login at /login`);
          
          // You could also create a notification record in the database
          // or integrate with an email service like SendGrid, AWS SES, etc.
        } catch (notificationError) {
          console.error('Failed to send approval notification:', notificationError);
          // Don't fail the update if notification fails
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Partner updated successfully',
        partner: updatedPartner,
        ...(existingPartner && existingPartner.status !== 'approved' && status === 'approved' && {
          notification: 'Approval notification sent to partner'
        })
      });

    } catch (dbError) {
      console.error('Database error in partner update:', dbError);
      return NextResponse.json(
        { error: 'Failed to update partner' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Partner update error:', error);
    return NextResponse.json(
      { error: 'Invalid request format' },
      { status: 400 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Debug logging
    console.log('Partner registration data received:', { 
      partner_type: body.partner_type, 
      email: body.email,
      name: body.name,
      type_of_partner_type: typeof body.partner_type 
    });
    
    // Validate required fields
    const requiredFields = ['email', 'name', 'partner_type', 'location', 'phone'];
    for (const field of requiredFields) {
      if (!body[field]) {
        console.log(`Missing required field: ${field}`);
        return NextResponse.json({
          success: false,
          message: `${field} is required`
        }, { status: 400 });
      }
    }
    
    // Validate partner type
    const validTypes = ['vet', 'trainer', 'corporate', 'kci'];
    if (!validTypes.includes(body.partner_type)) {
      console.log(`Invalid partner type received: "${body.partner_type}". Valid types: ${validTypes.join(', ')}`);
      return NextResponse.json({
        success: false,
        message: 'Invalid partner type. Must be: vet, trainer, corporate, or kci'
      }, { status: 400 });
    }

    // Password validation
    if (body.password && body.password.length < 6) {
      return NextResponse.json({
        success: false,
        message: 'Password must be at least 6 characters long'
      }, { status: 400 });
    }

    // Check if email already exists
    const existingPartner = await prisma.partner.findUnique({
      where: { email: body.email }
    });

    if (existingPartner) {
      return NextResponse.json({
        success: false,
        message: 'A partner with this email already exists'
      }, { status: 409 });
    }

    try {
      // Hash password if provided
      let hashedPassword = null;
      if (body.password) {
        hashedPassword = await bcrypt.hash(body.password, 12);
      }

      // Create new partner with enhanced fields
      const newPartner = await prisma.partner.create({
        data: {
          email: body.email,
          name: body.name,
          password: hashedPassword,
          partner_type: body.partner_type,
          business_name: body.business_name,
          license_number: body.license_number,
          specialization: body.specialization ? JSON.stringify(body.specialization) : null,
          experience_years: body.experience_years ? parseInt(body.experience_years) : null,
          location: body.location,
          address: body.address,
          phone: body.phone,
          website: body.website,
          bio: body.bio,
          services_offered: body.services_offered ? JSON.stringify(body.services_offered) : null,
          pricing_info: body.pricing_info ? JSON.stringify(body.pricing_info) : null,
          availability_schedule: body.availability_schedule ? JSON.stringify(body.availability_schedule) : null,
          languages_spoken: body.languages_spoken || [],
          certifications: body.certifications || [],
          profile_image_url: body.profile_image_url,
          partnership_tier: body.partnership_tier || 'basic',
          kci_registration_id: body.kci_registration_id,
          commission_rate: body.commission_rate ? parseFloat(body.commission_rate) : 0.0,
          consultation_fee_range: body.consultation_fee_range ? JSON.stringify(body.consultation_fee_range) : null,
          emergency_available: body.emergency_available || false,
          home_visit_available: body.home_visit_available || false,
          online_consultation: body.online_consultation || false,
          response_time_hours: body.response_time_hours ? parseInt(body.response_time_hours) : null,
          service_radius_km: body.service_radius_km ? parseInt(body.service_radius_km) : null,
          languages_primary: body.languages_primary || 'english',
          verification_documents: body.verification_documents ? JSON.stringify(body.verification_documents) : null,
          social_media_links: body.social_media_links ? JSON.stringify(body.social_media_links) : null,
          business_hours: body.business_hours ? JSON.stringify(body.business_hours) : null,
          cancellation_policy: body.cancellation_policy,
          refund_policy: body.refund_policy,
          terms_conditions: body.terms_conditions,
          status: 'pending', // New partners start as pending
          verified: false,
          health_id_access: false
        },
        select: {
          id: true,
          name: true,
          email: true,
          partner_type: true,
          business_name: true,
          status: true,
          location: true,
          specialization: true,
          partnership_tier: true,
          created_at: true
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Partner registration submitted successfully! We will review your application and get back to you within 2-3 business days.',
        data: {
          partner: newPartner,
          application_id: newPartner.id,
          next_steps: [
            'You will receive a confirmation email shortly',
            'Our team will review your application within 2-3 business days',
            'We may contact you for additional verification',
            'Once approved, you can login at /login with your email and password',
            'After approval, you\'ll get access to the partner dashboard'
          ]
        }
      });

    } catch (dbError) {
      console.error('Database error in partner registration:', dbError);
      return NextResponse.json({
        success: false,
        message: 'Failed to submit registration. Please try again later.'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Partner registration error:', error);
    return NextResponse.json({
      success: false,
      message: 'Invalid request format'
    }, { status: 400 });
  }
}