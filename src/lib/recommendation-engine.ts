// Week 19 Phase 3: Question Recommendation Engine
// Personalized question recommendations based on user interests and behavior

export interface QuestionRecommendation {
  questionId: string;
  title: string;
  category: string;
  tags: string[];
  relevanceScore: number;
  recommendationReason: string[];
  isUrgent: boolean;
  hasExpertAnswer: boolean;
  viewCount: number;
  upvoteCount: number;
  answerCount: number;
  createdAt: string;
  user: {
    id: string;
    name: string;
  };
  dog?: {
    breed: string;
    name: string;
  };
}

export interface UserProfile {
  id: string;
  interests: string[];
  dogBreeds: string[];
  recentActivity: string[];
  interactionHistory: {
    viewedCategories: string[];
    upvotedTags: string[];
    questionCategories: string[];
  };
}

export interface RecommendationFilter {
  categories?: string[];
  tags?: string[];
  minScore?: number;
  maxAge?: number; // Days
  hasAnswers?: boolean;
  isResolved?: boolean;
  excludeViewed?: boolean;
}

// Analyze user behavior to build interest profile
export const buildUserProfile = async (userId: string): Promise<UserProfile> => {
  
  try {
    // This would normally query the database for user behavior
    // For now, return a mock profile based on common patterns
    
    const mockProfile: UserProfile = {
      id: userId,
      interests: ['health', 'training', 'behavior'],
      dogBreeds: ['golden-retriever', 'labrador'],
      recentActivity: ['health', 'feeding', 'behavior'],
      interactionHistory: {
        viewedCategories: ['health', 'behavior', 'training'],
        upvotedTags: ['puppy', 'training', 'health'],
        questionCategories: ['health', 'behavior']
      }
    };

    console.log(`Built user profile for ${userId}:`, {
      primaryInterests: mockProfile.interests.slice(0, 3),
      dogBreeds: mockProfile.dogBreeds,
      recentActivity: mockProfile.recentActivity.slice(0, 3)
    });

    return mockProfile;

  } catch (error) {
    console.error('Error building user profile:', error);
    
    // Fallback to basic profile
    return {
      id: userId,
      interests: ['general'],
      dogBreeds: [],
      recentActivity: [],
      interactionHistory: {
        viewedCategories: [],
        upvotedTags: [],
        questionCategories: []
      }
    };
  }
};

// Calculate question relevance score based on user profile
export const calculateRelevanceScore = (
  question: any,
  userProfile: UserProfile
): { score: number; reasons: string[] } => {
  
  let score = 0;
  const reasons: string[] = [];

  // Category interest matching (30% weight)
  if (userProfile.interests.includes(question.category)) {
    score += 0.3;
    reasons.push(`Matches your interest in ${question.category}`);
  }

  // Tag overlap (25% weight)
  const tagOverlap = question.tags.filter((tag: string) => 
    userProfile.interactionHistory.upvotedTags.includes(tag)
  );
  if (tagOverlap.length > 0) {
    const tagScore = Math.min(tagOverlap.length * 0.1, 0.25);
    score += tagScore;
    reasons.push(`Related to your interests: ${tagOverlap.join(', ')}`);
  }

  // Dog breed matching (20% weight)  
  if (question.dog?.breed) {
    const breedMatch = userProfile.dogBreeds.some(breed => 
      question.dog.breed.toLowerCase().includes(breed.replace('-', ' '))
    );
    if (breedMatch) {
      score += 0.2;
      reasons.push(`Same breed as your dog: ${question.dog.breed}`);
    }
  }

  // Recent activity alignment (15% weight)
  if (userProfile.recentActivity.includes(question.category)) {
    score += 0.15;
    reasons.push('Related to your recent activity');
  }

  // Question quality factors (10% weight)
  const qualityScore = calculateQuestionQuality(question);
  score += qualityScore * 0.1;
  if (qualityScore > 0.7) {
    reasons.push('High-quality question');
  }

  return {
    score: Math.min(score, 1.0),
    reasons
  };
};

