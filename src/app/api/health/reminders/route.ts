import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getTokenFromRequest, verifyToken, isPetParent } from '@/lib/auth';

// POST /api/health/reminders - Create new health reminder
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
      reminder_type,
      title,
      description,
      medication_name,
      dosage,
      frequency,
      reminder_time,
      days_of_week,
      start_date,
      end_date,
      auto_complete,
      max_reminders
    } = body;

    // Validation
    if (!dog_id || !reminder_type || !title || !frequency || !start_date) {
      return NextResponse.json({
        success: false,
        message: 'Dog ID, reminder type, title, frequency, and start date are required'
      }, { status: 400 });
    }

    // Valid reminder types
    const validReminderTypes = ['medication', 'vaccination', 'vet_visit', 'grooming', 'exercise', 'feeding', 'training'];
    if (!validReminderTypes.includes(reminder_type)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid reminder type'
      }, { status: 400 });
    }

    // Valid frequencies
    const validFrequencies = ['daily', 'weekly', 'monthly', 'one_time', 'custom'];
    if (!validFrequencies.includes(frequency)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid frequency'
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
      // Calculate next reminder time
      const nextReminder = calculateNextReminder(start_date, frequency, reminder_time, days_of_week);

      // Create health reminder
      const healthReminder = await prisma.healthReminder.create({
        data: {
          dog_id,
          user_id: payload.userId,
          reminder_type,
          title,
          description,
          medication_name,
          dosage,
          frequency,
          reminder_time,
          days_of_week: days_of_week || [],
          start_date: new Date(start_date),
          end_date: end_date ? new Date(end_date) : null,
          next_reminder: nextReminder,
          auto_complete: auto_complete || false,
          max_reminders,
          is_active: true
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Health reminder created successfully',
        data: {
          reminder: healthReminder
        }
      });

    } catch (dbError) {
      console.error('Database error in reminder creation:', dbError);
      return NextResponse.json({
        success: false,
        message: 'Failed to create reminder'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Reminder creation error:', error);
    return NextResponse.json({
      success: false,
      message: 'Invalid request format'
    }, { status: 400 });
  }
}

// GET /api/health/reminders - Get user's health reminders
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
    const reminderType = searchParams.get('reminder_type');
    const isActive = searchParams.get('is_active');
    const upcoming = searchParams.get('upcoming'); // 'true' for upcoming reminders only
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    try {
      // Build where clause
      const where: any = {
        user_id: payload.userId
      };

      if (dogId) {
        where.dog_id = dogId;
      }

      if (reminderType) {
        where.reminder_type = reminderType;
      }

      if (isActive !== null) {
        where.is_active = isActive === 'true';
      }

      if (upcoming === 'true') {
        where.next_reminder = {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
        };
        where.is_active = true;
      }

      // Get reminders
      const reminders = await prisma.healthReminder.findMany({
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
        orderBy: [
          { next_reminder: 'asc' },
          { created_at: 'desc' }
        ],
        take: limit,
        skip: offset
      });

      // Get total count
      const total = await prisma.healthReminder.count({ where });

      // Get overdue reminders
      const overdueReminders = await prisma.healthReminder.findMany({
        where: {
          user_id: payload.userId,
          is_active: true,
          next_reminder: {
            lt: new Date()
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
          next_reminder: 'asc'
        },
        take: 10
      });

      return NextResponse.json({
        success: true,
        data: {
          reminders,
          overdue_reminders: overdueReminders,
          pagination: {
            total,
            limit,
            offset,
            hasMore: offset + limit < total
          },
          filters: {
            dog_id: dogId,
            reminder_type: reminderType,
            is_active: isActive,
            upcoming: upcoming
          }
        }
      });

    } catch (dbError) {
      console.error('Database error in reminders retrieval:', dbError);
      return NextResponse.json({
        success: false,
        message: 'Failed to retrieve reminders'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Reminders retrieval error:', error);
    return NextResponse.json({
      success: false,
      message: 'Invalid request format'
    }, { status: 400 });
  }
}

// Helper function to calculate next reminder time
function calculateNextReminder(startDate: string, frequency: string, reminderTime?: string, daysOfWeek?: string[]): Date {
  const start = new Date(startDate);
  const now = new Date();
  
  // If start date is in the future, use it
  if (start > now) {
    return setTimeOfDay(start, reminderTime);
  }

  // Calculate next occurrence based on frequency
  let nextDate = new Date();

  switch (frequency) {
    case 'daily':
      // Next occurrence is today if time hasn't passed, otherwise tomorrow
      if (reminderTime) {
        const [hours, minutes] = reminderTime.split(':').map(Number);
        const todayAtTime = new Date();
        todayAtTime.setHours(hours, minutes, 0, 0);
        
        if (todayAtTime > now) {
          nextDate = todayAtTime;
        } else {
          nextDate = new Date(todayAtTime.getTime() + 24 * 60 * 60 * 1000);
        }
      }
      break;

    case 'weekly':
      if (daysOfWeek && daysOfWeek.length > 0) {
        nextDate = getNextWeekday(daysOfWeek, reminderTime);
      } else {
        // Default to same day next week
        nextDate = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
      }
      break;

    case 'monthly':
      nextDate = new Date(start);
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;

    case 'one_time':
      nextDate = start;
      break;

    default:
      nextDate = start;
  }

  return setTimeOfDay(nextDate, reminderTime);
}

function setTimeOfDay(date: Date, timeString?: string): Date {
  if (!timeString) return date;
  
  const [hours, minutes] = timeString.split(':').map(Number);
  const newDate = new Date(date);
  newDate.setHours(hours, minutes, 0, 0);
  return newDate;
}

function getNextWeekday(daysOfWeek: string[], reminderTime?: string): Date {
  const today = new Date();
  const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // Convert day names to numbers
  const dayNumbers = daysOfWeek.map(day => {
    const dayMap: { [key: string]: number } = {
      'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
      'thursday': 4, 'friday': 5, 'saturday': 6
    };
    return dayMap[day.toLowerCase()] ?? 0;
  }).sort((a, b) => a - b);

  // Find next occurrence
  let daysToAdd = 0;
  let found = false;

  for (const dayNum of dayNumbers) {
    if (dayNum > currentDay) {
      daysToAdd = dayNum - currentDay;
      found = true;
      break;
    } else if (dayNum === currentDay && reminderTime) {
      // Check if time hasn't passed today
      const [hours, minutes] = reminderTime.split(':').map(Number);
      const timeToday = new Date();
      timeToday.setHours(hours, minutes, 0, 0);
      
      if (timeToday > today) {
        daysToAdd = 0;
        found = true;
        break;
      }
    }
  }

  if (!found) {
    // Next week, first day in the list
    daysToAdd = 7 - currentDay + dayNumbers[0];
  }

  const nextDate = new Date(today.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  return setTimeOfDay(nextDate, reminderTime);
}