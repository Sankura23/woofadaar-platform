// Week 26 Phase 2: Priority Vet Booking System
// Premium users get priority access to vet appointments and exclusive slots

import prisma from './db';

export interface VetSlot {
  id: string;
  vet_partner_id: string;
  slot_date: Date;
  slot_time: string;
  duration_minutes: number;
  slot_type: 'regular' | 'premium' | 'emergency';
  is_available: boolean;
  is_premium_only: boolean;
  price?: number;
  vet_info: {
    name: string;
    specializations: string[];
    rating: number;
    experience_years: number;
    location: string;
  };
}

export interface BookingRequest {
  userId: string;
  dogId: string;
  slotId?: string;
  preferredDate?: Date;
  appointmentType: 'regular' | 'premium' | 'emergency' | 'telemedicine';
  reason: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  specialization?: string;
  notes?: string;
}

export interface BookingResult {
  success: boolean;
  appointmentId?: string;
  message: string;
  appointment?: {
    id: string;
    date: Date;
    time: string;
    vet_name: string;
    appointment_type: string;
    cost?: number;
    meeting_link?: string;
  };
  alternatives?: VetSlot[];
}

export class PriorityVetBookingService {
  
  /**
   * Get available vet slots for premium users with priority access
   */
  static async getAvailableSlots(
    userId: string,
    filters: {
      date?: Date;
      specialization?: string;
      location?: string;
      appointment_type?: string;
      emergency?: boolean;
    } = {}
  ): Promise<VetSlot[]> {
    try {
      // Check if user has premium access
      const isPremium = await this.checkPremiumAccess(userId);
      
      const currentDate = new Date();
      const searchDate = filters.date || currentDate;
      const endDate = new Date(searchDate);
      endDate.setDate(endDate.getDate() + 30); // Search 30 days ahead

      // Build where clause
      const whereClause: any = {
        slot_date: {
          gte: searchDate,
          lte: endDate
        },
        is_available: true,
        current_bookings: {
          lt: prisma.vetAppointmentSlot.fields.max_bookings
        }
      };

      // Premium users get access to premium-only slots
      if (!isPremium) {
        whereClause.is_premium_only = false;
      }

      // Emergency slots for urgent needs
      if (filters.emergency) {
        whereClause.slot_type = 'emergency';
      }

      const slots = await prisma.vetAppointmentSlot.findMany({
        where: whereClause,
        include: {
          vet_partner: {
            include: {
              VetPartnerProfile: true
            }
          }
        },
        orderBy: [
          { slot_date: 'asc' },
          { slot_time: 'asc' }
        ],
        take: isPremium ? 50 : 20 // Premium users see more options
      });

      // Filter by specialization if requested
      const filteredSlots = slots.filter(slot => {
        if (filters.specialization && slot.vet_partner.VetPartnerProfile) {
          return slot.vet_partner.VetPartnerProfile.specializations.includes(filters.specialization);
        }
        return true;
      });

      // Convert to VetSlot format
      return filteredSlots.map(slot => ({
        id: slot.id,
        vet_partner_id: slot.vet_partner_id,
        slot_date: slot.slot_date,
        slot_time: slot.slot_time,
        duration_minutes: slot.duration_minutes,
        slot_type: slot.slot_type as any,
        is_available: slot.is_available,
        is_premium_only: slot.is_premium_only,
        price: slot.price,
        vet_info: {
          name: slot.vet_partner.name,
          specializations: slot.vet_partner.VetPartnerProfile?.specializations || [],
          rating: slot.vet_partner.VetPartnerProfile?.rating_average || 0,
          experience_years: slot.vet_partner.VetPartnerProfile?.experience_years || 0,
          location: slot.vet_partner.location || 'Location not specified'
        }
      }));

    } catch (error) {
      console.error('Error fetching available slots:', error);
      throw new Error('Failed to fetch available appointment slots');
    }
  }