// Calculate intrinsic question quality
const calculateQuestionQuality = (question: any): number => {
  let qualityScore = 0.5; // Base score

  // Title quality
  if (question.title.length >= 15 && question.title.length <= 100) {
    qualityScore += 0.1;
  }

  // Content depth
  if (question.content.length >= 100) {
    qualityScore += 0.1;
  }

  // Has structured data (templates)
  if (question.template_data && Object.keys(question.template_data).length > 0) {
    qualityScore += 0.15;
  }

  // Community engagement
  if (question.upvotes > 0) {
    qualityScore += Math.min(question.upvotes * 0.02, 0.1);
  }

  if (question.answer_count > 0) {
    qualityScore += Math.min(question.answer_count * 0.03, 0.15);
  }

  return Math.min(qualityScore, 1.0);
};

// Generate personalized question recommendations
export const generateQuestionRecommendations = async (
  userId: string,
  filters: RecommendationFilter = {},
  limit: number = 10
): Promise<QuestionRecommendation[]> => {
  
  try {
    // Build user profile
    const userProfile = await buildUserProfile(userId);

    // Mock questions for recommendation (would normally query database)
    const candidateQuestions = [
      {
        id: 'q1',
        title: 'Golden Retriever puppy not eating properly - need advice',
        content: 'My 3-month-old Golden Retriever has been eating very little for the past 2 days...',
        category: 'health',
        tags: ['puppy', 'feeding', 'health', 'golden-retriever'],
        view_count: 45,
        upvotes: 8,
        answer_count: 3,
        created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        is_resolved: false,
        template_data: {
          symptoms: 'Low appetite, lethargy',
          duration: '2 days',
          severity: 'Moderate'
        },
        user: { id: 'user1', name: 'Sarah M.' },
        dog: { breed: 'Golden Retriever', name: 'Buddy' }
      },
      {
        id: 'q2',
        title: 'Best training methods for Labrador aggression towards strangers?',
        content: 'My 2-year-old Labrador shows aggressive behavior when strangers approach...',
        category: 'behavior',
        tags: ['training', 'aggression', 'socialization', 'labrador'],
        view_count: 67,
        upvotes: 12,
        answer_count: 5,
        created_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        is_resolved: true,
        user: { id: 'user2', name: 'Rajesh K.' },
        dog: { breed: 'Labrador', name: 'Max' }
      },
      {
        id: 'q3',
        title: 'Nutrition plan for senior dogs with joint issues',
        content: 'Looking for dietary recommendations for my 8-year-old dog with arthritis...',
        category: 'feeding',
        tags: ['senior', 'nutrition', 'health', 'arthritis'],
        view_count: 34,
        upvotes: 6,
        answer_count: 2,
        created_at: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
        is_resolved: false,
        user: { id: 'user3', name: 'Priya S.' },
        dog: { breed: 'Mixed Breed', name: 'Luna' }
      },
      {
        id: 'q4',
        title: 'House training tips for rescue dogs?',
        content: 'Recently adopted a 1-year-old rescue dog who has accidents indoors...',
        category: 'training',
        tags: ['house-training', 'rescue', 'adult-dog', 'behavior'],
        view_count: 23,
        upvotes: 4,
        answer_count: 1,
        created_at: new Date(Date.now() - 432000000).toISOString(), // 5 days ago
        is_resolved: false,
        user: { id: 'user4', name: 'Michael T.' },
        dog: { breed: 'German Shepherd Mix', name: 'Rocky' }
      }
    ];

    // Apply filters
    let filteredQuestions = candidateQuestions;
    
    if (filters.categories && filters.categories.length > 0) {
      filteredQuestions = filteredQuestions.filter(q => 
        filters.categories!.includes(q.category)
      );
    }

    if (filters.hasAnswers !== undefined) {
      filteredQuestions = filteredQuestions.filter(q => 
        filters.hasAnswers ? q.answer_count > 0 : q.answer_count === 0
      );
    }

    if (filters.isResolved !== undefined) {
      filteredQuestions = filteredQuestions.filter(q => 
        q.is_resolved === filters.isResolved
      );
    }

    if (filters.maxAge) {
      const maxAgeMs = filters.maxAge * 24 * 60 * 60 * 1000;
      const cutoffDate = new Date(Date.now() - maxAgeMs);
      filteredQuestions = filteredQuestions.filter(q => 
        new Date(q.created_at) >= cutoffDate
      );
    }

    // Calculate relevance scores
    const recommendations: QuestionRecommendation[] = filteredQuestions.map(question => {
      const relevance = calculateRelevanceScore(question, userProfile);
      
      return {
        questionId: question.id,
        title: question.title,
        category: question.category,
        tags: question.tags,
        relevanceScore: relevance.score,
        recommendationReason: relevance.reasons,
        isUrgent: question.tags.includes('urgent') || question.category === 'health',
        hasExpertAnswer: question.answer_count > 0 && Math.random() > 0.5, // Mock expert answer detection
        viewCount: question.view_count,
        upvoteCount: question.upvotes,
        answerCount: question.answer_count,
        createdAt: question.created_at,
        user: question.user,
        dog: question.dog
      };
    });

    // Filter by minimum score
    const minScore = filters.minScore || 0.2;
    const qualifiedRecommendations = recommendations.filter(rec => 
      rec.relevanceScore >= minScore
    );

    // Sort by relevance score and apply limit
    const sortedRecommendations = qualifiedRecommendations
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);

    console.log(`Generated ${sortedRecommendations.length} recommendations for user ${userId}:`, {
      topRecommendation: sortedRecommendations[0]?.title,
      avgScore: sortedRecommendations.reduce((sum, rec) => sum + rec.relevanceScore, 0) / sortedRecommendations.length,
      categories: [...new Set(sortedRecommendations.map(rec => rec.category))]
    });

    return sortedRecommendations;

  } catch (error) {
    console.error('Error generating question recommendations:', error);
    return [];
  }
};

