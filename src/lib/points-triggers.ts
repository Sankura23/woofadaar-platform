// Automated Points Triggers for Week 21 Gamification

export async function awardPoints(
  action: string,
  userId: string,
  sourceType: string,
  sourceId?: string,
  userContext: any = {},
  indianContext: any = {},
  metadata: any = {}
) {
  try {
    const response = await fetch('/api/points/award', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('woofadaar_token')}`
      },
      body: JSON.stringify({
        action,
        sourceType,
        sourceId,
        userContext,
        indianContext,
        metadata
      })
    });

    const result = await response.json();
    
    if (result.success && result.data.leveledUp) {
      // Show level up notification
      showLevelUpNotification(result.data.newLevel);
    }
    
    return result;
  } catch (error) {
    console.error('Error awarding points:', error);
    return { success: false, error: 'Failed to award points' };
  }
}

// Point trigger functions for different user actions
export const PointsTriggers = {
  // Community Actions
  onQuestionPosted: (userId: string, questionId: string, metadata: any = {}) => {
    return awardPoints('questionPost', userId, 'question', questionId, {}, {}, metadata);
  },

  onAnswerPosted: (userId: string, answerId: string, metadata: any = {}) => {
    return awardPoints('answerPost', userId, 'answer', answerId, {}, {}, metadata);
  },

  onBestAnswerMarked: (userId: string, answerId: string, metadata: any = {}) => {
    return awardPoints('bestAnswer', userId, 'answer', answerId, {}, {}, metadata);
  },

  onCommentPosted: (userId: string, commentId: string, metadata: any = {}) => {
    return awardPoints('commentPost', userId, 'comment', commentId, {}, {}, metadata);
  },

  onHelpfulVoteReceived: (userId: string, contentId: string, metadata: any = {}) => {
    return awardPoints('helpfulVote', userId, 'vote', contentId, {}, {}, metadata);
  },

  onExpertVerification: (userId: string, verificationId: string, metadata: any = {}) => {
    return awardPoints('expertVerification', userId, 'verification', verificationId, {}, {}, metadata);
  },

  // Profile Actions
  onProfileCompleted: (userId: string, metadata: any = {}) => {
    return awardPoints('profileComplete', userId, 'profile', userId, {}, {}, metadata);
  },

  onDogProfileAdded: (userId: string, dogId: string, metadata: any = {}) => {
    return awardPoints('dogProfileAdd', userId, 'dog_profile', dogId, {}, {}, metadata);
  },

  onPhotoUploaded: (userId: string, photoId: string, metadata: any = {}) => {
    return awardPoints('photoUpload', userId, 'photo', photoId, {}, {}, metadata);
  },

  onStoryShared: (userId: string, storyId: string, metadata: any = {}) => {
    return awardPoints('storyShare', userId, 'story', storyId, {}, {}, metadata);
  },

  onReviewWritten: (userId: string, reviewId: string, metadata: any = {}) => {
    return awardPoints('reviewWrite', userId, 'review', reviewId, {}, {}, metadata);
  },

  // Health Actions
  onHealthLogEntry: (userId: string, logId: string, metadata: any = {}) => {
    return awardPoints('healthLogEntry', userId, 'health_log', logId, {}, {}, metadata);
  },

  onMedicationReminderSet: (userId: string, reminderId: string, metadata: any = {}) => {
    return awardPoints('medicationReminder', userId, 'medication', reminderId, {}, {}, metadata);
  },

  onVetVisitLogged: (userId: string, visitId: string, metadata: any = {}) => {
    return awardPoints('vetVisitLog', userId, 'vet_visit', visitId, {}, {}, metadata);
  },

  onVaccinationUpdated: (userId: string, vaccinationId: string, metadata: any = {}) => {
    return awardPoints('vaccinationUpdate', userId, 'vaccination', vaccinationId, {}, {}, metadata);
  },

  onHealthMilestone: (userId: string, milestoneId: string, metadata: any = {}) => {
    return awardPoints('healthMilestone', userId, 'milestone', milestoneId, {}, {}, metadata);
  },

  // Community Participation
  onForumParticipation: (userId: string, forumId: string, metadata: any = {}) => {
    return awardPoints('forumParticipation', userId, 'forum', forumId, {}, {}, metadata);
  },

  onEventAttendance: (userId: string, eventId: string, metadata: any = {}) => {
    return awardPoints('eventAttendance', userId, 'event', eventId, {}, {}, metadata);
  },

  onWorkshopCompletion: (userId: string, workshopId: string, metadata: any = {}) => {
    return awardPoints('workshopCompletion', userId, 'workshop', workshopId, {}, {}, metadata);
  },

  onMentorshipSession: (userId: string, sessionId: string, metadata: any = {}) => {
    return awardPoints('mentorshipSession', userId, 'mentorship', sessionId, {}, {}, metadata);
  },

  // Social Actions
  onFriendConnect: (userId: string, friendId: string, metadata: any = {}) => {
    return awardPoints('friendConnect', userId, 'friend', friendId, {}, {}, metadata);
  },

  onPlayDateOrganized: (userId: string, playDateId: string, metadata: any = {}) => {
    return awardPoints('playDateOrganize', userId, 'playdate', playDateId, {}, {}, metadata);
  },

  onCommunityHelp: (userId: string, helpId: string, metadata: any = {}) => {
    return awardPoints('communityHelp', userId, 'help', helpId, {}, {}, metadata);
  },

  onReferralSuccess: (userId: string, referralId: string, metadata: any = {}) => {
    return awardPoints('referralSuccess', userId, 'referral', referralId, {}, {}, metadata);
  },

  // Streak Actions
  onDailyLogin: (userId: string, metadata: any = {}) => {
    const dateKey = new Date().toISOString().split('T')[0];
    return awardPoints('dailyLogin', userId, 'login', dateKey, {}, {}, metadata);
  },

  onWeeklyStreak: (userId: string, weekNumber: number, metadata: any = {}) => {
    return awardPoints('weeklyStreak', userId, 'streak', `week-${weekNumber}`, {}, {}, metadata);
  },

  onMonthlyActive: (userId: string, month: string, metadata: any = {}) => {
    return awardPoints('monthlyActive', userId, 'monthly', month, {}, {}, metadata);
  },

  // Special Actions
  onExpertAnswer: (userId: string, answerId: string, metadata: any = {}) => {
    return awardPoints('expertAnswer', userId, 'expert_answer', answerId, { isExpert: true }, {}, metadata);
  },

  onModeratorAction: (userId: string, actionId: string, metadata: any = {}) => {
    return awardPoints('moderatorAction', userId, 'moderation', actionId, { isCommunityLeader: true }, {}, metadata);
  },

  onContentCreation: (userId: string, contentId: string, metadata: any = {}) => {
    return awardPoints('contentCreation', userId, 'content', contentId, {}, {}, metadata);
  },

  onCommunityGuide: (userId: string, guideId: string, metadata: any = {}) => {
    return awardPoints('communityGuide', userId, 'guide', guideId, {}, {}, metadata);
  },

  onBugReport: (userId: string, bugId: string, metadata: any = {}) => {
    return awardPoints('bugReport', userId, 'bug_report', bugId, {}, {}, metadata);
  }
};

// Helper function to show level up notification
function showLevelUpNotification(newLevel: number) {
  // This could be enhanced with a proper notification system
  if (typeof window !== 'undefined' && window.alert) {
    // Simple alert for now - can be replaced with toast notification
    setTimeout(() => {
      alert(`🎉 Congratulations! You've reached Level ${newLevel}!`);
    }, 1000);
  }
}

