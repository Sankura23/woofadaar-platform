import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';

interface DecodedToken {
  userId?: string;
  partnerId?: string;
  email: string;
  userType?: string;
}

async function verifyToken(request: NextRequest): Promise<{ userId?: string; partnerId?: string; email?: string } | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    return {
      userId: decoded.userId,
      partnerId: decoded.partnerId,
      email: decoded.email
    };
  } catch (error) {
    return null;
  }
}

// Helper function to validate Health ID format
function validateHealthId(healthId: string): boolean {
  // Health ID format: 3-4 letter prefix + 8 digit timestamp + 4 digit sequence
  const healthIdPattern = /^[A-Z]{3,4}\d{8}\d{4}$/;
  return healthIdPattern.test(healthId);
}

// Helper function to check partner access permissions
async function checkPartnerAccess(partnerId: string, healthId: string): Promise<{ hasAccess: boolean; reason?: string; dog?: any }> {
  // Get partner details
  const partner = await prisma.partner.findUnique({
    where: { id: partnerId },
    select: {
      id: true,
      name: true,
      partner_type: true,
      status: true,
      verified: true,
      health_id_access: true,
      partnership_tier: true
    }
  });

  if (!partner) {
    return { hasAccess: false, reason: 'Partner not found' };
  }

  if (partner.status !== 'approved' || !partner.verified) {
    return { hasAccess: false, reason: 'Partner not approved or verified' };
  }

  if (!partner.health_id_access) {
    return { hasAccess: false, reason: 'Partner does not have Health ID access permissions' };
  }

  // Find the dog with this Health ID
  const dog = await prisma.dog.findUnique({
    where: { health_id: healthId },
    include: {
      User: {
        select: {
          id: true,
          name: true,
          email: true,
          location: true
        }
      }
    }
  });

  if (!dog) {
    return { hasAccess: false, reason: 'Health ID not found' };
  }

  // Check if there's a recent appointment or explicit permission
  const recentAppointment = await prisma.appointment.findFirst({
    where: {
      partner_id: partnerId,
      dog_id: dog.id,
      appointment_date: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
      },
      status: { in: ['scheduled', 'confirmed', 'completed'] }
    }
  });

  if (recentAppointment) {
    return { hasAccess: true, dog };
  }

  // Check for existing Health ID verification permission
  const existingVerification = await prisma.healthIdVerification.findFirst({
    where: {
      partner_id: partnerId,
      dog_id: dog.id,
      verification_date: {
        gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // Last 90 days
      }
    }
  });

  if (existingVerification) {
    return { hasAccess: true, dog };
  }

  // For premium/enterprise partners, allow broader access
  if (partner.partnership_tier === 'premium' || partner.partnership_tier === 'enterprise') {
    return { hasAccess: true, dog };
  }

  return { hasAccess: false, reason: 'No recent appointment or verification history with this pet' };
}

