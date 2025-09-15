// Week 21: Comprehensive Barks Points System
// Enhanced points allocation and management

export interface PointsConfig {
  basePoints: {
    // Community Engagement
    questionPost: 10;
    answerPost: 15;
    bestAnswer: 50;
    commentPost: 5;
    helpfulVote: 3;
    expertVerification: 100;
    
    // Profile & Content
    profileComplete: 25;
    dogProfileAdd: 20;
    photoUpload: 8;
    storyShare: 12;
    reviewWrite: 15;
    
    // Health & Care
    healthLogEntry: 12;
    medicationReminder: 8;
    vetVisitLog: 25;
    vaccinationUpdate: 20;
    healthMilestone: 30;
    
    // Community Participation
    forumParticipation: 6;
    eventAttendance: 40;
    workshopCompletion: 60;
    mentorshipSession: 35;
    
    // Social Features
    friendConnect: 15;
    playDateOrganize: 25;
    communityHelp: 20;
    referralSuccess: 100;
    
    // Streaks & Consistency
    dailyLogin: 5;
    weeklyStreak: 25;
    monthlyActive: 100;
    
    // Special Contributions
    expertAnswer: 75;
    moderatorAction: 30;
    contentCreation: 45;
    communityGuide: 80;
    bugReport: 40;
  };
  
  multipliers: {
    newUser: 2.0; // First 30 days
    premiumUser: 1.5;
    expertUser: 1.3;
    communityLeader: 1.4;
    festivalEvent: 2.0;
    weekendBonus: 1.2;
    birthdayMonth: 1.5;
  };
  
  levelThresholds: number[];
  achievementPoints: {
    firstPost: 50;
    helpfulMember: 200;
    expertRecognition: 500;
    communityChampion: 1000;
    dogExpert: 750;
    healthAdvocate: 600;
    socialButterfly: 400;
    consistentContributor: 800;
  };
}

export const POINTS_CONFIG: PointsConfig = {
  basePoints: {
    questionPost: 10,
    answerPost: 15,
    bestAnswer: 50,
    commentPost: 5,
    helpfulVote: 3,
    expertVerification: 100,
    
    profileComplete: 25,
    dogProfileAdd: 20,
    photoUpload: 8,
    storyShare: 12,
    reviewWrite: 15,
    
    healthLogEntry: 12,
    medicationReminder: 8,
    vetVisitLog: 25,
    vaccinationUpdate: 20,
    healthMilestone: 30,
    
    forumParticipation: 6,
    eventAttendance: 40,
    workshopCompletion: 60,
    mentorshipSession: 35,
    
    friendConnect: 15,
    playDateOrganize: 25,
    communityHelp: 20,
    referralSuccess: 100,
    
    dailyLogin: 5,
    weeklyStreak: 25,
    monthlyActive: 100,
    
    expertAnswer: 75,
    moderatorAction: 30,
    contentCreation: 45,
    communityGuide: 80,
    bugReport: 40
  },
  
  multipliers: {
    newUser: 2.0,
    premiumUser: 1.5,
    expertUser: 1.3,
    communityLeader: 1.4,
    festivalEvent: 2.0,
    weekendBonus: 1.2,
    birthdayMonth: 1.5
  },
  
  levelThresholds: [
    0, 100, 250, 500, 1000, 1750, 2750, 4000, 5500, 7500,
    10000, 13000, 16500, 20500, 25000, 30000, 36000, 43000, 51000, 60000
  ],
  
  achievementPoints: {
    firstPost: 50,
    helpfulMember: 200,
    expertRecognition: 500,
    communityChampion: 1000,
    dogExpert: 750,
    healthAdvocate: 600,
    socialButterfly: 400,
    consistentContributor: 800
  }
};

export interface PointsTransaction {
  userId: string;
  pointsAmount: number;
  source: string;
  sourceId?: string;
  description: string;
  transactionType: 'earned' | 'spent';
  multiplierApplied?: number;
  achievementUnlocked?: string;
}

export class PointsManager {
  static calculatePoints(baseAction: keyof typeof POINTS_CONFIG.basePoints, userContext: {
    isNewUser?: boolean;
    isPremium?: boolean;
    isExpert?: boolean;
    isCommunityLeader?: boolean;
    isFestivalPeriod?: boolean;
    isWeekend?: boolean;
    isBirthdayMonth?: boolean;
  } = {}): { points: number; multiplier: number } {
    const basePoints = POINTS_CONFIG.basePoints[baseAction];
    let multiplier = 1.0;
    
    if (userContext.isNewUser) multiplier *= POINTS_CONFIG.multipliers.newUser;
    if (userContext.isPremium) multiplier *= POINTS_CONFIG.multipliers.premiumUser;
    if (userContext.isExpert) multiplier *= POINTS_CONFIG.multipliers.expertUser;
    if (userContext.isCommunityLeader) multiplier *= POINTS_CONFIG.multipliers.communityLeader;
    if (userContext.isFestivalPeriod) multiplier *= POINTS_CONFIG.multipliers.festivalEvent;
    if (userContext.isWeekend) multiplier *= POINTS_CONFIG.multipliers.weekendBonus;
    if (userContext.isBirthdayMonth) multiplier *= POINTS_CONFIG.multipliers.birthdayMonth;
    
    return {
      points: Math.round(basePoints * multiplier),
      multiplier: Number(multiplier.toFixed(2))
    };
  }
  
