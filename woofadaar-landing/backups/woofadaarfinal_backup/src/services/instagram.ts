export interface InstagramPost {
  id: string;
  username: string;
  userAvatar?: string;
  media_url?: string;
  caption: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  permalink: string;
  timestamp: string;
  likes?: number;
  timeAgo: string;
  isVerified: boolean;
}

// Static data (fallback)
const staticPosts: InstagramPost[] = [
  {
    id: '1',
    username: 'woofadaarofficial',
    caption: 'My husband and I have always been dog lovers. We\'d often talk about how, one day, when we started a family, there would be someone to ensure their happiness, their pain, their love. It was always part of the dream...',
    media_type: 'IMAGE',
    permalink: 'https://instagram.com/woofadaarofficial',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    likes: 523,
    timeAgo: '2h',
    isVerified: true
  },
  {
    id: '2',
    username: 'woofadaarofficial',
    caption: 'Woof Story | Episode 28: The Night Everything Changed',
    media_type: 'IMAGE',
    permalink: 'https://instagram.com/woofadaarofficial',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    likes: 387,
    timeAgo: '5h',
    isVerified: true
  },
  {
    id: '3',
    username: 'woofadaarofficial',
    caption: 'There are moments in life when everything feels uncertain... and then suddenly, life surprises us with exactly what we need.',
    media_type: 'IMAGE',
    permalink: 'https://instagram.com/woofadaarofficial',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    likes: 612,
    timeAgo: '1d',
    isVerified: true
  }
];

// Instagram API fetch function
async function fetchInstagramPosts(): Promise<InstagramPost[]> {
  const accessToken = process.env.NEXT_PUBLIC_INSTAGRAM_ACCESS_TOKEN;
  const userId = process.env.NEXT_PUBLIC_INSTAGRAM_USER_ID;

  if (!accessToken || !userId) {
    console.warn('Instagram API credentials not found, using static data');
    return staticPosts;
  }

  try {
    const response = await fetch(
      `https://graph.instagram.com/${userId}/media?fields=id,caption,media_type,media_url,permalink,timestamp&access_token=${accessToken}&limit=6`
    );

    if (!response.ok) {
      throw new Error(`Instagram API error: ${response.status}`);
    }

    const data = await response.json();

    return data.data.map((post: any): InstagramPost => ({
      id: post.id,
      username: 'woofadaarofficial',
      media_url: post.media_url,
      caption: post.caption || '',
      media_type: post.media_type,
      permalink: post.permalink,
      timestamp: post.timestamp,
      timeAgo: getTimeAgo(post.timestamp),
      isVerified: true
    }));
  } catch (error) {
    console.error('Failed to fetch Instagram posts:', error);
    return staticPosts;
  }
}

// Utility function to calculate time ago
function getTimeAgo(timestamp: string): string {
  const now = new Date();
  const postTime = new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - postTime.getTime()) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds}s`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  return `${Math.floor(diffInSeconds / 86400)}d`;
}

// Main export function
export async function getInstagramPosts(): Promise<InstagramPost[]> {
  const mode = process.env.NEXT_PUBLIC_INSTAGRAM_MODE || 'static';

  if (mode === 'api') {
    return await fetchInstagramPosts();
  }

  return staticPosts;
}