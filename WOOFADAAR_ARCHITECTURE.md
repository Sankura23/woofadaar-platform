# Woofadaar Mobile App - Technical Architecture

## Overview
Woofadaar is a comprehensive dog care and community platform built with React Native and Expo, featuring a Next.js backend API. The app serves pet parents, working dog handlers, and veterinarians with tools for health tracking, community engagement, and dog management.

## Technology Stack

### Frontend (Mobile App)
- **Framework**: React Native with Expo SDK 54.0.12
- **Navigation**: React Navigation v6 (Stack + Bottom Tabs)
- **UI Library**: Custom components with Expo Vector Icons
- **State Management**: React Context API
- **Storage**: AsyncStorage for local data persistence
- **Image Handling**: Expo Camera & Image Picker
- **Network**: Custom API service with fetch

### Backend API
- **Framework**: Next.js 15.4.5 with TypeScript
- **Database**: PostgreSQL with Prisma ORM 6.13.0
- **Authentication**: JWT-based authentication
- **File Storage**: Cloudinary for image uploads
- **Deployment**: Local development server

## App Architecture

### 1. Project Structure
```
mobile/
├── App.tsx                     # Root component with navigation setup
├── app.json                   # Expo configuration
├── package.json               # Dependencies and scripts
├── src/
│   ├── components/            # Reusable UI components
│   │   ├── ui/               # Base UI components
│   │   └── SplashScreen.tsx  # App loading screen
│   ├── contexts/             # React Context providers
│   │   ├── AuthContext.tsx   # Authentication state management
│   │   └── OnboardingContext.tsx # User onboarding flow
│   ├── navigation/           # Navigation configuration
│   │   └── BottomTabs.tsx    # Main tab navigation with stacks
│   ├── screens/              # Screen components organized by feature
│   │   ├── auth/             # Login/Register screens
│   │   ├── onboarding/       # User onboarding flow (6 screens)
│   │   ├── dogs/             # Dog management screens
│   │   ├── health/           # Health tracking screens
│   │   ├── community/        # Community Q&A screens
│   │   └── dog-id/          # Dog ID card screen
│   ├── services/             # API and external service integrations
│   │   └── api.ts           # Centralized API service layer
│   ├── theme/               # Design system and styling
│   │   └── colors.ts        # Color palette, spacing, shadows
│   ├── types/               # TypeScript type definitions
│   └── utils/               # Utility functions and helpers
├── assets/                   # Static assets (images, icons)
│   ├── icons/               # App-specific icons
│   └── animations/          # Animation assets
└── ios/                     # iOS-specific configuration
```

### 2. Navigation Architecture

#### Root Navigation Flow
```
App.tsx
├── AuthProvider Wrapper
├── OnboardingProvider Wrapper
└── NavigationContainer
    └── RootStackNavigator
        ├── Auth Screens (if not authenticated)
        │   ├── LoginScreen
        │   └── RegisterScreen
        ├── Onboarding Screens (if authenticated but needs onboarding)
        │   ├── WelcomeScreen
        │   ├── DogSetupScreen
        │   ├── ProfileCompletionScreen
        │   ├── PreferencesScreen
        │   ├── AccountSetupScreen
        │   └── OnboardingCompletionScreen
        └── Main App (if authenticated and onboarded)
            └── BottomTabNavigator
                ├── Home Stack
                ├── Community Stack
                ├── Health Stack
                ├── Dogs Stack
                └── Profile Stack
```

#### Tab Navigation Structure
1. **Home Tab**
   - DashboardScreen (main overview)
   - AppointmentsScreen

2. **Community Tab**
   - CommunityScreen (Q&A feed)
   - QuestionDetailScreen (individual questions with replies)

3. **Health Tab**
   - HealthScreen (health overview)
   - DailyLogScreen (log daily health data)
   - HealthLogsScreen (view historical data)

