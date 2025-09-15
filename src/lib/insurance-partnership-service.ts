// Week 26 Phase 3: Insurance Partnership Service
// Connect premium users with pet insurance providers and assist with claims

import prisma from './db';

export interface InsuranceProvider {
  id: string;
  name: string;
  logo_url: string;
  description: string;
  coverage_types: string[];
  premium_range: {
    min_monthly: number;
    max_monthly: number;
  };
  coverage_limits: {
    annual_limit: number;
    per_incident_limit: number;
    deductible: number;
  };
  features: string[];
  exclusions: string[];
  claim_settlement_time: string;
  network_hospitals: number;
  rating: number;
  contact_info: {
    phone: string;
    email: string;
    website: string;
  };
  special_offers: {
    woofadaar_discount: number;
    first_year_benefits: string[];
  };
}

export interface InsuranceClaim {
  id: string;
  user_id: string;
  dog_id: string;
  provider_id: string;
  policy_number: string;
  claim_amount: number;
  claim_type: 'medical' | 'surgery' | 'emergency' | 'wellness' | 'accident';
  incident_date: Date;
  claim_description: string;
  supporting_documents: string[];
  vet_bills: Array<{
    bill_number: string;
    amount: number;
    date: Date;
    vet_clinic: string;
    file_url: string;
  }>;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'settled';
  woofadaar_assistance: boolean;
  assistance_notes: string[];
  expected_settlement_date?: Date;
  settlement_amount?: number;
  rejection_reason?: string;
}

export interface InsuranceRecommendation {
  provider: InsuranceProvider;
  match_score: number;
  recommended_plan: string;
  estimated_premium: number;
  key_benefits: string[];
  customized_features: string[];
  reason_for_recommendation: string;
}

export class InsurancePartnershipService {

  // Mock insurance providers data (in production, this would come from API/database)
  private static readonly INSURANCE_PROVIDERS: InsuranceProvider[] = [
    {
      id: 'bajaj_allianz_pet',
      name: 'Bajaj Allianz Pet Insurance',
      logo_url: '/insurance/bajaj-allianz.png',
      description: 'Comprehensive pet insurance with nationwide coverage and quick claim settlements.',
      coverage_types: ['Medical Treatment', 'Surgery', 'Emergency Care', 'Wellness', 'Third Party Liability'],
      premium_range: { min_monthly: 599, max_monthly: 2499 },
      coverage_limits: { annual_limit: 200000, per_incident_limit: 50000, deductible: 2000 },
      features: [
        'Cashless treatment at 500+ vet clinics',
        'No age limit for enrollment',
        '24/7 helpline support',
        'Pre-existing condition cover after 2 years',
        'Multi-pet discount available'
      ],
      exclusions: ['Breeding complications', 'Cosmetic procedures', 'Experimental treatments'],
      claim_settlement_time: '7-10 working days',
      network_hospitals: 500,
      rating: 4.3,
      contact_info: {
        phone: '1800-209-5858',
        email: 'petinsurance@bajajallianz.co.in',
        website: 'https://www.bajajallianz.com/pet-insurance'
      },
      special_offers: {
        woofadaar_discount: 15,
        first_year_benefits: ['Free health checkup', 'Vaccination coverage', 'Emergency consultation credits']
      }
    },
    {
      id: 'tata_aig_pet',
      name: 'Tata AIG Pet Insurance',
      logo_url: '/insurance/tata-aig.png',
      description: 'Reliable pet protection with focus on preventive care and wellness programs.',
      coverage_types: ['Accident Coverage', 'Illness Treatment', 'Surgery', 'Diagnostic Tests', 'Preventive Care'],
      premium_range: { min_monthly: 499, max_monthly: 1999 },
      coverage_limits: { annual_limit: 150000, per_incident_limit: 40000, deductible: 1500 },
      features: [
        'Coverage from day 1 for accidents',
        'Preventive care package included',
        'Direct billing at partner clinics',
        'Mobile app for easy claims',
        'Breed-specific coverage options'
      ],
      exclusions: ['Pre-existing conditions', 'Hereditary diseases', 'Routine grooming'],
      claim_settlement_time: '5-7 working days',
      network_hospitals: 350,
      rating: 4.1,
      contact_info: {
        phone: '1800-266-7780',
        email: 'support@tataaig.com',
        website: 'https://www.tataaig.com/pet-insurance'
      },
      special_offers: {
        woofadaar_discount: 12,
        first_year_benefits: ['Complimentary wellness checkup', 'Microchipping coverage']
      }
    },
    {
      id: 'icici_lombard_pet',
      name: 'ICICI Lombard Pet Insurance',
      logo_url: '/insurance/icici-lombard.png',
      description: 'Digital-first pet insurance with instant policy issuance and quick claim processing.',
      coverage_types: ['Medical Treatment', 'Surgical Procedures', 'Emergency Care', 'Hospitalization'],
      premium_range: { min_monthly: 699, max_monthly: 2899 },
      coverage_limits: { annual_limit: 300000, per_incident_limit: 75000, deductible: 2500 },
      features: [
        'Instant policy issuance',
        'AI-powered claim processing',
        'Telemedicine consultations included',
        '100% digital experience',
        'Flexible payment options'
      ],
      exclusions: ['Waiting period diseases', 'Elective procedures', 'Behavioral therapy'],
      claim_settlement_time: '3-5 working days',
      network_hospitals: 400,
      rating: 4.4,
      contact_info: {
        phone: '1800-2666',
        email: 'petcare@icicilombard.com',
        website: 'https://www.icicilombard.com/pet-insurance'
      },
      special_offers: {
        woofadaar_discount: 18,
        first_year_benefits: ['Free telemedicine consultations', 'Digital health records', 'Priority claim processing']
      }
    }
  ];

