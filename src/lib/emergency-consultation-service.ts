// Week 26 Phase 2: Emergency Consultation Service
// Handle urgent pet health emergencies with priority expert access

import prisma from './db';
import { ExpertConsultationCreditService } from './expert-consultation-credits';

export interface EmergencyConsultationRequest {
  userId: string;
  dogId: string;
  emergencyType: 'poisoning' | 'injury' | 'breathing_difficulty' | 'seizure' | 'heat_stroke' | 'bleeding' | 'behavioral_emergency' | 'other';
  severityLevel: 'moderate' | 'high' | 'critical';
  description: string;
  symptoms: string[];
  photos?: string[];
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  contactPhone?: string;
}

export interface EmergencyResponse {
  success: boolean;
  emergency_id?: string;
  message: string;
  response_time?: string;
  assigned_expert?: {
    id: string;
    name: string;
    specializations: string[];
    contact?: string;
  };
  immediate_actions?: string[];
  escalation_required?: boolean;
  nearest_vet_clinics?: Array<{
    name: string;
    address: string;
    phone: string;
    distance_km: number;
    emergency_services: boolean;
  }>;
}

export interface EmergencyTriageResult {
  priority_level: 'low' | 'medium' | 'high' | 'critical';
  estimated_response_minutes: number;
  requires_immediate_vet_visit: boolean;
  first_aid_instructions: string[];
  warning_signs: string[];
  auto_escalate: boolean;
}

export class EmergencyConsultationService {

