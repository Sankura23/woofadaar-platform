import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { prisma } from '@/lib/prisma';
import fs from 'fs/promises';
import path from 'path';

const SYNC_STATE_PATH = path.join(process.cwd(), 'scripts', 'sync-state.json');
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_CREDENTIALS = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

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
    return { lastSyncedIds: [] };
  }
}

async function saveSyncState(state: any) {
  await fs.mkdir(path.dirname(SYNC_STATE_PATH), { recursive: true });
  await fs.writeFile(SYNC_STATE_PATH, JSON.stringify(state, null, 2));
}

async function authenticateGoogleSheets() {
  if (!GOOGLE_CREDENTIALS) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not found in environment');
  }

  const credentials = JSON.parse(GOOGLE_CREDENTIALS);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

async function ensureSheetHeaders(sheets: any) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Sheet1!A1:M1',
  });

  if (!response.data.values || response.data.values.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: 'Sheet1!A1:M1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [HEADERS],
      },
    });
  }
}

function formatWaitlistEntry(entry: any) {
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

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (for security)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🚀 Starting waitlist sync...');

    if (!SHEET_ID) {
      throw new Error('GOOGLE_SHEET_ID not found');
    }

    const syncState = await loadSyncState();
    const allEntries = await prisma.waitlist.findMany({
      orderBy: { created_at: 'asc' },
    });

    const newEntries = allEntries.filter(
      entry => !syncState.lastSyncedIds.includes(entry.id)
    );

    if (newEntries.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No new entries to sync',
        synced: 0,
        total: syncState.lastSyncedIds.length,
      });
    }

    const sheets = await authenticateGoogleSheets();
    await ensureSheetHeaders(sheets);

    const rows = newEntries.map(formatWaitlistEntry);

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'Sheet1!A:M',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: rows,
      },
    });

    syncState.lastSyncedIds.push(...newEntries.map((e: any) => e.id));
    await saveSyncState(syncState);

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${newEntries.length} entries`,
      synced: newEntries.length,
      total: syncState.lastSyncedIds.length,
    });

  } catch (error: any) {
    console.error('❌ Sync failed:', error);
    return NextResponse.json(
      { error: 'Sync failed', details: error.message },
      { status: 500 }
    );
  }
}
