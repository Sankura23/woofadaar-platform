import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

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
    const service = searchParams.get('service') || 'all';
    const location = searchParams.get('location');
    const partnerId = searchParams.get('partner_id');

    // Verify premium access
    const premiumSubscription = await prisma.premiumSubscription.findFirst({
      where: {
        user_id: userId,
        status: { in: ['trial', 'active'] }
      }
    });

    if (!premiumSubscription) {
      return NextResponse.json({
        error: 'Premium subscription required',
        message: 'Priority booking is available with premium subscription',
        benefits: [
          'Skip the queue with priority booking',
          'Access to premium time slots',
          'Instant confirmation for many appointments',
          'Extended booking window (30 days vs 7 days)'
        ],
        upgrade_options: {
          trial: 'Start 14-day free trial',
          premium: 'Get premium access for ₹99/month'
        }
      }, { status: 403 });
    }

    // Get available partners with priority slots
    const whereClause: any = {
      verified: true,
      status: 'active'
    };

    if (partnerId) {
      whereClause.id = partnerId;
    }

    if (service !== 'all') {
      whereClause.partner_type = service;
    }

    if (location) {
      whereClause.location = { contains: location, mode: 'insensitive' };
    }

    const partners = await prisma.partner.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        business_name: true,
        partner_type: true,
        specialization: true,
        location: true,
        rating_average: true,
        rating_count: true,
        verified: true,
        availability_schedule: true,
        pricing_info: true,
        services_offered: true
      },
      orderBy: [
        { rating_average: 'desc' },
        { rating_count: 'desc' }
      ]
    });

    // Get priority booking statistics
    const priorityBookingStats = await prisma.partnerBooking.groupBy({
      by: ['status'],
      where: {
        user_id: userId,
        created_at: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      _count: { _all: true }
    });

    // Generate priority availability for each partner
    const partnersWithPriority = partners.map(partner => {
      const prioritySlots = generatePrioritySlots(partner.availability_schedule);
      const regularSlots = generateRegularSlots(partner.availability_schedule);
      
      return {
        ...partner,
        priority_booking: {
          available_slots: prioritySlots,
          regular_slots: regularSlots,
          premium_benefits: {
            priority_access: true,
            instant_confirmation: partner.rating_average >= 4.5,
            extended_booking_window: '30 days',
            premium_support: true,
            cancellation_flexibility: '24 hours notice',
            rescheduling_options: 'Unlimited'
          },
          estimated_wait_time: calculateWaitTime(partner.id, true),
          next_available_priority: prioritySlots[0] || null,
          pricing: {
            base_fee: extractServiceFee(partner.pricing_info, service),
            premium_discount: 0, // Premium users get priority, not necessarily discount
            priority_booking_fee: 0 // No additional fee for premium users
          }
        }
      };
    });

    return NextResponse.json({
      success: true,
      premium_status: {
        subscription_type: premiumSubscription.subscription_type,
        priority_access: true,
        booking_window: '30 days',
        instant_confirmation_available: true
      },
      available_partners: partnersWithPriority,
      booking_history: {
        total_bookings: priorityBookingStats.reduce((sum, stat) => sum + stat._count._all, 0),
        successful_bookings: priorityBookingStats.find(s => s.status === 'confirmed')?._count._all || 0,
        average_confirmation_time: '< 15 minutes' // Premium users get faster confirmation
      },
      priority_benefits: {
        queue_position: 'Always first in line',
        booking_window: '30 days in advance (vs 7 days for free users)',
        confirmation_speed: 'Instant for top-rated partners',
        cancellation_policy: '24-hour free cancellation',
        rescheduling: 'Unlimited rescheduling options',
        customer_support: 'Priority customer support'
      }
    });

  } catch (error) {
    console.error('Error fetching priority booking options:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
    const {
      partner_id,
      dog_id,
      service_type,
      appointment_datetime,
      duration_minutes = 60,
      notes,
      priority_level = 'high',
      auto_confirm = false
    } = body;

    // Verify premium access
    const premiumSubscription = await prisma.premiumSubscription.findFirst({
      where: {
        user_id: userId,
        status: { in: ['trial', 'active'] }
      }
    });

    if (!premiumSubscription) {
      return NextResponse.json({
        error: 'Premium subscription required for priority booking'
      }, { status: 403 });
    }

    // Validate partner and availability
    const partner = await prisma.partner.findUnique({
      where: { id: partner_id },
      select: {
        id: true,
        name: true,
        business_name: true,
        verified: true,
        status: true,
        availability_schedule: true,
        pricing_info: true,
        rating_average: true
      }
    });

    if (!partner || !partner.verified || partner.status !== 'active') {
      return NextResponse.json({
        error: 'Partner not available for booking'
      }, { status: 400 });
    }

    // Validate dog ownership
    const dog = await prisma.dog.findFirst({
      where: {
        id: dog_id,
        user_id: userId
      }
    });

    if (!dog) {
      return NextResponse.json({
        error: 'Dog not found or access denied'
      }, { status: 404 });
    }

    // Check for appointment conflicts (premium users get priority in case of conflicts)
    const appointmentDate = new Date(appointment_datetime);
    const conflictingBookings = await prisma.partnerBooking.findMany({
      where: {
        partner_id: partner_id,
        appointment_datetime: {
          gte: new Date(appointmentDate.getTime() - 30 * 60 * 1000), // 30 min before
          lte: new Date(appointmentDate.getTime() + duration_minutes * 60 * 1000) // booking duration
        },
        status: { in: ['pending', 'confirmed'] }
      }
    });

    // Premium users can override non-premium bookings if partner allows
    const canOverride = conflictingBookings.length > 0 && 
                       conflictingBookings.every(booking => !isBookingFromPremiumUser(booking.user_id));

    if (conflictingBookings.length > 0 && !canOverride) {
      return NextResponse.json({
        error: 'Time slot not available',
        suggested_times: await suggestAlternativeSlots(partner_id, appointmentDate, duration_minutes),
        message: 'Premium users get priority, but this slot is already taken by another premium user'
      }, { status: 409 });
    }

    // Calculate pricing
    const baseFee = extractServiceFee(partner.pricing_info, service_type);
    const priorityBookingFee = 0; // No additional fee for premium users
    const totalFee = baseFee;

    // Determine if instant confirmation is available
    const instantConfirmation = auto_confirm && 
                               partner.rating_average >= 4.5 &&
                               !conflictingBookings.length;

    // Create priority booking
    const booking = await prisma.partnerBooking.create({
      data: {
        partner_id: partner_id,
        user_id: userId,
        dog_id: dog_id,
        service_type: service_type,
        booking_type: 'priority',
        appointment_datetime: appointmentDate,
        duration_minutes: duration_minutes,
        status: instantConfirmation ? 'confirmed' : 'priority_pending',
        notes: notes,
        user_notes: `Priority booking - Premium user`,
        price: totalFee,
        payment_status: 'pending',
        priority_level: priority_level,
        created_at: new Date(),
        updated_at: new Date()
      },
      include: {
        partner: {
          select: {
            name: true,
            business_name: true,
            location: true,
            phone: true
          }
        },
        dog: {
          select: {
            name: true,
            breed: true
          }
        }
      }
    });

    // If there were conflicts, notify other users about the priority override
    if (canOverride && conflictingBookings.length > 0) {
      await handlePriorityOverride(conflictingBookings, booking);
    }

    // Track priority booking usage
    await trackFeatureUsage(premiumSubscription.id, 'priority_booking');

    // Send confirmation notifications
    await sendPriorityBookingConfirmation(booking);

    return NextResponse.json({
      success: true,
      message: instantConfirmation 
        ? 'Priority booking confirmed instantly!'
        : 'Priority booking submitted and will be confirmed shortly',
      booking: {
        id: booking.id,
        partner: booking.partner,
        dog: booking.dog,
        service_type: booking.service_type,
        appointment_datetime: booking.appointment_datetime,
        duration_minutes: booking.duration_minutes,
        status: booking.status,
        price: booking.price,
        priority_level: booking.priority_level,
        instant_confirmation: instantConfirmation
      },
      premium_benefits_applied: {
        priority_queue_position: 1,
        instant_confirmation: instantConfirmation,
        no_additional_fees: true,
        flexible_cancellation: true,
        priority_support: true
      },
      next_steps: instantConfirmation 
        ? [
            'Booking confirmed! You will receive a calendar invite',
            'Partner will contact you 24 hours before appointment',
            'Free cancellation available up to 24 hours before'
          ]
        : [
            'Your booking is being processed with priority',
            'You will receive confirmation within 15 minutes',
            'Premium support is available if needed'
          ]
    });

  } catch (error) {
    console.error('Error creating priority booking:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions
function generatePrioritySlots(schedule: any): string[] {
  // Generate priority time slots (early morning, late evening)
  const slots = [];
  const now = new Date();
  
  // Premium users get access to slots 30 days in advance vs 7 days for free users
  for (let i = 0; i < 30; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() + i);
    
    // Priority slots: 8 AM, 12 PM, 6 PM
    const priorityHours = [8, 12, 18];
    priorityHours.forEach(hour => {
      const slot = new Date(date);
      slot.setHours(hour, 0, 0, 0);
      if (slot > now) {
        slots.push(slot.toISOString());
      }
    });
  }
  
  return slots.slice(0, 20); // Return top 20 priority slots
}

function generateRegularSlots(schedule: any): string[] {
  // Generate regular available slots
  const slots = [];
  const now = new Date();
  
  for (let i = 0; i < 14; i++) { // Regular users get 14 days
    const date = new Date(now);
    date.setDate(date.getDate() + i);
    
    // Regular hours: 10 AM, 2 PM, 4 PM
    const regularHours = [10, 14, 16];
    regularHours.forEach(hour => {
      const slot = new Date(date);
      slot.setHours(hour, 0, 0, 0);
      if (slot > now) {
        slots.push(slot.toISOString());
      }
    });
  }
  
  return slots.slice(0, 15);
}

function calculateWaitTime(partnerId: string, isPriority: boolean): string {
  // Premium users get priority, so shorter wait times
  return isPriority ? '< 15 minutes' : '2-4 hours';
}

function extractServiceFee(pricingInfo: any, serviceType: string): number {
  const defaultPricing = {
    'consultation': 500,
    'checkup': 800,
    'grooming': 1200,
    'training': 1000,
    'emergency': 1500
  };

  if (pricingInfo && typeof pricingInfo === 'object') {
    return pricingInfo[serviceType] || pricingInfo.consultation || 500;
  }

  return (defaultPricing as any)[serviceType] || 500;
}

async function isBookingFromPremiumUser(userId: string): Promise<boolean> {
  const subscription = await prisma.premiumSubscription.findFirst({
    where: {
      user_id: userId,
      status: { in: ['trial', 'active'] }
    }
  });
  
  return !!subscription;
}

async function suggestAlternativeSlots(partnerId: string, requestedDate: Date, duration: number): Promise<string[]> {
  const alternatives = [];
  
  // Suggest slots within 24 hours of requested time
  for (let i = 1; i <= 24; i++) {
    const altDate = new Date(requestedDate);
    altDate.setHours(altDate.getHours() + i);
    alternatives.push(altDate.toISOString());
  }
  
  return alternatives.slice(0, 5);
}

async function handlePriorityOverride(conflictingBookings: any[], priorityBooking: any) {
  // In a real implementation, this would:
  // 1. Move conflicting bookings to alternative slots
  // 2. Send notifications to affected users
  // 3. Offer compensation or priority for future bookings
  
  console.log(`Priority booking ${priorityBooking.id} overrode ${conflictingBookings.length} regular bookings`);
  
  // For now, just log the override
  for (const booking of conflictingBookings) {
    console.log(`Booking ${booking.id} moved due to priority booking`);
  }
}

async function trackFeatureUsage(subscriptionId: string, feature: string) {
  const currentMonth = new Date().toISOString().substring(0, 7);
  
  try {
    await prisma.premiumFeatureUsage.upsert({
      where: {
        premium_subscription_id_feature_name_usage_month: {
          premium_subscription_id: subscriptionId,
          feature_name: feature,
          usage_month: currentMonth
        }
      },
      update: {
        usage_count: { increment: 1 },
        last_used_at: new Date()
      },
      create: {
        premium_subscription_id: subscriptionId,
        feature_name: feature,
        usage_count: 1,
        usage_month: currentMonth,
        monthly_limit: null, // Unlimited for priority booking
        last_used_at: new Date()
      }
    });
  } catch (error) {
    console.error('Error tracking feature usage:', error);
  }
}

async function sendPriorityBookingConfirmation(booking: any) {
  // In a real implementation, this would send:
  // 1. Email confirmation to user
  // 2. SMS notification
  // 3. Calendar invite
  // 4. Notification to partner
  
  console.log(`Priority booking confirmation sent for booking ${booking.id}`);
  console.log(`- Partner: ${booking.partner.name}`);
  console.log(`- Time: ${booking.appointment_datetime}`);
  console.log(`- Status: ${booking.status}`);
}