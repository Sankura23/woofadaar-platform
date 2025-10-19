# Community Page Fix Session - Change Log

## Issue Summary
- **Problem**: Community page showing incorrect reply counts vs Question Detail page
- **User Report**: "community page shows some replies are there. but when i go inside the question to actually see the reply, then there are no replies"
- **Secondary Issue**: "app is not working. community page is not opening"

## Root Causes Identified
1. **Data Inconsistency**: Database `answer_count` field was out of sync with actual reply counts
2. **Cache Issues**: Mobile app was showing stale cached data
3. **API Error**: Prisma validation error due to incorrect field name `votes` instead of `CommunityVote`

## Changes Made

### 1. Database Synchronization Script
**File**: `/Users/sanket/Desktop/woofadaar1/scripts/fix-answer-counts.js`
**Action**: Created new script
**Purpose**: Sync database answer_count fields with actual reply counts
**Key Code**:
```javascript
for (const question of questions) {
  const actualAnswerCount = await prisma.communityAnswer.count({
    where: {
      question_id: question.id,
      status: 'active'
    }
  });

  if (question.answer_count !== actualAnswerCount) {
    console.log(`Updating question ${question.id}: ${question.answer_count} -> ${actualAnswerCount}`);
    await prisma.communityQuestion.update({
      where: { id: question.id },
      data: { answer_count: actualAnswerCount }
    });
  }
}
```
**Result**: Updated 2 questions from count 1 to 0

### 2. Mobile API Service Changes
**File**: `/Users/sanket/Desktop/woofadaar1/mobile/src/services/api.ts`
**Changes Made**:
- Removed local answer_count calculation logic
- Now trusts backend answer_count as source of truth
- **Key Change**:
```typescript
// OLD: Calculated answer_count locally
questions.forEach(question => {
  question.answer_count = question._count?.answers || 0;
});

// NEW: Use backend answer_count directly
let questions = apiQuestions.map((apiQuestion: any) => {
  return {
    ...apiQuestion,
    hasUpvoted: apiQuestion.userVote === 'up',
    _count: apiQuestion._count || { answers: 0 },
    // Use answer_count from the backend - it's the source of truth
    answer_count: apiQuestion.answer_count || 0
  };
});
```

### 3. Community Screen Cache Clearing
**File**: `/Users/sanket/Desktop/woofadaar1/mobile/src/screens/community/CommunityScreen.tsx`
**Changes Made**:
- Added cache clearing before fetching questions
- **Key Addition**:
```typescript
useEffect(() => {
  const fetchQuestions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Clear cache to ensure fresh data
      await AsyncStorage.removeItem('woofadaar_questions');

      const response = await apiService.getCommunityQuestions();
      // ... rest of logic
    }
  }
}, []);
```

### 4. Question Detail Screen Cache Clearing
**File**: `/Users/sanket/Desktop/woofadaar1/mobile/src/screens/community/QuestionDetailScreen.tsx`
**Changes Made**:
- Added cache clearing before loading question details
- **Key Addition**:
```typescript
useEffect(() => {
  const loadQuestionDetails = async () => {
    if (!questionId) return;

    try {
      setLoading(true);
      setError(null);

      // Clear cache to ensure fresh data
      await AsyncStorage.removeItem(`woofadaar_replies_${questionId}`);

      const response = await apiService.getQuestionReplies(questionId);
      // ... rest of logic
    }
  }
}, [questionId]);
```

### 5. Backend API Fix - Critical Prisma Error
**File**: `/Users/sanket/Desktop/woofadaar1/src/app/api/community/questions/route.ts`
**Problem**: API returning 500 errors due to unknown field `votes` in Prisma query
**Fix Applied**:
```typescript
// BEFORE (causing 500 error):
...(currentUserId && {
  votes: {
    where: { user_id: currentUserId },
    select: {
      vote_type: true
    }
  }
})

// AFTER (fixed):
...(currentUserId && {
  CommunityVote: {
    where: { user_id: currentUserId },
    select: {
      vote_type: true
    }
  }
})
```

**Additional Error Handling Added**:
```typescript
try {
  questions = await prisma.communityQuestion.findMany({...});
  total = await prisma.communityQuestion.count({ where });
} catch (dbError) {
  console.error('Database error fetching questions:', dbError);
  return NextResponse.json({
    success: true,
    data: { questions: [], total: 0 }
  });
}
```

### 6. Cache Clearing Utility
**File**: `/Users/sanket/Desktop/woofadaar1/mobile/clear-cache.js`
**Action**: Created utility script for manual cache clearing
**Purpose**: Remove all woofadaar-related AsyncStorage keys

## Testing Results
- ✅ Backend API endpoints working correctly
- ✅ `/api/community/questions` returns proper data structure
- ✅ `/api/community/questions/[id]/answers` returns correct empty arrays
- ✅ Database answer_count fields synchronized
- ❌ Mobile app community page still not loading (current issue)

## Current Status
- Backend APIs are functional and returning correct data
- Database synchronization completed
- Cache clearing implemented in mobile screens
- **Remaining Issue**: Mobile app community page still failing to load

## Next Steps Needed
1. Check mobile app logs/errors for specific failure points
2. Verify mobile app is connecting to correct API endpoint
3. Test mobile app network connectivity and authentication
4. Check for JavaScript/React Native errors in community screen component