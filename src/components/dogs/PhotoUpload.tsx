'use client';

import { useState, useRef } from 'react';
import { Camera, Upload, X, CheckCircle, AlertCircle } from 'lucide-react';

interface PhotoUploadProps {
  onPhotoUploaded: (url: string) => void;
  currentPhoto?: string;
}

export default function PhotoUpload({ onPhotoUploaded, currentPhoto }: PhotoUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>(currentPhoto || '');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file');
      setUploadStatus('error');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Image size must be less than 5MB');
      setUploadStatus('error');
      return;
    }

    setSelectedFile(file);
    setUploadStatus('idle');
    setErrorMessage('');

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Auto-upload the file
    handleUpload(file);
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handleUpload = async (fileToUpload?: File) => {
    const file = fileToUpload || selectedFile;
    if (!file) return;

    setIsUploading(true);
    setUploadStatus('idle');
    setErrorMessage('');

    try {
      const base64 = await convertToBase64(file);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: base64 }),
      });

      const result = await response.json();

      if (result.success) {
        setUploadStatus('success');
        onPhotoUploaded(result.url);
      } else {
        setUploadStatus('error');
        setErrorMessage(result.error || 'Upload failed');
        console.error('Upload failed:', result.error);
      }
    } catch (error) {
      setUploadStatus('error');
      setErrorMessage('Network error. Please try again.');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreview(currentPhoto || '');
    setUploadStatus('idle');
    setErrorMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg p-6 border-2 border-dashed border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <Camera className="w-5 h-5 mr-2 text-[#3bbca8]" />
        Dog Photo
      </h3>

      <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
        {/* Photo Preview */}
        <div className="relative">
          {preview ? (
            <div className="relative">
              <img
                src={preview}
                alt="Dog photo preview"
                className="w-24 h-24 rounded-full object-cover border-4 border-[#3bbca8]"
              />
              {uploadStatus === 'success' && (
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          ) : (
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center border-4 border-gray-300">
              <Camera className="w-8 h-8 text-gray-400" />
            </div>
          )}
        </div>

        {/* Upload Controls */}
        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="photo-upload"
            />
            <label
              htmlFor="photo-upload"
              className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer text-sm font-medium text-gray-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              Choose Photo
            </label>

            {selectedFile && (
              <button
                onClick={clearSelection}
                disabled={isUploading}
                className="inline-flex items-center px-3 py-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Status Messages */}
          {isUploading && (
            <div className="flex items-center text-blue-600 text-sm">
              <div className="w-4 h-4 mr-2 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              Uploading photo...
            </div>
          )}

          {uploadStatus === 'success' && (
            <div className="flex items-center text-green-600 text-sm">
              <CheckCircle className="w-4 h-4 mr-1" />
              Photo uploaded successfully!
            </div>
          )}

          {uploadStatus === 'error' && (
            <div className="flex items-center text-red-600 text-sm">
              <AlertCircle className="w-4 h-4 mr-1" />
              {errorMessage}
            </div>
          )}

          {/* Helper Text */}
          <div className="text-sm text-gray-500">
            <p>• Choose a clear photo of your dog</p>
            <p>• Best results with square images</p>
            <p>• Maximum size: 5MB</p>
            <p>• Supported formats: JPG, PNG, GIF</p>
          </div>
        </div>
      </div>
    </div>
  );
}