// POST /api/health-id/partner-access - Verify and access Health ID information
export async function POST(request: NextRequest) {
  const auth = await verifyToken(request);
  
  if (!auth || !auth.partnerId) {
    return NextResponse.json({ 
      success: false,
      message: 'Unauthorized - Partner authentication required' 
    }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { health_id, access_purpose, notes } = body;

    // Validation
    if (!health_id) {
      return NextResponse.json({
        success: false,
        message: 'Health ID is required'
      }, { status: 400 });
    }

    if (!validateHealthId(health_id)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid Health ID format'
      }, { status: 400 });
    }

    if (!access_purpose) {
      return NextResponse.json({
        success: false,
        message: 'Access purpose is required'
      }, { status: 400 });
    }

    const validPurposes = ['consultation', 'treatment', 'training', 'emergency', 'follow_up', 'vaccination_record'];
    if (!validPurposes.includes(access_purpose)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid access purpose'
      }, { status: 400 });
    }

    // Check partner access permissions
    const accessCheck = await checkPartnerAccess(auth.partnerId, health_id);
    
    if (!accessCheck.hasAccess) {
      return NextResponse.json({
        success: false,
        message: accessCheck.reason || 'Access denied',
        access_denied: true
      }, { status: 403 });
    }

    const dog = accessCheck.dog;

    // Get comprehensive pet health information
    const [healthLogs, appointments, previousVerifications, kciVerification] = await Promise.all([
      prisma.healthLog.findMany({
        where: { dog_id: dog.id },
        orderBy: { log_date: 'desc' },
        take: 10
      }),
      prisma.appointment.findMany({
        where: { dog_id: dog.id },
        include: {
          partner: {
            select: {
              id: true,
              name: true,
              business_name: true,
              partner_type: true
            }
          }
        },
        orderBy: { appointment_date: 'desc' },
        take: 5
      }),
      prisma.healthIdVerification.findMany({
        where: { dog_id: dog.id },
        include: {
          partner: {
            select: {
              id: true,
              name: true,
              business_name: true,
              partner_type: true
            }
          }
        },
        orderBy: { verification_date: 'desc' },
        take: 5
      }),
      prisma.kCIVerification.findFirst({
        where: { dog_id: dog.id },
        orderBy: { created_at: 'desc' }
      })
    ]);

    // Create new Health ID verification record
    const verification = await prisma.healthIdVerification.create({
      data: {
        partner_id: auth.partnerId,
        dog_id: dog.id,
        purpose: access_purpose,
        notes: notes || null,
        verified_by: auth.email || auth.partnerId
      }
    });

    // Prepare comprehensive health profile
    const healthProfile = {
      pet_info: {
        id: dog.id,
        name: dog.name,
        breed: dog.breed,
        age_months: dog.age_months,
        age_display: `${Math.floor(dog.age_months / 12)} years ${dog.age_months % 12} months`,
        weight_kg: dog.weight_kg,
        gender: dog.gender,
        health_id: dog.health_id,
        vaccination_status: dog.vaccination_status,
        spayed_neutered: dog.spayed_neutered,
        microchip_id: dog.microchip_id,
        emergency_contact: dog.emergency_contact,
        emergency_phone: dog.emergency_phone,
        medical_notes: dog.medical_notes,
        personality_traits: dog.personality_traits,
        photo_url: dog.photo_url,
        created_at: dog.created_at
      },
      owner_info: {
        id: dog.User.id,
        name: dog.User.name,
        email: dog.User.email,
        location: dog.User.location
      },
      health_history: {
        recent_logs: healthLogs.map(log => ({
          id: log.id,
          log_date: log.log_date,
          food_amount: log.food_amount,
          water_intake: log.water_intake,
          exercise_minutes: log.exercise_minutes,
          bathroom_frequency: log.bathroom_frequency,
          mood: log.mood,
          notes: log.notes,
          created_at: log.created_at
        })),
        appointment_history: appointments.map(apt => ({
          id: apt.id,
          appointment_date: apt.appointment_date,
          service_type: apt.service_type,
          status: apt.status,
          consultation_fee: apt.consultation_fee,
          notes: apt.notes,
          partner: apt.partner
        })),
        verification_history: previousVerifications.map(ver => ({
          id: ver.id,
          verification_date: ver.verification_date,
          purpose: ver.purpose,
          notes: ver.notes,
          partner: ver.partner
        }))
      },
      kci_verification: kciVerification ? {
        registration_id: kciVerification.kci_registration_id,
        breed: kciVerification.breed,
        verification_status: kciVerification.verification_status,
        verified_at: kciVerification.verified_at
      } : null,
      access_info: {
        access_granted_at: new Date(),
        access_purpose: access_purpose,
        verification_id: verification.id,
        partner_notes: notes
      }
    };

    // Calculate health score (mock algorithm)
    const healthScore = calculateHealthScore(dog, healthLogs);

    // Generate health recommendations
    const recommendations = generateHealthRecommendations(dog, healthLogs, appointments);

    // Log the access for audit purposes
    await prisma.auditLog.create({
      data: {
        user_id: auth.partnerId,
        action: 'health_id_access',
        details: {
          health_id: health_id,
          dog_id: dog.id,
          dog_name: dog.name,
          access_purpose: access_purpose,
          partner_id: auth.partnerId,
          timestamp: new Date().toISOString()
        }
      }
    }).catch(err => {
      console.log('Audit log creation failed:', err);
    });

    return NextResponse.json({
      success: true,
      message: `Health ID ${health_id} accessed successfully`,
      data: {
        health_profile: healthProfile,
        health_score: healthScore,
        recommendations: recommendations,
        access_level: getAccessLevel(access_purpose),
        compliance_info: {
          data_protection: 'This information is accessed under veterinary confidentiality',
          retention_policy: '30 days access log retention',
          usage_restrictions: 'Medical and training purposes only'
        }
      }
    });

  } catch (error) {
    console.error('Health ID partner access error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error during Health ID access'
    }, { status: 500 });
  }
}

