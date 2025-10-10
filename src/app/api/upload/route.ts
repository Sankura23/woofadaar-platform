import { NextRequest, NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';
import jwt from 'jsonwebtoken';

export const runtime = 'nodejs';

interface DecodedToken {
  userId: string;
  email: string;
}

async function verifyToken(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    return decoded.userId;
  } catch (error) {
    return null;
  }
}

export async function POST(request: NextRequest) {
  // Verify authentication
  const userId = await verifyToken(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const contentType = request.headers.get('content-type');
    
    if (contentType?.includes('multipart/form-data')) {
      // Handle FormData (file upload)
      const formData = await request.formData();
      const file = formData.get('file') as File;
      
      if (!file) {
        return NextResponse.json(
          { error: 'No file provided' },
          { status: 400 }
        );
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        return NextResponse.json(
          { error: 'Only image files are allowed' },
          { status: 400 }
        );
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'File size must be less than 5MB' },
          { status: 400 }
        );
      }

      // Convert file to base64
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64 = buffer.toString('base64');
      const dataURI = `data:${file.type};base64,${base64}`;

      // Upload to Cloudinary with timeout and retry
      const uploadResponse = await cloudinary.uploader.upload(dataURI, {
        folder: 'woofadaar',
        transformation: [
          { width: 500, height: 500, crop: 'fill' },
          { quality: 'auto' }
        ],
        resource_type: 'image',
        timeout: 60000, // 60 seconds timeout
        chunk_size: 6000000 // 6MB chunks for large files
      });

      return NextResponse.json({
        success: true,
        url: uploadResponse.secure_url,
        public_id: uploadResponse.public_id
      });

    } else {
      // Handle JSON (base64 image)
      const { image } = await request.json();
      
      if (!image) {
        return NextResponse.json(
          { error: 'No image data provided' },
          { status: 400 }
        );
      }

      // Upload to Cloudinary with specified transformations and timeout
      const uploadResponse = await cloudinary.uploader.upload(image, {
        folder: 'woofadaar',
        transformation: [
          { width: 500, height: 500, crop: 'fill' },
          { quality: 'auto' }
        ],
        resource_type: 'image',
        timeout: 60000, // 60 seconds timeout
        chunk_size: 6000000 // 6MB chunks for large files
      });

      return NextResponse.json({
        success: true,
        url: uploadResponse.secure_url,
        public_id: uploadResponse.public_id
      });
    }

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