// Get trending questions based on engagement
export const getTrendingQuestions = async (
  category?: string,
  timeframe: 'day' | 'week' | 'month' = 'week',
  limit: number = 5
): Promise<QuestionRecommendation[]> => {
  
  try {
    // Calculate trending score based on engagement velocity
    // This would normally query recent questions from database
    
    const mockTrendingQuestions = [
      {
        questionId: 'trending1',
        title: 'Emergency: Dog ate chocolate - what should I do?',
        category: 'health',
        tags: ['emergency', 'chocolate', 'poisoning', 'urgent'],
        relevanceScore: 0.95,
        recommendationReason: ['Trending in health category', 'High community engagement'],
        isUrgent: true,
        hasExpertAnswer: true,
        viewCount: 234,
        upvoteCount: 45,
        answerCount: 8,
        createdAt: new Date(Date.now() - 21600000).toISOString(), // 6 hours ago
        user: { id: 'user5', name: 'Emergency Dog Parent' },
        dog: { breed: 'Beagle', name: 'Charlie' }
      },
      {
        questionId: 'trending2',
        title: 'Best dog parks in Mumbai for socialization',
        category: 'local',
        tags: ['mumbai', 'dog-park', 'socialization', 'local'],
        relevanceScore: 0.88,
        recommendationReason: ['Trending in local category', 'Many upvotes'],
        isUrgent: false,
        hasExpertAnswer: false,
        viewCount: 156,
        upvoteCount: 28,
        answerCount: 12,
        createdAt: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
        user: { id: 'user6', name: 'Mumbai Dog Parent' },
        dog: { breed: 'German Shepherd', name: 'Rex' }
      }
    ];

    // Filter by category if specified
    const filtered = category 
      ? mockTrendingQuestions.filter(q => q.category === category)
      : mockTrendingQuestions;

    return filtered.slice(0, limit);

  } catch (error) {
    console.error('Error fetching trending questions:', error);
    return [];
  }
};

