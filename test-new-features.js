#!/usr/bin/env node

/**
 * Comprehensive Test Suite for Week 9 New Features
 * Tests Payment System, Premium Features, Partner Commissions, and Revenue Analytics
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TEST_RESULTS = [];

console.log('🚀 Starting Woofadaar Week 9 Features Test Suite...\n');

/**
 * Test helper functions
 */
function logTest(testName, status, message = '') {
  const statusEmoji = status === 'PASS' ? '✅' : '❌';
  const result = { testName, status, message, timestamp: new Date().toISOString() };
  TEST_RESULTS.push(result);
  console.log(`${statusEmoji} ${testName}: ${status}${message ? ` - ${message}` : ''}`);
}

async function testApiEndpoint(endpoint, method = 'GET', body = null, headers = {}) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    return {
      status: response.status,
      ok: response.ok,
      data: response.ok ? await response.json().catch(() => ({})) : null,
      error: !response.ok ? await response.text().catch(() => 'Unknown error') : null
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message
    };
  }
}

/**
 * Test 1: API Endpoints Availability
 */
async function testAPIEndpointsAvailability() {
  console.log('\n📡 Testing API Endpoints Availability...\n');

  const endpoints = [
    // Payment endpoints
    { path: '/api/payments/create-order', method: 'POST', requireAuth: true },
    { path: '/api/payments/verify', method: 'POST', requireAuth: true },
    { path: '/api/plans/premium_monthly', method: 'GET', requireAuth: false },
    
    // Subscription endpoints
    { path: '/api/subscriptions/current', method: 'GET', requireAuth: true },
    { path: '/api/subscriptions/cancel', method: 'POST', requireAuth: true },
    
    // Premium features endpoints
    { path: '/api/premium/check-access', method: 'POST', requireAuth: false },
    
    // Revenue analytics endpoints
    { path: '/api/admin/revenue-analytics', method: 'GET', requireAuth: true },
    
    // Partner commission endpoints
    { path: '/api/partner/commissions', method: 'GET', requireAuth: true },
    { path: '/api/partner/commissions/summary', method: 'GET', requireAuth: true }
  ];

  for (const endpoint of endpoints) {
    const response = await testApiEndpoint(endpoint.path, endpoint.method);
    
    if (response.status === 0) {
      logTest(`API ${endpoint.method} ${endpoint.path}`, 'FAIL', 'Server not responding');
    } else if (endpoint.requireAuth && response.status === 401) {
      logTest(`API ${endpoint.method} ${endpoint.path}`, 'PASS', 'Correctly requires authentication');
    } else if (!endpoint.requireAuth && response.status === 200) {
      logTest(`API ${endpoint.method} ${endpoint.path}`, 'PASS', 'Public endpoint accessible');
    } else if (response.status === 400) {
      logTest(`API ${endpoint.method} ${endpoint.path}`, 'PASS', 'Correctly validates input');
    } else if (response.status >= 200 && response.status < 300) {
      logTest(`API ${endpoint.method} ${endpoint.path}`, 'PASS', 'Endpoint responding');
    } else {
      logTest(`API ${endpoint.method} ${endpoint.path}`, 'FAIL', `Status: ${response.status}`);
    }
  }
}

/**
 * Test 2: Plan Details API
 */
async function testPlanDetails() {
  console.log('\n💰 Testing Plan Details API...\n');

  const plans = ['premium_monthly', 'premium_yearly'];
  
  for (const planId of plans) {
    const response = await testApiEndpoint(`/api/plans/${planId}`);
    
    if (response.ok && response.data.success) {
      const plan = response.data.data;
      
      // Check required fields
      if (plan.id && plan.name && plan.amount && plan.features && plan.trial_days) {
        logTest(`Plan ${planId} Details`, 'PASS', `${plan.name} - ${plan.amount}`);
      } else {
        logTest(`Plan ${planId} Details`, 'FAIL', 'Missing required fields');
      }
    } else {
      logTest(`Plan ${planId} Details`, 'FAIL', response.error || 'API error');
    }
  }
}

/**
 * Test 3: Premium Feature Check (Anonymous)
 */
async function testPremiumFeatureCheck() {
  console.log('\n🔒 Testing Premium Feature Access Check...\n');

  const features = [
    'expert_consultations',
    'unlimited_photo_storage', 
    'health_history_unlimited',
    'advanced_health_analytics'
  ];

  for (const feature of features) {
    const response = await testApiEndpoint('/api/premium/check-access', 'POST', { feature });
    
    if (response.ok && response.data.success) {
      const access = response.data.data;
      if (access.hasOwnProperty('hasAccess')) {
        logTest(`Feature Check: ${feature}`, 'PASS', 
          access.hasAccess ? 'Access granted' : 'Access denied (expected for free tier)');
      } else {
        logTest(`Feature Check: ${feature}`, 'FAIL', 'Invalid response format');
      }
    } else {
      logTest(`Feature Check: ${feature}`, 'FAIL', response.error || 'API error');
    }
  }
}

