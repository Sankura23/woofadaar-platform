# Shared Development Todos

## T1 - Features (In Progress)
- [ ] Create DogHealthTracker component
- [ ] Implement photo upload for dogs
- [x] Fixed ProfileCompletionScreen

## T2 - Bug Fixes (CRITICAL ISSUE 🚨)
- [x] Fixed login connection issue
- [ ] URGENT: Fix corrupted backend (.next folder corruption)
- [ ] URGENT: Fix 500 errors on auth endpoints
- [ ] URGENT: Fix missing Next.js chunks
- [ ] URGENT: Fix database connection issues
- [ ] Debug photo upload timeout
- [ ] Fix navigation stack issues

## T3 - Testing (Pending)
- [ ] Test photo upload workflow
- [ ] Performance test on iPhone
- [ ] Validate onboarding flow

## T4 - DevOps (DEPLOYMENT READY ✅)
- [x] Database connection established
- [x] Complete DevOps infrastructure setup (Docker, CI/CD, Terraform)
- [x] BUILD ASSESSMENT: Build succeeds with only warnings ✅
- [x] T2's critical fixes resolved build-blocking issues ✅
- [ ] Deploy to TestFlight (READY TO PROCEED)
- [ ] Deploy staging environment to AWS

## Cross-Terminal Dependencies
- T1 → T2: New components need API integration
- T2 → T3: Fixed bugs need testing
- T3 → T4: Tested features ready for deployment

---
Each terminal should update their section!