// Week 19 Phase 2: Expert Notification Service
// Intelligently matches questions with experts and manages notification priority

export interface ExpertMatch {
  expertId: string;
  expertName: string;
  specializations: string[];
  matchScore: number;
  priorityLevel: number;
  responseRate: number;
  avgResponseTime: number;
  rating: number;
}

export interface NotificationPriority {
  score: number;
  factors: string[];
  deadline: Date;
  notificationType: 'new_question' | 'urgent_question' | 'follow_up';
}

// Expert matching algorithm based on specialization and performance
export const findMatchingExperts = async (
  questionTitle: string,
  questionContent: string,
  category: string,
  tags: string[],
  isUrgent: boolean = false
): Promise<ExpertMatch[]> => {
  
  // Category to specialization mapping
  const categorySpecializationMap = {
    health: ['veterinary', 'health', 'medical', 'nutrition'],
    behavior: ['training', 'behavior', 'psychology', 'socialization'],
    feeding: ['nutrition', 'diet', 'feeding', 'health'],
    training: ['training', 'obedience', 'behavior', 'agility'],
    local: ['local_services', 'general', 'recommendations'],
    general: ['general', 'breeding', 'grooming', 'care']
  };

  const relevantSpecializations = categorySpecializationMap[category as keyof typeof categorySpecializationMap] || ['general'];
  const text = `${questionTitle} ${questionContent}`.toLowerCase();

  // Content-based specialization detection
  const specializationKeywords = {
    veterinary: ['vet', 'medical', 'sick', 'illness', 'symptoms', 'diagnosis', 'treatment'],
    nutrition: ['diet', 'food', 'feeding', 'nutrition', 'weight', 'supplements'],
    training: ['train', 'obedience', 'commands', 'behavior', 'discipline'],
    behavior: ['aggressive', 'anxiety', 'fear', 'socialization', 'destructive'],
    breeding: ['breed', 'genetics', 'breeding', 'puppies', 'lineage'],
    grooming: ['grooming', 'hygiene', 'bathing', 'coat', 'skin'],
    emergency: ['urgent', 'emergency', 'immediate', 'serious', 'critical']
  };

  const detectedSpecializations = [];
  for (const [spec, keywords] of Object.entries(specializationKeywords)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      detectedSpecializations.push(spec);
    }
  }

  // Combine category-based and content-detected specializations
  const targetSpecializations = [...new Set([...relevantSpecializations, ...detectedSpecializations])];

  try {
    // This would normally fetch from database
    // For now, return mock experts based on the pattern
    const mockExperts: ExpertMatch[] = [
      {
        expertId: 'expert_1',
        expertName: 'Dr. Sarah Veterinarian',
        specializations: ['veterinary', 'health', 'medical'],
        matchScore: 0.95,
        priorityLevel: 1,
        responseRate: 0.92,
        avgResponseTime: 45,
        rating: 4.8
      },
      {
        expertId: 'expert_2', 
        expertName: 'Rajesh Training Expert',
        specializations: ['training', 'behavior', 'obedience'],
        matchScore: 0.87,
        priorityLevel: 2,
        responseRate: 0.85,
        avgResponseTime: 120,
        rating: 4.6
      },
      {
        expertId: 'expert_3',
        expertName: 'Nutrition Specialist Priya',
        specializations: ['nutrition', 'diet', 'feeding'],
        matchScore: 0.82,
        priorityLevel: 2,
        responseRate: 0.78,
        avgResponseTime: 180,
        rating: 4.5
      }
    ];

    // Filter experts by specialization match
    const matchedExperts = mockExperts.filter(expert =>
      expert.specializations.some(spec => targetSpecializations.includes(spec))
    );

    // Calculate match scores based on multiple factors
    const scoredExperts = matchedExperts.map(expert => {
      let score = 0;

      // Specialization relevance (40% weight)
      const specializationMatch = expert.specializations.filter(spec => 
        targetSpecializations.includes(spec)
      ).length / targetSpecializations.length;
      score += specializationMatch * 0.4;

      // Performance metrics (30% weight)
      const performanceScore = (expert.responseRate + (expert.rating / 5)) / 2;
      score += performanceScore * 0.3;

      // Priority level (20% weight) - lower number = higher priority
      const priorityScore = (6 - expert.priorityLevel) / 5;
      score += priorityScore * 0.2;

      // Response time (10% weight) - faster = better
      const responseTimeScore = Math.max(0, (300 - expert.avgResponseTime) / 300);
      score += responseTimeScore * 0.1;

      return {
        ...expert,
        matchScore: Math.min(score, 1.0)
      };
    });

    // Sort by match score and return top matches
    return scoredExperts
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5);

  } catch (error) {
    console.error('Error finding matching experts:', error);
    return [];
  }
};

