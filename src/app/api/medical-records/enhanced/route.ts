import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// POST /api/medical-records/enhanced - Create enhanced medical record with sharing
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
    let decoded: any;
    
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const {
      dogId,
      partnerId,
      recordType,
      title,
      description,
      recordData,
      isEmergencyAccessible = false,
      emergencyPriority = 0,
      sharedWithPartners = [],
      sharingPermissions = {},
      consentObtained = false,
      attachments = [],
      tags = []
    } = await request.json();

    // Validate required fields
    if (!dogId || !recordType || !title || !recordData) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: dogId, recordType, title, recordData'
      }, { status: 400 });
    }

    const userId = decoded.userId;
    const createdByPartner = !!decoded.partnerId;
    const actualPartnerId = partnerId || decoded.partnerId;

    // Verify dog exists and user has access
    const dog = await prisma.dog.findFirst({
      where: {
        OR: [
          { id: dogId },
          { health_id: dogId }
        ],
        ...(createdByPartner ? {} : { user_id: userId })
      },
      select: {
        id: true,
        name: true,
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
        error: 'Dog not found or access denied'
      }, { status: 404 });
    }

    // If created by partner, verify they have access
    if (createdByPartner && actualPartnerId) {
      const verification = await prisma.partnerDogVerification.findFirst({
        where: {
          partner_id: actualPartnerId,
          dog_id: dog.id,
          is_active: true,
          access_level: { in: ['read_write', 'full_access', 'emergency_override'] }
        }
      });

      if (!verification) {
        return NextResponse.json({
          success: false,
          error: 'Partner does not have write access to this dog'
        }, { status: 403 });
      }
    }

    // Create enhanced medical record
    const medicalRecord = await prisma.medicalRecordEnhanced.create({
      data: {
        dog_id: dog.id,
        partner_id: actualPartnerId,
        user_id: createdByPartner ? dog.user_id : userId,
        record_type: recordType,
        title,
        description,
        record_data: recordData,
        is_emergency_accessible: isEmergencyAccessible,
        emergency_priority: emergencyPriority,
        shared_with_partners: sharedWithPartners,
        sharing_permissions: sharingPermissions,
        consent_obtained: consentObtained,
        created_by_partner: createdByPartner,
        attachments,
        tags
      },
      include: {
        dog: {
          select: {
            id: true,
            name: true,
            breed: true,
            health_id: true
          }
        },
        partner: {
          select: {
            id: true,
            name: true,
            partner_type: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Create sharing records for specified partners
    if (sharedWithPartners.length > 0) {
      const sharingPromises = sharedWithPartners.map(async (partnerIdToShare: string) => {
        return prisma.medicalRecordShare.create({
          data: {
            dog_id: dog.id,
            shared_by_user_id: dog.user_id,
            shared_with_partner_id: partnerIdToShare,
            share_type: 'specific_records',
            access_level: sharingPermissions.access_level || 'read_only',
            record_ids: [medicalRecord.id],
            permissions: sharingPermissions,
            consent_given: consentObtained,
            consent_timestamp: consentObtained ? new Date() : null,
            consent_ip_address: request.headers.get('x-forwarded-for') || 'unknown'
          }
        });
      });

      await Promise.all(sharingPromises);
    }

    // Log the medical record creation
    await prisma.sharingAnalytics.create({
      data: {
        dog_id: dog.id,
        partner_id: actualPartnerId,
        metric_type: 'medical_record_created',
        date: new Date().toISOString().split('T')[0],
        metadata: {
          record_type: recordType,
          shared_count: sharedWithPartners.length,
          emergency_accessible: isEmergencyAccessible,
          created_by: createdByPartner ? 'partner' : 'user'
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Enhanced medical record created successfully',
      data: {
        record: medicalRecord,
        sharingInfo: {
          sharedWith: sharedWithPartners.length,
          emergencyAccessible: isEmergencyAccessible,
          consentObtained: consentObtained
        }
      }
    });

  } catch (error) {
    console.error('Enhanced medical record creation error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create enhanced medical record',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// GET /api/medical-records/enhanced - Get enhanced medical records with sharing info
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dogId = searchParams.get('dogId');
    const partnerId = searchParams.get('partnerId');
    const recordType = searchParams.get('recordType');
    const emergencyOnly = searchParams.get('emergencyOnly') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get authorization
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    let decoded: any;
    
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Build where clause based on access type
    let whereClause: any = {};

    if (dogId) {
      const dog = await prisma.dog.findFirst({
        where: {
          OR: [
            { id: dogId },
            { health_id: dogId }
          ]
        },
        select: { id: true, user_id: true }
      });

      if (!dog) {
        return NextResponse.json({
          success: false,
          error: 'Dog not found'
        }, { status: 404 });
      }

      whereClause.dog_id = dog.id;

      // If partner is requesting, check their access
      if (decoded.partnerId) {
        const verification = await prisma.partnerDogVerification.findFirst({
          where: {
            partner_id: decoded.partnerId,
            dog_id: dog.id,
            is_active: true
          }
        });

        if (!verification) {
          return NextResponse.json({
            success: false,
            error: 'Partner does not have access to this dog'
          }, { status: 403 });
        }

        // Filter based on sharing permissions
        whereClause.OR = [
          { created_by_partner: true, partner_id: decoded.partnerId },
          { shared_with_partners: { array_contains: decoded.partnerId } },
          { is_emergency_accessible: true, emergency_priority: { gte: 1 } }
        ];
      } else {
        // User requesting their own dog's records
        if (dog.user_id !== decoded.userId) {
          return NextResponse.json({
            success: false,
            error: 'Access denied'
          }, { status: 403 });
        }
      }
    }

    if (partnerId && !decoded.partnerId) {
      whereClause.partner_id = partnerId;
    }

    if (recordType) {
      whereClause.record_type = recordType;
    }

    if (emergencyOnly) {
      whereClause.is_emergency_accessible = true;
      whereClause.emergency_priority = { gte: 1 };
    }

    // Get medical records
    const [records, total] = await Promise.all([
      prisma.medicalRecordEnhanced.findMany({
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
          },
          partner: {
            select: {
              id: true,
              name: true,
              partner_type: true
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.medicalRecordEnhanced.count({
        where: whereClause
      })
    ]);

    // Get sharing statistics for each record
    const recordsWithSharing = await Promise.all(
      records.map(async (record) => {
        const shareCount = await prisma.medicalRecordShare.count({
          where: {
            record_ids: { array_contains: record.id },
            is_active: true
          }
        });

        const accessCount = await prisma.medicalRecordAccess.count({
          where: {
            record_id: record.id
          }
        });

        return {
          ...record,
          sharing_stats: {
            shared_with_partners: shareCount,
            total_accesses: accessCount,
            last_accessed: record.last_accessed_by ? new Date() : null
          }
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        records: recordsWithSharing,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      }
    });

  } catch (error) {
    console.error('Get enhanced medical records error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch enhanced medical records'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// PUT /api/medical-records/enhanced?recordId=xxx - Update sharing permissions
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const recordId = searchParams.get('recordId');

    if (!recordId) {
      return NextResponse.json({
        success: false,
        error: 'Record ID is required'
      }, { status: 400 });
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    let decoded: any;
    
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const {
      sharedWithPartners,
      sharingPermissions,
      isEmergencyAccessible,
      emergencyPriority,
      consentObtained
    } = await request.json();

    // Find and verify record
    const record = await prisma.medicalRecordEnhanced.findUnique({
      where: { id: recordId },
      include: {
        dog: {
          select: {
            user_id: true
          }
        }
      }
    });

    if (!record) {
      return NextResponse.json({
        success: false,
        error: 'Medical record not found'
      }, { status: 404 });
    }

    // Verify user has permission to update
    if (!decoded.partnerId && record.dog.user_id !== decoded.userId) {
      return NextResponse.json({
        success: false,
        error: 'Permission denied'
      }, { status: 403 });
    }

    // Update the record
    const updatedRecord = await prisma.medicalRecordEnhanced.update({
      where: { id: recordId },
      data: {
        shared_with_partners: sharedWithPartners || record.shared_with_partners,
        sharing_permissions: sharingPermissions || record.sharing_permissions,
        is_emergency_accessible: isEmergencyAccessible ?? record.is_emergency_accessible,
        emergency_priority: emergencyPriority ?? record.emergency_priority,
        consent_obtained: consentObtained ?? record.consent_obtained,
        updated_at: new Date()
      }
    });

    // Update sharing records if partners changed
    if (sharedWithPartners) {
      // Remove old shares
      await prisma.medicalRecordShare.updateMany({
        where: {
          record_ids: { array_contains: recordId }
        },
        data: {
          is_active: false,
          revoked_at: new Date(),
          revoked_reason: 'Sharing permissions updated'
        }
      });

      // Create new shares
      if (sharedWithPartners.length > 0) {
        const sharingPromises = sharedWithPartners.map(async (partnerIdToShare: string) => {
          return prisma.medicalRecordShare.create({
            data: {
              dog_id: record.dog_id,
              shared_by_user_id: record.dog.user_id,
              shared_with_partner_id: partnerIdToShare,
              share_type: 'specific_records',
              access_level: sharingPermissions?.access_level || 'read_only',
              record_ids: [recordId],
              permissions: sharingPermissions || {},
              consent_given: consentObtained || false,
              consent_timestamp: consentObtained ? new Date() : null,
              consent_ip_address: request.headers.get('x-forwarded-for') || 'unknown'
            }
          });
        });

        await Promise.all(sharingPromises);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Medical record sharing updated successfully',
      data: updatedRecord
    });

  } catch (error) {
    console.error('Update medical record sharing error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update medical record sharing'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}