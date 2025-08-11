import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, getTokenFromRequest, isPetParent } from '@/lib/auth'
import prisma from '@/lib/db'

export async function POST(request: NextRequest) {
  const token = getTokenFromRequest(request);
  const payload = token ? verifyToken(token) : null;
  const userId = payload && isPetParent(payload) ? payload.userId : null;
  
  if (!userId) {
    return NextResponse.json(
      { message: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { exportType = 'full' } = await request.json();

    // Get user profile with all related data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        Dog: {
          include: {
            HealthLog: true,
            DogShares: true
          }
        },
        ProfileBackups: {
          orderBy: { created_at: 'desc' },
          take: 5
        },
        AuditLogs: {
          orderBy: { created_at: 'desc' },
          take: 50
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Prepare export data based on type
    let exportData: any = {};

    if (exportType === 'full') {
      exportData = {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          location: user.location,
          experience_level: user.experience_level,
          barks_points: user.barks_points,
          is_premium: user.is_premium,
          profile_image_url: user.profile_image_url,
          profile_visibility: user.profile_visibility,
          reputation: user.reputation,
          notification_prefs: user.notification_prefs,
          created_at: user.created_at,
          updated_at: user.updated_at
        },
        dogs: user.Dog.map(dog => ({
          id: dog.id,
          name: dog.name,
          breed: dog.breed,
          age_months: dog.age_months,
          weight_kg: dog.weight_kg,
          gender: dog.gender,
          vaccination_status: dog.vaccination_status,
          spayed_neutered: dog.spayed_neutered,
          microchip_id: dog.microchip_id,
          emergency_contact: dog.emergency_contact,
          emergency_phone: dog.emergency_phone,
          medical_notes: dog.medical_notes,
          personality_traits: dog.personality_traits,
          location: dog.location,
          photo_url: dog.photo_url,
          health_id: dog.health_id,
          created_at: dog.created_at,
          updated_at: dog.updated_at,
          health_logs: dog.HealthLog,
          shares: dog.DogShares
        })),
        backups: user.ProfileBackups,
        audit_logs: user.AuditLogs,
        export_info: {
          exported_at: new Date().toISOString(),
          export_type: exportType,
          total_dogs: user.Dog.length,
          total_health_logs: user.Dog.reduce((sum, dog) => sum + dog.HealthLog.length, 0),
          total_shares: user.Dog.reduce((sum, dog) => sum + dog.DogShares.length, 0)
        }
      };
    } else if (exportType === 'basic') {
      exportData = {
        user: {
          name: user.name,
          email: user.email,
          location: user.location,
          experience_level: user.experience_level,
          profile_visibility: user.profile_visibility
        },
        dogs: user.Dog.map(dog => ({
          name: dog.name,
          breed: dog.breed,
          age_months: dog.age_months,
          gender: dog.gender,
          health_id: dog.health_id,
          photo_url: dog.photo_url
        })),
        export_info: {
          exported_at: new Date().toISOString(),
          export_type: exportType,
          total_dogs: user.Dog.length
        }
      };
    }

    // Create backup record
    await prisma.profileBackup.create({
      data: {
        user_id: userId,
        data: exportData
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        user_id: userId,
        action: 'profile_exported',
        details: {
          export_type: exportType,
          data_size: JSON.stringify(exportData).length
        }
      }
    });

    return NextResponse.json({
      message: 'Profile exported successfully',
      data: exportData,
      download_url: `/api/profile/export/download/${userId}?type=${exportType}`
    });

  } catch (error) {
    console.error('Profile export error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const token = getTokenFromRequest(request);
  const payload = token ? verifyToken(token) : null;
  const userId = payload && isPetParent(payload) ? payload.userId : null;
  
  if (!userId) {
    return NextResponse.json(
      { message: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Get user's export history
    const exports = await prisma.profileBackup.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 10
    });

    return NextResponse.json({
      exports: exports.map(exp => ({
        id: exp.id,
        created_at: exp.created_at,
        data_size: JSON.stringify(exp.data).length
      }))
    });

  } catch (error) {
    console.error('Export history error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 