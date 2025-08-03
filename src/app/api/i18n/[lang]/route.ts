import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lang: string }> }
) {
  try {
    const { lang } = await params;
    
    // Validate language code
    const supportedLanguages = ['en', 'hi'];
    if (!supportedLanguages.includes(lang)) {
      return NextResponse.json(
        { error: 'Unsupported language' },
        { status: 400 }
      );
    }

    // Read the translation file
    const translationsPath = path.join(
      process.cwd(),
      'src',
      'translations',
      `${lang}.json`
    );

    try {
      const translationsFile = await fs.readFile(translationsPath, 'utf8');
      const translations = JSON.parse(translationsFile);

      return NextResponse.json(translations, {
        headers: {
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
          'Content-Type': 'application/json',
        },
      });
    } catch (fileError) {
      console.error(`Error reading translation file for ${lang}:`, fileError);
      
      // Fallback to English if the requested language file doesn't exist
      if (lang !== 'en') {
        const englishPath = path.join(
          process.cwd(),
          'src',
          'translations',
          'en.json'
        );
        const englishFile = await fs.readFile(englishPath, 'utf8');
        const englishTranslations = JSON.parse(englishFile);
        
        return NextResponse.json(englishTranslations, {
          headers: {
            'Cache-Control': 'public, max-age=3600',
            'Content-Type': 'application/json',
          },
        });
      }
      
      throw fileError;
    }
  } catch (error) {
    console.error('Error in i18n API:', error);
    return NextResponse.json(
      { error: 'Failed to load translations' },
      { status: 500 }
    );
  }
}