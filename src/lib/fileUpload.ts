import sharp from 'sharp';
import { validateImageFile, FileUploadError } from './validation';
import { logError, logInfo } from './logger';

export interface FileUploadConfig {
  maxSize: number;
  allowedTypes: string[];
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export const DEFAULT_UPLOAD_CONFIG: FileUploadConfig = {
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 85
};

// Validate and optimize image file
export const processImageFile = async (
  file: File,
  config: FileUploadConfig = DEFAULT_UPLOAD_CONFIG
): Promise<Buffer> => {
  try {
    // Size validation
    if (file.size > config.maxSize) {
      throw new FileUploadError(`File size ${file.size} exceeds maximum ${config.maxSize} bytes`);
    }

    // MIME type validation
    if (!config.allowedTypes.includes(file.type)) {
      throw new FileUploadError(`File type ${file.type} not allowed. Allowed types: ${config.allowedTypes.join(', ')}`);
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Magic number validation
    const isValidImage = await validateImageFile(buffer);
    if (!isValidImage) {
      throw new FileUploadError('File is not a valid image or may be corrupted');
    }

    // Image optimization using Sharp
    let processedBuffer = buffer;
    
    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();
      
      logInfo('Processing image', {
        originalSize: buffer.length,
        format: metadata.format,
        width: metadata.width,
        height: metadata.height
      });

      // Resize if necessary
      if (
        metadata.width && metadata.height &&
        (metadata.width > (config.maxWidth || 1200) || metadata.height > (config.maxHeight || 1200))
      ) {
        image.resize(config.maxWidth, config.maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      // Convert to JPEG for consistency and compression
      processedBuffer = await image
        .jpeg({ quality: config.quality || 85 })
        .toBuffer() as Buffer;

      logInfo('Image processed successfully', {
        originalSize: buffer.length,
        processedSize: processedBuffer.length,
        compressionRatio: ((buffer.length - processedBuffer.length) / buffer.length * 100).toFixed(2) + '%'
      });

    } catch (sharpError) {
      logError('Sharp processing failed, using original buffer', sharpError as Error);
      processedBuffer = buffer;
    }

    return processedBuffer;

  } catch (error) {
    logError('File processing failed', error as Error, {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });
    throw error;
  }
};

// File validation without processing
export const validateFile = async (file: File, config: FileUploadConfig = DEFAULT_UPLOAD_CONFIG): Promise<boolean> => {
  try {
    if (file.size > config.maxSize) return false;
    if (!config.allowedTypes.includes(file.type)) return false;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    return await validateImageFile(buffer);
  } catch (error) {
    logError('File validation failed', error as Error, { fileName: file.name });
    return false;
  }
};

// Generate secure filename
export const generateSecureFilename = (originalName: string, extension?: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const ext = extension || originalName.split('.').pop() || 'jpg';
  
  return `${timestamp}_${random}.${ext}`;
};

// File size formatter
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Image metadata extraction
export const getImageMetadata = async (buffer: Buffer) => {
  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();
    
    return {
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
      channels: metadata.channels,
      density: metadata.density,
      hasAlpha: metadata.hasAlpha,
      size: buffer.length
    };
  } catch (error) {
    logError('Failed to extract image metadata', error as Error);
    return null;
  }
};