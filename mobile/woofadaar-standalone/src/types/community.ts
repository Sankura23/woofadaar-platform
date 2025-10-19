export interface Question {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  is_resolved: boolean;
  view_count: number;
  upvotes: number;
  downvotes: number;
  answer_count: number;
  created_at: string;
  user: {
    id: string;
    name: string;
    profile_image_url?: string;
  };
  dog?: {
    id: string;
    name: string;
    breed: string;
    photo_url?: string;
  };
}

export interface Answer {
  id: string;
  content: string;
  is_helpful: boolean;
  upvotes: number;
  downvotes: number;
  created_at: string;
  user: {
    id: string;
    name: string;
    profile_image_url?: string;
  };
}

export const QUESTION_CATEGORIES = [
  { value: '', label: 'All Categories', icon: '🏠' },
  { value: 'health', label: 'Health', icon: '🏥' },
  { value: 'behavior', label: 'Behavior', icon: '🎾' },
  { value: 'feeding', label: 'Feeding', icon: '🍖' },
  { value: 'training', label: 'Training', icon: '📚' },
  { value: 'local', label: 'Local', icon: '📍' },
  { value: 'general', label: 'General', icon: '🐕' }
];

export const COMMON_TAGS = [
  'puppy', 'senior-dog', 'rescue', 'first-time-owner', 'emergency',
  'vaccination', 'diet', 'exercise', 'grooming', 'behavior-training',
  'indoor', 'outdoor', 'travel', 'vet-visit', 'medication'
];