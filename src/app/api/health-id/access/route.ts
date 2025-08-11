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

// Helper function to generate secure share token
function generateShareToken(dogId: string, shareType: string): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  const dogCode = dogId.substring(0, 6);
  return `${shareType.toUpperCase()}-${dogCode}-${randomStr}-${timestamp}`.toUpperCase();
}

// Helper function to validate share access
async function validateShareAccess(shareToken: string, requesterType: 'partner' | 'user' | 'public' = 'public') {
  const dogShare = await prisma.dogShare.findUnique({
    where: { share_token: shareToken },
    include: {
      Dog: {
        include: {
          User: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      }
    }
  });

  if (!dogShare) {
    return { valid: false, message: 'Invalid share token' };
  }

  // Check if expired
  if (dogShare.expires_at && dogShare.expires_at < new Date()) {
    return { valid: false, message: 'Share token has expired' };
  }

  // Check access permissions
  if (dogShare.share_type === 'private' && requesterType === 'public') {
    return { valid: false, message: 'Private share requires authentication' };
  }

  if (dogShare.share_type === 'partner' && requesterType !== 'partner') {
    return { valid: false, message: 'Partner-only share requires partner authentication' };
  }

  return { valid: true, dogShare };
}

// POST /api/health-id/access - Create or manage Health ID access shares
export async function POST(request: NextRequest) {
  const auth = await verifyToken(request);
  
  if (!auth || !auth.userId) {
    return NextResponse.json({ 
      success: false,
      message: 'Unauthorized - User authentication required' 
    }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      dog_id,
      action = 'create_share',
      share_type = 'public', // 'public', 'private', 'partner'
      expires_in_hours,
      partner_specific_access,
      access_permissions = {}
    } = body;

    if (!dog_id) {
      return NextResponse.json({
        success: false,
        message: 'dog_id is required'
      }, { status: 400 });
    }

    // Verify dog ownership
    const dog = await prisma.dog.findUnique({
      where: { id: dog_id },
      select: {
        id: true,
        name: true,
        breed: true,
        health_id: true,
        user_id: true,
        User: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!dog) {
      return NextResponse.json({
        success: false,
        message: 'Dog not found'
      }, { status: 404 });
    }

    if (dog.user_id !== auth.userId) {
      return NextResponse.json({
        success: false,
        message: 'You can only manage access for your own pets'
      }, { status: 403 });
    }

    switch (action) {
      case 'create_share':
        const validShareTypes = ['public', 'private', 'partner'];
        if (!validShareTypes.includes(share_type)) {
          return NextResponse.json({
            success: false,
            message: 'Invalid share_type. Must be: public, private, or partner'
          }, { status: 400 });
        }

        // Calculate expiration date
        let expiresAt = null;
        if (expires_in_hours) {
          expiresAt = new Date(Date.now() + expires_in_hours * 60 * 60 * 1000);
        } else {
          // Default expiration times
          const defaultHours = {
            public: 72,    // 3 days
            private: 168,  // 7 days
            partner: 720   // 30 days
          };
          expiresAt = new Date(Date.now() + defaultHours[share_type as keyof typeof defaultHours] * 60 * 60 * 1000);
        }

        // Generate share token
        const shareToken = generateShareToken(dog_id, share_type);

        // Create share record
        const dogShare = await prisma.dogShare.create({
          data: {
            dog_id,
            share_token: shareToken,
            share_type,
            expires_at: expiresAt,
            created_by: auth.userId,
            created_at: new Date()
          }
        });

        // Generate share URL
        const baseUrl = process.env.FRONTEND_URL || 'https://woofadaar.com';
        const shareUrl = `${baseUrl}/health-id/shared/${shareToken}`;

        return NextResponse.json({
          success: true,
          message: 'Health ID share created successfully',
          data: {
            share: {
              id: dogShare.id,
              share_token: shareToken,
              share_url: shareUrl,
              share_type: share_type,
              expires_at: expiresAt,
              dog: {
                id: dog.id,
                name: dog.name,
                breed: dog.breed,
                health_id: dog.health_id
              }
            },
            usage_instructions: {
              public: share_type === 'public' ? 'Anyone with this link can view basic health information' : null,
              private: share_type === 'private' ? 'Only authenticated users can view this information' : null,
              partner: share_type === 'partner' ? 'Only verified partners can access this health information' : null,
              expiration: `Link expires on ${expiresAt?.toLocaleDateString()} at ${expiresAt?.toLocaleTimeString()}`
            }
          }
        });

      case 'revoke_share':
        const { share_token } = body;
        if (!share_token) {
          return NextResponse.json({
            success: false,
            message: 'share_token is required for revoke action'
          }, { status: 400 });
        }

        // Find and verify ownership of the share
        const existingShare = await prisma.dogShare.findUnique({
          where: { share_token },
          include: {
            Dog: {
              select: { user_id: true }
            }
          }
        });

        if (!existingShare) {
          return NextResponse.json({
            success: false,
            message: 'Share token not found'
          }, { status: 404 });
        }

        if (existingShare.Dog.user_id !== auth.userId) {
          return NextResponse.json({
            success: false,
            message: 'You can only revoke your own shares'
          }, { status: 403 });
        }

        // Delete the share
        await prisma.dogShare.delete({
          where: { share_token }
        });

        return NextResponse.json({
          success: true,
          message: 'Health ID share revoked successfully',
          data: {
            revoked_share_token: share_token,
            revoked_at: new Date().toISOString()
          }
        });

      case 'list_shares':
        // Get all shares for this dog
        const dogShares = await prisma.dogShare.findMany({
          where: { dog_id },
          orderBy: { created_at: 'desc' }
        });

        return NextResponse.json({
          success: true,
          data: {
            dog: {
              id: dog.id,
              name: dog.name,
              health_id: dog.health_id
            },
            shares: dogShares.map(share => ({
              id: share.id,
              share_token: share.share_token,
              share_type: share.share_type,
              created_at: share.created_at,
              expires_at: share.expires_at,
              is_expired: share.expires_at ? share.expires_at < new Date() : false,
              share_url: `${process.env.FRONTEND_URL || 'https://woofadaar.com'}/health-id/shared/${share.share_token}`
            })),
            total_shares: dogShares.length,
            active_shares: dogShares.filter(share => !share.expires_at || share.expires_at > new Date()).length
          }
        });

      default:
        return NextResponse.json({
          success: false,
          message: 'Invalid action. Supported actions: create_share, revoke_share, list_shares'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Health ID access management error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error during access management'
    }, { status: 500 });
  }
}

// GET /api/health-id/access - Access shared Health ID information
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const share_token = searchParams.get('share_token');
    const action = searchParams.get('action') || 'view';
    
    if (!share_token) {
      return NextResponse.json({
        success: false,
        message: 'share_token parameter is required'
      }, { status: 400 });
    }

    // Determine requester type
    const auth = await verifyToken(request);
    let requesterType: 'partner' | 'user' | 'public' = 'public';
    
    if (auth?.partnerId) {
      requesterType = 'partner';
    } else if (auth?.userId) {
      requesterType = 'user';
    }

    // Validate share access
    const shareValidation = await validateShareAccess(share_token, requesterType);
    
    if (!shareValidation.valid) {
      return NextResponse.json({
        success: false,
        message: shareValidation.message
      }, { status: shareValidation.message.includes('expired') ? 410 : 
                  shareValidation.message.includes('authentication') ? 401 : 403 });
    }

    const dogShare = shareValidation.dogShare!;
    const dog = dogShare.Dog;

    // Get health information based on share type and requester permissions
    let healthData: any = {
      basic_info: {
        id: dog.id,
        name: dog.name,
        breed: dog.breed,
        age_months: dog.age_months,
        gender: dog.gender,
        health_id: dog.health_id
      },
      owner: {
        name: dog.User.name,
        // Email only for private/partner shares
        email: dogShare.share_type !== 'public' ? dog.User.email : null
      },
      share_info: {
        share_type: dogShare.share_type,
        shared_at: dogShare.created_at,
        expires_at: dogShare.expires_at,
        accessed_by: requesterType
      }
    };

    // Add detailed information based on share type and requester permissions
    if (dogShare.share_type === 'partner' && requesterType === 'partner') {
      // Full health information for partners
      const recentHealthLogs = await prisma.healthLog.findMany({
        where: {
          dog_id: dog.id,
          created_at: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        },
        orderBy: { log_date: 'desc' },
        take: 10
      });

      const verificationHistory = await prisma.healthIdVerification.findMany({
        where: { dog_id: dog.id },
        include: {
          partner: {
            select: {
              name: true,
              business_name: true,
              partner_type: true
            }
          }
        },
        orderBy: { verification_date: 'desc' },
        take: 10
      });

      healthData.detailed_info = {
        weight_kg: dog.weight_kg,
        vaccination_status: dog.vaccination_status,
        spayed_neutered: dog.spayed_neutered,
        microchip_id: dog.microchip_id,
        emergency_contact: dog.emergency_contact,
        emergency_phone: dog.emergency_phone,
        medical_notes: dog.medical_notes,
        personality_traits: dog.personality_traits
      };

      healthData.recent_health_logs = recentHealthLogs;
      healthData.verification_history = verificationHistory.map(ver => ({
        verification_date: ver.verification_date,
        partner_name: ver.partner.name || ver.partner.business_name,
        partner_type: ver.partner.partner_type,
        purpose: ver.purpose
      }));

    } else if (dogShare.share_type === 'private' && requesterType !== 'public') {
      // Limited information for private shares
      healthData.basic_health = {
        vaccination_status: dog.vaccination_status,
        spayed_neutered: dog.spayed_neutered,
        has_microchip: !!dog.microchip_id,
        has_emergency_contact: !!(dog.emergency_contact && dog.emergency_phone)
      };

    } else if (dogShare.share_type === 'public') {
      // Very basic information for public shares
      healthData.public_info = {
        vaccination_current: dog.vaccination_status === 'up_to_date',
        microchipped: !!dog.microchip_id,
        last_updated: dog.updated_at
      };
    }

    // Log access for audit purposes
    console.log('Health ID shared access:', {
      share_token,
      dog_id: dog.id,
      dog_name: dog.name,
      requester_type: requesterType,
      requester_id: auth?.userId || auth?.partnerId || 'anonymous',
      access_time: new Date().toISOString(),
      share_type: dogShare.share_type
    });

    return NextResponse.json({
      success: true,
      data: healthData,
      access_info: {
        share_token,
        access_level: dogShare.share_type,
        requester_type: requesterType,
        accessed_at: new Date().toISOString(),
        expires_at: dogShare.expires_at
      },
      disclaimer: 'This information is shared by the pet owner. Always verify critical health information with a veterinarian.'
    });

  } catch (error) {
    console.error('Shared Health ID access error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error while accessing shared Health ID'
    }, { status: 500 });
  }
}