// Calculate notification priority based on question characteristics
export const calculateNotificationPriority = (
  questionTitle: string,
  questionContent: string,
  category: string,
  tags: string[],
  isUrgent: boolean = false,
  expertMatch: ExpertMatch
): NotificationPriority => {
  
  let score = 0.5; // Base score
  const factors: string[] = [];

  // Urgency factor (highest weight)
  if (isUrgent) {
    score += 0.3;
    factors.push('Marked as urgent by user');
  }

  // Health-related urgency detection
  const urgentHealthKeywords = [
    'emergency', 'bleeding', 'unconscious', 'seizure', 'poisoning',
    'severe pain', 'difficulty breathing', 'collapse', 'trauma'
  ];
  const text = `${questionTitle} ${questionContent}`.toLowerCase();
  
  if (urgentHealthKeywords.some(keyword => text.includes(keyword))) {
    score += 0.25;
    factors.push('Contains urgent health keywords');
  }

  // Expert match relevance
  if (expertMatch.matchScore > 0.8) {
    score += 0.15;
    factors.push('High expertise match');
  }

  // Category urgency levels
  const categoryUrgencyMap = {
    health: 0.2,
    behavior: 0.1,
    feeding: 0.1,
    training: 0.05,
    local: 0.05,
    general: 0.0
  };
  
  const categoryBonus = categoryUrgencyMap[category as keyof typeof categoryUrgencyMap] || 0;
  score += categoryBonus;
  if (categoryBonus > 0.1) {
    factors.push(`High-priority category: ${category}`);
  }

  // Tag-based priority
  const priorityTags = ['urgent', 'emergency', 'help', 'serious', 'critical'];
  const hasPriorityTags = tags.some(tag => priorityTags.includes(tag.toLowerCase()));
  if (hasPriorityTags) {
    score += 0.1;
    factors.push('Contains priority tags');
  }

  // Expert priority level
  if (expertMatch.priorityLevel <= 2) {
    score += 0.1;
    factors.push('High-priority expert');
  }

  // Determine notification type and deadline
  let notificationType: 'new_question' | 'urgent_question' | 'follow_up' = 'new_question';
  let deadline = new Date();
  
  if (score > 0.8 || isUrgent) {
    notificationType = 'urgent_question';
    deadline.setMinutes(deadline.getMinutes() + 15); // 15 minute deadline
  } else if (score > 0.6) {
    deadline.setHours(deadline.getHours() + 2); // 2 hour deadline
  } else {
    deadline.setHours(deadline.getHours() + 24); // 24 hour deadline
  }

  return {
    score: Math.min(score, 1.0),
    factors,
    deadline,
    notificationType
  };
};

// Send notifications to matched experts
export const notifyExperts = async (
  questionId: string,
  questionTitle: string,
  questionContent: string,
  category: string,
  tags: string[],
  isUrgent: boolean = false
): Promise<{ notificationsSent: number; expertsNotified: string[] }> => {
  
  try {
    // Find matching experts
    const matchedExperts = await findMatchingExperts(
      questionTitle, 
      questionContent, 
      category, 
      tags, 
      isUrgent
    );

    if (matchedExperts.length === 0) {
      console.log(`No matching experts found for question ${questionId}`);
      return { notificationsSent: 0, expertsNotified: [] };
    }

    const notificationPromises = matchedExperts.map(async (expert) => {
      const priority = calculateNotificationPriority(
        questionTitle,
        questionContent,
        category,
        tags,
        isUrgent,
        expert
      );

      // This would normally create notification in database
      console.log(`Notification queued for expert ${expert.expertName}:`, {
        questionId,
        expertId: expert.expertId,
        priorityScore: priority.score,
        type: priority.notificationType,
        deadline: priority.deadline,
        matchScore: expert.matchScore
      });

      // In production, this would:
      // 1. Create ExpertNotification record
      // 2. Send email/push notification
      // 3. Update expert notification preferences
      
      return expert.expertId;
    });

    const expertsNotified = await Promise.all(notificationPromises);

    return {
      notificationsSent: expertsNotified.length,
      expertsNotified
    };

  } catch (error) {
    console.error('Error sending expert notifications:', error);
    return { notificationsSent: 0, expertsNotified: [] };
  }
};

