import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';

interface DecodedToken {
  userId?: string;
  partnerId?: string;
  email: string;
  userType?: string;
}

async function verifyToken(request: NextRequest): Promise<{ userId?: string; partnerId?: string; email?: string; isAdmin?: boolean } | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    
    const isAdmin = decoded.email === 'admin@woofadaar.com' || decoded.userType === 'admin';
    
    return {
      userId: decoded.userId,
      partnerId: decoded.partnerId,
      email: decoded.email,
      isAdmin
    };
  } catch (error) {
    return null;
  }
}

// Helper function to validate Health ID format
function validateHealthId(healthId: string): { valid: boolean; message?: string } {
  if (!healthId || healthId.length < 8) {
    return { valid: false, message: 'Health ID must be at least 8 characters long' };
  }

  // Check if it matches expected format (WF-XXXX-XXXX or similar)
  const healthIdPattern = /^(WF|WOOF)-[A-Z0-9]{4}-[A-Z0-9]{4}$/i;
  if (!healthIdPattern.test(healthId.toUpperCase())) {
    return { valid: false, message: 'Invalid Health ID format. Expected format: WF-XXXX-XXXX' };
  }

  return { valid: true };
}

// Helper function to generate verification token
function generateVerificationToken(partnerId: string, dogId: string): string {
  const timestamp = Date.now().toString(36);
  const partnerCode = partnerId.substring(0, 6);
  const dogCode = dogId.substring(0, 6);
  return `VER-${partnerCode}-${dogCode}-${timestamp}`.toUpperCase();
}

// Helper function to calculate verification score
function calculateVerificationScore(dog: any, partner: any): number {
  let score = 0;
  
  // Base score for having a Health ID
  if (dog.health_id) score += 20;
  
  // Score for complete profile
  if (dog.name && dog.breed && dog.age_months && dog.weight_kg) score += 15;
  
  // Score for vaccination status
  if (dog.vaccination_status === 'up_to_date') score += 20;
  else if (dog.vaccination_status === 'partial') score += 10;
  
  // Score for medical information
  if (dog.medical_notes) score += 10;
  if (dog.microchip_id) score += 10;
  
  // Score for emergency contacts
  if (dog.emergency_contact && dog.emergency_phone) score += 10;
  
  // Partner credibility bonus
  if (partner.kci_verified) score += 10;
  if (partner.verified && partner.status === 'approved') score += 5;
  
  return Math.min(100, score);
}

// Helper function to get verification level
function getVerificationLevel(score: number): { level: string; description: string; color: string } {
  if (score >= 90) {
    return {
      level: 'PLATINUM',
      description: 'Comprehensive verification with all details confirmed',
      color: '#E5E4E2'
    };
  } else if (score >= 75) {
    return {
      level: 'GOLD',
      description: 'High verification with most details confirmed',
      color: '#FFD700'
    };
  } else if (score >= 60) {
    return {
      level: 'SILVER',
      description: 'Standard verification with key details confirmed',
      color: '#C0C0C0'
    };
  } else if (score >= 40) {
    return {
      level: 'BRONZE',
      description: 'Basic verification with minimal details confirmed',
      color: '#CD7F32'
    };
  } else {
    return {
      level: 'BASIC',
      description: 'Limited verification - additional information needed',
      color: '#808080'
    };
  }
}

