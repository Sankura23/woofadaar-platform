'use client';

import React, { useState } from 'react';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Calendar,
  MapPin,
  Camera,
  Star,
  Globe,
  Lock,
  Edit,
  Trash2,
  Tag,
  Cloud
} from 'lucide-react';

interface DiaryEntryProps {
  entry: {
    id: string;
    title: string;
    content: string;
    entry_type: string;
    photos: string[];
    milestone_type?: string;
    mood?: string;
    weather?: string;
    location?: string;
    tags: string[];
    is_private: boolean;
    created_at: string;
    updated_at: string;
    dog: {
      id: string;
      name: string;
      breed: string;
      photo_url?: string;
      user: {
        id: string;
        first_name: string;
        last_name: string;
        avatar_url?: string;
      };
    };
    isLiked: boolean;
    likesCount: number;
    commentsCount: number;
  };
  currentUserId?: string;
  currentUserDogs?: Array<{ id: string; name: string; photo_url?: string }>;
  onLike?: (entryId: string, dogId: string) => void;
  onComment?: (entryId: string) => void;
  onEdit?: (entry: any) => void;
  onDelete?: (entryId: string) => void;
}

const ENTRY_TYPES = {
  general: { icon: Heart, color: 'text-gray-500', label: 'Daily Life' },
  milestone: { icon: Star, color: 'text-yellow-500', label: 'Milestone' },
  training: { icon: Calendar, color: 'text-blue-500', label: 'Training' },
  health: { icon: Heart, color: 'text-red-500', label: 'Health' },
  adventure: { icon: MapPin, color: 'text-green-500', label: 'Adventure' }
};

const MOODS = {
  happy: '😊',
  excited: '🤩',
  calm: '😌',
  sleepy: '😴',
  playful: '😄',
  anxious: '😰',
  sick: '🤒'
};

const WEATHER_ICONS = {
  sunny: '☀️',
  cloudy: '☁️',
  rainy: '🌧️',
  snowy: '❄️',
  windy: '💨'
};

export default function DiaryEntry({ 
  entry, 
  currentUserId, 
  currentUserDogs = [],
  onLike, 
  onComment, 
  onEdit, 
  onDelete 
}: DiaryEntryProps) {
  const [showComments, setShowComments] = useState(false);
  
  const isOwner = entry.dog?.User?.id === currentUserId;
  const entryType = ENTRY_TYPES[entry.entry_type as keyof typeof ENTRY_TYPES] || ENTRY_TYPES.general;
  const TypeIcon = entryType.icon;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleLike = () => {
    if (currentUserDogs.length > 0 && onLike) {
      // Use first dog for liking - in real app, user might choose which dog
      onLike(entry.id, currentUserDogs[0].id);
    }
  };

  return (
    <article className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="relative">
              {entry.dog.photo_url ? (
                <img
                  src={entry.dog.photo_url}
                  alt={entry.dog.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500 font-medium">
                    {entry.dog.name[0]}
                  </span>
                </div>
              )}
              <TypeIcon className={`w-4 h-4 absolute -bottom-1 -right-1 ${entryType.color} bg-white rounded-full p-0.5 border border-gray-200`} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-gray-900 truncate">{entry.dog.name}</h3>
                <span className="text-sm text-gray-500">•</span>
                <span className={`text-sm ${entryType.color} font-medium`}>
                  {entryType.label}
                </span>
                {entry.milestone_type && (
                  <>
                    <span className="text-sm text-gray-500">•</span>
                    <span className="text-sm text-yellow-600 font-medium">
                      {entry.milestone_type}
                    </span>
                  </>
                )}
              </div>
              
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-sm text-gray-500">
                  {entry.dog?.User?.name || 'Dog Owner'}
                </span>
                <span className="text-sm text-gray-400">•</span>
                <span className="text-sm text-gray-500">{formatDate(entry.created_at)}</span>
                {entry.is_private ? (
                  <Lock className="w-3 h-3 text-gray-400" />
                ) : (
                  <Globe className="w-3 h-3 text-gray-400" />
                )}
              </div>
            </div>
          </div>

          {isOwner && (
            <div className="flex items-center space-x-1">
              {onEdit && (
                <button
                  onClick={() => onEdit(entry)}
                  className="p-1 text-gray-400 hover:text-[#3bbca8] transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(entry.id)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">{entry.title}</h2>
        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap mb-4">
          {entry.content}
        </p>

        {/* Photos */}
        {entry.photos.length > 0 && (
          <div className="mb-4">
            <div className={`grid gap-2 ${
              entry.photos.length === 1 ? 'grid-cols-1' :
              entry.photos.length === 2 ? 'grid-cols-2' :
              'grid-cols-2 md:grid-cols-3'
            }`}>
              {entry.photos.map((photo, index) => (
                <img
                  key={index}
                  src={photo}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                />
              ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-4">
          {entry.mood && (
            <div className="flex items-center space-x-1">
              <span>{MOODS[entry.mood as keyof typeof MOODS]}</span>
              <span className="capitalize">{entry.mood}</span>
            </div>
          )}
          
          {entry.weather && (
            <div className="flex items-center space-x-1">
              <span>{WEATHER_ICONS[entry.weather as keyof typeof WEATHER_ICONS]}</span>
              <span className="capitalize">{entry.weather}</span>
            </div>
          )}
          
          {entry.location && (
            <div className="flex items-center space-x-1">
              <MapPin className="w-3 h-3" />
              <span>{entry.location}</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {entry.tags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full"
              >
                <Tag className="w-2 h-2 mr-1" />
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleLike}
              disabled={!currentUserDogs.length}
              className={`flex items-center space-x-2 px-3 py-1 rounded-full transition-colors ${
                entry.isLiked
                  ? 'bg-red-50 text-red-600'
                  : 'text-gray-500 hover:bg-gray-50'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Heart className={`w-4 h-4 ${entry.isLiked ? 'fill-current' : ''}`} />
              <span className="text-sm font-medium">{entry.likesCount}</span>
            </button>

            <button
              onClick={() => {
                setShowComments(!showComments);
                onComment?.(entry.id);
              }}
              className="flex items-center space-x-2 px-3 py-1 rounded-full text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-sm font-medium">{entry.commentsCount}</span>
            </button>

            <button className="flex items-center space-x-2 px-3 py-1 rounded-full text-gray-500 hover:bg-gray-50 transition-colors">
              <Share2 className="w-4 h-4" />
              <span className="text-sm font-medium">Share</span>
            </button>
          </div>

          <div className="text-xs text-gray-400">
            {entry.updated_at !== entry.created_at && 'Edited'}
          </div>
        </div>
      </div>

      {/* Comments Section - Would expand here */}
      {showComments && (
        <div className="border-t border-gray-100 p-4 bg-gray-50">
          <p className="text-sm text-gray-500">Comments loading...</p>
        </div>
      )}
    </article>
  );
}