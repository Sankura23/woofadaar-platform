# Woofadaar Landing Page - Admin Guide

## Table of Contents
1. [Viewing Waitlist Submissions](#viewing-waitlist-submissions)
2. [Admin Dashboard](#admin-dashboard)
3. [Prisma Studio](#prisma-studio)
4. [Exporting Data](#exporting-data)
5. [Security Configuration](#security-configuration)
6. [Technical Details](#technical-details)
7. [Troubleshooting](#troubleshooting)

---

## Viewing Waitlist Submissions

You have two options to view waitlist submissions:

### Option 1: Admin Dashboard (Recommended)
A beautiful, user-friendly web interface with filtering and export capabilities.

**URL:** `http://localhost:3000/admin`

### Option 2: Prisma Studio
A database browser tool for direct database access.

**URL:** `http://localhost:5555`

---

## Admin Dashboard

### Accessing the Dashboard

1. Navigate to `http://localhost:3000/admin` in your browser
2. Enter the admin password (default: `woofadaar2024`)
3. Click "Access Dashboard"

### Features

#### Dashboard Overview
- **Total Signups:** View total number of waitlist entries
- **Dog Owner Count:** See how many entries are from dog owners
- **Real-time Stats:** Get instant insights into your waitlist

#### Filtering Options
- **All Entries:** View all waitlist submissions
- **Dog Owners Only:** Filter to show only users who have dogs
- **Non-Dog Owners:** Filter to show only users without dogs

#### Entry Information Displayed
Each entry card shows:
- Name and email
- Phone number (if provided)
- Location (if provided)
- Join date and time
- Position number
- Dog information (if applicable):
  - Dog's name
  - Dog's breed
  - Dog's age range
  - What they're excited about
  - Weekly tips opt-in status

#### Export Functionality
- Click "Export CSV" button in the header
- Downloads all entries as a CSV file
- Filename format: `waitlist-YYYY-MM-DD.csv`
- Includes all fields: user info, dog info, preferences

---

## Prisma Studio

### Starting Prisma Studio

```bash
cd /Users/sanket/Desktop/woofadaar1/woofadaar-landing
npx prisma studio
```

This will open Prisma Studio at `http://localhost:5555`

### Using Prisma Studio

1. Click on "Waitlist" in the left sidebar
2. View all database records in a table format
3. Click on any row to see full details
4. You can:
   - View all fields
   - Edit entries directly
   - Delete entries
   - Filter and search

### Viewing Dog Information

The `interests` field contains JSON data with:
- `dogName`: Dog's name
- `dogBreed`: Dog's breed
- `dogAge`: Dog's age range
- `excitement`: What they're excited about
- `weeklyTips`: Whether they opted in for tips

---

## Exporting Data

### Via Admin Dashboard

1. Go to `http://localhost:3000/admin`
2. Login with your password
3. Click "Export CSV" button
4. File downloads automatically to your Downloads folder

### CSV Fields Included

The exported CSV contains:
- ID
- Email
- Name
- Phone
- Location
- Dog Owner (true/false)
- Position
- Status
- Created At
- Dog Name
- Dog Breed
- Dog Age
- Excitement
- Weekly Tips (true/false)

### Via API (Advanced)

You can also programmatically export data:

```bash
curl -X POST http://localhost:3000/api/admin/waitlist \
  -H "Authorization: Bearer woofadaar2024" \
  -H "Content-Type: application/json" \
  -d '{"format":"csv"}' \
  --output waitlist.csv
```

For JSON format:

```bash
curl http://localhost:3000/api/admin/waitlist \
  -H "Authorization: Bearer woofadaar2024"
```

---

## Security Configuration

### Changing the Admin Password

#### For Development (.env.local)

Edit `/Users/sanket/Desktop/woofadaar1/woofadaar-landing/.env.local`:

```env
ADMIN_PASSWORD="your_new_secure_password"
```

#### For Production

Set the environment variable on your hosting platform:

```
ADMIN_PASSWORD=your_production_password
```

**Important:** Never commit `.env.local` or `.env` files to git!

### Default Credentials

- **Password:** `woofadaar2024`
- **Change this before deploying to production!**

### Protected Files

The following files are protected by `.gitignore`:
- `.env`
- `.env.local`
- `.env*.local`

---

## Technical Details

### API Endpoints

#### GET /api/admin/waitlist
Fetches all waitlist entries.

**Headers:**
- `Authorization: Bearer {password}`

**Response:**
```json
{
  "success": true,
  "count": 5,
  "entries": [
    {
      "id": "...",
      "email": "user@example.com",
      "name": "John Doe",
      "phone": "+91 98765 43210",
      "location": "Mumbai, India",
      "dog_owner": true,
      "position": 1,
      "status": "active",
      "created_at": "2024-11-06T...",
      "dogName": "Buddy",
      "dogBreed": "Golden Retriever",
      "dogAge": "adult",
      "excitement": "All of the Above!",
      "weeklyTips": true
    }
  ]
}
```

#### POST /api/admin/waitlist
Exports waitlist data.

**Headers:**
- `Authorization: Bearer {password}`
- `Content-Type: application/json`

**Body:**
```json
{
  "format": "csv"  // or "json"
}
```

### Database Schema

The Waitlist table structure:

```prisma
model Waitlist {
  id                 String   @id
  email              String   @unique
  name               String
  location           String?
  phone              String?
  dog_owner          Boolean  @default(false)
  preferred_language String   @default("en")
  referral_source    String?
  interests          String?   // JSON string
  status             String   @default("active")
  position           Int?
  created_at         DateTime @default(now())
  updated_at         DateTime
}
```

### File Structure

```
woofadaar-landing/
├── src/
│   ├── app/
│   │   ├── admin/
│   │   │   └── page.tsx              # Admin dashboard UI
│   │   └── api/
│   │       ├── waitlist/
│   │       │   └── route.ts          # Public waitlist submission
│   │       └── admin/
│   │           └── waitlist/
│   │               └── route.ts      # Admin API endpoints
│   ├── components/
│   │   └── JoinWaitlist.tsx          # Waitlist form modal
│   └── lib/
│       └── prisma.ts                 # Prisma client setup
├── prisma/
│   └── schema.prisma                 # Database schema
├── .env                              # Environment variables (for Prisma CLI)
├── .env.local                        # Environment variables (for Next.js)
└── .gitignore                        # Protected files
```

---

## Troubleshooting

### Issue: Admin Dashboard Shows "Unauthorized"

**Solution:**
1. Check that you're using the correct password
2. Verify `.env.local` has `ADMIN_PASSWORD` set
3. Restart your dev server: `npm run dev`

### Issue: Prisma Studio Shows No Entries

**Solution:**
1. Check that `.env` file exists with `DATABASE_URL`
2. Verify database connection string is correct
3. Run `npx prisma studio` from the `woofadaar-landing` directory
4. Refresh the Prisma Studio page in your browser

### Issue: CSV Export Downloads Empty File

**Solution:**
1. Check that you're authenticated (logged in to admin dashboard)
2. Verify there are entries in the database
3. Try refreshing the admin dashboard first
4. Check browser console for errors

### Issue: "Environment variable not found: DATABASE_URL"

**Solution:**
Create `.env` file in `woofadaar-landing` directory:

```env
DATABASE_URL="postgresql://postgres:projectWoof%40251321@db.cqfgtugxcyjtxzvcshij.supabase.co:5432/postgres"
```

### Issue: Can't Access Admin Page After Deployment

**Solution:**
1. Ensure `ADMIN_PASSWORD` is set in your hosting platform's environment variables
2. Ensure `DATABASE_URL` is set in production environment
3. Check that `/admin` route is not blocked by your hosting configuration

### Issue: Waitlist Submissions Not Appearing

**Solution:**
1. Check that the form submission was successful (check browser network tab)
2. Verify database connection in `.env.local`
3. Check API logs for errors
4. Try submitting a test entry
5. Refresh admin dashboard or Prisma Studio

---

## Production Deployment Notes

### Before Deploying

1. **Change admin password:**
   ```env
   ADMIN_PASSWORD="strong_secure_password_here"
   ```

2. **Set environment variables on hosting platform:**
   - `DATABASE_URL`: Your production database connection string
   - `ADMIN_PASSWORD`: Your secure admin password

3. **Test the admin dashboard** in production
4. **Set up database backups** (recommended)

### Security Recommendations

1. Use a strong, unique password for production
2. Consider implementing proper authentication (NextAuth.js, Auth0, etc.)
3. Add rate limiting to prevent brute force attacks
4. Set up SSL/HTTPS for admin access
5. Consider IP whitelisting for admin routes
6. Regularly backup your database

### Monitoring

Monitor these metrics:
- Total signups per day
- Dog owner percentage
- Most popular "excitement" options
- Geographic distribution (from location field)
- Weekly tips opt-in rate

---

## Quick Reference

### Common Commands

```bash
# Start development server
npm run dev

# Start Prisma Studio
npx prisma studio

# Generate Prisma client (after schema changes)
npx prisma generate

# View database schema
npx prisma db pull
```

### Important URLs

- **Landing Page:** http://localhost:3000
- **Admin Dashboard:** http://localhost:3000/admin
- **Prisma Studio:** http://localhost:5555

### Default Credentials

- **Admin Password:** `woofadaar2024`

---

## Support

For technical issues or questions:
1. Check this guide first
2. Review the Troubleshooting section
3. Check Next.js and Prisma documentation
4. Review application logs for error messages

---

**Last Updated:** November 6, 2024
**Version:** 1.0
**Created by:** Claude Code