  /**
   * Get personalized insurance recommendations for user's dog
   */
  static async getInsuranceRecommendations(
    userId: string, 
    dogId: string
  ): Promise<InsuranceRecommendation[]> {
    try {
      // Verify premium access
      const isPremium = await this.checkPremiumAccess(userId);
      if (!isPremium) {
        throw new Error('Premium subscription required for insurance partnerships');
      }

      // Get dog details for personalized recommendations
      const dog = await prisma.dog.findFirst({
        where: { id: dogId, user_id: userId },
        include: {
          health_logs: {
            take: 10,
            orderBy: { created_at: 'desc' }
          },
          vet_appointments: {
            take: 5,
            orderBy: { appointment_datetime: 'desc' }
          }
        }
      });

      if (!dog) {
        throw new Error('Dog not found or access denied');
      }

      // Calculate risk factors and recommendations
      const recommendations: InsuranceRecommendation[] = [];

      for (const provider of this.INSURANCE_PROVIDERS) {
        const matchScore = this.calculateInsuranceMatchScore(dog, provider);
        const estimatedPremium = this.estimateMonthlyPremium(dog, provider);
        
        recommendations.push({
          provider,
          match_score: matchScore,
          recommended_plan: this.getRecommendedPlan(dog, provider),
          estimated_premium: estimatedPremium,
          key_benefits: this.getKeyBenefitsForDog(dog, provider),
          customized_features: this.getCustomizedFeatures(dog, provider),
          reason_for_recommendation: this.getRecommendationReason(dog, provider, matchScore)
        });
      }

      // Sort by match score (highest first)
      recommendations.sort((a, b) => b.match_score - a.match_score);

      // Track feature usage
      await this.trackFeatureUsage(userId, 'insurance_recommendations');

      return recommendations;

    } catch (error) {
      console.error('Error getting insurance recommendations:', error);
      throw error;
    }
  }

  /**
   * Submit insurance claim with Woofadaar assistance
   */
  static async submitInsuranceClaim(
    userId: string,
    claimData: {
      dog_id: string;
      provider_id: string;
      policy_number: string;
      claim_amount: number;
      claim_type: 'medical' | 'surgery' | 'emergency' | 'wellness' | 'accident';
      incident_date: Date;
      description: string;
      supporting_documents: string[];
      vet_bills: Array<{
        bill_number: string;
        amount: number;
        date: Date;
        vet_clinic: string;
        file_url: string;
      }>;
      request_assistance: boolean;
    }
  ): Promise<{ success: boolean; claim_id?: string; message: string; assistance_included?: boolean }> {
    try {
      // Verify premium access
      const isPremium = await this.checkPremiumAccess(userId);
      if (!isPremium) {
        return {
          success: false,
          message: 'Premium subscription required for insurance claim assistance'
        };
      }

      // Verify dog ownership
      const dog = await prisma.dog.findFirst({
        where: { id: claimData.dog_id, user_id: userId }
      });

      if (!dog) {
        return {
          success: false,
          message: 'Dog not found or access denied'
        };
      }

      // Create claim record
      const claim = await prisma.insuranceClaim.create({
        data: {
          user_id: userId,
          dog_id: claimData.dog_id,
          provider_id: claimData.provider_id,
          policy_number: claimData.policy_number,
          claim_amount: claimData.claim_amount,
          claim_type: claimData.claim_type,
          incident_date: claimData.incident_date,
          description: claimData.description,
          supporting_documents: claimData.supporting_documents,
          vet_bills: claimData.vet_bills,
          status: 'draft',
          woofadaar_assistance: claimData.request_assistance,
          metadata: {
            submission_timestamp: new Date().toISOString(),
            assistance_requested: claimData.request_assistance,
            estimated_processing_time: '7-10 working days'
          }
        }
      });

      // If assistance is requested, assign claim specialist
      if (claimData.request_assistance) {
        await this.assignClaimSpecialist(claim.id);
        
        // Create assistance notes
        const assistanceNotes = [
          'Woofadaar claim specialist assigned',
          'Documents under review for completeness',
          'We will contact you within 24 hours with next steps',
          'All communication with insurance provider will be handled by our team'
        ];

        await prisma.insuranceClaim.update({
          where: { id: claim.id },
          data: {
            assistance_notes: assistanceNotes,
            status: 'submitted'
          }
        });
      }

      // Track feature usage
      await this.trackFeatureUsage(userId, 'insurance_claim_submission');

      return {
        success: true,
        claim_id: claim.id,
        message: claimData.request_assistance 
          ? 'Claim submitted successfully with Woofadaar assistance. Our specialist will contact you within 24 hours.'
          : 'Claim submitted successfully. You can track the progress in your insurance dashboard.',
        assistance_included: claimData.request_assistance
      };

    } catch (error) {
      console.error('Error submitting insurance claim:', error);
      return {
        success: false,
        message: 'Failed to submit insurance claim. Please try again.'
      };
    }
  }

