// Week 26 Phase 3: Premium Customer Support Service
// Priority support system for premium subscribers with dedicated assistance

import prisma from './db';

export interface SupportTicket {
  id: string;
  user_id: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'technical' | 'billing' | 'insurance' | 'health' | 'appointment' | 'general';
  subject: string;
  description: string;
  status: 'open' | 'assigned' | 'in_progress' | 'pending_user' | 'resolved' | 'closed';
  is_premium: boolean;
  assigned_agent?: string;
  created_at: Date;
  updated_at: Date;
  first_response_time?: Date;
  resolution_time?: Date;
  satisfaction_rating?: number;
  attachments: string[];
  tags: string[];
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_type: 'user' | 'agent' | 'system';
  message: string;
  attachments: string[];
  is_internal_note: boolean;
  created_at: Date;
}

export interface PremiumSupportAgent {
  id: string;
  name: string;
  specializations: string[];
  languages: string[];
  availability_status: 'available' | 'busy' | 'offline';
  current_workload: number;
  max_tickets: number;
  rating: number;
  response_time_avg_minutes: number;
}

export interface SupportMetrics {
  total_tickets: number;
  open_tickets: number;
  resolved_tickets: number;
  avg_resolution_time_hours: number;
  avg_first_response_time_minutes: number;
  satisfaction_score: number;
  premium_priority_fulfilled: number;
}

export class PremiumSupportService {

  // Mock support agents (in production, this would come from database)
  private static readonly SUPPORT_AGENTS: PremiumSupportAgent[] = [
    {
      id: 'agent_001',
      name: 'Priya Sharma',
      specializations: ['insurance', 'billing', 'general'],
      languages: ['English', 'Hindi'],
      availability_status: 'available',
      current_workload: 3,
      max_tickets: 15,
      rating: 4.8,
      response_time_avg_minutes: 12
    },
    {
      id: 'agent_002',
      name: 'Rajesh Kumar',
      specializations: ['technical', 'appointments', 'health'],
      languages: ['English', 'Hindi', 'Tamil'],
      availability_status: 'available',
      current_workload: 5,
      max_tickets: 12,
      rating: 4.6,
      response_time_avg_minutes: 18
    },
    {
      id: 'agent_003',
      name: 'Anita Desai',
      specializations: ['health', 'insurance', 'emergency'],
      languages: ['English', 'Hindi', 'Gujarati'],
      availability_status: 'busy',
      current_workload: 8,
      max_tickets: 10,
      rating: 4.9,
      response_time_avg_minutes: 8
    }
  ];

  /**
   * Create premium support ticket with priority handling
   */
  static async createSupportTicket(
    userId: string,
    ticketData: {
      category: 'technical' | 'billing' | 'insurance' | 'health' | 'appointment' | 'general';
      subject: string;
      description: string;
      priority?: 'low' | 'medium' | 'high' | 'critical';
      attachments?: string[];
      tags?: string[];
    }
  ): Promise<{ success: boolean; ticket_id?: string; message: string; expected_response_time?: string }> {
    try {
      // Check if user is premium
      const subscription = await prisma.subscription.findFirst({
        where: {
          user_id: userId,
          status: 'active'
        }
      });

      const isPremium = subscription !== null;
      
      // Auto-determine priority for premium users
      let priority = ticketData.priority || 'medium';
      if (isPremium) {
        if (ticketData.category === 'health' || ticketData.category === 'insurance') {
          priority = priority === 'low' ? 'medium' : 'high';
        }
        if (ticketData.subject.toLowerCase().includes('emergency') || 
            ticketData.description.toLowerCase().includes('urgent')) {
          priority = 'critical';
        }
      }

      // Create support ticket
      const ticket = await prisma.supportTicket.create({
        data: {
          user_id: userId,
          priority,
          category: ticketData.category,
          subject: ticketData.subject,
          description: ticketData.description,
          status: 'open',
          is_premium: isPremium,
          attachments: ticketData.attachments || [],
          tags: ticketData.tags || [],
          metadata: {
            created_via: 'api',
            user_premium_status: isPremium,
            auto_priority_adjusted: isPremium && ticketData.priority !== priority
          }
        }
      });

      // Auto-assign to best available agent for premium users
      if (isPremium) {
        const assignedAgent = await this.assignBestAvailableAgent(ticket.id, ticketData.category, priority);
        if (assignedAgent) {
          await prisma.supportTicket.update({
            where: { id: ticket.id },
            data: {
              assigned_agent: assignedAgent.id,
              status: 'assigned',
              assigned_at: new Date()
            }
          });
        }
      }

      // Create initial system message
      await prisma.supportMessage.create({
        data: {
          ticket_id: ticket.id,
          sender_id: 'system',
          sender_type: 'system',
          message: this.generateWelcomeMessage(isPremium, priority, ticketData.category),
          is_internal_note: false
        }
      });

      // Track feature usage
      await this.trackFeatureUsage(userId, 'premium_support_ticket');

      const expectedResponseTime = this.getExpectedResponseTime(isPremium, priority);

      return {
        success: true,
        ticket_id: ticket.id,
        message: isPremium 
          ? `Premium support ticket created successfully! Our dedicated support team will respond within ${expectedResponseTime}.`
          : `Support ticket created successfully! Expected response time: ${expectedResponseTime}.`,
        expected_response_time: expectedResponseTime
      };

    } catch (error) {
      console.error('Error creating support ticket:', error);
      return {
        success: false,
        message: 'Failed to create support ticket. Please try again.'
      };
    }
  }

