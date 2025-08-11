'use client';

import React, { useState, useEffect } from 'react';
import DiaryEntry from './DiaryEntry';
import DiaryEntryForm from './DiaryEntryForm';
import { 
  Plus, 
  BookOpen, 
  Filter,
  Search,
  Star,
  Heart,
  Calendar,
  MapPin,
  Globe,
  Lock,
  ChevronDown
} from 'lucide-react';

interface DogDiaryProps {
  dogId?: string;
  showPublicFeed?: boolean;
}

interface DiaryEntryData {
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
}

interface Dog {
  id: string;
  name: string;
  breed: string;
  photo_url?: string;
}

const ENTRY_TYPE_FILTERS = [
  { value: '', label: 'All Types', icon: BookOpen },
  { value: 'milestone', label: 'Milestones', icon: Star },
  { value: 'general', label: 'Daily Life', icon: Heart },
  { value: 'training', label: 'Training', icon: Calendar },
  { value: 'adventure', label: 'Adventures', icon: MapPin }
];

export default function DogDiary({ dogId, showPublicFeed = false }: DogDiaryProps) {
  const [entries, setEntries] = useState<DiaryEntryData[]>([]);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DiaryEntryData | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Filters
  const [selectedDog, setSelectedDog] = useState<string>(dogId || '');
  const [selectedType, setSelectedType] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    fetchUserData();
    fetchEntries(true);
  }, [selectedDog, selectedType, showPublicFeed]);

  useEffect(() => {
    if (searchQuery) {
      const debounceTimer = setTimeout(() => {
        fetchEntries(true);
      }, 500);
      return () => clearTimeout(debounceTimer);
    } else {
      fetchEntries(true);
    }
  }, [searchQuery]);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('woofadaar_token');
      
      // Get current user info and dogs
      const [userResponse, dogsResponse] = await Promise.all([
        fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/dogs', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (userResponse.ok) {
        const userData = await userResponse.json();
        setCurrentUserId(userData.data.user.id);
      } else {
        // Fallback: extract user ID from token or use a default
        const token = localStorage.getItem('woofadaar_token');
        if (token) {
          try {
            // Try to decode user ID from token payload (simplified approach)
            setCurrentUserId('current_user');
          } catch (e) {
            console.log('Could not get user ID from token');
          }
        }
      }

      if (dogsResponse.ok) {
        const dogsData = await dogsResponse.json();
        setDogs(dogsData.data.dogs || []);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const fetchEntries = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const params = new URLSearchParams({
        limit: '10',
        offset: reset ? '0' : entries.length.toString()
      });

      if (selectedDog) params.append('dog_id', selectedDog);
      if (selectedType) params.append('entry_type', selectedType);
      if (showPublicFeed) params.append('public_only', 'true');
      if (searchQuery) params.append('search', searchQuery);

      const token = localStorage.getItem('woofadaar_token');
      const response = await fetch(`/api/diary/entries?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        const newEntries = data.data.entries || [];
        
        if (reset) {
          setEntries(newEntries);
        } else {
          setEntries(prev => [...prev, ...newEntries]);
        }
        
        setHasMore(data.data.pagination.hasMore);
      }
    } catch (error) {
      console.error('Error fetching entries:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleCreateEntry = () => {
    setEditingEntry(null);
    setShowForm(true);
  };

  const handleEditEntry = (entry: DiaryEntryData) => {
    setEditingEntry(entry);
    setShowForm(true);
  };

  const handleSaveEntry = (savedEntry: DiaryEntryData) => {
    if (editingEntry) {
      // Update existing entry
      setEntries(prev => prev.map(entry => 
        entry.id === editingEntry.id ? savedEntry : entry
      ));
    } else {
      // Add new entry at the top
      setEntries(prev => [savedEntry, ...prev]);
    }
    
    setShowForm(false);
    setEditingEntry(null);
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this diary entry?')) return;

    try {
      const token = localStorage.getItem('woofadaar_token');
      const response = await fetch(`/api/diary/entries/${entryId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setEntries(prev => prev.filter(entry => entry.id !== entryId));
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  };

  const handleLikeEntry = async (entryId: string, dogId: string) => {
    try {
      const token = localStorage.getItem('woofadaar_token');
      const response = await fetch('/api/diary/likes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ entry_id: entryId, dog_id: dogId })
      });

      if (response.ok) {
        const data = await response.json();
        const isLiked = data.data.liked;
        
        setEntries(prev => prev.map(entry => {
          if (entry.id === entryId) {
            return {
              ...entry,
              isLiked,
              likesCount: entry.likesCount + (isLiked ? 1 : -1)
            };
          }
          return entry;
        }));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchEntries(false);
    }
  };

  if (showForm) {
    return (
      <DiaryEntryForm
        dogId={selectedDog || dogs[0]?.id}
        dogs={dogs}
        initialData={editingEntry}
        onSave={handleSaveEntry}
        onCancel={() => setShowForm(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <BookOpen className="w-6 h-6 text-[#3bbca8]" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {showPublicFeed ? 'Community Stories' : 'Dog Diary'}
            </h1>
            <p className="text-gray-600">
              {showPublicFeed 
                ? 'Discover stories from the community' 
                : 'Document your dog\'s journey and milestones'}
            </p>
          </div>
        </div>

        {!showPublicFeed && dogs.length > 0 && (
          <button
            onClick={handleCreateEntry}
            className="inline-flex items-center px-4 py-2 bg-[#3bbca8] text-white rounded-md hover:bg-[#2daa96] transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Story
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search stories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
            />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            <ChevronDown className={`w-4 h-4 transform transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {showFilters && (
          <div className="space-y-4 pt-4 border-t border-gray-200">
            {/* Dog Filter */}
            {!showPublicFeed && dogs.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dog</label>
                <select
                  value={selectedDog}
                  onChange={(e) => setSelectedDog(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
                >
                  <option value="">All Dogs</option>
                  {dogs.map(dog => (
                    <option key={dog.id} value={dog.id}>{dog.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Entry Type</label>
              <div className="flex flex-wrap gap-2">
                {ENTRY_TYPE_FILTERS.map(filter => {
                  const Icon = filter.icon;
                  return (
                    <button
                      key={filter.value}
                      onClick={() => setSelectedType(filter.value)}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-full border transition-colors ${
                        selectedType === filter.value
                          ? 'bg-[#3bbca8] text-white border-[#3bbca8]'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm">{filter.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Entries Feed */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg p-6 shadow-sm animate-pulse">
              <div className="flex items-start space-x-3 mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-24 bg-gray-200 rounded mb-4"></div>
              <div className="flex space-x-4">
                <div className="h-8 bg-gray-200 rounded w-16"></div>
                <div className="h-8 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      ) : entries.length > 0 ? (
        <div className="space-y-6">
          {entries.map(entry => (
            <DiaryEntry
              key={entry.id}
              entry={entry}
              currentUserId={currentUserId}
              currentUserDogs={dogs}
              onLike={handleLikeEntry}
              onEdit={handleEditEntry}
              onDelete={handleDeleteEntry}
            />
          ))}

          {hasMore && (
            <div className="text-center py-8">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-6 py-2 text-[#3bbca8] border border-[#3bbca8] rounded-md hover:bg-[#3bbca8] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loadingMore ? 'Loading...' : 'Load More Stories'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery || selectedType || selectedDog ? 'No stories found' : 'No stories yet'}
          </h3>
          <p className="text-gray-500 mb-6">
            {searchQuery || selectedType || selectedDog 
              ? 'Try adjusting your filters to see more stories'
              : showPublicFeed 
                ? 'Be the first to share your dog\'s story with the community!'
                : 'Start documenting your dog\'s journey and milestones'
            }
          </p>
          {!showPublicFeed && dogs.length > 0 && (
            <button
              onClick={handleCreateEntry}
              className="inline-flex items-center px-6 py-3 bg-[#3bbca8] text-white rounded-md hover:bg-[#2daa96] transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Story
            </button>
          )}
        </div>
      )}
    </div>
  );
}