  /**
   * Get user's insurance claims and status
   */
  static async getUserInsuranceClaims(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<any> {
    try {
      const isPremium = await this.checkPremiumAccess(userId);
      if (!isPremium) {
        return { success: false, message: 'Premium subscription required' };
      }

      const claims = await prisma.insuranceClaim.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
        include: {
          dog: {
            select: { id: true, name: true, breed: true }
          }
        }
      });

      const totalClaims = await prisma.insuranceClaim.count({
        where: { user_id: userId }
      });

      // Get provider details
      const claimsWithProviders = claims.map(claim => {
        const provider = this.INSURANCE_PROVIDERS.find(p => p.id === claim.provider_id);
        return {
          id: claim.id,
          dog: claim.dog,
          provider: provider ? {
            id: provider.id,
            name: provider.name,
            logo_url: provider.logo_url,
            contact_phone: provider.contact_info.phone
          } : null,
          policy_number: claim.policy_number,
          claim_amount: claim.claim_amount,
          claim_type: claim.claim_type,
          incident_date: claim.incident_date,
          description: claim.description,
          status: claim.status,
          woofadaar_assistance: claim.woofadaar_assistance,
          assistance_notes: claim.assistance_notes || [],
          expected_settlement_date: claim.expected_settlement_date,
          settlement_amount: claim.settlement_amount,
          rejection_reason: claim.rejection_reason,
          created_at: claim.created_at,
          updated_at: claim.updated_at
        };
      });

      return {
        success: true,
        claims: claimsWithProviders,
        pagination: {
          total: totalClaims,
          limit,
          offset,
          has_more: offset + limit < totalClaims
        }
      };

    } catch (error) {
      console.error('Error fetching insurance claims:', error);
      return { success: false, message: 'Failed to fetch claims' };
    }
  }

  /**
   * Connect user with insurance provider for policy purchase
   */
  static async connectWithInsuranceProvider(
    userId: string,
    providerId: string,
    dogId: string,
    planType: string
  ): Promise<{ success: boolean; message: string; connection_details?: any }> {
    try {
      const isPremium = await this.checkPremiumAccess(userId);
      if (!isPremium) {
        return {
          success: false,
          message: 'Premium subscription required for insurance partnerships'
        };
      }

      const provider = this.INSURANCE_PROVIDERS.find(p => p.id === providerId);
      if (!provider) {
        return {
          success: false,
          message: 'Insurance provider not found'
        };
      }

      // Get user and dog details for provider
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const dog = await prisma.dog.findFirst({
        where: { id: dogId, user_id: userId }
      });

      if (!user || !dog) {
        return {
          success: false,
          message: 'User or dog not found'
        };
      }

      // Create connection record
      const connection = await prisma.insuranceConnection.create({
        data: {
          user_id: userId,
          dog_id: dogId,
          provider_id: providerId,
          plan_type: planType,
          status: 'initiated',
          connection_details: {
            user_info: {
              name: user.name,
              email: user.email,
              phone: user.phone,
              location: user.location
            },
            dog_info: {
              name: dog.name,
              breed: dog.breed,
              age_months: dog.age_months,
              weight: dog.weight,
              vaccination_status: 'up_to_date' // This would be calculated from records
            },
            plan_preference: planType,
            woofadaar_discount: provider.special_offers.woofadaar_discount
          },
          metadata: {
            initiated_timestamp: new Date().toISOString(),
            provider_contact: provider.contact_info,
            estimated_premium: this.estimateMonthlyPremium(dog, provider)
          }
        }
      });

      // Track feature usage
      await this.trackFeatureUsage(userId, 'insurance_provider_connection');

      return {
        success: true,
        message: `Connection initiated with ${provider.name}. You will receive a call within 24 hours.`,
        connection_details: {
          connection_id: connection.id,
          provider: provider.name,
          estimated_premium: this.estimateMonthlyPremium(dog, provider),
          woofadaar_discount: provider.special_offers.woofadaar_discount,
          contact_phone: provider.contact_info.phone,
          benefits: provider.special_offers.first_year_benefits
        }
      };

    } catch (error) {
      console.error('Error connecting with insurance provider:', error);
      return {
        success: false,
        message: 'Failed to connect with insurance provider'
      };
    }
  }

  // Helper Methods
  private static calculateInsuranceMatchScore(dog: any, provider: InsuranceProvider): number {
    let score = 70; // Base score

    // Age factor
    if (dog.age_months < 12) score += 15; // Puppies get higher score
    else if (dog.age_months > 84) score -= 10; // Senior dogs might have limitations

    // Breed factor
    const commonBreeds = ['labrador', 'golden retriever', 'german shepherd', 'beagle'];
    if (commonBreeds.some(breed => dog.breed?.toLowerCase().includes(breed))) {
      score += 10;
    }

    // Health history factor
    const healthLogs = dog.health_logs || [];
    if (healthLogs.length > 0) {
      const recentHealthIssues = healthLogs.filter((log: any) => 
        log.symptoms && Object.keys(log.symptoms).length > 0
      );
      if (recentHealthIssues.length === 0) score += 10;
    }

    // Provider-specific adjustments
    if (provider.id === 'icici_lombard_pet' && dog.age_months < 24) score += 5; // Good for young dogs
    if (provider.id === 'bajaj_allianz_pet' && dog.age_months > 60) score += 5; // Good for older dogs

    return Math.min(score, 100);
  }

  private static estimateMonthlyPremium(dog: any, provider: InsuranceProvider): number {
    let basePremium = provider.premium_range.min_monthly;
    
    // Age-based adjustment
    if (dog.age_months > 60) basePremium *= 1.3;
    else if (dog.age_months < 12) basePremium *= 0.8;

    // Apply Woofadaar discount
    basePremium *= (1 - provider.special_offers.woofadaar_discount / 100);

    return Math.round(basePremium);
  }

  private static getRecommendedPlan(dog: any, provider: InsuranceProvider): string {
    if (dog.age_months < 12) return 'Puppy Care Plan';
    if (dog.age_months > 84) return 'Senior Care Plan';
    return 'Comprehensive Care Plan';
  }

  private static getKeyBenefitsForDog(dog: any, provider: InsuranceProvider): string[] {
    const benefits = [...provider.features.slice(0, 3)];
    
    if (dog.age_months < 12) {
      benefits.push('Puppy vaccination coverage', 'Growth monitoring support');
    } else if (dog.age_months > 84) {
      benefits.push('Senior health screenings', 'Chronic condition management');
    }

    return benefits;
  }

  private static getCustomizedFeatures(dog: any, provider: InsuranceProvider): string[] {
    const features = [];
    
    if (provider.special_offers.woofadaar_discount > 0) {
      features.push(`${provider.special_offers.woofadaar_discount}% Woofadaar exclusive discount`);
    }

    features.push(...provider.special_offers.first_year_benefits);
    
    return features;
  }

  private static getRecommendationReason(dog: any, provider: InsuranceProvider, matchScore: number): string {
    if (matchScore >= 90) {
      return `Perfect match for ${dog.name}! This provider offers the best coverage for ${dog.breed} dogs with excellent claim settlement record.`;
    } else if (matchScore >= 80) {
      return `Great option for ${dog.name}. Strong coverage with good value for money and reliable service.`;
    } else {
      return `Suitable option with basic coverage. Consider upgrading as ${dog.name} grows older.`;
    }
  }

  private static async assignClaimSpecialist(claimId: string): Promise<void> {
    // In production, this would assign a real claim specialist
    await prisma.insuranceClaim.update({
      where: { id: claimId },
      data: {
        assigned_specialist: 'specialist_001',
        specialist_contact: '+91-80-4567-8901',
        metadata: {
          specialist_assigned: true,
          assignment_timestamp: new Date().toISOString()
        }
      }
    });
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
            service: 'insurance_partnership'
          }
        }
      });
    } catch (error) {
      console.error('Error tracking feature usage:', error);
    }
  }
}