  /**
   * Submit emergency consultation with automated triage
   */
  static async submitEmergencyConsultation(
    request: EmergencyConsultationRequest
  ): Promise<EmergencyResponse> {
    try {
      // Verify premium access
      const isPremium = await this.checkPremiumAccess(request.userId);
      
      if (!isPremium) {
        return {
          success: false,
          message: 'Emergency consultations require premium subscription. For immediate veterinary care, please contact your nearest emergency vet clinic.',
          nearest_vet_clinics: await this.findNearestVetClinics(request.location)
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

      // Check emergency credits
      const creditBalance = await ExpertConsultationCreditService.getCreditBalance(request.userId);
      if (!creditBalance || creditBalance.emergency_credits < 3) {
        return {
          success: false,
          message: 'Insufficient emergency credits. Emergency consultations require 3 credits.',
          escalation_required: true,
          nearest_vet_clinics: await this.findNearestVetClinics(request.location)
        };
      }

      // Automated triage assessment
      const triageResult = await this.performEmergencyTriage(request);

      // Create emergency consultation record
      const emergency = await prisma.emergencyConsultation.create({
        data: {
          user_id: request.userId,
          dog_id: request.dogId,
          emergency_type: request.emergencyType,
          severity_level: request.severityLevel,
          description: request.description,
          symptoms: request.symptoms,
          photos: request.photos || [],
          location: request.location,
          contact_phone: request.contactPhone,
          triage_priority: triageResult.priority_level,
          requires_immediate_vet_visit: triageResult.requires_immediate_vet_visit,
          estimated_response_minutes: triageResult.estimated_response_minutes,
          status: 'submitted',
          is_premium_user: true,
          credits_used: 3,
          metadata: {
            triage_result: triageResult,
            submission_timestamp: new Date().toISOString(),
            automatic_triage: true
          }
        }
      });

      // Auto-assign expert based on priority and specialization
      const assignedExpert = await this.assignEmergencyExpert(request.emergencyType, triageResult.priority_level);

      let expertInfo = null;
      if (assignedExpert) {
        await prisma.emergencyConsultation.update({
          where: { id: emergency.id },
          data: {
            assigned_expert: assignedExpert.id,
            assigned_at: new Date(),
            status: 'assigned'
          }
        });

        expertInfo = {
          id: assignedExpert.id,
          name: assignedExpert.name,
          specializations: assignedExpert.ExpertProfile?.specializations || [],
          contact: assignedExpert.emergency_contact
        };
      }

      // Use emergency credits
      await ExpertConsultationCreditService.useCredits(
        request.userId,
        'emergency',
        assignedExpert?.id || 'system',
        emergency.id
      );

      // Send immediate automated response with first aid instructions
      const immediateActions = this.getImmediateFirstAidInstructions(request.emergencyType);
      
      // Create initial system response
      await prisma.consultationMessage.create({
        data: {
          consultation_id: emergency.consultation_id || emergency.id, // Fallback to emergency.id if consultation_id is null
          sender_id: 'system',
          sender_type: 'system',
          message: this.generateEmergencyResponseMessage(request, triageResult, immediateActions),
          message_type: 'emergency_response',
          is_automated: true
        }
      });

      // Track premium feature usage
      await this.trackFeatureUsage(request.userId, 'emergency_consultation');

      return {
        success: true,
        emergency_id: emergency.id,
        message: assignedExpert 
          ? `Emergency consultation submitted. Expert ${assignedExpert.name} has been notified and will respond within ${triageResult.estimated_response_minutes} minutes.`
          : 'Emergency consultation submitted. Our on-call expert team has been notified.',
        response_time: `${triageResult.estimated_response_minutes} minutes`,
        assigned_expert: expertInfo,
        immediate_actions: immediateActions,
        escalation_required: triageResult.requires_immediate_vet_visit,
        nearest_vet_clinics: triageResult.requires_immediate_vet_visit 
          ? await this.findNearestVetClinics(request.location)
          : undefined
      };

    } catch (error) {
      console.error('Emergency consultation submission error:', error);
      return {
        success: false,
        message: 'Failed to submit emergency consultation. For immediate help, please contact your nearest emergency vet clinic.',
        nearest_vet_clinics: await this.findNearestVetClinics(request.location)
      };
    }
  }

  /**
   * Get emergency consultation status and updates
   */
  static async getEmergencyConsultationStatus(emergencyId: string, userId: string): Promise<any> {
    try {
      const emergency = await prisma.emergencyConsultation.findFirst({
        where: {
          id: emergencyId,
          user_id: userId
        },
        include: {
          expert: {
            select: {
              id: true,
              name: true,
              ExpertProfile: {
                select: {
                  specializations: true,
                  emergency_contact: true
                }
              }
            }
          },
          dog: {
            select: { id: true, name: true, breed: true }
          },
          consultation: {
            include: {
              messages: {
                orderBy: { created_at: 'asc' }
              }
            }
          }
        }
      });

      if (!emergency) {
        return {
          success: false,
          error: 'Emergency consultation not found'
        };
      }

      return {
        success: true,
        emergency: {
          id: emergency.id,
          dog: emergency.dog,
          emergency_type: emergency.emergency_type,
          severity_level: emergency.severity_level,
          description: emergency.description,
          symptoms: emergency.symptoms,
          status: emergency.status,
          triage_priority: emergency.triage_priority,
          requires_immediate_vet_visit: emergency.requires_immediate_vet_visit,
          estimated_response_minutes: emergency.estimated_response_minutes,
          created_at: emergency.created_at,
          assigned_at: emergency.assigned_at,
          resolved_at: emergency.resolved_at,
          expert: emergency.expert ? {
            id: emergency.expert.id,
            name: emergency.expert.name,
            specializations: emergency.expert.ExpertProfile?.specializations || [],
            emergency_contact: emergency.expert.ExpertProfile?.emergency_contact
          } : null,
          credits_used: emergency.credits_used,
          messages: emergency.consultation?.messages || [],
          metadata: emergency.metadata
        }
      };

    } catch (error) {
      console.error('Error fetching emergency consultation status:', error);
      return {
        success: false,
        error: 'Failed to fetch consultation status'
      };
    }
  }

  /**
   * Escalate emergency to veterinary clinic
   */
  static async escalateToVetClinic(
    emergencyId: string,
    userId: string,
    reason: string
  ): Promise<{ success: boolean; message: string; clinic_contacts?: any[] }> {
    try {
      const emergency = await prisma.emergencyConsultation.findFirst({
        where: {
          id: emergencyId,
          user_id: userId
        }
      });

      if (!emergency) {
        return {
          success: false,
          message: 'Emergency consultation not found'
        };
      }

      // Update emergency status
      await prisma.emergencyConsultation.update({
        where: { id: emergencyId },
        data: {
          status: 'escalated_to_vet',
          escalation_reason: reason,
          escalated_at: new Date(),
          requires_immediate_vet_visit: true
        }
      });

      // Find nearest vet clinics
      const nearestClinics = await this.findNearestVetClinics(emergency.location);

      return {
        success: true,
        message: 'Emergency has been escalated to veterinary care. Please contact one of the nearby clinics immediately.',
        clinic_contacts: nearestClinics
      };

    } catch (error) {
      console.error('Error escalating emergency:', error);
      return {
        success: false,
        message: 'Failed to escalate emergency. Please contact your vet directly.'
      };
    }
  }

  // Helper Methods
  private static async performEmergencyTriage(request: EmergencyConsultationRequest): Promise<EmergencyTriageResult> {
    let priority: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    let responseMinutes = 60;
    let requiresVetVisit = false;
    let autoEscalate = false;

    // Critical emergency types
    const criticalTypes = ['poisoning', 'breathing_difficulty', 'seizure', 'heat_stroke'];
    if (criticalTypes.includes(request.emergencyType)) {
      priority = 'critical';
      responseMinutes = 15;
      requiresVetVisit = true;
      autoEscalate = true;
    }

    // High priority types
    const highPriorityTypes = ['injury', 'bleeding'];
    if (highPriorityTypes.includes(request.emergencyType)) {
      priority = 'high';
      responseMinutes = 30;
      requiresVetVisit = request.severityLevel === 'critical';
    }

    // Severity-based adjustments
    if (request.severityLevel === 'critical') {
      priority = 'critical';
      responseMinutes = Math.min(responseMinutes, 15);
      requiresVetVisit = true;
    } else if (request.severityLevel === 'high') {
      priority = priority === 'low' ? 'medium' : 'high';
      responseMinutes = Math.min(responseMinutes, 30);
    }

    // Symptom-based escalation
    const criticalSymptoms = ['unconscious', 'not breathing', 'severe bleeding', 'convulsions', 'blue gums'];
    const hasCriticalSymptoms = request.symptoms.some(symptom => 
      criticalSymptoms.some(critical => symptom.toLowerCase().includes(critical))
    );

    if (hasCriticalSymptoms) {
      priority = 'critical';
      responseMinutes = 10;
      requiresVetVisit = true;
      autoEscalate = true;
    }

    return {
      priority_level: priority,
      estimated_response_minutes: responseMinutes,
      requires_immediate_vet_visit: requiresVetVisit,
      first_aid_instructions: this.getImmediateFirstAidInstructions(request.emergencyType),
      warning_signs: this.getWarningSignsToWatch(request.emergencyType),
      auto_escalate: autoEscalate
    };
  }

  private static async assignEmergencyExpert(emergencyType: string, priority: string): Promise<any> {
    // Prioritize experts based on emergency type and availability
    const whereClause: any = {
      verification_status: 'verified',
      emergency_available: true,
      availability_status: 'available'
    };

    // Match specialization to emergency type
    const specializationMap: { [key: string]: string[] } = {
      'poisoning': ['toxicology', 'emergency', 'veterinary'],
      'injury': ['surgery', 'orthopedics', 'emergency'],
      'breathing_difficulty': ['respiratory', 'cardiology', 'emergency'],
      'seizure': ['neurology', 'emergency', 'veterinary'],
      'heat_stroke': ['emergency', 'internal_medicine'],
      'bleeding': ['surgery', 'emergency', 'veterinary'],
      'behavioral_emergency': ['behavior', 'psychology', 'emergency']
    };

    const relevantSpecs = specializationMap[emergencyType] || ['emergency', 'veterinary'];
    whereClause.specializations = { hasSome: relevantSpecs };

    const expert = await prisma.expertProfile.findFirst({
      where: whereClause,
      include: {
        user: {
          select: { id: true, name: true }
        }
      },
      orderBy: [
        { emergency_priority_rank: 'asc' },
        { response_time_hours: 'asc' }
      ]
    });

    return expert ? {
      id: expert.user.id,
      name: expert.user.name,
      ExpertProfile: expert,
      emergency_contact: expert.emergency_contact_phone
    } : null;
  }

  private static getImmediateFirstAidInstructions(emergencyType: string): string[] {
    const instructions: { [key: string]: string[] } = {
      'poisoning': [
        'Remove any remaining toxic substance from reach',
        'Do NOT induce vomiting unless specifically instructed by a vet',
        'Keep your dog calm and still',
        'Take photos of the substance if possible',
        'Contact emergency vet immediately'
      ],
      'injury': [
        'Keep your dog calm and still',
        'Apply gentle pressure to bleeding wounds with clean cloth',
        'Do not move the dog if spinal injury is suspected',
        'Keep the injured area elevated if possible',
        'Transport carefully to emergency vet'
      ],
      'breathing_difficulty': [
        'Keep your dog calm and upright',
        'Ensure airways are clear of obstructions',
        'Provide fresh air and ventilation',
        'Do not leave dog unattended',
        'Get to emergency vet immediately'
      ],
      'seizure': [
        'Keep your dog safe from surrounding hazards',
        'Do NOT put anything in the mouth',
        'Time the seizure duration',
        'Keep the environment quiet and dim',
        'Contact vet immediately if seizure lasts over 2 minutes'
      ],
      'heat_stroke': [
        'Move to cool, shaded area immediately',
        'Apply cool (not cold) water to paws and belly',
        'Provide small amounts of cool water to drink',
        'Use fan for air circulation',
        'Monitor temperature and get to vet quickly'
      ],
      'bleeding': [
        'Apply direct pressure with clean cloth or bandage',
        'Elevate the bleeding area if possible',
        'Do not remove objects embedded in wounds',
        'Keep your dog calm to reduce heart rate',
        'Transport to emergency vet immediately'
      ]
    };

    return instructions[emergencyType] || [
      'Keep your dog calm and comfortable',
      'Monitor vital signs and behavior',
      'Document symptoms with photos/video if safe',
      'Prepare for immediate transport to vet',
      'Contact emergency veterinary clinic'
    ];
  }

  private static getWarningSignsToWatch(emergencyType: string): string[] {
    const warnings: { [key: string]: string[] } = {
      'poisoning': ['Vomiting', 'Diarrhea', 'Lethargy', 'Loss of coordination', 'Difficulty breathing'],
      'injury': ['Excessive bleeding', 'Signs of shock', 'Inability to move', 'Severe pain', 'Loss of consciousness'],
      'breathing_difficulty': ['Blue gums', 'Excessive drooling', 'Panic', 'Loss of consciousness', 'Weak pulse'],
      'seizure': ['Prolonged seizure (over 2 minutes)', 'Multiple seizures', 'Difficulty breathing', 'High fever'],
      'heat_stroke': ['Excessive panting', 'Drooling', 'Weakness', 'Vomiting', 'High body temperature'],
      'bleeding': ['Pale gums', 'Weakness', 'Rapid breathing', 'Cold extremities', 'Loss of consciousness']
    };

    return warnings[emergencyType] || [
      'Changes in breathing patterns',
      'Loss of consciousness',
      'Severe pain or distress',
      'Inability to stand or walk',
      'Blue or pale gums'
    ];
  }

  private static async findNearestVetClinics(location?: any): Promise<any[]> {
    // This would integrate with maps API to find actual vet clinics
    // For now, returning mock data based on major Indian cities
    return [
      {
        name: 'City Veterinary Emergency Hospital',
        address: 'Near your location',
        phone: '+91-11-2345-6789',
        distance_km: 2.5,
        emergency_services: true
      },
      {
        name: '24/7 Pet Care Clinic',
        address: 'Main Road',
        phone: '+91-11-3456-7890',
        distance_km: 4.2,
        emergency_services: true
      },
      {
        name: 'Animal Hospital Emergency Ward',
        address: 'Medical District',
        phone: '+91-11-4567-8901',
        distance_km: 6.8,
        emergency_services: true
      }
    ];
  }

  private static generateEmergencyResponseMessage(
    request: EmergencyConsultationRequest,
    triage: EmergencyTriageResult,
    actions: string[]
  ): string {
    let message = `🚨 Emergency consultation received for ${request.emergencyType.replace('_', ' ')}.\n\n`;
    
    message += `**IMMEDIATE ACTIONS:**\n`;
    actions.forEach(action => {
      message += `• ${action}\n`;
    });

    if (triage.requires_immediate_vet_visit) {
      message += `\n⚠️ **IMPORTANT: This condition requires immediate veterinary attention. Please proceed to the nearest emergency vet clinic.**\n`;
    }

    message += `\n**Priority Level:** ${triage.priority_level.toUpperCase()}\n`;
    message += `**Expected Expert Response:** Within ${triage.estimated_response_minutes} minutes\n\n`;
    
    message += `An expert will review your case and provide detailed guidance shortly. Monitor your pet closely for the warning signs mentioned above.`;

    return message;
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
            service: 'emergency_consultation'
          }
        }
      });
    } catch (error) {
      console.error('Error tracking feature usage:', error);
    }
  }
}