// GET /api/health-id/partner-access - Get partner's Health ID access history and permissions
export async function GET(request: NextRequest) {
  const auth = await verifyToken(request);
  
  if (!auth || !auth.partnerId) {
    return NextResponse.json({ 
      success: false,
      message: 'Unauthorized - Partner authentication required' 
    }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const health_id = searchParams.get('health_id');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Get partner information
    const partner = await prisma.partner.findUnique({
      where: { id: auth.partnerId },
      select: {
        id: true,
        name: true,
        business_name: true,
        partner_type: true,
        health_id_access: true,
        partnership_tier: true,
        status: true,
        verified: true
      }
    });

    if (!partner) {
      return NextResponse.json({
        success: false,
        message: 'Partner not found'
      }, { status: 404 });
    }

    if (!partner.health_id_access) {
      return NextResponse.json({
        success: false,
        message: 'Partner does not have Health ID access permissions'
      }, { status: 403 });
    }

    let whereClause: any = { partner_id: auth.partnerId };

    // If specific Health ID requested, find the dog and filter
    if (health_id) {
      const dog = await prisma.dog.findUnique({
        where: { health_id: health_id },
        select: { id: true }
      });

      if (!dog) {
        return NextResponse.json({
          success: false,
          message: 'Health ID not found'
        }, { status: 404 });
      }

      whereClause.dog_id = dog.id;
    }

    // Get verification history
    const [verifications, totalCount] = await Promise.all([
      prisma.healthIdVerification.findMany({
        where: whereClause,
        include: {
          dog: {
            select: {
              id: true,
              name: true,
              breed: true,
              health_id: true,
              User: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        },
        orderBy: { verification_date: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.healthIdVerification.count({ where: whereClause })
    ]);

    // Get recent access statistics
    const stats = await getPartnerAccessStats(auth.partnerId);

    // Get partner's access permissions summary
    const accessPermissions = {
      has_health_id_access: partner.health_id_access,
      partnership_tier: partner.partnership_tier,
      access_level: partner.partnership_tier === 'enterprise' ? 'full' :
                   partner.partnership_tier === 'premium' ? 'enhanced' : 'standard',
      permissions: getPartnerPermissions(partner.partnership_tier),
      restrictions: getAccessRestrictions(partner.partnership_tier)
    };

    return NextResponse.json({
      success: true,
      data: {
        partner_info: {
          id: partner.id,
          name: partner.name,
          business_name: partner.business_name,
          partner_type: partner.partner_type
        },
        access_permissions: accessPermissions,
        verification_history: verifications.map(ver => ({
          id: ver.id,
          verification_date: ver.verification_date,
          purpose: ver.purpose,
          notes: ver.notes,
          pet: {
            id: ver.dog.id,
            name: ver.dog.name,
            breed: ver.dog.breed,
            health_id: ver.dog.health_id,
            owner: ver.dog.User
          }
        })),
        statistics: stats,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        }
      }
    });

  } catch (error) {
    console.error('Health ID access history error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error while fetching access history'
    }, { status: 500 });
  }
}

// Helper functions
function calculateHealthScore(dog: any, healthLogs: any[]): { score: number; factors: any } {
  let score = 70; // Base score
  const factors = [];

  // Age factor
  if (dog.age_months < 12) {
    score += 10; // Young dogs generally healthier
    factors.push({ factor: 'Age', impact: '+10', reason: 'Young pet' });
  } else if (dog.age_months > 96) {
    score -= 5; // Senior dogs may need more care
    factors.push({ factor: 'Age', impact: '-5', reason: 'Senior pet' });
  }

  // Vaccination status
  if (dog.vaccination_status === 'up_to_date') {
    score += 15;
    factors.push({ factor: 'Vaccination', impact: '+15', reason: 'Up to date' });
  } else {
    score -= 10;
    factors.push({ factor: 'Vaccination', impact: '-10', reason: 'Not up to date' });
  }

  // Spay/neuter status
  if (dog.spayed_neutered) {
    score += 5;
    factors.push({ factor: 'Sterilization', impact: '+5', reason: 'Spayed/neutered' });
  }

  // Recent health logs activity
  const recentLogs = healthLogs.filter(log => 
    new Date(log.log_date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  );

  if (recentLogs.length > 0) {
    score += 10;
    factors.push({ factor: 'Monitoring', impact: '+10', reason: 'Active health tracking' });
  }

  // Mood analysis from recent logs
  const goodMoods = recentLogs.filter(log => 
    log.mood && ['happy', 'playful', 'energetic'].includes(log.mood.toLowerCase())
  ).length;

  if (goodMoods > recentLogs.length * 0.7) {
    score += 5;
    factors.push({ factor: 'Mood', impact: '+5', reason: 'Positive mood indicators' });
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    factors: factors
  };
}

function generateHealthRecommendations(dog: any, healthLogs: any[], appointments: any[]): string[] {
  const recommendations = [];

  // Age-based recommendations
  if (dog.age_months < 12) {
    recommendations.push('🐶 Puppy Care: Ensure proper vaccination schedule and socialization');
  } else if (dog.age_months > 84) {
    recommendations.push('👴 Senior Care: Consider more frequent health check-ups and joint care');
  }

  // Vaccination status
  if (dog.vaccination_status !== 'up_to_date') {
    recommendations.push('💉 Update vaccinations to ensure optimal health protection');
  }

  // Weight management
  if (dog.weight_kg > 40) {
    recommendations.push('⚖️ Weight Management: Monitor diet and ensure regular exercise');
  }

  // Activity tracking
  const recentLogs = healthLogs.filter(log => 
    new Date(log.log_date) > new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
  );

  if (recentLogs.length === 0) {
    recommendations.push('📊 Health Tracking: Encourage owner to maintain regular health logs');
  }

  // Recent appointments
  const recentAppointments = appointments.filter(apt => 
    new Date(apt.appointment_date) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  );

  if (recentAppointments.length === 0) {
    recommendations.push('🏥 Regular Check-ups: Schedule routine health examination');
  }

  // Breed-specific recommendations
  if (dog.breed.toLowerCase().includes('retriever')) {
    recommendations.push('🏊 Breed Care: Regular exercise and hip dysplasia monitoring recommended');
  } else if (dog.breed.toLowerCase().includes('german shepherd')) {
    recommendations.push('🐕 Breed Care: Monitor for hip/elbow dysplasia and bloat prevention');
  }

  return recommendations.slice(0, 5); // Limit to top 5 recommendations
}

function getAccessLevel(purpose: string): string {
  const levels = {
    'consultation': 'Standard',
    'treatment': 'Enhanced',
    'emergency': 'Full',
    'training': 'Standard',
    'follow_up': 'Standard',
    'vaccination_record': 'Enhanced'
  };
  
  return levels[purpose as keyof typeof levels] || 'Standard';
}

function getPartnerPermissions(tier: string): string[] {
  const permissions = {
    basic: [
      'View basic pet information',
      'Access vaccination records',
      'View recent health logs',
      'Create Health ID verifications'
    ],
    premium: [
      'All Basic permissions',
      'Access full medical history',
      'View all appointment records',
      'Export health reports',
      'Advanced health analytics'
    ],
    enterprise: [
      'All Premium permissions',
      'Bulk Health ID access',
      'Custom health reporting',
      'API access for integrations',
      'Advanced compliance features'
    ]
  };
  
  return permissions[tier as keyof typeof permissions] || permissions.basic;
}

function getAccessRestrictions(tier: string): string[] {
  const restrictions = {
    basic: [
      'Access limited to pets with recent appointments',
      'Cannot access sensitive medical details',
      'Limited to 10 Health ID accesses per day'
    ],
    premium: [
      'Broader access permissions',
      'Limited to 50 Health ID accesses per day',
      'Cannot access restricted medical notes'
    ],
    enterprise: [
      'Minimal restrictions',
      'Unlimited Health ID access',
      'Full compliance and audit features'
    ]
  };
  
  return restrictions[tier as keyof typeof restrictions] || restrictions.basic;
}

async function getPartnerAccessStats(partnerId: string) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  const [totalAccess, monthlyAccess, uniquePets, purposes] = await Promise.all([
    prisma.healthIdVerification.count({
      where: { partner_id: partnerId }
    }),
    prisma.healthIdVerification.count({
      where: {
        partner_id: partnerId,
        verification_date: { gte: thirtyDaysAgo }
      }
    }),
    prisma.healthIdVerification.findMany({
      where: {
        partner_id: partnerId,
        verification_date: { gte: thirtyDaysAgo }
      },
      select: { dog_id: true },
      distinct: ['dog_id']
    }),
    prisma.healthIdVerification.groupBy({
      by: ['purpose'],
      where: {
        partner_id: partnerId,
        verification_date: { gte: thirtyDaysAgo }
      },
      _count: { id: true }
    })
  ]);

  return {
    total_access_count: totalAccess,
    monthly_access_count: monthlyAccess,
    unique_pets_accessed: uniquePets.length,
    access_by_purpose: purposes.reduce((acc, item) => {
      acc[item.purpose || 'other'] = item._count.id;
      return acc;
    }, {} as any),
    average_daily_access: Math.round(monthlyAccess / 30)
  };
}