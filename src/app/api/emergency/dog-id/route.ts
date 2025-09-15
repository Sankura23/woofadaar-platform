import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST /api/emergency/dog-id - Emergency Dog ID access (no auth required)
export async function POST(request: NextRequest) {
  try {
    const {
      dogId,
      qrCode,
      emergencyLevel = 'normal',
      accessorInfo,
      locationData,
      contactInfo
    } = await request.json();

    if (!dogId && !qrCode) {
      return NextResponse.json({
        success: false,
        error: 'Dog ID or QR code is required'
      }, { status: 400 });
    }

    // Get client information
    const clientIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    let dog;
    let qrCodeRecord = null;

    // If QR code provided, look up emergency QR first
    if (qrCode) {
      qrCodeRecord = await prisma.emergencyQRCode.findUnique({
        where: { qr_code: qrCode, is_active: true },
        include: {
          dog: {
            include: {
              User: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                  location: true
                }
              },
              EmergencyContacts: {
                orderBy: { priority_order: 'asc' }
              },
              MedicalRecordsEnhanced: {
                where: {
                  is_emergency_accessible: true,
                  emergency_priority: { gte: 1 }
                },
                orderBy: { emergency_priority: 'desc' },
                take: 10
              }
            }
          }
        }
      });

      if (qrCodeRecord) {
        dog = qrCodeRecord.dog;
        
        // Update QR code access count
        await prisma.emergencyQRCode.update({
          where: { id: qrCodeRecord.id },
          data: {
            access_count: { increment: 1 },
            last_accessed: new Date()
          }
        });
      }
    }

    // If no QR code or QR not found, try direct Dog ID lookup
    if (!dog && dogId) {
      dog = await prisma.dog.findFirst({
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
              location: true
            }
          },
          EmergencyContacts: {
            orderBy: { priority_order: 'asc' }
          },
          MedicalRecordsEnhanced: {
            where: {
              is_emergency_accessible: true,
              emergency_priority: { gte: 1 }
            },
            orderBy: { emergency_priority: 'desc' },
            take: 10
          }
        }
      });
    }

    if (!dog) {
      // Log failed attempt
      await prisma.securityAuditLog.create({
        data: {
          action_type: 'emergency_dog_id_access',
          resource_accessed: `dog_id:${dogId || qrCode}`,
          success: false,
          failure_reason: 'Dog ID not found or inactive',
          ip_address: clientIp,
          user_agent: userAgent,
          risk_score: 15,
          flagged_for_review: true
        }
      });

      return NextResponse.json({
        success: false,
        error: 'Dog ID not found or emergency access not available'
      }, { status: 404 });
    }

    // Create emergency access log
    const accessLog = await prisma.emergencyAccessLog.create({
      data: {
        qr_code_id: qrCodeRecord?.id,
        dog_id: dog.id,
        access_type: qrCode ? 'qr_scan' : 'emergency_search',
        accessor_info: accessorInfo || {},
        location_data: locationData,
        emergency_level: emergencyLevel,
        ip_address: clientIp,
        user_agent: userAgent
      }
    });

    // Determine emergency data based on urgency
    let emergencyData: any = {
      basic_info: {
        name: dog.name,
        breed: dog.breed,
        age_months: dog.age_months,
        weight_kg: dog.weight_kg,
        gender: dog.gender,
        health_id: dog.health_id
      },
      owner: {
        name: dog.User.name,
        location: dog.User.location
      }
    };

    // Include emergency contacts (always available)
    emergencyData.emergency_contacts = dog.EmergencyContacts.map(contact => ({
      name: contact.contact_name,
      phone: contact.contact_phone,
      email: contact.contact_email,
      relationship: contact.relationship,
      is_primary: contact.is_primary,
      is_emergency_vet: contact.is_emergency_vet,
      available_24_7: contact.available_24_7,
      priority_order: contact.priority_order
    }));

    // Include owner contact for high priority emergencies
    if (emergencyLevel === 'urgent' || emergencyLevel === 'critical') {
      emergencyData.owner.email = dog.User.email;
      emergencyData.owner.phone = dog.User.phone;
    }

    // Include medical information for critical emergencies
    if (emergencyLevel === 'critical') {
      emergencyData.critical_medical_info = {
        vaccination_status: dog.vaccination_status,
        medical_notes: dog.medical_notes,
        emergency_notes: dog.emergency_contact,
        microchip_id: dog.microchip_id,
        medical_records: dog.MedicalRecordsEnhanced.map(record => ({
          id: record.id,
          title: record.title,
          record_type: record.record_type,
          emergency_priority: record.emergency_priority,
          description: record.description,
          created_at: record.created_at
        }))
      };
    }

    // Include QR offline data if available
    if (qrCodeRecord?.emergency_data) {
      emergencyData.offline_data = qrCodeRecord.emergency_data;
    }

    // Create emergency alert for high priority cases
    if (emergencyLevel === 'urgent' || emergencyLevel === 'critical') {
      const alert = await prisma.emergencyAlert.create({
        data: {
          dog_id: dog.id,
          qr_code_id: qrCodeRecord?.id,
          alert_type: 'medical_emergency',
          severity: emergencyLevel === 'critical' ? 'critical' : 'high',
          location_latitude: locationData?.latitude ? parseFloat(locationData.latitude) : null,
          location_longitude: locationData?.longitude ? parseFloat(locationData.longitude) : null,
          location_description: locationData?.description,
          description: `Emergency access requested for ${dog.name}`,
          contact_info: contactInfo || {}
        }
      });

      emergencyData.emergency_alert_id = alert.id;

      // Send emergency notifications (implement based on your notification system)
      // This would typically send SMS/email to owner and emergency contacts
    }

    // Log successful emergency access
    await prisma.securityAuditLog.create({
      data: {
        action_type: 'emergency_dog_id_access',
        resource_accessed: `dog_id:${dog.health_id}`,
        success: true,
        ip_address: clientIp,
        user_agent: userAgent,
        risk_score: emergencyLevel === 'critical' ? 5 : 10,
        location_country: locationData?.country,
        location_city: locationData?.city
      }
    });

    return NextResponse.json({
      success: true,
      access_id: accessLog.id,
      emergency_data: emergencyData,
      access_level: emergencyLevel,
      instructions: {
        critical_contacts: dog.EmergencyContacts
          .filter(c => c.is_primary || c.is_emergency_vet)
          .map(c => `${c.relationship}: ${c.contact_phone}`),
        next_steps: [
          'Contact primary emergency contact immediately',
          'If vet needed, contact emergency veterinarian',
          'Keep this Dog ID information accessible',
          'Document any treatment provided'
        ]
      }
    });

  } catch (error) {
    console.error('Emergency Dog ID access error:', error);
    
    // Log system error
    try {
      await prisma.securityAuditLog.create({
        data: {
          action_type: 'emergency_dog_id_access',
          resource_accessed: 'emergency_system',
          success: false,
          failure_reason: error instanceof Error ? error.message : 'System error',
          ip_address: request.headers.get('x-forwarded-for') || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown',
          risk_score: 30,
          flagged_for_review: true
        }
      });
    } catch (auditError) {
      console.error('Failed to log emergency access error:', auditError);
    }

    return NextResponse.json({
      success: false,
      error: 'Emergency access system temporarily unavailable',
      support_info: {
        message: 'For immediate veterinary emergencies, contact your local emergency vet clinic',
        emergency_number: '1860-266-3333' // Generic emergency number
      }
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// GET /api/emergency/dog-id/:dogId - Get emergency information (rate limited)
export async function GET(request: NextRequest, { params }: { params: { dogId: string } }) {
  try {
    const dogId = params.dogId;
    
    if (!dogId) {
      return NextResponse.json({
        success: false,
        error: 'Dog ID is required'
      }, { status: 400 });
    }

    // Rate limiting check - max 5 emergency lookups per IP per hour
    const clientIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentAccesses = await prisma.emergencyAccessLog.count({
      where: {
        ip_address: clientIp,
        access_timestamp: { gte: oneHourAgo }
      }
    });

    if (recentAccesses >= 5) {
      await prisma.securityAuditLog.create({
        data: {
          action_type: 'emergency_dog_id_access',
          resource_accessed: `dog_id:${dogId}`,
          success: false,
          failure_reason: 'Rate limit exceeded',
          ip_address: clientIp,
          user_agent: request.headers.get('user-agent') || 'unknown',
          risk_score: 40,
          flagged_for_review: true
        }
      });

      return NextResponse.json({
        success: false,
        error: 'Too many emergency requests. Contact support if this is a genuine emergency.',
        support_number: '1860-266-3333'
      }, { status: 429 });
    }

    // Look up dog with emergency information
    const dog = await prisma.dog.findFirst({
      where: {
        OR: [
          { id: dogId },
          { health_id: dogId }
        ]
      },
      select: {
        id: true,
        name: true,
        breed: true,
        health_id: true,
        age_months: true,
        weight_kg: true,
        gender: true,
        vaccination_status: true,
        emergency_contact: true,
        emergency_phone: true,
        medical_notes: true,
        User: {
          select: {
            name: true,
            location: true
          }
        },
        EmergencyContacts: {
          where: {
            OR: [
              { is_primary: true },
              { is_emergency_vet: true }
            ]
          },
          orderBy: { priority_order: 'asc' }
        }
      }
    });

    if (!dog) {
      return NextResponse.json({
        success: false,
        error: 'Dog ID not found or emergency access not configured'
      }, { status: 404 });
    }

    // Log the lookup
    await prisma.emergencyAccessLog.create({
      data: {
        dog_id: dog.id,
        access_type: 'emergency_lookup',
        emergency_level: 'normal',
        ip_address: clientIp,
        user_agent: request.headers.get('user-agent') || 'unknown'
      }
    });

    // Return limited emergency information
    return NextResponse.json({
      success: true,
      emergency_info: {
        dog: {
          name: dog.name,
          breed: dog.breed,
          health_id: dog.health_id,
          age_months: dog.age_months,
          weight_kg: dog.weight_kg,
          vaccination_status: dog.vaccination_status
        },
        owner: {
          name: dog.User.name,
          location: dog.User.location
        },
        emergency_contacts: dog.EmergencyContacts.map(contact => ({
          name: contact.contact_name,
          phone: contact.contact_phone,
          relationship: contact.relationship,
          is_emergency_vet: contact.is_emergency_vet,
          available_24_7: contact.available_24_7
        })),
        emergency_notes: dog.medical_notes,
        instructions: [
          'Contact emergency contacts immediately',
          'Provide Dog ID when seeking veterinary care',
          'Keep dog calm and safe',
          'Document any symptoms or incidents'
        ]
      }
    });

  } catch (error) {
    console.error('Emergency lookup error:', error);
    return NextResponse.json({
      success: false,
      error: 'Emergency lookup failed'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}