  /**
   * Get user's support tickets with premium prioritization
   */
  static async getUserSupportTickets(
    userId: string,
    limit: number = 20,
    offset: number = 0,
    status?: string
  ): Promise<any> {
    try {
      const whereClause: any = { user_id: userId };
      if (status) {
        whereClause.status = status;
      }

      const tickets = await prisma.supportTicket.findMany({
        where: whereClause,
        orderBy: [
          { is_premium: 'desc' }, // Premium tickets first
          { priority: 'desc' },
          { created_at: 'desc' }
        ],
        take: limit,
        skip: offset,
        include: {
          messages: {
            where: { is_internal_note: false },
            orderBy: { created_at: 'desc' },
            take: 1 // Latest message
          }
        }
      });

      const totalTickets = await prisma.supportTicket.count({
        where: whereClause
      });

      // Check if user is premium for additional details
      const isPremium = await this.checkPremiumAccess(userId);

      return {
        success: true,
        support_tickets: tickets.map(ticket => ({
          id: ticket.id,
          priority: ticket.priority,
          category: ticket.category,
          subject: ticket.subject,
          description: ticket.description.substring(0, 200) + (ticket.description.length > 200 ? '...' : ''),
          status: ticket.status,
          is_premium: ticket.is_premium,
          assigned_agent: ticket.assigned_agent,
          created_at: ticket.created_at,
          updated_at: ticket.updated_at,
          first_response_time: ticket.first_response_time,
          resolution_time: ticket.resolution_time,
          satisfaction_rating: ticket.satisfaction_rating,
          latest_message: ticket.messages[0] || null,
          premium_benefits: isPremium ? {
            priority_handling: true,
            dedicated_agent: ticket.assigned_agent !== null,
            faster_response: true,
            direct_phone_support: true
          } : null
        })),
        pagination: {
          total: totalTickets,
          limit,
          offset,
          has_more: offset + limit < totalTickets
        },
        user_premium_status: isPremium,
        support_benefits: isPremium ? {
          priority_queue: 'Your tickets get priority handling',
          dedicated_agents: 'Assigned to specialized support agents',
          faster_response: 'Guaranteed response within premium SLA',
          phone_support: 'Direct phone support available',
          escalation: 'Direct escalation to senior support'
        } : {
          upgrade_benefits: 'Upgrade to premium for priority support, dedicated agents, and faster response times'
        }
      };

    } catch (error) {
      console.error('Error fetching support tickets:', error);
      return {
        success: false,
        message: 'Failed to fetch support tickets'
      };
    }
  }

