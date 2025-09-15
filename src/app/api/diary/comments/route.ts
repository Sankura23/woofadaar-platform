import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'Diary comments API endpoint' });
}

export async function POST() {
  return NextResponse.json({ message: 'Create diary comment endpoint' });
}