// Get similar questions based on content similarity
export const getSimilarQuestions = async (
  questionTitle: string,
  questionContent: string,
  questionCategory: string,
  questionTags: string[],
  limit: number = 5
): Promise<QuestionRecommendation[]> => {
  
  try {
    // Content similarity algorithm (simplified)
    const inputText = `${questionTitle} ${questionContent}`.toLowerCase();
    const inputWords = new Set(inputText.split(/\s+/));

    // Mock similar questions (would normally use vector similarity or text search)
    const candidateQuestions = [
      {
        id: 'similar1',
        title: 'Dog not eating after vaccination - is this normal?',
        content: 'My dog received vaccinations yesterday and now refuses to eat...',
        category: 'health',
        tags: ['vaccination', 'appetite', 'health'],
        similarity: 0.78
      },
      {
        id: 'similar2', 
        title: 'Training aggressive rescue dog - need professional help',
        content: 'Adopted a rescue dog that shows aggressive behavior towards family members...',
        category: 'behavior',
        tags: ['aggression', 'rescue', 'training', 'behavior'],
        similarity: 0.65
      }
    ];

    // Calculate similarity scores
    const similarQuestions = candidateQuestions.map(candidate => {
      const candidateText = `${candidate.title} ${candidate.content}`.toLowerCase();
      const candidateWords = new Set(candidateText.split(/\s+/));
      
      // Calculate word overlap
      const intersection = new Set([...inputWords].filter(word => candidateWords.has(word)));
      const union = new Set([...inputWords, ...candidateWords]);
      const jaccardSimilarity = intersection.size / union.size;

      // Category bonus
      const categoryBonus = candidate.category === questionCategory ? 0.2 : 0;
      
      // Tag overlap bonus
      const tagOverlap = questionTags.filter(tag => candidate.tags.includes(tag)).length;
      const tagBonus = Math.min(tagOverlap * 0.1, 0.3);

      const totalSimilarity = jaccardSimilarity + categoryBonus + tagBonus;

      return {
        questionId: candidate.id,
        title: candidate.title,
        category: candidate.category,
        tags: candidate.tags,
        relevanceScore: totalSimilarity,
        recommendationReason: [
          `${Math.round(totalSimilarity * 100)}% similar to your question`,
          ...(categoryBonus > 0 ? ['Same category'] : []),
          ...(tagOverlap > 0 ? [`${tagOverlap} shared tags`] : [])
        ],
        isUrgent: candidate.tags.includes('urgent'),
        hasExpertAnswer: Math.random() > 0.6,
        viewCount: Math.floor(Math.random() * 100) + 20,
        upvoteCount: Math.floor(Math.random() * 20) + 1,
        answerCount: Math.floor(Math.random() * 8) + 1,
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        user: { id: `user_${candidate.id}`, name: 'Similar Question Author' }
      };
    });

    return similarQuestions
      .filter(q => q.relevanceScore > 0.4)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);

  } catch (error) {
    console.error('Error finding similar questions:', error);
    return [];
  }
};

// Get recommendations for "questions you might like"
export const getPersonalizedRecommendations = async (
  userId: string,
  filters: RecommendationFilter = {},
  limit: number = 10
): Promise<{
  recommendations: QuestionRecommendation[];
  trending: QuestionRecommendation[];
  categories: { [category: string]: QuestionRecommendation[] };
}> => {
  
  try {
    // Get general recommendations
    const recommendations = await generateQuestionRecommendations(
      userId,
      { ...filters, minScore: 0.3 },
      limit
    );

    // Get trending questions
    const trending = await getTrendingQuestions(undefined, 'week', 5);

    // Get category-specific recommendations
    const categories: { [category: string]: QuestionRecommendation[] } = {};
    const userProfile = await buildUserProfile(userId);
    
    for (const interest of userProfile.interests.slice(0, 3)) {
      categories[interest] = await generateQuestionRecommendations(
        userId,
        { ...filters, categories: [interest], minScore: 0.2 },
        3
      );
    }

    console.log(`Generated personalized recommendations for user ${userId}:`, {
      totalRecommendations: recommendations.length,
      trendingQuestions: trending.length,
      categoryRecommendations: Object.keys(categories).length,
      topRecommendationScore: recommendations[0]?.relevanceScore
    });

    return {
      recommendations,
      trending,
      categories
    };

  } catch (error) {
    console.error('Error generating personalized recommendations:', error);
    
    return {
      recommendations: [],
      trending: [],
      categories: {}
    };
  }
};

// Update user interests based on interactions
export const updateUserInterests = async (
  userId: string,
  action: 'view' | 'upvote' | 'answer' | 'ask',
  questionCategory: string,
  questionTags: string[]
): Promise<void> => {
  
  try {
    // This would normally update UserInterest records in database
    console.log(`Updating user interests for ${userId}:`, {
      action,
      category: questionCategory,
      tags: questionTags.slice(0, 3)
    });

    // Weight different actions
    const actionWeights = {
      view: 0.1,
      upvote: 0.3,
      answer: 0.5,
      ask: 0.4
    };

    const weight = actionWeights[action];
    
    console.log(`Interest update: ${action} on ${questionCategory} (weight: ${weight})`);

    // In production, this would:
    // 1. Update or create UserInterest records
    // 2. Update category analytics
    // 3. Recalculate recommendation weights
    // 4. Trigger personalization model updates
    
  } catch (error) {
    console.error('Error updating user interests:', error);
  }
};