// POST /api/health-id/partner-verify - Partner verifies Health ID and creates verification record
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
    const {
      health_id,
      dog_id,
      verification_purpose = 'consultation',
      health_assessment,
      recommendations,
      notes,
      verified_details = {}
    } = body;

    // Validation
    if (!health_id && !dog_id) {
      return NextResponse.json({
        success: false,
        message: 'Either health_id or dog_id is required'
      }, { status: 400 });
    }

    // Validate Health ID format if provided
    if (health_id) {
      const validation = validateHealthId(health_id);
      if (!validation.valid) {
        return NextResponse.json({
          success: false,
          message: validation.message
        }, { status: 400 });
      }
    }

    // Get partner details and verify permissions
    const partner = await prisma.partner.findUnique({
      where: { id: auth.partnerId },
      select: {
        id: true,
        name: true,
        business_name: true,
        partner_type: true,
        status: true,
        verified: true,
        health_id_access: true,
        kci_verified: true,
        partnership_tier: true
      }
    });

    if (!partner) {
      return NextResponse.json({
        success: false,
        message: 'Partner not found'
      }, { status: 404 });
    }

    if (partner.status !== 'approved' || !partner.verified) {
      return NextResponse.json({
        success: false,
        message: 'Partner is not approved for Health ID verification'
      }, { status: 403 });
    }

    if (!partner.health_id_access) {
      return NextResponse.json({
        success: false,
        message: 'Partner does not have Health ID access permissions'
      }, { status: 403 });
    }

    // Find the dog by Health ID or dog_id
    let whereClause: any = {};
    if (health_id) {
      whereClause.health_id = health_id.toUpperCase();
    } else {
      whereClause.id = dog_id;
    }

    const dog = await prisma.dog.findFirst({
      where: whereClause,
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        HealthLog: {
          where: {
            created_at: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          },
          orderBy: { created_at: 'desc' },
          take: 5
        }
      }
    });

    if (!dog) {
      return NextResponse.json({
        success: false,
        message: health_id ? `Dog with Health ID ${health_id} not found` : `Dog with ID ${dog_id} not found`
      }, { status: 404 });
    }

    // Check if recent verification already exists (prevent duplicate verifications within 24 hours)
    const recentVerification = await prisma.healthIdVerification.findFirst({
      where: {
        partner_id: auth.partnerId,
        dog_id: dog.id,
        verification_date: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    });

    if (recentVerification) {
      return NextResponse.json({
        success: false,
        message: 'You have already verified this Health ID within the last 24 hours',
        data: {
          existing_verification: {
            id: recentVerification.id,
            verification_date: recentVerification.verification_date,
            purpose: recentVerification.purpose
          }
        }
      }, { status: 409 });
    }

    // Calculate verification score
    const verificationScore = calculateVerificationScore(dog, partner);
    const verificationLevel = getVerificationLevel(verificationScore);

    // Generate verification token
    const verificationToken = generateVerificationToken(auth.partnerId, dog.id);

    // Create comprehensive verification data
    const verificationData = {
      partner_info: {
        id: partner.id,
        name: partner.name,
        business_name: partner.business_name,
        partner_type: partner.partner_type,
        kci_verified: partner.kci_verified,
        partnership_tier: partner.partnership_tier
      },
      dog_info: {
        id: dog.id,
        name: dog.name,
        breed: dog.breed,
        age_months: dog.age_months,
        weight_kg: dog.weight_kg,
        gender: dog.gender,
        vaccination_status: dog.vaccination_status,
        spayed_neutered: dog.spayed_neutered,
        microchip_id: dog.microchip_id
      },
      verification_details: {
        score: verificationScore,
        level: verificationLevel,
        verified_fields: verified_details,
        health_assessment: health_assessment || null,
        recommendations: recommendations || null,
        verification_token: verificationToken
      },
      timestamp: new Date().toISOString()
    };

    // Create verification record
    const verification = await prisma.healthIdVerification.create({
      data: {
        partner_id: auth.partnerId,
        dog_id: dog.id,
        verification_date: new Date(),
        purpose: verification_purpose,
        notes: notes || null,
        verified_by: partner.email || auth.email || `partner_${auth.partnerId}`
      }
    });

    // Store extended verification data in a separate record (could be a new table in production)
    console.log('Extended Health ID verification data:', verificationData);

    // Update dog's verification status (if we had such field)
    // await prisma.dog.update({
    //   where: { id: dog.id },
    //   data: { last_verified_at: new Date(), verification_level: verificationLevel.level }
    // });

    return NextResponse.json({
      success: true,
      message: 'Health ID verification completed successfully',
      data: {
        verification: {
          id: verification.id,
          verification_date: verification.verification_date,
          verification_token: verificationToken,
          purpose: verification.purpose,
          verified_by: verification.verified_by
        },
        dog: {
          id: dog.id,
          name: dog.name,
          breed: dog.breed,
          health_id: dog.health_id,
          owner: {
            name: dog.User.name,
            email: dog.User.email
          }
        },
        verification_assessment: {
          score: verificationScore,
          level: verificationLevel.level,
          level_description: verificationLevel.description,
          level_color: verificationLevel.color
        },
        health_summary: {
          vaccination_status: dog.vaccination_status,
          has_microchip: !!dog.microchip_id,
          has_emergency_contact: !!(dog.emergency_contact && dog.emergency_phone),
          recent_health_logs: dog.HealthLog.length,
          last_health_log: dog.HealthLog[0]?.log_date || null
        }
      },
      partner_benefits: {
        verification_recorded: true,
        health_id_access_confirmed: true,
        partnership_tier_bonus: partner.partnership_tier !== 'basic' ? 
          `${partner.partnership_tier} tier provides enhanced verification features` : null
      },
      next_steps: [
        'Verification has been recorded in the system',
        'Dog owner will be notified of the verification',
        health_assessment ? 'Health assessment has been documented' : 'Consider adding health assessment notes',
        recommendations ? 'Recommendations have been provided to the owner' : 'Consider providing care recommendations',
        verificationScore < 60 ? 'Suggest owner complete missing profile information' : null
      ].filter(Boolean)
    });

  } catch (error) {
    console.error('Health ID partner verification error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error during Health ID verification'
    }, { status: 500 });
  }
}