  /**
   * Book a priority vet appointment
   */
  static async bookAppointment(request: BookingRequest): Promise<BookingResult> {
    try {
      // Verify premium access for priority booking
      const isPremium = await this.checkPremiumAccess(request.userId);
      
      if (!isPremium && (request.appointmentType === 'premium' || request.priority === 'high' || request.priority === 'urgent')) {
        return {
          success: false,
          message: 'Premium subscription required for priority appointments. Upgrade to ₹99/month for instant access.',
          alternatives: await this.getAvailableSlots(request.userId, { emergency: false })
        };
      }

      // Verify dog ownership
      const dog = await prisma.dog.findFirst({
        where: {
          id: request.dogId,
          user_id: request.userId
        }
      });

      if (!dog) {
        return {
          success: false,
          message: 'Dog not found or access denied'
        };
      }

      let slot = null;
      let vet_partner = null;

      if (request.slotId) {
        // Book specific slot
        slot = await prisma.vetAppointmentSlot.findUnique({
          where: { id: request.slotId },
          include: { vet_partner: { include: { VetPartnerProfile: true } } }
        });

        if (!slot || !slot.is_available || slot.current_bookings >= slot.max_bookings) {
          return {
            success: false,
            message: 'Selected slot is no longer available',
            alternatives: await this.getAvailableSlots(request.userId, {
              date: request.preferredDate,
              specialization: request.specialization
            })
          };
        }

        // Check premium-only slot access
        if (slot.is_premium_only && !isPremium) {
          return {
            success: false,
            message: 'This slot is reserved for premium subscribers. Upgrade to ₹99/month for access.',
            alternatives: await this.getAvailableSlots(request.userId, { emergency: false })
          };
        }

        vet_partner = slot.vet_partner;
      } else {
        // Auto-assign based on preferences
        const availableSlots = await this.getAvailableSlots(request.userId, {
          date: request.preferredDate,
          specialization: request.specialization,
          emergency: request.priority === 'urgent'
        });

        if (availableSlots.length === 0) {
          return {
            success: false,
            message: 'No available slots found for your criteria',
            alternatives: await this.getAvailableSlots(request.userId, {})
          };
        }

        // Premium users get priority slot selection
        const selectedSlot = isPremium ? availableSlots[0] : availableSlots.find(s => !s.is_premium_only) || availableSlots[0];
        
        slot = await prisma.vetAppointmentSlot.findUnique({
          where: { id: selectedSlot.id },
          include: { vet_partner: { include: { VetPartnerProfile: true } } }
        });

        if (!slot) {
          return {
            success: false,
            message: 'Selected slot is no longer available'
          };
        }

        vet_partner = slot.vet_partner;
      }

      // Create the appointment
      const appointment = await prisma.vetAppointment.create({
        data: {
          dog_id: request.dogId,
          user_id: request.userId,
          vet_id: vet_partner.id,
          slot_id: slot.id,
          appointment_datetime: new Date(`${slot.slot_date.toISOString().split('T')[0]}T${slot.slot_time}:00`),
          appointment_time: slot.slot_time,
          reason: request.reason,
          appointment_type: request.appointmentType,
          priority_level: request.priority,
          status: 'scheduled',
          duration_minutes: slot.duration_minutes,
          cost: slot.price ? slot.price / 100 : undefined, // Convert paisa to rupees
          is_premium_booking: isPremium,
          booking_source: 'priority_booking',
          notes: request.notes,
          meeting_link: request.appointmentType === 'telemedicine' ? await this.generateMeetingLink() : undefined,
          metadata: {
            booking_timestamp: new Date(),
            user_premium_status: isPremium,
            slot_type: slot.slot_type,
            auto_assigned: !request.slotId
          }
        }
      });

      // Update slot availability
      await prisma.vetAppointmentSlot.update({
        where: { id: slot.id },
        data: {
          current_bookings: { increment: 1 },
          is_available: slot.current_bookings + 1 >= slot.max_bookings ? false : true
        }
      });

      // Track premium feature usage
      if (isPremium) {
        await this.trackFeatureUsage(request.userId, 'priority_vet_booking');
      }

      // Schedule reminders for premium users
      if (isPremium) {
        await this.scheduleReminders(appointment.id);
      }

      return {
        success: true,
        appointmentId: appointment.id,
        message: isPremium 
          ? 'Priority appointment booked successfully! You will receive reminders and priority support.'
          : 'Appointment booked successfully!',
        appointment: {
          id: appointment.id,
          date: appointment.appointment_datetime,
          time: slot.slot_time,
          vet_name: vet_partner.name,
          appointment_type: appointment.appointment_type,
          cost: slot.price ? slot.price / 100 : undefined,
          meeting_link: appointment.meeting_link
        }
      };

    } catch (error) {
      console.error('Error booking appointment:', error);
      return {
        success: false,
        message: 'Failed to book appointment. Please try again.'
      };
    }
  }

