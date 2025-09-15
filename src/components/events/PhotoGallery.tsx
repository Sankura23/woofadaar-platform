'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  Camera, 
  Heart, 
  MessageCircle, 
  Upload, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Plus,
  MoreVertical,
  Trash2,
  Edit,
  Share,
  Download,
  User,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface Photo {
  id: string;
  image_url: string;
  thumbnail_url: string;
  caption: string;
  taken_at?: string;
  created_at: string;
  user: {
    id: string;
    name: string;
    profile_image_url?: string;
  };
  likes_count: number;
  comments_count: number;
  user_has_liked: boolean;
}

interface PhotoGalleryProps {
  eventId: string;
  allowPhotos?: boolean;
  userCanUpload?: boolean;
  className?: string;
}

export default function PhotoGallery({ eventId, allowPhotos = true, userCanUpload = false, className = '' }: PhotoGalleryProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Mock user ID - in real app this would come from auth context
  const userId = 'demo-user-id';

  const fetchPhotos = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/events/${eventId}/photos?user_id=${userId}`);
      const result = await response.json();
      
      if (result.success) {
        setPhotos(result.data.photos);
      } else {
        setError(result.error || 'Failed to fetch photos');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error fetching photos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLikePhoto = async (photoId: string) => {
    try {
      const response = await fetch(`/api/events/${eventId}/photos/${photoId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      });

      const result = await response.json();

      if (result.success) {
        setPhotos(prev => prev.map(photo => 
          photo.id === photoId 
            ? {
                ...photo,
                likes_count: result.data.likes_count,
                user_has_liked: result.data.user_has_liked
              }
            : photo
        ));

        // Update selected photo if it's the same
        if (selectedPhoto?.id === photoId) {
          setSelectedPhoto(prev => prev ? {
            ...prev,
            likes_count: result.data.likes_count,
            user_has_liked: result.data.user_has_liked
          } : null);
        }
      }
    } catch (err) {
      console.error('Error liking photo:', err);
    }
  };

  const openPhotoModal = (photo: Photo, index: number) => {
    setSelectedPhoto(photo);
    setCurrentPhotoIndex(index);
  };

  const closePhotoModal = () => {
    setSelectedPhoto(null);
    setCurrentPhotoIndex(0);
  };

  const navigatePhoto = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'next' 
      ? (currentPhotoIndex + 1) % photos.length
      : (currentPhotoIndex - 1 + photos.length) % photos.length;
    
    setCurrentPhotoIndex(newIndex);
    setSelectedPhoto(photos[newIndex]);
  };

  useEffect(() => {
    if (allowPhotos) {
      fetchPhotos();
    }
  }, [eventId, allowPhotos]);

  if (!allowPhotos) {
    return (
      <div className={`bg-gray-50 rounded-lg p-8 text-center ${className}`}>
        <Camera className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">Photo sharing is not enabled for this event</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-orange-200 p-8 text-center ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading photos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg border border-orange-200 p-8 text-center ${className}`}>
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => fetchPhotos()}
          className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-orange-200 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Camera className="h-6 w-6 text-orange-600" />
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Event Photos</h3>
              <p className="text-sm text-gray-600">
                {photos.length} photo{photos.length !== 1 ? 's' : ''} shared
              </p>
            </div>
          </div>

          {userCanUpload && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Photos
            </button>
          )}
        </div>
      </div>

      {/* Photo Grid */}
      {photos.length > 0 ? (
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo, index) => (
              <div key={photo.id} className="relative group cursor-pointer aspect-square">
                <div 
                  className="relative w-full h-full bg-gray-200 rounded-lg overflow-hidden"
                  onClick={() => openPhotoModal(photo, index)}
                >
                  <Image
                    src={photo.thumbnail_url || photo.image_url}
                    alt={photo.caption || 'Event photo'}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                  
                  {/* Overlay with likes */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-2 left-2 flex items-center gap-2 text-white text-sm">
                      <Heart className={`h-4 w-4 ${photo.user_has_liked ? 'fill-red-500 text-red-500' : ''}`} />
                      <span>{photo.likes_count}</span>
                      {photo.comments_count > 0 && (
                        <>
                          <MessageCircle className="h-4 w-4 ml-1" />
                          <span>{photo.comments_count}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* User info */}
                <div className="absolute top-2 left-2 flex items-center gap-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                  <div className="w-4 h-4 bg-orange-200 rounded-full flex items-center justify-center">
                    {photo.user.profile_image_url ? (
                      <Image
                        src={photo.user.profile_image_url}
                        alt={photo.user.name}
                        width={16}
                        height={16}
                        className="rounded-full"
                      />
                    ) : (
                      <User className="h-2 w-2 text-orange-700" />
                    )}
                  </div>
                  <span>{photo.user.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-12 text-center">
          <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">No photos yet</h4>
          <p className="text-gray-600 mb-6">
            Be the first to share memories from this event!
          </p>
          
          {userCanUpload && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2 mx-auto"
            >
              <Upload className="h-5 w-5" />
              Upload Photos
            </button>
          )}
        </div>
      )}

      {/* Photo Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-full w-full">
            {/* Close button */}
            <button
              onClick={closePhotoModal}
              className="absolute top-4 right-4 z-10 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Navigation buttons */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={() => navigatePhoto('prev')}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                
                <button
                  onClick={() => navigatePhoto('next')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            {/* Main image */}
            <div className="relative bg-black rounded-lg overflow-hidden max-h-[70vh]">
              <Image
                src={selectedPhoto.image_url}
                alt={selectedPhoto.caption || 'Event photo'}
                width={1200}
                height={800}
                className="max-w-full max-h-full object-contain mx-auto"
              />
            </div>

            {/* Photo info */}
            <div className="bg-white rounded-lg mt-4 p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-200 rounded-full flex items-center justify-center">
                    {selectedPhoto.user.profile_image_url ? (
                      <Image
                        src={selectedPhoto.user.profile_image_url}
                        alt={selectedPhoto.user.name}
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                    ) : (
                      <User className="h-5 w-5 text-orange-700" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{selectedPhoto.user.name}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(selectedPhoto.created_at).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleLikePhoto(selectedPhoto.id)}
                    className={`flex items-center gap-2 px-3 py-1 rounded-full transition-colors ${
                      selectedPhoto.user_has_liked 
                        ? 'bg-red-100 text-red-700' 
                        : 'bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-600'
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${selectedPhoto.user_has_liked ? 'fill-current' : ''}`} />
                    <span>{selectedPhoto.likes_count}</span>
                  </button>
                  
                  {selectedPhoto.comments_count > 0 && (
                    <div className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full">
                      <MessageCircle className="h-4 w-4" />
                      <span>{selectedPhoto.comments_count}</span>
                    </div>
                  )}
                </div>
              </div>

              {selectedPhoto.caption && (
                <p className="text-gray-900 mb-2">{selectedPhoto.caption}</p>
              )}

              {photos.length > 1 && (
                <p className="text-sm text-gray-500">
                  Photo {currentPhotoIndex + 1} of {photos.length}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <PhotoUploadModal
          eventId={eventId}
          onClose={() => setShowUploadModal(false)}
          onPhotoUploaded={() => {
            setShowUploadModal(false);
            fetchPhotos();
          }}
        />
      )}
    </div>
  );
}

// Photo Upload Modal Component
interface PhotoUploadModalProps {
  eventId: string;
  onClose: () => void;
  onPhotoUploaded: () => void;
}

function PhotoUploadModal({ eventId, onClose, onPhotoUploaded }: PhotoUploadModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = 'demo-user-id'; // Mock user ID

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      return allowedTypes.includes(file.type) && file.size <= maxSize;
    });
    
    setSelectedFiles(prev => [...prev, ...validFiles].slice(0, 5)); // Max 5 photos
    setError(null);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('user_id', userId);
        formData.append('caption', caption);

        const response = await fetch(`/api/events/${eventId}/photos`, {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || 'Upload failed');
        }
      }

      onPhotoUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Upload Photos</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* File input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Photos (max 5, 10MB each)
            </label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
            />
          </div>

          {/* Selected files */}
          {selectedFiles.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Selected photos:</p>
              <div className="space-y-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <span className="text-sm text-gray-600 truncate">{file.name}</span>
                    <button
                      onClick={() => removeFile(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Caption */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Caption (optional)
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Share what made this moment special..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={selectedFiles.length === 0 || uploading}
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload {selectedFiles.length} photo{selectedFiles.length !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}