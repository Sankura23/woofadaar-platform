// Week 26 Phase 3: Premium Support API
// Priority customer support for premium subscribers

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { PremiumSupportService } from '@/lib/premium-support-service';

const prisma = new PrismaClient();

/**
 * GET /api/premium/support
 * Get support tickets, ticket details, or support information
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const userId = decoded.id;

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'tickets';
    const ticketId = searchParams.get('ticket_id');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Check premium status for enhanced support features
    const subscription = await prisma.subscription.findFirst({
      where: {
        user_id: userId,
        status: 'active'
      }
    });

    const isPremium = subscription !== null;

    switch (action) {
      case 'tickets':
        const ticketsResult = await PremiumSupportService.getUserSupportTickets(
          userId,
          limit,
          offset,
          status
        );

        if (!ticketsResult.success) {
          return NextResponse.json({
            error: ticketsResult.message
          }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          ...ticketsResult,
          premium_support_available: isPremium,
          upgrade_benefits: !isPremium ? {
            priority_queue: 'Skip the line with premium support',
            dedicated_agents: 'Get assigned to specialized support agents',
            faster_response: 'Guaranteed response within 4 hours',
            phone_support: 'Direct phone support with callbacks',
            escalation: 'Direct escalation to senior support team'
          } : null
        });

      case 'details':
        if (!ticketId) {
          return NextResponse.json({
            error: 'Ticket ID is required'
          }, { status: 400 });
        }

        const ticketResult = await PremiumSupportService.getSupportTicketDetails(
          ticketId,
          userId
        );

        if (!ticketResult.success) {
          return NextResponse.json({
            error: ticketResult.error
          }, { status: ticketResult.error === 'Support ticket not found' ? 404 : 500 });
        }

        return NextResponse.json({
          success: true,
          ...ticketResult,
          premium_support_available: isPremium
        });

      case 'info':
        // Return support information and premium benefits
        return NextResponse.json({
          success: true,
          support_info: {
            is_premium_user: isPremium,
            general_support: {
              email: 'support@woofadaar.com',
              response_time: '24-48 hours',
              available_hours: '9 AM - 6 PM IST, Monday to Friday',
              categories: ['technical', 'billing', 'general']
            },
            premium_support: isPremium ? {
              priority_response_time: '30 minutes - 4 hours based on priority',
              phone_support: '+91-80-4567-8900',
              available_hours: '24/7 for critical issues, 9 AM - 9 PM for regular support',
              dedicated_agents: true,
              categories: ['technical', 'billing', 'insurance', 'health', 'appointment', 'general'],
              additional_benefits: [
                'Priority queue handling',
                'Dedicated specialized agents',
                'Direct phone support with callbacks',
                'Escalation to senior support',
                'Insurance claim assistance',
                'Health consultation support'
              ]
            } : {
              upgrade_message: 'Upgrade to premium for priority support with dedicated agents, faster response times, and phone support',
              benefits: [
                'Skip the support queue',
                'Dedicated specialized agents',
                'Response within 4 hours',
                'Direct phone support',
                'Insurance and health query assistance'
              ]
            }
          }
        });

      case 'categories':
        // Return available support categories
        const categories = [
          {
            id: 'technical',
            name: 'Technical Support',
            description: 'App issues, login problems, feature questions',
            premium_benefits: isPremium ? 'Priority handling by technical specialists' : null
          },
          {
            id: 'billing',
            name: 'Billing & Subscriptions',
            description: 'Payment issues, subscription management, refunds',
            premium_benefits: isPremium ? 'Dedicated billing support agent' : null
          },
          {
            id: 'insurance',
            name: 'Insurance Support',
            description: 'Insurance queries, claim assistance, provider connections',
            premium_only: true,
            premium_benefits: 'Complete claim assistance and provider liaison'
          },
          {
            id: 'health',
            name: 'Health & Veterinary',
            description: 'Health queries, vet appointment issues, consultation support',
            premium_benefits: isPremium ? 'Health specialists and vet consultation support' : null
          },
          {
            id: 'appointment',
            name: 'Appointments',
            description: 'Vet appointment booking, rescheduling, cancellations',
            premium_benefits: isPremium ? 'Priority booking assistance' : null
          },
          {
            id: 'general',
            name: 'General Inquiries',
            description: 'Account questions, feature requests, feedback',
            premium_benefits: isPremium ? 'Personalized account management' : null
          }
        ];

        return NextResponse.json({
          success: true,
          support_categories: categories,
          is_premium_user: isPremium
        });

      default:
        return NextResponse.json({
          error: 'Invalid action parameter'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in premium support API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/premium/support
 * Create support ticket, add message, or request callback
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const userId = decoded.id;

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'create_ticket':
        const {
          category,
          subject,
          description,
          priority,
          attachments = [],
          tags = []
        } = body;

        // Validate required fields
        if (!category || !subject || !description) {
          return NextResponse.json({
            error: 'Missing required fields: category, subject, description'
          }, { status: 400 });
        }

        const validCategories = ['technical', 'billing', 'insurance', 'health', 'appointment', 'general'];
        if (!validCategories.includes(category)) {
          return NextResponse.json({
            error: 'Invalid category'
          }, { status: 400 });
        }

        // Check if insurance category requires premium
        if (category === 'insurance') {
          const subscription = await prisma.subscription.findFirst({
            where: {
              user_id: userId,
              status: 'active'
            }
          });

          if (!subscription) {
            return NextResponse.json({
              error: 'Premium subscription required for insurance support',
              upgrade_message: 'Insurance support is available only for premium subscribers. Upgrade to ₹99/month for comprehensive insurance assistance.'
            }, { status: 403 });
          }
        }

        const ticketResult = await PremiumSupportService.createSupportTicket(
          userId,
          {
            category,
            subject,
            description,
            priority,
            attachments,
            tags
          }
        );

        if (!ticketResult.success) {
          return NextResponse.json({
            error: ticketResult.message
          }, { status: 400 });
        }

        // Track premium feature usage
        await trackPremiumFeatureUsage(userId, 'premium_support_ticket_creation');

        return NextResponse.json({
          success: true,
          support_ticket: {
            id: ticketResult.ticket_id,
            message: ticketResult.message,
            expected_response_time: ticketResult.expected_response_time,
            category: category,
            priority: priority || 'medium'
          }
        });

      case 'add_message':
        const { ticket_id, message, attachments: msgAttachments = [] } = body;

        if (!ticket_id || !message) {
          return NextResponse.json({
            error: 'Missing required fields: ticket_id, message'
          }, { status: 400 });
        }

        const messageResult = await PremiumSupportService.addMessageToTicket(
          ticket_id,
          userId,
          message,
          msgAttachments
        );

        if (!messageResult.success) {
          return NextResponse.json({
            error: messageResult.message
          }, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          message: messageResult.message
        });

      case 'rate_ticket':
        const { ticket_id: ratingTicketId, rating, feedback } = body;

        if (!ratingTicketId || !rating) {
          return NextResponse.json({
            error: 'Missing required fields: ticket_id, rating'
          }, { status: 400 });
        }

        const ratingResult = await PremiumSupportService.rateSupportTicket(
          ratingTicketId,
          userId,
          rating,
          feedback
        );

        if (!ratingResult.success) {
          return NextResponse.json({
            error: ratingResult.message
          }, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          message: ratingResult.message
        });

      case 'request_callback':
        const { ticket_id: callbackTicketId, phone_number, preferred_time } = body;

        if (!callbackTicketId || !phone_number || !preferred_time) {
          return NextResponse.json({
            error: 'Missing required fields: ticket_id, phone_number, preferred_time'
          }, { status: 400 });
        }

        const callbackResult = await PremiumSupportService.requestPhoneCallback(
          userId,
          callbackTicketId,
          phone_number,
          preferred_time
        );

        if (!callbackResult.success) {
          const statusCode = callbackResult.message.includes('premium subscribers') ? 403 : 400;
          return NextResponse.json({
            error: callbackResult.message,
            upgrade_required: statusCode === 403
          }, { status: statusCode });
        }

        // Track premium feature usage
        await trackPremiumFeatureUsage(userId, 'premium_phone_callback_request');

        return NextResponse.json({
          success: true,
          callback: callbackResult.callback_scheduled,
          message: callbackResult.message
        });

      default:
        return NextResponse.json({
          error: 'Invalid action. Use "create_ticket", "add_message", "rate_ticket", or "request_callback"'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Error processing support request:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process support request',
        message: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

async function trackPremiumFeatureUsage(userId: string, featureName: string) {
  try {
    await prisma.featureUsageLog.create({
      data: {
        user_id: userId,
        feature_id: featureName,
        usage_count: 1,
        metadata: {
          endpoint: '/api/premium/support',
          timestamp: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Error tracking premium feature usage:', error);
  }
}