  /**
   * Get user's upcoming appointments with premium features
   */
  static async getUserAppointments(userId: string, includeHistory: boolean = false): Promise<any[]> {
    try {
      const isPremium = await this.checkPremiumAccess(userId);
      
      const whereClause: any = {
        user_id: userId
      };

      if (!includeHistory) {
        whereClause.appointment_datetime = {
          gte: new Date()
        };
      }

      const appointments = await prisma.vetAppointment.findMany({
        where: whereClause,
        include: {
          dog: {
            select: { id: true, name: true, breed: true, age_months: true }
          },
          vet: {
            select: { 
              id: true, 
              name: true, 
              location: true,
              contact_phone: true,
              email: true
            },
            include: {
              VetPartnerProfile: {
                select: {
                  specializations: true,
                  rating_average: true,
                  emergency_available: true,
                  telemedicine_enabled: true
                }
              }
            }
          },
          slot: {
            select: {
              slot_type: true,
              is_premium_only: true
            }
          },
          payment: {
            select: {
              id: true,
              amount: true,
              status: true,
              razorpay_payment_id: true
            }
          }
        },
        orderBy: {
          appointment_datetime: 'asc'
        }
      });

      return appointments.map(appointment => ({
        id: appointment.id,
        dog: appointment.dog,
        vet: {
          ...appointment.vet,
          specializations: appointment.vet?.VetPartnerProfile?.specializations || [],
          rating: appointment.vet?.VetPartnerProfile?.rating_average || 0,
          emergency_available: appointment.vet?.VetPartnerProfile?.emergency_available || false,
          telemedicine_enabled: appointment.vet?.VetPartnerProfile?.telemedicine_enabled || false
        },
        appointment_datetime: appointment.appointment_datetime,
        appointment_time: appointment.appointment_time,
        reason: appointment.reason,
        appointment_type: appointment.appointment_type,
        priority_level: appointment.priority_level,
        status: appointment.status,
        duration_minutes: appointment.duration_minutes,
        cost: appointment.cost,
        payment_status: appointment.payment_status,
        payment: appointment.payment,
        is_premium_booking: appointment.is_premium_booking,
        meeting_link: isPremium ? appointment.meeting_link : null, // Only show for premium
        consultation_notes: isPremium ? appointment.consultation_notes : null, // Premium feature
        prescription: isPremium ? appointment.prescription : null, // Premium feature
        follow_up_date: appointment.follow_up_date,
        follow_up_notes: isPremium ? appointment.follow_up_notes : null, // Premium feature
        rating: appointment.rating,
        feedback: appointment.feedback,
        emergency_consultation: appointment.emergency_consultation,
        slot_info: appointment.slot,
        metadata: isPremium ? appointment.metadata : null // Premium feature
      }));

    } catch (error) {
      console.error('Error fetching user appointments:', error);
      throw new Error('Failed to fetch appointments');
    }
  }

  /**
   * Emergency vet consultation for premium users
   */
  static async requestEmergencyConsultation(
    userId: string,
    dogId: string,
    emergencyData: {
      emergency_type: string;
      severity_level: string;
      description: string;
      symptoms: string[];
      photos?: string[];
      location?: any;
    }
  ): Promise<any> {
    try {
      const isPremium = await this.checkPremiumAccess(userId);
      
      if (!isPremium) {
        return {
          success: false,
          message: 'Emergency consultations are a premium feature. Upgrade to ₹99/month for instant access to emergency vet support.',
          upgrade_required: true
        };
      }

      // Create emergency consultation record
      const emergency = await prisma.emergencyConsultation.create({
        data: {
          user_id: userId,
          dog_id: dogId,
          emergency_type: emergencyData.emergency_type,
          severity_level: emergencyData.severity_level,
          description: emergencyData.description,
          symptoms: emergencyData.symptoms,
          photos: emergencyData.photos || [],
          location: emergencyData.location,
          status: 'submitted',
          is_premium_user: true,
          credits_used: 2 // Emergency consultations cost more credits
        }
      });

      // Auto-assign to available emergency expert
      const availableExpert = await this.findAvailableEmergencyExpert();
      if (availableExpert) {
        await prisma.emergencyConsultation.update({
          where: { id: emergency.id },
          data: {
            assigned_expert: availableExpert.id,
            assigned_at: new Date(),
            status: 'assigned'
          }
        });
      }

      // Track feature usage
      await this.trackFeatureUsage(userId, 'emergency_consultation');

      return {
        success: true,
        emergency_id: emergency.id,
        message: 'Emergency consultation submitted successfully. An expert will respond within 15 minutes.',
        expected_response_time: '15 minutes',
        assigned_expert: availableExpert ? {
          id: availableExpert.id,
          name: availableExpert.name,
          specialization: availableExpert.ExpertProfile?.specializations || []
        } : null
      };

    } catch (error) {
      console.error('Error requesting emergency consultation:', error);
      return {
        success: false,
        message: 'Failed to submit emergency consultation. Please try again.'
      };
    }
  }

  // Helper methods
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
            service: 'priority_vet_booking'
          }
        }
      });
    } catch (error) {
      console.error('Error tracking feature usage:', error);
    }
  }

  private static async generateMeetingLink(): Promise<string> {
    // In production, integrate with video conferencing service
    const meetingId = Math.random().toString(36).substring(2, 15);
    return `https://meet.woofadaar.com/vet-consultation/${meetingId}`;
  }

  private static async scheduleReminders(appointmentId: string): Promise<void> {
    // In production, integrate with notification service
    try {
      await prisma.vetAppointment.update({
        where: { id: appointmentId },
        data: { reminder_sent: false } // Will be updated when reminder is sent
      });
    } catch (error) {
      console.error('Error scheduling reminders:', error);
    }
  }

  private static async findAvailableEmergencyExpert(): Promise<any> {
    const expert = await prisma.expertProfile.findFirst({
      where: {
        verification_status: 'verified',
        availability_status: 'available',
        specializations: {
          hasSome: ['emergency', 'veterinary', 'health']
        }
      },
      include: {
        user: {
          select: { id: true, name: true }
        }
      },
      orderBy: {
        response_time_hours: 'asc'
      }
    });

    return expert ? {
      id: expert.user.id,
      name: expert.user.name,
      ExpertProfile: expert
    } : null;
  }
}