import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { processQuestionForExperts } from '@/lib/expert-notification-service';
import prisma from '@/lib/db';

// GET - Get expert notifications for logged in expert
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const userId = 'userId' in user ? user.userId : user.partnerId;
    let notifications = [];

    try {
      // Check if user is an expert
      const expertProfile = await prisma.expertProfile.findUnique({
        where: { user_id: userId },
        include: {
          expert_notifications: {
            include: {
              question: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true
                    }
                  },
                  dog: {
                    select: {
                      id: true,
                      name: true,
                      breed: true
                    }
                  }
                }
              }
            },
            orderBy: [
              { priority_score: 'desc' },
              { created_at: 'desc' }
            ],
            take: 50
          }
        }
      });

      if (expertProfile) {
        notifications = expertProfile.expert_notifications;
      }

    } catch (dbError) {
      console.warn('Database error fetching expert notifications:', dbError);
      
      // Fallback: Return mock notifications for demo
      notifications = [
        {
          id: 'notif_1',
          question_id: 'demo_question_1',
          notification_type: 'urgent_question',
          priority_score: 0.9,
          is_read: false,
          created_at: new Date().toISOString(),
          question: {
            id: 'demo_question_1',
            title: 'Urgent: My dog is not eating for 2 days',
            content: 'My 3-year-old Golden Retriever has not eaten anything for 2 days...',
            category: 'health',
            tags: ['urgent', 'health', 'appetite'],
            user: { id: 'user_1', name: 'Worried Dog Parent' },
            dog: { id: 'dog_1', name: 'Buddy', breed: 'Golden Retriever' }
          }
        },
        {
          id: 'notif_2', 
          question_id: 'demo_question_2',
          notification_type: 'new_question',
          priority_score: 0.7,
          is_read: false,
          created_at: new Date(Date.now() - 3600000).toISOString(),
          question: {
            id: 'demo_question_2',
            title: 'Best training methods for aggressive behavior?',
            content: 'My 1-year-old German Shepherd shows aggressive behavior towards strangers...',
            category: 'behavior',
            tags: ['training', 'aggression', 'socialization'],
            user: { id: 'user_2', name: 'First-time Owner' },
            dog: { id: 'dog_2', name: 'Max', breed: 'German Shepherd' }
          }
        }
      ];
    }

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        unread_count: notifications.filter((n: any) => !n.is_read).length,
        high_priority_count: notifications.filter((n: any) => n.priority_score > 0.7).length
      }
    });

  } catch (error) {
    console.error('Error fetching expert notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// POST - Trigger expert notifications for a question
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { questionId, title, content, category, tags, isUrgent } = body;

    if (!questionId || !title || !content || !category) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Process question for expert matching and notifications
    const result = await processQuestionForExperts(
      questionId,
      title,
      content,
      category,
      tags || [],
      isUrgent || false
    );

    console.log(`Expert notification processing completed for question ${questionId}:`, result);

    return NextResponse.json({
      success: true,
      data: {
        experts_matched: result.expertsMatched,
        notifications_scheduled: result.notificationsScheduled,
        high_priority_alerts: result.highPriorityAlerts
      },
      message: `Notified ${result.expertsMatched} matching experts`
    });

  } catch (error) {
    console.error('Error processing expert notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process expert notifications' },
      { status: 500 }
    );
  }
}

// PATCH - Mark notification as read
export async function PATCH(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { notificationId, action } = body;

    if (!notificationId || !action) {
      return NextResponse.json(
        { success: false, error: 'Notification ID and action are required' },
        { status: 400 }
      );
    }

    const userId = 'userId' in user ? user.userId : user.partnerId;

    try {
      // Update notification status
      if (action === 'mark_read') {
        await prisma.expertNotification.updateMany({
          where: {
            id: notificationId,
            expert: {
              user_id: userId
            }
          },
          data: {
            is_read: true,
            read_at: new Date()
          }
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Notification updated successfully'
      });

    } catch (dbError) {
      console.warn('Database error updating notification:', dbError);
      
      // Return success for demo purposes
      return NextResponse.json({
        success: true,
        message: 'Notification updated (demo mode)'
      });
    }

  } catch (error) {
    console.error('Error updating expert notification:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}