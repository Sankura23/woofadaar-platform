const cron = require('node-cron');
const fetch = require('node-fetch');

// Weekly digest scheduler - runs every Sunday at 9 AM
// This would typically run on a server or via a cron job service

const DIGEST_API_URL = process.env.NEXT_PUBLIC_BASE_URL 
  ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/admin/digest/weekly`
  : 'http://localhost:3000/api/admin/digest/weekly';

const ADMIN_TOKEN = process.env.ADMIN_API_TOKEN; // Set this in your environment

async function sendWeeklyDigest() {
  try {
    console.log('🚀 Starting weekly digest generation...');
    
    const response = await fetch(DIGEST_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Weekly digest sent successfully!');
    } else {
      console.error('❌ Failed to send weekly digest:', data.error);
    }
  } catch (error) {
    console.error('❌ Error sending weekly digest:', error.message);
  }
}

// Test function - run immediately
async function testDigest() {
  console.log('🧪 Testing weekly digest...');
  await sendWeeklyDigest();
}

// Preview digest data
async function previewDigest() {
  try {
    console.log('👀 Previewing weekly digest data...');
    
    const response = await fetch(DIGEST_API_URL, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      }
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('📊 Weekly Digest Preview:');
      console.log(`📅 Week: ${data.data.preview.weekStart} to ${data.data.preview.weekEnd}`);
      console.log(`👥 Total Users: ${data.data.preview.stats.totalUsers}`);
      console.log(`📝 Posts This Week: ${data.data.preview.stats.postsThisWeek}`);
      console.log(`💬 Comments This Week: ${data.data.preview.stats.commentsThisWeek}`);
      console.log(`\n🔥 Popular Posts:`);
      
      data.data.preview.popularPosts.forEach((post, index) => {
        console.log(`${index + 1}. "${post.title}" by ${post.author} (${post.category}) - ${post.engagement} engagements`);
      });
    } else {
      console.error('❌ Failed to preview digest:', data.error);
    }
  } catch (error) {
    console.error('❌ Error previewing digest:', error.message);
  }
}

// Schedule weekly digest for every Sunday at 9:00 AM
const schedule = () => {
  console.log('📅 Scheduling weekly digest for Sundays at 9:00 AM...');
  
  cron.schedule('0 9 * * 0', async () => {
    console.log('⏰ Weekly digest scheduled execution triggered');
    await sendWeeklyDigest();
  }, {
    timezone: "Asia/Kolkata" // Indian timezone
  });
  
  console.log('✅ Weekly digest scheduler is now active!');
};

// Handle command line arguments
const command = process.argv[2];

switch (command) {
  case 'test':
    testDigest();
    break;
  case 'preview':
    previewDigest();
    break;
  case 'schedule':
    schedule();
    break;
  default:
    console.log(`
📧 Weekly Digest Scheduler for Woofadaar Community

Usage:
  node scripts/weekly-digest-scheduler.js [command]

Commands:
  test     - Send digest immediately (for testing)
  preview  - Preview digest data without sending
  schedule - Start the scheduled digest service (runs every Sunday 9AM IST)

Example:
  node scripts/weekly-digest-scheduler.js test
  node scripts/weekly-digest-scheduler.js preview
  node scripts/weekly-digest-scheduler.js schedule

Environment Variables:
  NEXT_PUBLIC_BASE_URL  - Base URL of your application
  ADMIN_API_TOKEN       - Admin token for API authentication
`);
}

module.exports = { sendWeeklyDigest, previewDigest, schedule };