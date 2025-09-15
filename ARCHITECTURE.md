# Woofadaar System Architecture

## 🎯 Overview
Woofadaar is a Next.js 15 web application serving as India's premier dog parent community platform. The system has been migrated from a **demo storage system** to a **database-first architecture** using PostgreSQL via Supabase with Prisma ORM.

## 🚨 CRITICAL: Current System State (Updated August 2025)

### ✅ PRODUCTION READY - Use Database APIs
- **Authentication**: Database-first with fallback to demo storage
- **User Management**: Fully migrated to PostgreSQL
- **Appointments**: Database-first system
- **Partner Management**: Database-first system
- **Dog Profiles**: Database-first system

### ❌ DEPRECATED - Demo Storage System
- **DO NOT USE** demo storage APIs for new development
- Demo storage exists only as fallback for legacy compatibility
- All new features MUST use database APIs

---

## 📊 Database Schema (PostgreSQL via Supabase)

### Core Tables
```sql
-- Users (Pet Parents)
User {
  id: String @id
  email: String @unique
  name: String
  password_hash: String
  location: String?
  experience_level: String @default("beginner")
  barks_points: Int @default(0)
  is_premium: Boolean @default(false)
  profile_image_url: String?
  profile_visibility: String @default("public")
  reputation: Int @default(0)
  preferred_language: String @default("en")
  created_at: DateTime @default(now())
  updated_at: DateTime @updatedAt
}

-- Partners (Vets, Trainers, Corporate)
Partner {
  id: String @id @default(cuid())
  email: String @unique
  name: String
  password: String?
  partner_type: String // 'vet' | 'trainer' | 'corporate' | 'kci'
  business_name: String?
  location: String
  phone: String
  website: String?
  bio: String?
  specialization: Json?
  consultation_fee_range: Json?
  languages_spoken: String[]
  certifications: String[]
  verified: Boolean @default(false)
  status: String @default("pending") // 'pending' | 'approved' | 'rejected'
  partnership_tier: String @default("basic")
  rating_average: Float @default(0.0)
  total_appointments: Int @default(0)
  created_at: DateTime @default(now())
}

-- Dogs
Dog {
  id: String @id @default(cuid())
  user_id: String
  name: String
  breed: String
  age_months: Int
  weight_kg: Float
  gender: String
  vaccination_status: String
  spayed_neutered: Boolean
  health_id: String? @unique
  photo_url: String?
  emergency_contact: String?
  emergency_phone: String?
  medical_notes: String?
  personality_traits: String[]
  location: String?
  created_at: DateTime @default(now())
  updated_at: DateTime @updatedAt
}

-- Appointments
Appointment {
  id: String @id @default(cuid())
  partner_id: String
  user_id: String
  dog_id: String?
  appointment_date: DateTime
  duration_minutes: Int @default(60)
  service_type: String // 'consultation' | 'treatment' | 'training' | 'emergency'
  meeting_type: String // 'in_person' | 'video_call' | 'phone_call'
  consultation_fee: Float
  status: String @default("scheduled") // 'scheduled' | 'confirmed' | 'completed' | 'cancelled'
  notes: String?
  meeting_link: String?
  created_at: DateTime @default(now())
  updated_at: DateTime @updatedAt
}
```

### Database Connection
```env
DATABASE_URL="postgresql://postgres:projectWoof@251321@db.cqfgtugxcyjtxzvcshij.supabase.co:5432/postgres"
```

---

## 🔐 Authentication System

### JWT Token Structure
```javascript
// Pet Parent Token
{
  userId: "user-1755769240167-fgxpbr06x",
  email: "e@c.com",
  userType: "pet-parent",
  iat: 1755771265,
  exp: 1756376065
}

// Partner Token  
{
  partnerId: "partner-1755770019060-cybwvukre",
  email: "a@a.com", 
  userType: "partner",
  iat: 1755772456,
  exp: 1756377256
}
```

### Authentication Flow
1. **Login**: `/api/auth/working-login` (Database-first with demo fallback)
2. **User Profile**: `/api/auth/working-user` (Database-first)
3. **Partner Profile**: `/api/auth/partner-me` (Database-first)
4. **Dogs**: `/api/auth/working-dogs` (Database-first)