4. **Dogs Tab**
   - DogsScreen (list of user's dogs)
   - AddDogScreen (register new dog)
   - EditDogScreen (edit dog information)
   - DogIdScreen (digital ID card)

5. **Profile Tab**
   - ProfileScreen (user profile)
   - EditProfileScreen (edit user information)

### 3. State Management

#### Context Providers
1. **AuthContext** (`src/contexts/AuthContext.tsx`)
   - User authentication state
   - JWT token management
   - Login/logout functionality
   - User profile data
   - Automatic token validation

2. **OnboardingContext** (`src/contexts/OnboardingContext.tsx`)
   - Onboarding flow progress
   - User completion status
   - Multi-step form data management

#### Local Storage Strategy
- **AsyncStorage** for persistent data:
  - Authentication tokens
  - User preferences
  - Cached API responses
  - Offline data storage

### 4. API Architecture

#### API Service Layer (`src/services/api.ts`)
Centralized service providing:
- Authentication endpoints (login, register, token validation)
- User management (profile, preferences)
- Dog management (CRUD operations)
- Health tracking (logs, insights)
- Community features (questions, answers, comments)
- File upload handling (Cloudinary integration)

#### API Endpoints Structure
```typescript
// Authentication
- POST /api/auth/login
- POST /api/auth/register
- GET /api/auth/validate

// User Management
- GET /api/user
- PUT /api/user
- POST /api/user/upload-image

// Dog Management
- GET /api/dogs
- POST /api/dogs
- PUT /api/dogs/[id]
- DELETE /api/dogs/[id]

// Health Tracking
- GET /api/health/logs
- POST /api/health/logs
- GET /api/health/insights

// Community
- GET /api/community/questions
- POST /api/community/questions
- GET /api/community/questions/[id]
- POST /api/community/questions/[id]/answers
- POST /api/community/comments

// Points System
- GET /api/points
- POST /api/points/award
```

### 5. User Types & Roles

#### User Types
1. **Pet Parent**
   - Primary target user
   - Manages personal dogs
   - Participates in community
   - Tracks health data

2. **Working Dog Handler**
   - Professional dog handler
   - Manages multiple working dogs
   - Advanced health tracking
   - Professional features

3. **Veterinarian**
   - Medical professional
   - Can provide expert answers
   - Access to health insights
   - Verification system

#### Permission System
- Role-based access control
- Feature availability based on user type
- Premium subscription tiers
- Professional verification status

### 6. Key Features

#### Authentication & Onboarding
- JWT-based secure authentication
- Multi-step onboarding process
- Profile completion validation
- Preference setup

#### Dog Management
- Multiple dog profiles per user
- Comprehensive dog information (breed, age, health data)
- Digital ID cards with QR codes
- Photo management with Cloudinary

#### Health Tracking
- Daily health logs
- Symptom tracking
- Medication reminders
- Vet appointment scheduling
- Health insights and analytics

#### Community Platform
- Q&A system with categories
- Upvoting system
- Expert answers
- Comment threads
- User reputation system

#### Gamification
- Points system (Barks Points)
- User levels and experience
- Achievement system
- Leaderboards

### 7. UI/UX Design System

#### Color Palette (`src/theme/colors.ts`)
```typescript
Primary Colors:
- mintTeal: #2dd4bf (primary brand color)
- coralPink: #fb7185 (accent color)
- sunnyYellow: #fbbf24 (highlight color)
- lavenderPurple: #a78bfa (secondary accent)

Neutral Colors:
- milkWhite: #fefefe
- softGray: #f8fafc
- charcoalGray: #374151
- fafafa: #fafafa

UI Colors:
- surface: #ffffff
- background: #f8fafc
- textPrimary: #1f2937
- textSecondary: #6b7280
- border: #e5e7eb
```

#### Design Principles
- Clean, modern interface
- Consistent spacing system
- Accessibility-first design
- Mobile-optimized layouts
- Material Design inspired components

### 8. Data Models

#### Core Entities
1. **User**
   ```typescript
   interface User {
     id: string
     name: string
     email: string
     userType: 'pet-parent' | 'working-dog-handler' | 'veterinarian'
     location: string
     profileImageUrl?: string
     barksPoints: number
     isPremium: boolean
     createdAt: string
   }
   ```

2. **Dog**
   ```typescript
   interface Dog {
     id: string
     name: string
     breed: string
     ageMonths: number
     weightKg: number
     gender: 'male' | 'female'
     photoUrl?: string
     healthId: string
     vaccinationStatus: string
     spayedNeutered: boolean
     microchipId?: string
     location: string
   }
   ```

3. **HealthLog**
   ```typescript
   interface HealthLog {
     id: string
     dogId: string
     date: string
     weight?: number
     temperature?: number
     symptoms: string[]
     mood: number
     appetite: number
     activity: number
     notes?: string
   }
   ```

4. **CommunityQuestion**
   ```typescript
   interface Question {
     id: string
     title: string
     content: string
     category: string
     tags: string[]
     isResolved: boolean
     viewCount: number
     upvotes: number
     answerCount: number
     userId: string
     dogId?: string
     createdAt: string
   }
   ```

### 9. Security & Performance

#### Security Measures
- JWT token authentication
- Secure API endpoints
- Input validation and sanitization
- Image upload restrictions
- Rate limiting on API calls

#### Performance Optimizations
- Lazy loading of screens
- Image caching and optimization
- Efficient list rendering with FlatList
- Local data caching with AsyncStorage
- Network request optimization

### 10. Development & Build Configuration

#### Expo Configuration
- Development client build for testing
- Release builds for production
- Platform-specific configurations
- Asset optimization
- Bundle splitting

#### Build Targets
- iOS (iPhone/iPad)
- Android (phone/tablet)
- Development vs Production environments

## Current Status & Technical Debt

### Implemented Features ✅
- Complete authentication system
- User onboarding flow
- Dog management (CRUD)
- Health tracking basics
- Community Q&A platform
- Profile management
- Points system foundation

### Known Issues 🔧
- Network dependency in development builds
- API error handling needs improvement
- Offline functionality limited
- Push notifications not implemented

### Performance Considerations
- Large API response handling
- Image loading optimization needed
- Background sync requirements
- Memory management in lists

## Future Architecture Improvements

### Recommended Enhancements
1. **State Management**: Consider Redux Toolkit or Zustand for complex state
2. **Offline Support**: Implement proper offline-first architecture
3. **Push Notifications**: Add real-time notification system
4. **Caching Strategy**: Implement sophisticated caching with React Query
5. **Testing**: Add comprehensive unit and integration tests
6. **CI/CD**: Automate build and deployment pipeline
7. **Monitoring**: Add crash reporting and analytics
8. **Security**: Implement certificate pinning and advanced security measures

---

*Generated: October 13, 2025*
*Version: Current production build*
*Last Updated: Technical architecture review*