  /**
   * Get specific support ticket with conversation history
   */
  static async getSupportTicketDetails(
    ticketId: string,
    userId: string
  ): Promise<any> {
    try {
      const ticket = await prisma.supportTicket.findFirst({
        where: {
          id: ticketId,
          user_id: userId
        },
        include: {
          messages: {
            where: { is_internal_note: false },
            orderBy: { created_at: 'asc' }
          }
        }
      });

      if (!ticket) {
        return {
          success: false,
          error: 'Support ticket not found'
        };
      }

      // Get agent details if assigned
      let agentDetails = null;
      if (ticket.assigned_agent) {
        agentDetails = this.SUPPORT_AGENTS.find(agent => agent.id === ticket.assigned_agent);
      }

      return {
        success: true,
        support_ticket: {
          id: ticket.id,
          priority: ticket.priority,
          category: ticket.category,
          subject: ticket.subject,
          description: ticket.description,
          status: ticket.status,
          is_premium: ticket.is_premium,
          assigned_agent: agentDetails ? {
            id: agentDetails.id,
            name: agentDetails.name,
            specializations: agentDetails.specializations,
            rating: agentDetails.rating,
            avg_response_time: agentDetails.response_time_avg_minutes
          } : null,
          created_at: ticket.created_at,
          updated_at: ticket.updated_at,
          first_response_time: ticket.first_response_time,
          resolution_time: ticket.resolution_time,
          satisfaction_rating: ticket.satisfaction_rating,
          attachments: ticket.attachments,
          tags: ticket.tags,
          messages: ticket.messages.map(msg => ({
            id: msg.id,
            sender_type: msg.sender_type,
            sender_name: msg.sender_type === 'agent' && agentDetails ? agentDetails.name : 
                         msg.sender_type === 'user' ? 'You' : 'System',
            message: msg.message,
            attachments: msg.attachments,
            created_at: msg.created_at
          })),
          premium_benefits: ticket.is_premium ? {
            priority_status: 'High priority handling',
            response_sla: this.getExpectedResponseTime(true, ticket.priority),
            escalation_available: true,
            phone_support: '+91-80-4567-8900'
          } : null
        }
      };

    } catch (error) {
      console.error('Error fetching ticket details:', error);
      return {
        success: false,
        error: 'Failed to fetch ticket details'
      };
    }
  }