---

## 🛣 API Architecture

### ✅ PRODUCTION APIs (Database-First)

#### Authentication
- `POST /api/auth/working-login` - Login for both pet parents and partners
- `GET /api/auth/working-user` - Get user profile (pet parents)
- `PUT /api/auth/working-user` - Update user profile (pet parents)
- `GET /api/auth/partner-me` - Get partner profile
- `GET /api/auth/working-dogs` - Get user's dogs
- `POST /api/auth/working-dogs` - Create new dog

#### Partners
- `GET /api/partners` - Get all approved partners (public)
- `GET /api/partners/bookings` - Get partner's appointments (authenticated)
- `PUT /api/partners/bookings` - Update appointment status

#### Appointments
- `POST /api/appointments/book` - Book appointment with partner
- `GET /api/appointments/book` - Get available time slots

### ❌ DEPRECATED APIs (Demo Storage)
- `/api/partner/appointments` - DO NOT USE (uses demo data)
- Any API using `@/lib/demo-storage` functions

---

## 🎨 Frontend Architecture

### Key Pages & Components

#### Pet Parent Flow
```
/login → /profile → /profile/dogs/add → /partners/directory → /appointments/book
```

#### Partner Flow  
```
/login → /partner/dashboard → /partner/appointments
```

### Component Data Flow
```javascript
// ✅ CORRECT: Database API Usage
const fetchUserData = async () => {
  const response = await fetch('/api/auth/working-user', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  return data.user;
};

// ❌ WRONG: Demo Storage Usage
const fetchOldWay = async () => {
  // Don't use endpoints that still use demo storage
};
```

---

## 🔄 Data Flow Patterns

### User Registration & Login
1. User registers/logs in via `/api/auth/working-login`
2. JWT token stored in localStorage as 'woofadaar_token'  
3. Frontend components use token for authenticated requests
4. Database-first lookup with demo storage fallback

### Appointment Booking
1. Pet parent browses `/api/partners` (database partners)
2. Selects partner and books via `/api/appointments/book`
3. Appointment stored in database with proper relations
4. Partner views appointments via `/api/partners/bookings`

### Frontend State Management
- localStorage for JWT tokens and user type
- React useState for component state
- No global state management (Redux/Zustand)

---

## 📁 File Structure

```
woofadaar1/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── working-login/route.ts        ✅ Database-first
│   │   │   │   ├── working-user/route.ts         ✅ Database-first  
│   │   │   │   ├── partner-me/route.ts           ✅ Database-first
│   │   │   │   └── working-dogs/route.ts         ✅ Database-first
│   │   │   ├── partners/
│   │   │   │   ├── route.ts                      ✅ Database-first
│   │   │   │   └── bookings/route.ts             ✅ Database-first
│   │   │   ├── appointments/
│   │   │   │   └── book/route.ts                 ✅ Database-first
│   │   │   └── partner/
│   │   │       └── appointments/route.ts         ❌ Deprecated
│   │   ├── partner/
│   │   │   ├── dashboard/page.tsx
│   │   │   └── appointments/page.tsx             ✅ Fixed to use bookings API
│   │   ├── profile/page.tsx                      ✅ Uses working-user API
│   │   └── partners/directory/page.tsx           ✅ Uses partners API
│   ├── lib/
│   │   ├── db.ts                                 ✅ Prisma client
│   │   ├── auth.ts                               ✅ JWT utilities
│   │   └── demo-storage.ts                       ❌ Deprecated (fallback only)
│   └── components/
├── prisma/
│   ├── schema.prisma                             ✅ Source of truth
│   └── migrations/
├── .env                                          ✅ Database config
└── ARCHITECTURE.md                               📚 This document
```

---

## 🚀 Development Guidelines

### ✅ DO's
1. **Always use database-first APIs** for new features
2. **Check this architecture** before starting any new development
3. **Use Prisma client** for database operations
4. **Include proper error handling** with database fallbacks
5. **Test both frontend and backend** before considering complete
6. **Use proper JWT authentication** for all protected routes
7. **Transform data structures** if frontend/backend schemas differ

