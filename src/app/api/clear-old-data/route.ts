import { NextRequest, NextResponse } from 'next/server';
import { clearAllDataExceptUser } from '@/lib/demo-storage';

export async function POST(request: NextRequest) {
  try {
    const { keepUserEmail } = await request.json();
    
    if (!keepUserEmail) {
      return NextResponse.json({ message: 'keepUserEmail is required' }, { status: 400 });
    }

    await clearAllDataExceptUser(keepUserEmail);
    
    return NextResponse.json({ 
      success: true, 
      message: `Cleared all data except user: ${keepUserEmail}` 
    });

  } catch (error) {
    console.error('Clear data error:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to clear data',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}