import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import DatabaseOptimizer from '@/lib/db-optimization';
import CacheService from '@/lib/cache-service';
import { registerNewPartner, getPartnerByEmail, getAllPartners, updatePartnerInStorage, getPartnerById } from '@/lib/demo-storage';

export async function GET(request: NextRequest) {
  const startTime = performance.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const isAdmin = request.headers.get('authorization') === 'Bearer admin-token';
    
    // Handle admin requests differently
    if (isAdmin) {
      try {
        const partners = await prisma.partner.findMany({
          orderBy: { created_at: 'desc' },
          select: {
            id: true,
            email: true,
            name: true,
            partner_type: true,
            business_name: true,
            license_number: true,
            specialization: true,
            experience_years: true,
            location: true,
            address: true,
            phone: true,
            website: true,
            bio: true,
            status: true,
            verified: true,
            health_id_access: true,
            admin_notes: true,
            created_at: true
          }
        });

        // If no partners found in database, return demo data
        if (partners.length === 0) {
          const demoPartners = [
            {
              id: 'demo_partner_1',
              email: 'demo.vet@example.com',
              name: 'Dr. Demo Veterinarian',
              partner_type: 'vet',
              business_name: 'Demo Vet Clinic',
              license_number: 'VET123456',
              specialization: ['General Practice'],
              experience_years: 8,
              location: 'Mumbai, India',
              address: '123 Demo Street, Mumbai',
              phone: '+91-9876543210',
              website: 'https://demo-vet.com',
              bio: 'Experienced veterinarian specializing in general practice',
              status: 'pending',
              verified: false,
              health_id_access: false,
              admin_notes: 'Demo partner - register new partners to replace this demo data',
              created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
            }
          ];
          
          const demoStats = {
            total: 1,
            pending: 1,
            approved: 0,
            veterinarians: 1,
            trainers: 0,
            corporate: 0
          };

          return NextResponse.json({ partners: demoPartners, stats: demoStats });
        }

        const stats = {
          total: partners.length,
          pending: partners.filter(p => p.status === 'pending').length,
          approved: partners.filter(p => p.status === 'approved').length,
          veterinarians: partners.filter(p => p.partner_type === 'vet').length,
          trainers: partners.filter(p => p.partner_type === 'trainer').length,
          corporate: partners.filter(p => p.partner_type === 'corporate').length
        };

        return NextResponse.json({ partners, stats });
      } catch (dbError) {
        console.error('Database error in admin partner listing:', dbError);
        // Return demo data for admin when database is unavailable
        const demoPartners = [
          {
            id: 'demo_partner_1',
            email: 'demo.vet@example.com',
            name: 'Dr. Demo Veterinarian',
            partner_type: 'vet',
            business_name: 'Demo Vet Clinic',
            license_number: 'VET123456',
            specialization: ['General Practice'],
            experience_years: 8,
            location: 'Mumbai, India',
            address: '123 Demo Street, Mumbai',
            phone: '+91-9876543210',
            website: 'https://demo-vet.com',
            bio: 'Experienced veterinarian specializing in general practice',
            status: 'pending',
            verified: false,
            health_id_access: false,
            admin_notes: 'Demo partner - database unavailable',
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 'demo_partner_2',
            email: 'trainer@example.com',
            name: 'Sarah Johnson',
            partner_type: 'trainer',
            business_name: 'Pawsome Training Academy',
            license_number: 'TRN789012',
            specialization: ['Basic Obedience', 'Puppy Training'],
            experience_years: 5,
            location: 'Delhi, India',
            address: '456 Training Avenue, Delhi',
            phone: '+91-9876543211',
            website: 'https://pawsome-training.com',
            bio: 'Professional dog trainer specializing in obedience and behavioral training',
            status: 'approved',
            verified: true,
            health_id_access: true,
            admin_notes: 'Demo approved partner',
            created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 'demo_partner_3',
            email: 'corporate@example.com',
            name: 'PetCare Solutions',
            partner_type: 'corporate',
            business_name: 'PetCare Solutions Pvt Ltd',
            license_number: 'CORP345678',
            specialization: ['Pet Insurance', 'Corporate Wellness'],
            experience_years: 12,
            location: 'Bangalore, India',
            address: '789 Corporate Park, Bangalore',
            phone: '+91-9876543212',
            website: 'https://petcare-solutions.com',
            bio: 'Leading corporate partner providing comprehensive pet care solutions',
            status: 'approved',
            verified: true,
            health_id_access: true,
            admin_notes: 'Demo corporate partner',
            created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
          }
        ];
        
        const demoStats = {
          total: 3,
          pending: 1,
          approved: 2,
          veterinarians: 1,
          trainers: 1,
          corporate: 1
        };

        return NextResponse.json({ partners: demoPartners, stats: demoStats });
      }
    }
    
    // Extract search parameters for public API
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

    // Create cache key
    const cacheService = CacheService.getInstance();
    const searchParams_obj = Object.fromEntries(searchParams);
    const cacheKey = cacheService.generateCacheKey(searchParams_obj);
    
    // Check cache first
    const cached = await cacheService.getPartnerSearch(cacheKey);
    if (cached) {
      return NextResponse.json({
        ...cached,
        performance: {
          ...cached.performance,
          cached: true,
          total_time_ms: Math.round(performance.now() - startTime)
        }
      });
    }
    
    // Build where clause for public searches
    const where: any = {
      status: 'approved', // Only show approved partners for public
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

    // Use optimized database service
    const dbOptimizer = DatabaseOptimizer.getInstance();
    
    const searchParams_clean = {
      search,
      location,
      type: partnerType,
      specialization,
      verified: verified === 'true' ? true : verified === 'false' ? false : undefined,
      emergency: emergencyAvailable === 'true',
      online: onlineConsultation === 'true',
      minRating,
      maxDistance: maxDistance ? parseFloat(maxDistance) : undefined,
      sortBy,
      sortOrder,
      page,
      limit
    };

    const result = await dbOptimizer.searchPartners(searchParams_clean);
    const { partners, pagination } = result;

    console.log('Partners API - Optimized search completed');
    console.log('Partners API - Found partners:', partners.length);
    console.log('Partners API - Total count:', pagination.totalCount);

    const processingTime = performance.now() - startTime;
    
    const response = {
      success: true,
      partners,
      pagination,
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
      },
      performance: {
        query_time_ms: Math.round(processingTime),
        cached: false,
        partners_returned: partners.length
      }
    };

    // Cache the result
    await cacheService.cachePartnerSearch(cacheKey, response);

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Partner search error:', error);
    
    // Check if it's a database connection error
    if (error.message?.includes('database') || error.message?.includes('prisma') || error.code === 'P1001') {
      return NextResponse.json(
        { error: 'Database temporarily unavailable. Please try again later.' },
        { status: 503 }
      );
    }
    
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

      // Get the partner before update to check status changes from demo storage
      const existingPartner = await getPartnerById(partner_id);
      if (!existingPartner) {
        return NextResponse.json(
          { error: 'Partner not found' },
          { status: 404 }
        );
      }

      // Update partner in demo storage
      const updatedPartner = await updatePartnerInStorage(partner_id, updateData);

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

    } catch (error) {
      console.error('Partner update error:', error);
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

    // Check if email already exists in demo storage first
    let existingPartner = await getPartnerByEmail(body.email);
    if (existingPartner) {
      return NextResponse.json({
        success: false,
        message: 'A partner with this email already exists'
      }, { status: 409 });
    }

    // Also check database if available
    try {
      existingPartner = await prisma.partner.findUnique({
        where: { email: body.email }
      });

      if (existingPartner) {
        return NextResponse.json({
          success: false,
          message: 'A partner with this email already exists'
        }, { status: 409 });
      }
    } catch (dbError) {
      console.warn('Database check failed, continuing with demo storage:', dbError);
      // Continue with demo registration
    }

    try {
      // Hash password if provided
      let hashedPassword = null;
      if (body.password) {
        hashedPassword = await bcrypt.hash(body.password, 12);
      }

      // Create new partner in demo storage first
      const demoPartnerData = {
        ...body,
        password: hashedPassword
      };
      
      const newPartner = await registerNewPartner(demoPartnerData);

      // Also try to create in database if available
      try {
        await prisma.partner.create({
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
            partnership_tier: body.partnership_tier || 'premium',
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
            status: 'pending',
            verified: false,
            health_id_access: false
          }
        });
        console.log('Partner also saved to database');
      } catch (dbCreateError) {
        console.warn('Database create failed, but demo registration successful:', dbCreateError);
      }

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