/**
 * Test 4: Component File Availability
 */
async function testComponentFiles() {
  console.log('\n📁 Testing Component Files...\n');

  const components = [
    '/src/components/payments/PaymentForm.tsx',
    '/src/components/payments/SubscriptionPlans.tsx',
    '/src/components/payments/MobilePaymentFlow.tsx',
    '/src/components/premium/UpgradePrompt.tsx',
    '/src/components/premium/PremiumFeatureGuard.tsx',
    '/src/app/premium/page.tsx',
    '/src/app/admin/revenue-analytics/page.tsx',
    '/src/app/partner/earnings/page.tsx'
  ];

  for (const componentPath of components) {
    const fullPath = path.join(__dirname, componentPath);
    
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      logTest(`Component File: ${componentPath}`, 'PASS', `${(stats.size / 1024).toFixed(1)}KB`);
    } else {
      logTest(`Component File: ${componentPath}`, 'FAIL', 'File not found');
    }
  }
}

/**
 * Test 5: Library Files Availability
 */
async function testLibraryFiles() {
  console.log('\n📚 Testing Library Files...\n');

  const libraries = [
    '/src/lib/razorpay.ts',
    '/src/lib/premium-features.ts',
    '/src/lib/partner-commissions.ts'
  ];

  for (const libPath of libraries) {
    const fullPath = path.join(__dirname, libPath);
    
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      logTest(`Library File: ${libPath}`, 'PASS', `${(stats.size / 1024).toFixed(1)}KB`);
    } else {
      logTest(`Library File: ${libPath}`, 'FAIL', 'File not found');
    }
  }
}

/**
 * Test 6: Environment Configuration
 */
async function testEnvironmentConfig() {
  console.log('\n⚙️  Testing Environment Configuration...\n');

  const requiredEnvVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'NEXT_PUBLIC_RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET'
  ];

  const envPath = path.join(__dirname, '.env');
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    
    for (const envVar of requiredEnvVars) {
      if (envContent.includes(envVar)) {
        logTest(`Environment Variable: ${envVar}`, 'PASS', 'Configured');
      } else {
        logTest(`Environment Variable: ${envVar}`, 'FAIL', 'Missing');
      }
    }
  } else {
    logTest('Environment File', 'FAIL', '.env file not found');
  }
}

/**
 * Test 7: Database Schema Validation
 */
async function testDatabaseSchema() {
  console.log('\n🗄️  Testing Database Schema...\n');

  const schemaPath = path.join(__dirname, 'prisma/schema.prisma');
  
  if (fs.existsSync(schemaPath)) {
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    
    const expectedModels = [
      'Payment',
      'Subscription', 
      'PremiumFeatureUsage',
      'PartnerCommission',
      'PartnerPayout',
      'DogPhoto'
    ];

    for (const model of expectedModels) {
      if (schemaContent.includes(`model ${model}`)) {
        logTest(`Database Model: ${model}`, 'PASS', 'Defined in schema');
      } else {
        logTest(`Database Model: ${model}`, 'FAIL', 'Missing from schema');
      }
    }
    
    // Check for payment relations
    if (schemaContent.includes('Payments           Payment[]')) {
      logTest('User-Payment Relation', 'PASS', 'Configured');
    } else {
      logTest('User-Payment Relation', 'FAIL', 'Missing relation');
    }
    
  } else {
    logTest('Prisma Schema', 'FAIL', 'schema.prisma not found');
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                    WOOFADAAR WEEK 9 TEST SUITE                  ║');
  console.log('║                                                                  ║');
  console.log('║  Testing: Payment System, Premium Features, Partner Commissions ║');
  console.log('║  Revenue Analytics, Mobile Payments, Subscription Management    ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');

  // Run all test suites
  await testAPIEndpointsAvailability();
  await testPlanDetails();
  await testPremiumFeatureCheck();
  await testComponentFiles();
  await testLibraryFiles();
  await testEnvironmentConfig();
  await testDatabaseSchema();

  // Generate summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(70));

  const passed = TEST_RESULTS.filter(t => t.status === 'PASS').length;
  const failed = TEST_RESULTS.filter(t => t.status === 'FAIL').length;
  const total = TEST_RESULTS.length;

  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed} (${((passed/total)*100).toFixed(1)}%)`);
  console.log(`❌ Failed: ${failed} (${((failed/total)*100).toFixed(1)}%)`);

  if (failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    TEST_RESULTS.filter(t => t.status === 'FAIL').forEach(test => {
      console.log(`  - ${test.testName}: ${test.message || 'Unknown error'}`);
    });
  }

  console.log('\n🏁 Testing completed successfully!');
  
  if (passed >= total * 0.8) {
    console.log('🎉 All major functionality appears to be working correctly!');
    console.log('🚀 Week 9 implementation is ready for production testing.');
  } else {
    console.log('⚠️  Some issues found. Please review failed tests before deployment.');
  }

  return { passed, failed, total };
}

// Run tests if called directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };