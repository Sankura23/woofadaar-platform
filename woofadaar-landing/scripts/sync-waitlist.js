const { google } = require('googleapis');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient();

// Configuration
const CREDENTIALS_PATH = path.join(__dirname, '..', 'credentials', 'google-sheets-key.json');
const SYNC_STATE_PATH = path.join(__dirname, 'sync-state.json');
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

// Column headers matching waitlist fields
const HEADERS = [
  'ID',
  'Email',
  'Name',
  'Location',
  'Phone',
  'Dog Owner',
  'Preferred Language',
  'Referral Source',
  'Interests',
  'Status',
  'Position',
  'Created At',
  'Updated At'
];

async function loadSyncState() {
  try {
    const data = await fs.readFile(SYNC_STATE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, return empty state
    return { lastSyncedIds: [] };
  }
}

async function saveSyncState(state) {
  await fs.writeFile(SYNC_STATE_PATH, JSON.stringify(state, null, 2));
}

async function authenticateGoogleSheets() {
  const credentials = JSON.parse(await fs.readFile(CREDENTIALS_PATH, 'utf8'));

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

async function ensureSheetHeaders(sheets) {
  try {
    // Check if headers exist
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Sheet1!A1:M1',
    });

    if (!response.data.values || response.data.values.length === 0) {
      // Add headers if they don't exist
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: 'Sheet1!A1:M1',
        valueInputOption: 'RAW',
        resource: {
          values: [HEADERS],
        },
      });
      console.log('✅ Headers added to sheet');
    }
  } catch (error) {
    console.error('Error checking/adding headers:', error.message);
    throw error;
  }
}

function formatWaitlistEntry(entry) {
  return [
    entry.id,
    entry.email,
    entry.name,
    entry.location || '',
    entry.phone || '',
    entry.dog_owner ? 'Yes' : 'No',
    entry.preferred_language,
    entry.referral_source || '',
    entry.interests || '',
    entry.status,
    entry.position || '',
    entry.created_at.toISOString(),
    entry.updated_at.toISOString(),
  ];
}

async function syncWaitlist() {
  try {
    console.log('🚀 Starting waitlist sync...');

    // Validate configuration
    if (!SHEET_ID) {
      throw new Error('GOOGLE_SHEET_ID not found in environment variables');
    }

    // Load sync state
    const syncState = await loadSyncState();
    console.log(`📊 Previously synced: ${syncState.lastSyncedIds.length} entries`);

    // Fetch all waitlist entries
    const allEntries = await prisma.waitlist.findMany({
      orderBy: { created_at: 'asc' },
    });
    console.log(`📋 Total waitlist entries: ${allEntries.length}`);

    // Filter new entries
    const newEntries = allEntries.filter(
      entry => !syncState.lastSyncedIds.includes(entry.id)
    );

    if (newEntries.length === 0) {
      console.log('✅ No new entries to sync');
      return;
    }

    console.log(`📤 Syncing ${newEntries.length} new entries...`);

    // Authenticate with Google Sheets
    const sheets = await authenticateGoogleSheets();

    // Ensure headers exist
    await ensureSheetHeaders(sheets);

    // Format entries for Google Sheets
    const rows = newEntries.map(formatWaitlistEntry);

    // Append new rows
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'Sheet1!A:M',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: rows,
      },
    });

    // Update sync state
    syncState.lastSyncedIds.push(...newEntries.map(e => e.id));
    await saveSyncState(syncState);

    console.log(`✅ Successfully synced ${newEntries.length} entries`);
    console.log(`📊 Total synced to date: ${syncState.lastSyncedIds.length} entries`);

  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the sync
syncWaitlist()
  .then(() => {
    console.log('🎉 Sync completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Sync failed with error:', error);
    process.exit(1);
  });
