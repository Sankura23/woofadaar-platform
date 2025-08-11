import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getTokenFromRequest, verifyToken, isPetParent } from '@/lib/auth';

// GET /api/health/reminders/active - Get active reminders for today and upcoming
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

    try {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
      const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Get overdue reminders
      const overdueReminders = await prisma.healthReminder.findMany({
        where: {
          user_id: payload.userId,
          is_active: true,
          next_reminder: {
            lt: startOfToday
          }
        },
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
          next_reminder: 'asc'
        }
      });

      // Get today's reminders
      const todayReminders = await prisma.healthReminder.findMany({
        where: {
          user_id: payload.userId,
          is_active: true,
          next_reminder: {
            gte: startOfToday,
            lt: endOfToday
          }
        },
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
          next_reminder: 'asc'
        }
      });

      // Get upcoming reminders (next 7 days, excluding today)
      const upcomingReminders = await prisma.healthReminder.findMany({
        where: {
          user_id: payload.userId,
          is_active: true,
          next_reminder: {
            gte: endOfToday,
            lte: next7Days
          }
        },
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
          next_reminder: 'asc'
        },
        take: 10
      });

      // Calculate summary statistics
      const totalActiveReminders = await prisma.healthReminder.count({
        where: {
          user_id: payload.userId,
          is_active: true
        }
      });

      const remindersByType = await prisma.healthReminder.groupBy({
        by: ['reminder_type'],
        where: {
          user_id: payload.userId,
          is_active: true
        },
        _count: {
          reminder_type: true
        }
      });

      const summary = {
        total_active: totalActiveReminders,
        overdue_count: overdueReminders.length,
        today_count: todayReminders.length,
        upcoming_count: upcomingReminders.length,
        by_type: remindersByType.reduce((acc: any, item) => {
          acc[item.reminder_type] = item._count.reminder_type;
          return acc;
        }, {})
      };

      return NextResponse.json({
        success: true,
        data: {
          overdue: overdueReminders,
          today: todayReminders,
          upcoming: upcomingReminders,
          summary,
          current_time: now.toISOString()
        }
      });

    } catch (dbError) {
      console.error('Database error in active reminders retrieval:', dbError);
      return NextResponse.json({
        success: false,
        message: 'Failed to retrieve active reminders'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Active reminders retrieval error:', error);
    return NextResponse.json({
      success: false,
      message: 'Invalid request format'
    }, { status: 400 });
  }
}

// POST /api/health/reminders/active - Mark reminder as completed and update next occurrence
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
    const { reminder_id, action, snooze_minutes } = body;

    // Validation
    if (!reminder_id || !action) {
      return NextResponse.json({
        success: false,
        message: 'Reminder ID and action are required'
      }, { status: 400 });
    }

    const validActions = ['complete', 'snooze', 'skip', 'disable'];
    if (!validActions.includes(action)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid action'
      }, { status: 400 });
    }

    // Verify reminder ownership
    const reminder = await prisma.healthReminder.findFirst({
      where: {
        id: reminder_id,
        user_id: payload.userId
      }
    });

    if (!reminder) {
      return NextResponse.json({
        success: false,
        message: 'Reminder not found or access denied'
      }, { status: 404 });
    }

    try {
      let updatedReminder;

      switch (action) {
        case 'complete':
          // Mark as completed and calculate next occurrence
          const nextReminder = calculateNextOccurrence(reminder);
          updatedReminder = await prisma.healthReminder.update({
            where: { id: reminder_id },
            data: {
              last_reminded: new Date(),
              next_reminder: nextReminder,
              reminder_count: reminder.reminder_count + 1,
              snooze_until: null,
              // Disable if max reminders reached
              is_active: reminder.max_reminders 
                ? reminder.reminder_count + 1 < reminder.max_reminders 
                : true
            }
          });
          break;

        case 'snooze':
          const snoozeTime = snooze_minutes || 30; // Default 30 minutes
          const snoozeUntil = new Date(Date.now() + snoozeTime * 60 * 1000);
          updatedReminder = await prisma.healthReminder.update({
            where: { id: reminder_id },
            data: {
              snooze_until: snoozeUntil
            }
          });
          break;

        case 'skip':
          // Skip this occurrence and move to next
          const skippedNextReminder = calculateNextOccurrence(reminder);
          updatedReminder = await prisma.healthReminder.update({
            where: { id: reminder_id },
            data: {
              last_reminded: new Date(),
              next_reminder: skippedNextReminder,
              snooze_until: null
            }
          });
          break;

        case 'disable':
          updatedReminder = await prisma.healthReminder.update({
            where: { id: reminder_id },
            data: {
              is_active: false,
              snooze_until: null
            }
          });
          break;

        default:
          throw new Error('Invalid action');
      }

      return NextResponse.json({
        success: true,
        message: `Reminder ${action}d successfully`,
        data: {
          reminder: updatedReminder,
          action_performed: action
        }
      });

    } catch (dbError) {
      console.error('Database error in reminder action:', dbError);
      return NextResponse.json({
        success: false,
        message: 'Failed to update reminder'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Reminder action error:', error);
    return NextResponse.json({
      success: false,
      message: 'Invalid request format'
    }, { status: 400 });
  }
}

// Helper function to calculate next occurrence
function calculateNextOccurrence(reminder: any): Date | null {
  const now = new Date();

  // Check if reminder has ended
  if (reminder.end_date && now > new Date(reminder.end_date)) {
    return null;
  }

  // Check if max reminders reached
  if (reminder.max_reminders && reminder.reminder_count >= reminder.max_reminders - 1) {
    return null;
  }

  switch (reminder.frequency) {
    case 'daily':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);

    case 'weekly':
      if (reminder.days_of_week && reminder.days_of_week.length > 0) {
        return getNextWeekday(reminder.days_of_week, reminder.reminder_time);
      }
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    case 'monthly':
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      return setTimeOfDay(nextMonth, reminder.reminder_time);

    case 'one_time':
      return null; // One-time reminders don't repeat

    default:
      return null;
  }
}

function getNextWeekday(daysOfWeek: string[], reminderTime?: string): Date {
  const today = new Date();
  const currentDay = today.getDay();
  
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
    }
  }

  if (!found) {
    daysToAdd = 7 - currentDay + dayNumbers[0];
  }

  const nextDate = new Date(today.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  return setTimeOfDay(nextDate, reminderTime);
}

function setTimeOfDay(date: Date, timeString?: string): Date {
  if (!timeString) return date;
  
  const [hours, minutes] = timeString.split(':').map(Number);
  const newDate = new Date(date);
  newDate.setHours(hours, minutes, 0, 0);
  return newDate;
}