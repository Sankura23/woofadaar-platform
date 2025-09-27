# Woofadaar Mobile App UI Backup
## Created: 2025-09-27

This document preserves the current UI implementation that the user loves.

## Key UI Components and Styles

### 1. Login Screen
- **Logo**: 90% screen width, 200px height
- **Welcome Text**: Inside login box, mint teal color (#3bbca8)
- **Background**: Cream color (#fef8e8)
- **Form Container**: White with 32px border radius, shadow effects
- **Login Button**: Mint teal background with white text

### 2. Dashboard Screen
- **Hero Card**: Mint teal gradient with Woofadaar branding
- **Feature Grid**: 2x2 layout with Woofadaar brand colors
  - My Dogs: Mint Teal
  - Health: Burnt Orange
  - Dog ID: Muted Purple
  - Appointments: Warm Yellow
- **Stats Overview**: 3 metrics with icons
- **Quick Actions**: Horizontal scroll with colored icons
- **Recent Activity**: Cards with time stamps

### 3. Community Screen
- **Quick Actions**: Horizontal scroll, 75x75px cards
  - Ask Question: Mint Teal
  - Trending: Burnt Orange
  - My Questions: Muted Purple
  - Leaderboard: Warm Yellow
- **Tabs**: Recent/Popular/Unanswered
- **Question Cards**: Interactive with upvoting
- **Reply Modal**: Full functionality
- **Visual Feedback**: Heart animation on upvote

### 4. Bottom Navigation
- **Order**: Home, Community, Health, My Dogs, Profile
- **Active Color**: Mint Teal (#3bbca8)
- **Inactive Color**: Gray (#9CA3AF)
- **Icons**: Mix of Ionicons, MaterialCommunityIcons, FontAwesome5

### 5. Theme Configuration (colors.ts)
```typescript
Colors = {
  primary: {
    mintTeal: '#3bbca8',
    mutedPurple: '#76519f',
    burntOrange: '#e05a37',
    warmYellow: '#ffa602',
  },
  secondary: {
    mintTeal: { 20: '#3bbca820' },
    mutedPurple: { 20: '#76519f20' },
    burntOrange: { 20: '#e05a3720' },
    warmYellow: { 20: '#ffa60220' },
  },
  neutral: {
    milkWhite: '#fef8e8',
    charcoal: '#3e3e3e',
    fafafa: '#fafafa',
  }
}
```

### 6. Border Radius
- Cards: 32px (signature Woofadaar style)
- Buttons: 12px
- Small elements: 8px

### 7. Shadows
```typescript
Shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  }
}
```

## API Configuration
- Base URL: Uses device's local network IP (192.168.1.7:3000)
- Authentication: Database-only, no mock data
- Credentials: e@c.com / Password

## Important Notes
1. NEVER add mock logins or demo data
2. Always use database authentication
3. Maintain 32px border radius for cards (Woofadaar signature)
4. Keep mint teal as primary brand color
5. Bottom tabs must remain in exact order: Home, Community, Health, My Dogs, Profile

## File Preservation List
Critical files that define the UI:
- /mobile/src/theme/colors.ts
- /mobile/src/screens/auth/LoginScreen.tsx
- /mobile/src/screens/DashboardScreen.tsx
- /mobile/src/screens/community/CommunityScreen.tsx
- /mobile/src/navigation/BottomTabs.tsx
- /mobile/src/services/api.ts