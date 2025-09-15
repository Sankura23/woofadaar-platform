import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Verify Dog ID and return accessible information for authorized partners
export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    
    // Verify JWT token
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const partnerId = decoded.partnerId;
    if (!partnerId) {
      return NextResponse.json(
        { error: 'Partner ID not found in token' },
        { status: 401 }
      );
    }

    // Get request body
    const { dogId, verificationReason, verificationType = 'routine' } = await request.json();
    
    if (!dogId || !verificationReason) {
      return NextResponse.json(
        { error: 'Dog ID and verification reason are required' },
        { status: 400 }
      );
    }

    // Verify partner exists and has appropriate access level
    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
      select: {
        id: true,
        name: true,
        partner_type: true,
        dog_id_access_level: true,
        emergency_access_enabled: true,
        status: true,
        verified: true,
        compliance_status: true,
        api_rate_limit: true,
        total_verifications_count: true,
      }
    });

    if (!partner) {
      return NextResponse.json(
        { error: 'Partner not found' },
        { status: 404 }
      );
    }

    if (partner.status !== 'approved' || !partner.verified) {
      return NextResponse.json(
        { error: 'Partner not approved for Dog ID verification' },
        { status: 403 }
      );
    }

    if (partner.compliance_status !== 'compliant') {
      return NextResponse.json(
        { error: 'Partner compliance status does not allow Dog ID access' },
        { status: 403 }
      );
    }

    // Check rate limiting (simplified version)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayVerifications = await prisma.dogIdVerification.count({
      where: {
        partner_id: partnerId,
        verified_at: {
          gte: today
        }
      }
    });

    if (todayVerifications >= partner.api_rate_limit) {
      return NextResponse.json(
        { error: 'Daily API rate limit exceeded' },
        { status: 429 }
      );
    }

    // Find the dog by Dog ID
    const dog = await prisma.dog.findFirst({
      where: {
        OR: [
          { id: dogId },
          { health_id: dogId }
        ]
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            location: true,
          }
        },
        MedicalRecords: {
          where: {
            record_type: { in: ['vaccination', 'allergy', 'chronic_condition', 'emergency_contact'] }
          },
          orderBy: { record_date: 'desc' },
          take: 10,
          select: {
            id: true,
            record_type: true,
            title: true,
            description: true,
            record_date: true,
            vet_name: true,
            vet_clinic: true,
            medications: true,
            next_due_date: true,
          }
        },
        HealthReminders: {
          where: {
            is_active: true,
            end_date: { gte: new Date() }
          },
          select: {
            id: true,
            reminder_type: true,
            medication_name: true,
            dosage: true,
            frequency: true,
            next_reminder: true,
          }
        },
        Medications: {
          where: { is_active: true },
          select: {
            id: true,
            name: true,
            dosage: true,
            frequency: true,
            start_date: true,
            end_date: true,
            prescribed_by: true,
            instructions: true,
            side_effects: true,
          }
        }
      }
    });

    if (!dog) {
      return NextResponse.json(
        { error: 'Dog ID not found' },
        { status: 404 }
      );
    }

    // Get client information for audit
    const clientIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Determine what data to include based on partner access level and verification type
    let healthDataAccessed: any = {};
    let dogProfile: any = {
      id: dog.id,
      health_id: dog.health_id,
      name: dog.name,
      breed: dog.breed,
      age_months: dog.age_months,
      weight_kg: dog.weight_kg,
      gender: dog.gender,
      vaccination_status: dog.vaccination_status,
      spayed_neutered: dog.spayed_neutered,
      microchip_id: dog.microchip_id,
      photo_url: dog.photo_url,
      owner: {
        name: dog.User.name,
        email: dog.User.email,
        location: dog.User.location,
      }
    };

    // Include medical data based on access level
    if (partner.dog_id_access_level === 'full' || partner.dog_id_access_level === 'medical') {
      dogProfile.medical_records = dog.MedicalRecords;
      dogProfile.current_medications = dog.Medications;
      dogProfile.health_reminders = dog.HealthReminders;
      dogProfile.medical_notes = dog.medical_notes;
      dogProfile.emergency_contact = dog.emergency_contact;
      dogProfile.emergency_phone = dog.emergency_phone;
      
      healthDataAccessed = {
        medical_records: true,
        medications: true,
        health_reminders: true,
        emergency_contacts: true,
      };
    }

    // For emergency access, always include critical information
    if (verificationType === 'emergency' && partner.emergency_access_enabled) {
      dogProfile.emergency_contact = dog.emergency_contact;
      dogProfile.emergency_phone = dog.emergency_phone;
      dogProfile.medical_notes = dog.medical_notes;
      dogProfile.current_medications = dog.Medications;
      
      // Include critical medical records
      const criticalRecords = dog.MedicalRecords.filter(record => 
        ['allergy', 'chronic_condition', 'emergency_contact'].includes(record.record_type)
      );
      dogProfile.critical_medical_info = criticalRecords;
      
      healthDataAccessed.emergency_access = true;
    }

    // Check/Create PartnerDogVerification for Week 12 enhancement
    const existingVerification = await prisma.partnerDogVerification.findFirst({
      where: {
        partner_id: partnerId,
        dog_id: dog.id,
        is_active: true,
        OR: [
          { expires_at: null },
          { expires_at: { gte: new Date() } }
        ]
      }
    });

    let partnerVerification;
    if (existingVerification) {
      // Update existing verification
      partnerVerification = await prisma.partnerDogVerification.update({
        where: { id: existingVerification.id },
        data: {
          last_accessed: new Date(),
          access_count: { increment: 1 },
          verification_method: 'api_call',
          verification_notes: verificationReason,
          updated_at: new Date()
        }
      });
    } else {
      // Create new PartnerDogVerification
      partnerVerification = await prisma.partnerDogVerification.create({
        data: {
          partner_id: partnerId,
          dog_id: dog.id,
          verification_type: verificationType,
          access_level: partner.dog_id_access_level || 'read_only',
          granted_by: partnerId, // For API access, partner grants to themselves
          verification_method: 'api_call',
          verification_notes: verificationReason,
          permissions: {
            medical_records: partner.dog_id_access_level === 'full' || partner.dog_id_access_level === 'medical',
            emergency_access: partner.emergency_access_enabled,
            appointment_booking: partner.partner_type === 'veterinarian',
          },
          access_count: 1
        }
      });
    }

    // Log the verification (existing Week 11 system)
    const verification = await prisma.dogIdVerification.create({
      data: {
        dog_id: dog.id,
        partner_id: partnerId,
        verification_type: verificationType,
        access_reason: verificationReason,
        health_data_accessed: {
          ...healthDataAccessed,
          partner_verification_id: partnerVerification.id
        },
        ip_address: clientIp,
        user_agent: userAgent,
        verified_by: partnerId,
        audit_metadata: {
          partner_name: partner.name,
          partner_type: partner.partner_type,
          access_level: partner.dog_id_access_level,
          dog_name: dog.name,
          dog_breed: dog.breed,
          verification_method: 'api_call'
        }
      }
    });

    // Update partner's verification count
    await prisma.partner.update({
      where: { id: partnerId },
      data: {
        total_verifications_count: { increment: 1 },
        last_dog_id_access: new Date(),
      }
    });

    // Log security audit
    await prisma.securityAuditLog.create({
      data: {
        partner_id: partnerId,
        action_type: 'dog_id_access',
        resource_accessed: `dog_id:${dogId}`,
        success: true,
        ip_address: clientIp,
        user_agent: userAgent,
        risk_score: verificationType === 'emergency' ? 10 : 5, // Higher risk for emergency access
      }
    });

    return NextResponse.json({
      success: true,
      verification_id: verification.id,
      dog: dogProfile,
      access_level: partner.dog_id_access_level,
      verification_timestamp: verification.verified_at,
      partner_info: {
        name: partner.name,
        type: partner.partner_type,
      }
    });

  } catch (error) {
    console.error('Dog ID verification error:', error);
    
    // Log failed attempt
    try {
      const authHeader = request.headers.get('authorization');
      if (authHeader) {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        
        await prisma.securityAuditLog.create({
          data: {
            partner_id: decoded.partnerId,
            action_type: 'dog_id_access',
            resource_accessed: 'dog_id_verification',
            success: false,
            failure_reason: error instanceof Error ? error.message : 'Unknown error',
            ip_address: request.headers.get('x-forwarded-for') || 'unknown',
            user_agent: request.headers.get('user-agent') || 'unknown',
            risk_score: 25, // Higher risk for failed attempts
            flagged_for_review: true,
          }
        });
      }
    } catch (auditError) {
      console.error('Failed to log audit:', auditError);
    }

    return NextResponse.json(
      { error: 'Internal server error during Dog ID verification' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// GET /api/partners/verify-dog-id?limit=20&offset=0 - Get partner's verified dogs
export async function GET(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    
    // Verify JWT token
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const partnerId = decoded.partnerId;
    if (!partnerId) {
      return NextResponse.json(
        { error: 'Partner ID not found in token' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const includeExpired = searchParams.get('includeExpired') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const verificationType = searchParams.get('type');

    // Build where clause
    const whereClause: any = {
      partner_id: partnerId,
      is_active: true
    };

    if (!includeExpired) {
      whereClause.OR = [
        { expires_at: null },
        { expires_at: { gte: new Date() } }
      ];
    }

    if (verificationType) {
      whereClause.verification_type = verificationType;
    }

    // Get verified dogs with pagination
    const [verifications, total] = await Promise.all([
      prisma.partnerDogVerification.findMany({
        where: whereClause,
        include: {
          dog: {
            select: {
              id: true,
              name: true,
              breed: true,
              health_id: true,
              photo_url: true,
              age_months: true,
              weight_kg: true,
              gender: true,
              vaccination_status: true,
              emergency_contact: true,
              emergency_phone: true,
              User: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                  location: true
                }
              },
              // Include recent medical records for quick access
              MedicalRecords: {
                where: {
                  record_type: { in: ['vaccination', 'allergy', 'chronic_condition', 'emergency_contact'] }
                },
                orderBy: { record_date: 'desc' },
                take: 3,
                select: {
                  id: true,
                  record_type: true,
                  title: true,
                  record_date: true,
                  next_due_date: true
                }
              }
            }
          },
          granter: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { last_accessed: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.partnerDogVerification.count({
        where: whereClause
      })
    ]);

    // Get verification analytics
    const analytics = await prisma.partnerAnalytics.findFirst({
      where: {
        partner_id: partnerId,
        metric_type: 'dog_id_verifications',
        date: new Date().toISOString().split('T')[0]
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        verifications: verifications.map(v => ({
          ...v,
          dog: {
            ...v.dog,
            // Filter sensitive data based on access level
            emergency_contact: v.access_level === 'full' || v.access_level === 'medical' ? v.dog.emergency_contact : undefined,
            emergency_phone: v.access_level === 'full' || v.access_level === 'medical' ? v.dog.emergency_phone : undefined,
            User: {
              ...v.dog.User,
              email: v.access_level === 'full' ? v.dog.User.email : undefined,
              phone: v.access_level === 'full' ? v.dog.User.phone : undefined
            }
          }
        })),
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        },
        analytics: {
          totalVerificationsToday: analytics?.metric_value || 0,
          totalRevenue: analytics?.total_revenue || 0,
          avgResponseTime: analytics?.avg_response_time || null
        }
      }
    });

  } catch (error) {
    console.error('Get verified dogs error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch verified dogs' 
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}