### ❌ DON'Ts
1. **Never use demo storage** for new features
2. **Don't create duplicate APIs** without checking existing ones
3. **Don't skip database migrations** when changing schema
4. **Don't hardcode partner/user IDs** in components
5. **Don't mix demo and database data** in the same API
6. **Don't assume APIs work** without testing the full flow

---

## 🧪 Testing Checklist

### Authentication Flow
- [ ] Pet parent can register/login with `working-login`
- [ ] Partner can register/login with `working-login`  
- [ ] JWT tokens are properly formatted and stored
- [ ] Protected routes require valid authentication

### User Management
- [ ] Pet parent profile loads via `working-user`
- [ ] Partner profile loads via `partner-me`
- [ ] User data updates persist to database
- [ ] Dogs CRUD operations work via `working-dogs`

### Appointments Flow
- [ ] Partner directory shows only approved partners from database
- [ ] Appointment booking creates records in database
- [ ] Partner can view appointments via `bookings` API
- [ ] Frontend transforms data correctly between APIs

### Data Consistency
- [ ] All user actions reflect immediately in UI
- [ ] Database and frontend stay in sync
- [ ] No duplicate records created
- [ ] Proper error handling with user feedback

---

## 🏗 Common Patterns

### API Response Format
```javascript
// Success Response
{
  success: true,
  data: { /* actual data */ },
  message: "Operation successful"
}

// Error Response  
{
  success: false,
  message: "Error description",
  error: "Technical details"
}
```

### Authentication Header
```javascript
headers: {
  'Authorization': `Bearer ${localStorage.getItem('woofadaar_token')}`,
  'Content-Type': 'application/json'
}
```

### Database Query Pattern
```javascript
// Always include proper select and relations
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: {
    id: true,
    name: true,
    email: true,
    // ... other fields
  }
});
```

---

## 📞 Quick Reference

### Active User Accounts
```javascript
// Pet Parent
email: "e@c.com"
password: "Password"
id: "user-1755769240167-fgxpbr06x"

// Partner (Vet)
email: "a@a.com" 
password: "Password"
id: "partner-1755770019060-cybwvukre"
```

### Database Connection Test
```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.count().then(count => console.log('Users:', count));
"
```

### JWT Secret
```
JWT_SECRET=woofadaar-super-secret-jwt-key-for-authentication-2024-india-dogs
```

---

## 🎯 Migration Status

| Component | Status | API Endpoint | Notes |
|-----------|---------|--------------|--------|
| Pet Parent Auth | ✅ Migrated | `/api/auth/working-login` | Database-first |
| Partner Auth | ✅ Migrated | `/api/auth/working-login` | Database-first |
| User Profile | ✅ Migrated | `/api/auth/working-user` | Database-first |
| Partner Profile | ✅ Migrated | `/api/auth/partner-me` | Database-first |
| Dogs Management | ✅ Migrated | `/api/auth/working-dogs` | Database-first |
| Partner Directory | ✅ Migrated | `/api/partners` | Database-first |
| Appointments | ✅ Migrated | `/api/partners/bookings` | Database-first |
| Appointment Booking | ✅ Migrated | `/api/appointments/book` | Database-first |

---

## 📋 Future Development Notes

### When Adding New Features:
1. **Check this document first** - Don't assume anything about the current system
2. **Use database-first approach** - All new APIs should query PostgreSQL directly
3. **Follow existing patterns** - Use same authentication, error handling, and data transformation patterns
4. **Test full user flows** - From login to feature completion
5. **Update this document** - Add new APIs, components, and patterns

### When Debugging Issues:
1. **Check API endpoint** - Ensure frontend is calling the correct database API
2. **Verify data transformation** - Frontend/backend data structures may differ
3. **Test authentication** - Ensure JWT tokens are valid and properly formatted
4. **Check database state** - Verify data actually exists in PostgreSQL
5. **Review logs** - Both frontend console and server logs

---

*This architecture document is the single source of truth for Woofadaar's system design. Always refer to this before making changes or adding features. Last updated: August 2025*