// Auto-moderation content analysis
export const analyzeContentForModeration = (
  content: string,
  contentType: 'question' | 'answer' | 'comment'
): {
  shouldFlag: boolean;
  flagReasons: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  autoAction: 'allow' | 'flag' | 'remove' | 'require_review';
} => {
  
  const flagReasons: string[] = [];
  let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
  let confidence = 0;

  const text = content.toLowerCase();

  // Spam detection
  const spamPatterns = [
    /buy now/gi,
    /click here/gi,
    /free trial/gi,
    /limited time/gi,
    /(www\.|http)/gi,
    /\b[A-Z]{5,}\b/g, // Excessive caps
    /(.)\1{4,}/g // Repeated characters
  ];

  let spamScore = 0;
  spamPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      spamScore += matches.length;
    }
  });

  if (spamScore > 3) {
    flagReasons.push('Potential spam content detected');
    severity = 'high';
    confidence += 0.3;
  }

  // Inappropriate content detection
  const inappropriateKeywords = [
    'abuse', 'cruel', 'torture', 'harm', 'hurt', 'kill', 'poison'
  ];
  
  const inappropriateMatches = inappropriateKeywords.filter(keyword => 
    text.includes(keyword)
  );

  if (inappropriateMatches.length > 0) {
    flagReasons.push('Inappropriate content detected');
    severity = 'critical';
    confidence += 0.5;
  }

  // Medical advice detection (veterinary scope)
  const medicalAdvicePatterns = [
    /diagnose/gi,
    /prescribe/gi,
    /dosage.*medication/gi,
    /medical advice/gi
  ];

  if (medicalAdvicePatterns.some(pattern => pattern.test(text))) {
    flagReasons.push('Potential unauthorized medical advice');
    severity = 'medium';
    confidence += 0.2;
  }

  // Commercial content detection
  const commercialKeywords = ['sell', 'selling', 'price', 'discount', 'offer', 'business'];
  const commercialCount = commercialKeywords.filter(keyword => text.includes(keyword)).length;
  
  if (commercialCount >= 2) {
    flagReasons.push('Commercial content detected');
    severity = 'medium';
    confidence += 0.2;
  }

  // Off-topic detection
  const dogRelatedKeywords = ['dog', 'puppy', 'canine', 'pet', 'animal', 'vet', 'breed'];
  const hasDogContent = dogRelatedKeywords.some(keyword => text.includes(keyword));
  
  if (!hasDogContent && content.length > 50) {
    flagReasons.push('Content may be off-topic');
    severity = 'low';
    confidence += 0.1;
  }

  // Determine auto action
  let autoAction: 'allow' | 'flag' | 'remove' | 'require_review' = 'allow';
  
  if (severity === 'critical' && confidence > 0.7) {
    autoAction = 'remove';
  } else if (severity === 'high' && confidence > 0.5) {
    autoAction = 'require_review';
  } else if (flagReasons.length > 0 && confidence > 0.3) {
    autoAction = 'flag';
  }

  return {
    shouldFlag: flagReasons.length > 0,
    flagReasons,
    severity,
    confidence: Math.min(confidence, 1.0),
    autoAction
  };
};

