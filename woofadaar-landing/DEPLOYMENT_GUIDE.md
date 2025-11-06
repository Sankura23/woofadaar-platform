# Woofadaar Landing Page - Deployment Guide

## 🚀 Deploying to Production with GoDaddy Domain

This guide will walk you through deploying your Next.js landing page to Vercel and connecting your GoDaddy domain.

---

## Prerequisites

- ✅ GoDaddy domain registered (e.g., woofadaar.com)
- ✅ Supabase account with database set up
- ✅ GitHub account (for connecting to Vercel)
- ✅ Landing page backup ready

---

## Step 1: Prepare Your Code for Deployment

### 1.1 Check Environment Variables
Make sure you have these environment variables in your `.env.local`:

```env
# Database
DATABASE_URL="your-supabase-postgres-url"

# Admin Password
ADMIN_PASSWORD="your-secure-password-here"

# Optional: Instagram Access Token (if needed)
INSTAGRAM_ACCESS_TOKEN="your-instagram-token"
```

### 1.2 Verify Build Works Locally
```bash
npm run build
npm run start
```
Visit `http://localhost:3000` to confirm everything works.

---

## Step 2: Push Code to GitHub

### 2.1 Create a New Repository
1. Go to https://github.com/new
2. Name it: `woofadaar-landing`
3. Keep it Private (recommended)
4. Don't initialize with README (we already have code)

### 2.2 Push Your Code
```bash
# In your woofadaar-landing directory
git init
git add .
git commit -m "Initial commit - Ready for deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/woofadaar-landing.git
git push -u origin main
```

---

## Step 3: Deploy to Vercel

### 3.1 Sign Up / Login to Vercel
1. Go to https://vercel.com
2. Click "Sign Up" (use GitHub to sign in - easiest)

### 3.2 Import Your Project
1. Once logged in, click "Add New" → "Project"
2. Click "Import" next to your `woofadaar-landing` repository
3. Vercel will auto-detect it's a Next.js project

### 3.3 Configure Project Settings
- **Framework Preset:** Next.js (auto-detected)
- **Root Directory:** `./` (leave as default)
- **Build Command:** `npm run build` (auto-filled)
- **Output Directory:** `.next` (auto-filled)

### 3.4 Add Environment Variables
Click "Environment Variables" and add:
```
DATABASE_URL = your-supabase-postgres-url
ADMIN_PASSWORD = your-secure-password
```

**IMPORTANT:** Get your DATABASE_URL from Supabase:
- Go to Supabase Dashboard
- Click your project
- Settings → Database → Connection String → URI
- Copy the "Connection Pooling" URL (not Transaction mode)

### 3.5 Deploy
1. Click "Deploy"
2. Wait 2-3 minutes for build to complete
3. You'll get a URL like: `woofadaar-landing-xyz123.vercel.app`
4. Test this URL to make sure everything works

---

## Step 4: Connect Your GoDaddy Domain

### 4.1 Add Domain in Vercel
1. In your Vercel project dashboard, go to "Settings" → "Domains"
2. Add your domain: `woofadaar.com`
3. Also add: `www.woofadaar.com`
4. Vercel will show you the DNS records you need to add

### 4.2 Configure DNS in GoDaddy

#### Option A: Using A Records (Recommended)
1. Login to GoDaddy: https://dcc.godaddy.com/domains
2. Find your domain, click "DNS"
3. Add/Edit these records:

**For root domain (woofadaar.com):**
```
Type: A
Name: @
Value: 76.76.21.21
TTL: 600 seconds
```

**For www subdomain:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 600 seconds
```

#### 4.3 Wait for DNS Propagation
- Can take 1-48 hours (usually 1-4 hours)
- Check status: https://dnschecker.org
- Enter your domain and check if it resolves correctly

---

## Step 5: Configure SSL (Automatic)

Vercel automatically provisions SSL certificates for your domain.
- This happens after DNS is verified
- Your site will be accessible via `https://woofadaar.com`
- No action needed on your part!

---

## Step 6: Test Your Live Site

### 6.1 Test Core Functionality
- ✅ Homepage loads correctly
- ✅ All sections scroll smoothly
- ✅ Waitlist form submits successfully
- ✅ Instagram carousel loads
- ✅ Footer links work (Privacy, Contact)
- ✅ Admin page is accessible at `/admin`
- ✅ Privacy Policy page loads at `/privacy`
- ✅ Contact page loads at `/contact`

### 6.2 Test Waitlist Submissions
1. Go to your site
2. Click "Join Waitlist"
3. Fill out the form and submit
4. Go to `yourdomain.com/admin`
5. Enter admin password
6. Verify the submission appears

### 6.3 Test on Multiple Devices
- Desktop browsers (Chrome, Safari, Firefox)
- Mobile devices (iOS Safari, Chrome)
- Tablet (if available)

