import { NextRequest, NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Set body size limit to 10MB
    if (!request.body) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const { image } = await request.json();
    
    if (!image) {
      return NextResponse.json(
        { error: 'No image data provided' },
        { status: 400 }
      );
    }

    // Upload to Cloudinary with specified transformations
    const uploadResponse = await cloudinary.uploader.upload(image, {
      folder: 'woofadaar/dogs',
      transformation: [
        { width: 500, height: 500, crop: 'fill' },
        { quality: 'auto' }
      ],
      resource_type: 'image'
    });

    return NextResponse.json({
      success: true,
      url: uploadResponse.secure_url,
      public_id: uploadResponse.public_id
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed' 
      },
      { status: 500 }
    );
  }
}

// Configure body parser
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};