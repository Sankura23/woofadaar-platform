# Community Section Protection Documentation

**CRITICAL: This document protects the working community section from future regressions**

## Current Working State (As of 2025-10-21)

The community section is **FULLY FUNCTIONAL** and must be protected from any changes that could break:

### 1. Ask Question Functionality ✅
- **Modal opens correctly** via TouchableOpacity button
- **Keyboard dismisses properly** when tapping outside modal overlay
- **Form submission works** without any blocking wrappers
- **Categories work correctly** with proper color mapping

### 2. Category System ✅
- **Color consistency** between filter cards and question tags
- **Proper category mapping**: health, behavior, training, food, local
- **AI categorization** correctly maps to 'food' (not 'feeding')

### 3. Question Display ✅
- **Questions load and display** with correct formatting
- **Vote functionality** works properly
- **Navigation** to question details works
- **Filtering by category** works correctly

## PROTECTED FILES - DO NOT MODIFY WITHOUT EXTREME CAUTION

### Primary Community Files:
1. `/mobile/woofadaar-standalone/src/screens/community/CommunityScreen.tsx`
2. `/mobile/woofadaar-standalone/src/screens/community/QuestionDetailScreen.tsx`
3. `/src/app/api/community/questions/route.ts`
4. `/src/lib/ai-categorization.ts`

### Critical Implementation Details:

#### Keyboard Handling Pattern:
```tsx
// ✅ WORKING PATTERN - DO NOT CHANGE
<Modal visible={isAskModalVisible} animationType="slide" presentationStyle="pageSheet">
  <TouchableWithoutFeedback onPress={() => setIsAskModalVisible(false)}>
    <View style={styles.modalOverlay}>
      <TouchableWithoutFeedback onPress={() => {}}>
        <View style={styles.modalContent}>
          {/* Content here */}
        </View>
      </TouchableWithoutFeedback>
    </View>
  </TouchableWithoutFeedback>
</Modal>

// ❌ BROKEN PATTERN - NEVER USE
<TouchableWithoutFeedback onPress={Keyboard.dismiss}>
  <View style={{ flex: 1 }}>
    {/* This blocks all touch events including buttons */}
  </View>
</TouchableWithoutFeedback>
```

#### Category Color Mapping:
```tsx
// ✅ CORRECT COLORS - MUST MATCH EXACTLY
const getCategoryColor = (category: string) => {
  switch (category.toLowerCase()) {
    case 'health': return '#e05a37';
    case 'behavior': return '#76519f';
    case 'training': return '#ffa602';
    case 'food': return '#4ECDC4';
    case 'local': return '#FF6B6B';
    default: return '#9CA3AF';
  }
};
```

## REGRESSION PREVENTION RULES

### Rule 1: Touch Event Handling
- **NEVER** wrap the entire screen in TouchableWithoutFeedback
- **ALWAYS** test button functionality after keyboard handling changes
- **USE** modal overlay pattern for keyboard dismissal

### Rule 2: Category System
- **NEVER** change category names without updating all related files
- **ALWAYS** maintain color consistency across all UI components
- **TEST** both filter cards and question tags after any category changes

### Rule 3: API Consistency
- **ENSURE** mobile category names match API expectations
- **UPDATE** AI categorization when changing category mappings
- **VERIFY** question posting works end-to-end after API changes

## TESTING CHECKLIST BEFORE ANY COMMUNITY CHANGES

1. **Ask Question Flow**:
   - [ ] Modal opens when tapping Ask button
   - [ ] Keyboard dismisses when tapping outside
   - [ ] Form can be submitted successfully
   - [ ] New question appears in feed

2. **Category System**:
   - [ ] Filter cards show correct colors
   - [ ] Question tags match filter card colors
   - [ ] All 5 categories work: health, behavior, training, food, local

3. **Question Display**:
   - [ ] Questions load and display correctly
   - [ ] Voting works
   - [ ] Navigation to details works
   - [ ] Filtering works

## EMERGENCY CONTACT

If the community section breaks:
1. **REVERT** all recent changes immediately
2. **CHECK** this protection document for working patterns
3. **RESTORE** from last known working state
4. **TEST** all functionality before deploying

---

**Last Updated**: 2025-10-21
**Status**: Community section fully functional and protected
**Next Review**: Before any major feature additions