// Daily login streak tracker
export async function checkDailyLoginStreak(userId: string) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Check if user already logged in today
    const existingLogin = await fetch(`/api/points/check-daily?date=${today}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('woofadaar_token')}`
      }
    });
    
    if (existingLogin.ok) {
      const result = await existingLogin.json();
      if (!result.data.alreadyLogged) {
        await PointsTriggers.onDailyLogin(userId);
      }
    }
  } catch (error) {
    console.error('Error checking daily login:', error);
  }
}

// Festival and special event detector
export function getCurrentIndianContext() {
  const today = new Date();
  const month = today.getMonth() + 1;
  const date = today.getDate();
  
  // Festival detection (simplified - would be enhanced with proper calendar)
  const festivals: { [key: string]: { month: number; date: number; name: string } } = {
    diwali: { month: 10, date: 15, name: 'Diwali' }, // Approximate
    holi: { month: 3, date: 15, name: 'Holi' }, // Approximate
    dussehra: { month: 10, date: 5, name: 'Dussehra' }, // Approximate
    ganeshChaturthi: { month: 8, date: 20, name: 'Ganesh Chaturthi' } // Approximate
  };
  
  for (const [key, festival] of Object.entries(festivals)) {
    if (month === festival.month && Math.abs(date - festival.date) <= 2) {
      return { festival: festival.name.toLowerCase().replace(' ', '-') };
    }
  }
  
  return {};
}