---

## Step 7: Set Up Continuous Deployment

Good news! This is already done. 🎉

Every time you push to your `main` branch on GitHub:
1. Vercel automatically detects the change
2. Builds your project
3. Deploys the new version
4. Usually takes 2-3 minutes

To deploy updates:
```bash
git add .
git commit -m "Description of changes"
git push
```

---

## Common Issues & Troubleshooting

### Issue: "Database connection failed"
**Solution:** Check your `DATABASE_URL` in Vercel environment variables
- Make sure you're using the Connection Pooling URL from Supabase
- Format: `postgresql://user:password@host:port/database?pgbouncer=true`

### Issue: "Admin page not working"
**Solution:**
- Verify `ADMIN_PASSWORD` is set in Vercel environment variables
- Make sure it matches what you're entering

### Issue: "Domain not connecting"
**Solution:**
- Wait 1-4 hours for DNS propagation
- Verify DNS records are correct in GoDaddy
- Use https://dnschecker.org to check propagation status

### Issue: "Site is slow to load"
**Solution:**
- This is normal on first visit (cold start)
- Vercel free tier has some cold start delays
- Consider upgrading to Pro ($20/month) for better performance

### Issue: "Instagram images not loading"
**Solution:**
- Check if Instagram URLs are still valid
- Instagram may have blocked embedding (check Instagram's embed settings)
- Consider switching to static images if issues persist

---

## Post-Deployment Checklist

- [ ] Domain is live and accessible
- [ ] SSL certificate is active (https works)
- [ ] Waitlist form works and saves to database
- [ ] Admin dashboard accessible and shows submissions
- [ ] Privacy Policy page loads
- [ ] Contact page loads
- [ ] All links work (Instagram, Email, etc.)
- [ ] Responsive on mobile devices
- [ ] Page loads in under 3 seconds
- [ ] No console errors in browser

---

## Monitoring & Analytics (Optional)

### Add Google Analytics
1. Get your GA4 tracking ID
2. Add to `src/app/layout.tsx`:
```tsx
<Script src="https://www.googletagmanager.com/gtag/js?id=GA_TRACKING_ID" />
<Script id="google-analytics">
  {`
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'GA_TRACKING_ID');
  `}
</Script>
```

### Monitor Waitlist Signups
- Use Prisma Studio: `npx prisma studio`
- Or check Supabase dashboard directly
- Or use the `/admin` page on your site

---

## Performance Optimization (Post-Launch)

1. **Enable Vercel Analytics**
   - Go to Vercel Dashboard → Analytics → Enable
   - Free tier: 2,500 data points/month

2. **Optimize Images**
   - Already using Next.js Image component ✅
   - Consider converting PNGs to WebP for smaller file sizes

3. **Monitor Core Web Vitals**
   - Use Google PageSpeed Insights: https://pagespeed.web.dev
   - Aim for scores above 90

---

## Backup & Recovery

Your code is backed up in:
- ✅ GitHub (primary backup)
- ✅ Local backup: `backups/20251107_003357_landing_page/`
- ✅ Vercel (deployment history - can rollback anytime)

To rollback to previous version:
1. Go to Vercel Dashboard → Deployments
2. Find the working version
3. Click "..." → "Promote to Production"

---

## Cost Breakdown

**Free Tier (Good for launch):**
- Vercel: Free (includes SSL, hosting, deployments)
- Supabase: Free (up to 500MB database, 50,000 monthly active users)
- GoDaddy Domain: ~$10-15/year

**Paid Tier (For scaling):**
- Vercel Pro: $20/month (better performance, analytics, more team members)
- Supabase Pro: $25/month (8GB database, 100,000 MAU, better support)
- Total: ~$45/month + domain cost

---

## Support Resources

- Vercel Docs: https://vercel.com/docs
- Next.js Docs: https://nextjs.org/docs
- Supabase Docs: https://supabase.com/docs
- Prisma Docs: https://www.prisma.io/docs

---

## Quick Commands Reference

```bash
# Local development
npm run dev

# Build for production
npm run build

# Run production build locally
npm run start

# Open Prisma Studio (view database)
npx prisma studio

# Push database changes
npx prisma db push

# Deploy to Vercel (after setup)
git push  # Automatic deployment

# View Vercel logs
vercel logs  # Need Vercel CLI installed
```

---

## Need Help?

If you run into issues:
1. Check Vercel deployment logs (in dashboard)
2. Check browser console for errors (F12)
3. Check Supabase logs
4. Review this guide again
5. Contact Vercel support (they're very responsive)

---

**🎉 Congratulations! Your Woofadaar landing page is now live!**

Visit: https://woofadaar.com (once DNS propagates)