  static calculateLevel(totalPoints: number): { level: number; pointsToNext: number } {
    const thresholds = POINTS_CONFIG.levelThresholds;
    let level = 1;
    
    for (let i = thresholds.length - 1; i >= 0; i--) {
      if (totalPoints >= thresholds[i]) {
        level = i + 1;
        break;
      }
    }
    
    const nextThreshold = thresholds[level] || thresholds[thresholds.length - 1] + 10000;
    const pointsToNext = nextThreshold - totalPoints;
    
    return { level, pointsToNext };
  }
  
  static checkAchievements(userStats: {
    totalPosts: number;
    helpfulVotes: number;
    expertAnswers: number;
    communityContributions: number;
    dogProfiles: number;
    healthLogs: number;
    friendConnections: number;
    streakDays: number;
  }): string[] {
    const achievements: string[] = [];
    
    if (userStats.totalPosts >= 1) achievements.push('firstPost');
    if (userStats.helpfulVotes >= 50) achievements.push('helpfulMember');
    if (userStats.expertAnswers >= 25) achievements.push('expertRecognition');
    if (userStats.communityContributions >= 100) achievements.push('communityChampion');
    if (userStats.dogProfiles >= 3 && userStats.expertAnswers >= 10) achievements.push('dogExpert');
    if (userStats.healthLogs >= 30) achievements.push('healthAdvocate');
    if (userStats.friendConnections >= 20) achievements.push('socialButterfly');
    if (userStats.streakDays >= 30) achievements.push('consistentContributor');
    
    return achievements;
  }
  
  static getIndianContextBonus(context: {
    city?: string;
    festival?: string;
    dogBreed?: string;
    regionalEvent?: string;
  }): number {
    let bonus = 1.0;
    
    // Major Indian cities bonus
    const majorCities = ['mumbai', 'delhi', 'bangalore', 'hyderabad', 'pune', 'chennai', 'kolkata', 'ahmedabad'];
    if (context.city && majorCities.includes(context.city.toLowerCase())) {
      bonus *= 1.1;
    }
    
    // Festival bonuses
    const festivals = ['diwali', 'holi', 'dussehra', 'ganesh-chaturthi', 'navratri'];
    if (context.festival && festivals.includes(context.festival.toLowerCase())) {
      bonus *= POINTS_CONFIG.multipliers.festivalEvent;
    }
    
    // Indian dog breeds bonus
    const indianBreeds = ['indian-pariah', 'rajapalayam', 'mudhol-hound', 'rampur-greyhound', 'chippiparai'];
    if (context.dogBreed && indianBreeds.includes(context.dogBreed.toLowerCase())) {
      bonus *= 1.2;
    }
    
    return Number(bonus.toFixed(2));
  }
}

export const INDIAN_CONTEXT = {
  cities: [
    'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Pune', 'Chennai', 'Kolkata', 
    'Ahmedabad', 'Surat', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 
    'Thane', 'Bhopal', 'Visakhapatnam', 'Pimpri-Chinchwad', 'Patna', 'Vadodara'
  ],
  
  festivals: [
    { name: 'Diwali', multiplier: 2.0, duration: 5 },
    { name: 'Holi', multiplier: 1.8, duration: 2 },
    { name: 'Dussehra', multiplier: 1.6, duration: 3 },
    { name: 'Ganesh Chaturthi', multiplier: 1.7, duration: 11 },
    { name: 'Navratri', multiplier: 1.5, duration: 9 },
    { name: 'Karva Chauth', multiplier: 1.3, duration: 1 },
    { name: 'Raksha Bandhan', multiplier: 1.4, duration: 1 }
  ],
  
  dogBreeds: [
    'Indian Pariah Dog', 'Rajapalayam', 'Mudhol Hound', 'Rampur Greyhound',
    'Chippiparai', 'Kanni', 'Combai', 'Bakharwal Dog', 'Gaddi Kutta', 'Bully Kutta'
  ],
  
  regionalEvents: [
    'Republic Day', 'Independence Day', 'Gandhi Jayanti', 'World Animal Day',
    'National Pet Day India', 'Monsoon Pet Safety Week'
  ]
};