  /**
   * Add message to support ticket
   */
  static async addMessageToTicket(
    ticketId: string,
    userId: string,
    message: string,
    attachments: string[] = []
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Verify ticket ownership
      const ticket = await prisma.supportTicket.findFirst({
        where: {
          id: ticketId,
          user_id: userId
        }
      });

      if (!ticket) {
        return {
          success: false,
          message: 'Support ticket not found'
        };
      }

      if (ticket.status === 'closed') {
        return {
          success: false,
          message: 'Cannot add message to closed ticket'
        };
      }

      // Add message
      await prisma.supportMessage.create({
        data: {
          ticket_id: ticketId,
          sender_id: userId,
          sender_type: 'user',
          message,
          attachments,
          is_internal_note: false
        }
      });

      // Update ticket status if it was resolved
      if (ticket.status === 'resolved') {
        await prisma.supportTicket.update({
          where: { id: ticketId },
          data: {
            status: 'pending_user',
            updated_at: new Date()
          }
        });
      } else {
        await prisma.supportTicket.update({
          where: { id: ticketId },
          data: { updated_at: new Date() }
        });
      }

      return {
        success: true,
        message: 'Message added successfully'
      };

    } catch (error) {
      console.error('Error adding message to ticket:', error);
      return {
        success: false,
        message: 'Failed to add message'
      };
    }
  }

  /**
   * Rate support ticket satisfaction
   */
  static async rateSupportTicket(
    ticketId: string,
    userId: string,
    rating: number,
    feedback?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (rating < 1 || rating > 5) {
        return {
          success: false,
          message: 'Rating must be between 1 and 5'
        };
      }

      const ticket = await prisma.supportTicket.findFirst({
        where: {
          id: ticketId,
          user_id: userId
        }
      });

      if (!ticket) {
        return {
          success: false,
          message: 'Support ticket not found'
        };
      }

      await prisma.supportTicket.update({
        where: { id: ticketId },
        data: {
          satisfaction_rating: rating,
          satisfaction_feedback: feedback,
          status: 'closed',
          closed_at: new Date()
        }
      });

      // Add feedback message if provided
      if (feedback) {
        await prisma.supportMessage.create({
          data: {
            ticket_id: ticketId,
            sender_id: userId,
            sender_type: 'user',
            message: `Rating: ${rating}/5 stars\nFeedback: ${feedback}`,
            is_internal_note: false
          }
        });
      }

      return {
        success: true,
        message: 'Thank you for your feedback!'
      };

    } catch (error) {
      console.error('Error rating support ticket:', error);
      return {
        success: false,
        message: 'Failed to submit rating'
      };
    }
  }

  /**
   * Request premium phone support callback
   */
  static async requestPhoneCallback(
    userId: string,
    ticketId: string,
    phoneNumber: string,
    preferredTime: string
  ): Promise<{ success: boolean; message: string; callback_scheduled?: any }> {
    try {
      const isPremium = await this.checkPremiumAccess(userId);
      
      if (!isPremium) {
        return {
          success: false,
          message: 'Phone support is available only for premium subscribers. Upgrade to ₹99/month for priority phone support.'
        };
      }

      // Verify ticket ownership
      const ticket = await prisma.supportTicket.findFirst({
        where: {
          id: ticketId,
          user_id: userId
        }
      });

      if (!ticket) {
        return {
          success: false,
          message: 'Support ticket not found'
        };
      }

      // Schedule callback
      const callback = await prisma.supportPhoneCallback.create({
        data: {
          user_id: userId,
          ticket_id: ticketId,
          phone_number: phoneNumber,
          preferred_time: new Date(preferredTime),
          status: 'scheduled',
          priority: ticket.priority,
          metadata: {
            ticket_category: ticket.category,
            user_premium: true,
            scheduled_timestamp: new Date().toISOString()
          }
        }
      });

      // Add message to ticket
      await prisma.supportMessage.create({
        data: {
          ticket_id: ticketId,
          sender_id: 'system',
          sender_type: 'system',
          message: `Premium phone callback scheduled for ${preferredTime}. Our support team will call you at ${phoneNumber}.`,
          is_internal_note: false
        }
      });

      return {
        success: true,
        message: 'Phone callback scheduled successfully! Our premium support team will call you at the requested time.',
        callback_scheduled: {
          id: callback.id,
          phone_number: phoneNumber,
          preferred_time: preferredTime,
          priority: ticket.priority,
          expected_call_window: '15 minutes before/after scheduled time'
        }
      };

    } catch (error) {
      console.error('Error scheduling phone callback:', error);
      return {
        success: false,
        message: 'Failed to schedule phone callback'
      };
    }
  }

  // Helper Methods
  private static async assignBestAvailableAgent(
    ticketId: string,
    category: string,
    priority: string
  ): Promise<PremiumSupportAgent | null> {
    // Find best available agent based on specialization and workload
    const availableAgents = this.SUPPORT_AGENTS
      .filter(agent => 
        agent.availability_status === 'available' &&
        agent.current_workload < agent.max_tickets &&
        agent.specializations.includes(category)
      )
      .sort((a, b) => {
        // Priority agents for critical tickets
        if (priority === 'critical') {
          return a.response_time_avg_minutes - b.response_time_avg_minutes;
        }
        // Balance workload and rating
        return (a.current_workload / a.max_tickets) - (b.current_workload / b.max_tickets);
      });

    return availableAgents[0] || null;
  }

  private static generateWelcomeMessage(isPremium: boolean, priority: string, category: string): string {
    if (isPremium) {
      return `🌟 Welcome to Woofadaar Premium Support!\n\nYour ${priority} priority ticket has been received and assigned to our specialized support team. As a premium member, you get:\n\n✅ Priority handling\n✅ Dedicated support agent\n✅ Faster response times\n✅ Phone support available\n\nWe'll respond to your ${category} query shortly. Thank you for being a valued premium member!`;
    } else {
      return `Thank you for contacting Woofadaar Support!\n\nYour ${category} ticket has been received and will be handled in the order it was received. Our team will respond as soon as possible.\n\n💡 Did you know? Premium subscribers get priority support with dedicated agents and faster response times!`;
    }
  }

  private static getExpectedResponseTime(isPremium: boolean, priority: string): string {
    if (!isPremium) {
      return '24-48 hours';
    }

    const premiumSLA = {
      'critical': '30 minutes',
      'high': '2 hours',
      'medium': '4 hours',
      'low': '8 hours'
    };

    return premiumSLA[priority as keyof typeof premiumSLA] || '4 hours';
  }

  private static async checkPremiumAccess(userId: string): Promise<boolean> {
    const subscription = await prisma.subscription.findFirst({
      where: {
        user_id: userId,
        status: 'active'
      }
    });
    return subscription !== null;
  }

  private static async trackFeatureUsage(userId: string, featureName: string): Promise<void> {
    try {
      await prisma.featureUsageLog.create({
        data: {
          user_id: userId,
          feature_id: featureName,
          usage_count: 1,
          metadata: {
            timestamp: new Date(),
            service: 'premium_support'
          }
        }
      });
    } catch (error) {
      console.error('Error tracking feature usage:', error);
    }
  }
}