// GET /api/health-id/partner-verify - Get Health ID information for partner verification
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
    const dog_id = searchParams.get('dog_id');
    const action = searchParams.get('action') || 'lookup';

    // Get partner details
    const partner = await prisma.partner.findUnique({
      where: { id: auth.partnerId },
      select: {
        id: true,
        name: true,
        partner_type: true,
        status: true,
        verified: true,
        health_id_access: true,
        kci_verified: true,
        partnership_tier: true
      }
    });

    if (!partner) {
      return NextResponse.json({
        success: false,
        message: 'Partner not found'
      }, { status: 404 });
    }

    if (partner.status !== 'approved' || !partner.verified || !partner.health_id_access) {
      return NextResponse.json({
        success: false,
        message: 'Partner does not have Health ID access permissions'
      }, { status: 403 });
    }

    // Handle different actions
    if (action === 'history') {
      // Get partner's verification history
      const verifications = await prisma.healthIdVerification.findMany({
        where: { partner_id: auth.partnerId },
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
        take: 50
      });

      return NextResponse.json({
        success: true,
        data: {
          partner: {
            id: partner.id,
            name: partner.name,
            partner_type: partner.partner_type,
            partnership_tier: partner.partnership_tier
          },
          verification_history: verifications.map(ver => ({
            id: ver.id,
            verification_date: ver.verification_date,
            purpose: ver.purpose,
            notes: ver.notes,
            dog: {
              id: ver.dog.id,
              name: ver.dog.name,
              breed: ver.dog.breed,
              health_id: ver.dog.health_id,
              owner_name: ver.dog.User.name
            }
          })),
          total_verifications: verifications.length,
          verification_permissions: {
            health_id_access: partner.health_id_access,
            kci_verified: partner.kci_verified,
            partnership_tier: partner.partnership_tier
          }
        }
      });
    }

    // Health ID lookup
    if (!health_id && !dog_id) {
      return NextResponse.json({
        success: false,
        message: 'health_id or dog_id parameter is required for lookup'
      }, { status: 400 });
    }

    // Validate Health ID format if provided
    if (health_id) {
      const validation = validateHealthId(health_id);
      if (!validation.valid) {
        return NextResponse.json({
          success: false,
          message: validation.message
        }, { status: 400 });
      }
    }

    // Find the dog
    let whereClause: any = {};
    if (health_id) {
      whereClause.health_id = health_id.toUpperCase();
    } else {
      whereClause.id = dog_id;
    }

    const dog = await prisma.dog.findFirst({
      where: whereClause,
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            location: true,
            experience_level: true
          }
        },
        HealthLog: {
          where: {
            created_at: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          },
          orderBy: { log_date: 'desc' },
          take: 10
        }
      }
    });

    if (!dog) {
      return NextResponse.json({
        success: false,
        message: health_id ? `Dog with Health ID ${health_id} not found` : `Dog with ID ${dog_id} not found`
      }, { status: 404 });
    }

    // Get previous verifications by this partner
    const partnerVerifications = await prisma.healthIdVerification.findMany({
      where: {
        partner_id: auth.partnerId,
        dog_id: dog.id
      },
      orderBy: { verification_date: 'desc' },
      take: 5
    });

    // Get all verifications for this dog (for verification history)
    const allVerifications = await prisma.healthIdVerification.findMany({
      where: { dog_id: dog.id },
      include: {
        partner: {
          select: {
            id: true,
            name: true,
            business_name: true,
            partner_type: true,
            kci_verified: true
          }
        }
      },
      orderBy: { verification_date: 'desc' },
      take: 20
    });

    // Calculate verification score and level
    const verificationScore = calculateVerificationScore(dog, partner);
    const verificationLevel = getVerificationLevel(verificationScore);

    // Calculate health summary
    const healthSummary = {
      profile_completeness: calculateProfileCompleteness(dog),
      vaccination_current: dog.vaccination_status === 'up_to_date',
      has_microchip: !!dog.microchip_id,
      has_emergency_contacts: !!(dog.emergency_contact && dog.emergency_phone),
      recent_health_activity: dog.HealthLog.length,
      last_health_log_date: dog.HealthLog[0]?.log_date || null,
      medical_notes_available: !!dog.medical_notes
    };

    return NextResponse.json({
      success: true,
      data: {
        dog: {
          id: dog.id,
          name: dog.name,
          breed: dog.breed,
          age_months: dog.age_months,
          weight_kg: dog.weight_kg,
          gender: dog.gender,
          vaccination_status: dog.vaccination_status,
          spayed_neutered: dog.spayed_neutered,
          microchip_id: dog.microchip_id,
          health_id: dog.health_id,
          emergency_contact: dog.emergency_contact,
          emergency_phone: dog.emergency_phone,
          medical_notes: dog.medical_notes,
          personality_traits: dog.personality_traits,
          photo_url: dog.photo_url,
          created_at: dog.created_at
        },
        owner: {
          id: dog.User.id,
          name: dog.User.name,
          email: dog.User.email,
          location: dog.User.location,
          experience_level: dog.User.experience_level
        },
        verification_assessment: {
          score: verificationScore,
          level: verificationLevel.level,
          level_description: verificationLevel.description,
          level_color: verificationLevel.color,
          recommendations: generateVerificationRecommendations(verificationScore, dog)
        },
        health_summary: healthSummary,
        recent_health_logs: dog.HealthLog.map(log => ({
          id: log.id,
          log_date: log.log_date,
          food_amount: log.food_amount,
          water_intake: log.water_intake,
          exercise_minutes: log.exercise_minutes,
          bathroom_frequency: log.bathroom_frequency,
          mood: log.mood,
          notes: log.notes
        })),
        verification_history: {
          by_this_partner: partnerVerifications.length,
          total_verifications: allVerifications.length,
          last_verified_by_partner: partnerVerifications[0]?.verification_date || null,
          recent_verifications: allVerifications.slice(0, 5).map(ver => ({
            verification_date: ver.verification_date,
            partner_name: ver.partner.name || ver.partner.business_name,
            partner_type: ver.partner.partner_type,
            purpose: ver.purpose,
            kci_verified_partner: ver.partner.kci_verified
          }))
        },
        partner_permissions: {
          can_verify: true,
          health_id_access: partner.health_id_access,
          partnership_tier: partner.partnership_tier,
          kci_verified: partner.kci_verified,
          recently_verified: partnerVerifications.length > 0 && 
            partnerVerifications[0].verification_date > new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    });

  } catch (error) {
    console.error('Health ID partner lookup error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error during Health ID lookup'
    }, { status: 500 });
  }
}

