import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getTokenFromRequest, verifyToken, isPetParent } from '@/lib/auth';

// POST /api/health/medical-record - Create new medical record
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({
        success: false,
        message: 'Authentication required'
      }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || !isPetParent(payload)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid authentication'
      }, { status: 401 });
    }

    const body = await request.json();
    const {
      dog_id,
      record_type,
      record_date,
      title,
      description,
      vet_name,
      vet_clinic,
      vet_contact,
      medications,
      next_due_date,
      documents,
      photos,
      cost,
      diagnosis,
      treatment_plan,
      follow_up_required
    } = body;

    // Validation
    if (!dog_id || !record_type || !record_date || !title) {
      return NextResponse.json({
        success: false,
        message: 'Dog ID, record type, date, and title are required'
      }, { status: 400 });
    }

    // Valid record types
    const validRecordTypes = ['vaccination', 'vet_visit', 'medication', 'surgery', 'checkup', 'emergency', 'grooming', 'training'];
    if (!validRecordTypes.includes(record_type)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid record type'
      }, { status: 400 });
    }

    // Verify dog ownership
    const dog = await prisma.dog.findFirst({
      where: {
        id: dog_id,
        user_id: payload.userId
      }
    });

    if (!dog) {
      return NextResponse.json({
        success: false,
        message: 'Dog not found or access denied'
      }, { status: 404 });
    }

    try {
      // Create medical record
      const medicalRecord = await prisma.medicalRecord.create({
        data: {
          dog_id,
          user_id: payload.userId,
          record_type,
          record_date: new Date(record_date),
          title,
          description,
          vet_name,
          vet_clinic,
          vet_contact,
          medications,
          next_due_date: next_due_date ? new Date(next_due_date) : null,
          documents,
          photos,
          cost,
          diagnosis,
          treatment_plan,
          follow_up_required: follow_up_required || false
        }
      });

      // Create automatic reminder if next_due_date is provided
      if (next_due_date) {
        await createAutomaticReminder(dog_id, payload.userId, medicalRecord);
      }

      return NextResponse.json({
        success: true,
        message: 'Medical record created successfully',
        data: {
          medical_record: medicalRecord
        }
      });

    } catch (dbError) {
      console.error('Database error in medical record creation:', dbError);
      return NextResponse.json({
        success: false,
        message: 'Failed to create medical record'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Medical record creation error:', error);
    return NextResponse.json({
      success: false,
      message: 'Invalid request format'
    }, { status: 400 });
  }
}

// GET /api/health/medical-record - Get medical records for user's dogs
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({
        success: false,
        message: 'Authentication required'
      }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || !isPetParent(payload)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid authentication'
      }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const dogId = searchParams.get('dog_id');
    const recordType = searchParams.get('record_type');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    try {
      // Build where clause
      const where: any = {
        user_id: payload.userId
      };

      if (dogId) {
        where.dog_id = dogId;
      }

      if (recordType) {
        where.record_type = recordType;
      }

      if (startDate || endDate) {
        where.record_date = {};
        if (startDate) where.record_date.gte = new Date(startDate);
        if (endDate) where.record_date.lte = new Date(endDate);
      }

      // Get medical records
      const medicalRecords = await prisma.medicalRecord.findMany({
        where,
        include: {
          dog: {
            select: {
              id: true,
              name: true,
              breed: true,
              photo_url: true
            }
          }
        },
        orderBy: {
          record_date: 'desc'
        },
        take: limit,
        skip: offset
      });

      // Get total count
      const total = await prisma.medicalRecord.count({ where });

      // Get upcoming due dates
      const upcomingDueDates = await prisma.medicalRecord.findMany({
        where: {
          user_id: payload.userId,
          next_due_date: {
            gte: new Date(),
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Next 30 days
          }
        },
        include: {
          dog: {
            select: {
              id: true,
              name: true,
              photo_url: true
            }
          }
        },
        orderBy: {
          next_due_date: 'asc'
        },
        take: 5
      });

      return NextResponse.json({
        success: true,
        data: {
          medical_records: medicalRecords,
          upcoming_due_dates: upcomingDueDates,
          pagination: {
            total,
            limit,
            offset,
            hasMore: offset + limit < total
          },
          filters: {
            dog_id: dogId,
            record_type: recordType,
            date_range: { start: startDate, end: endDate }
          }
        }
      });

    } catch (dbError) {
      console.error('Database error in medical records retrieval:', dbError);
      return NextResponse.json({
        success: false,
        message: 'Failed to retrieve medical records'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Medical records retrieval error:', error);
    return NextResponse.json({
      success: false,
      message: 'Invalid request format'
    }, { status: 400 });
  }
}

// Helper function to create automatic reminder
async function createAutomaticReminder(dogId: string, userId: string, medicalRecord: any) {
  try {
    const reminderTitle = getReminderTitle(medicalRecord.record_type, medicalRecord.title);
    const reminderType = getReminderType(medicalRecord.record_type);

    await prisma.healthReminder.create({
      data: {
        dog_id: dogId,
        user_id: userId,
        reminder_type: reminderType,
        title: reminderTitle,
        description: `Follow-up for: ${medicalRecord.title}`,
        frequency: 'one_time',
        start_date: medicalRecord.next_due_date,
        next_reminder: medicalRecord.next_due_date,
        is_active: true
      }
    });

  } catch (error) {
    console.error('Error creating automatic reminder:', error);
    // Don't fail the main operation if reminder creation fails
  }
}

function getReminderTitle(recordType: string, title: string): string {
  switch (recordType) {
    case 'vaccination':
      return `Vaccination Due: ${title}`;
    case 'medication':
      return `Medication Follow-up: ${title}`;
    case 'vet_visit':
      return `Follow-up Visit: ${title}`;
    case 'checkup':
      return `Next Checkup: ${title}`;
    default:
      return `Follow-up: ${title}`;
  }
}

function getReminderType(recordType: string): string {
  switch (recordType) {
    case 'vaccination':
      return 'vaccination';
    case 'medication':
      return 'medication';
    case 'vet_visit':
    case 'checkup':
      return 'vet_visit';
    default:
      return 'vet_visit';
  }
}