// Process expert availability and response patterns
export const calculateExpertPriority = (
  expert: {
    responseRate: number;
    avgResponseTime: number;
    rating: number;
    priorityLevel: number;
    specializations: string[];
  },
  questionCategory: string,
  questionUrgency: number
): number => {
  
  let priority = 0.5;

  // Response rate factor (25% weight)
  priority += (expert.responseRate * 0.25);

  // Rating factor (25% weight)
  priority += ((expert.rating / 5) * 0.25);

  // Response time factor (20% weight) - faster is better
  const responseTimeFactor = Math.max(0, (300 - expert.avgResponseTime) / 300);
  priority += (responseTimeFactor * 0.2);

  // Specialization match (20% weight)
  const categorySpecializationMap = {
    health: ['veterinary', 'health', 'medical'],
    behavior: ['training', 'behavior', 'psychology'],
    feeding: ['nutrition', 'diet', 'feeding'],
    training: ['training', 'obedience', 'behavior']
  };
  
  const relevantSpecs = categorySpecializationMap[questionCategory as keyof typeof categorySpecializationMap] || [];
  const specializationMatch = expert.specializations.filter(spec => 
    relevantSpecs.includes(spec)
  ).length / Math.max(relevantSpecs.length, 1);
  
  priority += (specializationMatch * 0.2);

  // Priority level factor (10% weight)
  const priorityLevelFactor = (6 - expert.priorityLevel) / 5;
  priority += (priorityLevelFactor * 0.1);

  // Urgency boost
  if (questionUrgency > 0.7) {
    priority += 0.1;
  }

  return Math.min(priority, 1.0);
};

// Schedule expert notifications based on their availability
export const scheduleExpertNotifications = async (
  notifications: Array<{
    expertId: string;
    questionId: string;
    priority: NotificationPriority;
  }>
): Promise<void> => {
  
  try {
    // Sort notifications by priority score (highest first)
    const sortedNotifications = notifications.sort((a, b) => 
      b.priority.score - a.priority.score
    );

    for (const notification of sortedNotifications) {
      // This would normally:
      // 1. Check expert availability 
      // 2. Create database record
      // 3. Schedule actual notification delivery
      // 4. Track notification metrics
      
      console.log(`Scheduling notification for expert ${notification.expertId}:`, {
        questionId: notification.questionId,
        type: notification.priority.notificationType,
        score: notification.priority.score,
        deadline: notification.priority.deadline
      });
    }

    console.log(`Scheduled ${sortedNotifications.length} expert notifications`);
    
  } catch (error) {
    console.error('Error scheduling expert notifications:', error);
  }
};

// Main function to process question and notify experts
export const processQuestionForExperts = async (
  questionId: string,
  questionTitle: string,
  questionContent: string,
  category: string,
  tags: string[],
  isUrgent: boolean = false
): Promise<{
  expertsMatched: number;
  notificationsScheduled: number;
  highPriorityAlerts: number;
}> => {
  
  try {
    // Find matching experts
    const experts = await findMatchingExperts(
      questionTitle,
      questionContent,
      category,
      tags,
      isUrgent
    );

    if (experts.length === 0) {
      return { expertsMatched: 0, notificationsScheduled: 0, highPriorityAlerts: 0 };
    }

    // Generate notifications with priorities
    const notifications = experts.map(expert => {
      const priority = calculateNotificationPriority(
        questionTitle,
        questionContent,
        category,
        tags,
        isUrgent,
        expert
      );

      return {
        expertId: expert.expertId,
        questionId,
        priority
      };
    });

    // Schedule notifications
    await scheduleExpertNotifications(notifications);

    // Count high priority alerts
    const highPriorityAlerts = notifications.filter(n => n.priority.score > 0.7).length;

    console.log(`Expert notification summary for question ${questionId}:`, {
      expertsMatched: experts.length,
      notificationsScheduled: notifications.length,
      highPriorityAlerts,
      topExpert: experts[0]?.expertName,
      topMatchScore: experts[0]?.matchScore
    });

    return {
      expertsMatched: experts.length,
      notificationsScheduled: notifications.length,
      highPriorityAlerts
    };

  } catch (error) {
    console.error('Error processing question for experts:', error);
    return { expertsMatched: 0, notificationsScheduled: 0, highPriorityAlerts: 0 };
  }
};