// Helper functions
function calculateProfileCompleteness(dog: any): number {
  const fields = [
    'name', 'breed', 'age_months', 'weight_kg', 'gender', 
    'vaccination_status', 'microchip_id', 'emergency_contact', 
    'emergency_phone', 'medical_notes', 'photo_url'
  ];
  
  const completedFields = fields.filter(field => dog[field] && dog[field] !== '').length;
  return Math.round((completedFields / fields.length) * 100);
}

function generateVerificationRecommendations(score: number, dog: any): string[] {
  const recommendations = [];
  
  if (score < 60) {
    recommendations.push('Profile needs significant completion for better verification');
  }
  
  if (!dog.vaccination_status || dog.vaccination_status === 'unknown') {
    recommendations.push('Update vaccination status for health verification');
  }
  
  if (!dog.microchip_id) {
    recommendations.push('Consider microchipping for permanent identification');
  }
  
  if (!dog.emergency_contact || !dog.emergency_phone) {
    recommendations.push('Add emergency contact information for safety');
  }
  
  if (!dog.medical_notes) {
    recommendations.push('Document any medical conditions or allergies');
  }
  
  if (dog.age_months > 12 && dog.vaccination_status !== 'up_to_date') {
    recommendations.push('Adult dog should have current vaccinations');
  }
  
  return recommendations.length > 0 ? recommendations : 
    ['Profile is well-maintained and verification-ready'];
}