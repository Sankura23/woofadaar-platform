'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import MentionTextarea from '@/components/community/MentionTextarea';
import ReportButton from '@/components/community/ReportButton';
import TopicActions from '@/components/community/TopicActions';

interface ForumPost {
  id: string;
  title: string;
  content: string;
  tags: string[];
  view_count: number;
  like_count: number;
  comment_count: number;
  is_pinned: boolean;
  is_featured: boolean;
  is_locked: boolean;
  status: string;
  photo_url?: string;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    name: string;
    profile_image_url?: string;
  };
  category: {
    id: string;
    name: string;
    slug: string;
    icon: string;
    color: string;
  };
}

interface Comment {
  id: string;
  content: string;
  upvotes: number;
  downvotes: number;
  reply_count: number;
  mentioned_users: string[];
  parent_comment_id?: string;
  created_at: string;
  user: {
    id: string;
    name: string;
    profile_image_url?: string;
  };
  replies?: Comment[];
}

export default function ForumTopicPage() {
  const { id } = useParams();
  const [post, setPost] = useState<ForumPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [showReplyForm, setShowReplyForm] = useState<string | null>(null);

  useEffect(() => {
    fetchForumPost();
    fetchComments();
  }, [id]);

  const fetchForumPost = async () => {
    try {
      const response = await fetch(`/api/community/forums/${id}`);
      const data = await response.json();
      
      if (data.success) {
        setPost(data.data.post);
        // Increment view count
        await fetch(`/api/community/forums/${id}/view`, { method: 'POST' });
      }
    } catch (error) {
      console.error('Error fetching forum post:', error);
    }
  };

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/community/forums/${id}/comments`);
      const data = await response.json();
      
      if (data.success) {
        setComments(buildCommentTree(data.data.comments));
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildCommentTree = (comments: Comment[]): Comment[] => {
    const commentMap = new Map<string, Comment>();
    const rootComments: Comment[] = [];

    // First pass: create comment map
    comments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // Second pass: build tree structure
    comments.forEach(comment => {
      const commentWithReplies = commentMap.get(comment.id)!;
      
      if (comment.parent_comment_id) {
        const parent = commentMap.get(comment.parent_comment_id);
        if (parent) {
          parent.replies!.push(commentWithReplies);
        }
      } else {
        rootComments.push(commentWithReplies);
      }
    });

    return rootComments;
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/community/forums/${id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: newComment,
          parent_comment_id: replyTo
        })
      });

      const data = await response.json();
      if (data.success) {
        setNewComment('');
        setReplyTo(null);
        setShowReplyForm(null);
        fetchComments(); // Refresh comments
      }
    } catch (error) {
      console.error('Error posting comment:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  const renderComment = (comment: Comment, depth = 0) => (
    <div key={comment.id} className={`${depth > 0 ? 'ml-6 border-l-2 border-gray-100 pl-4' : ''} mb-4`}>
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              {comment.user.profile_image_url ? (
                <img 
                  src={comment.user.profile_image_url} 
                  alt={comment.user.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <span className="text-gray-500 text-sm">👤</span>
              )}
            </div>
          </div>
          
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-sm font-medium text-gray-900">{comment.user.name}</span>
              <span className="text-sm text-gray-500">{formatDate(comment.created_at)}</span>
            </div>
            
            <div 
              className="text-gray-700 text-sm mb-3"
              dangerouslySetInnerHTML={{
                __html: comment.content.replace(
                  /@(\w+)/g, 
                  '<span class="text-[#76519f] font-medium bg-[#76519f]/10 px-1 rounded">@$1</span>'
                )
              }}
            />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <button className="flex items-center space-x-1 hover:text-[#76519f]">
                  <span>👍</span>
                  <span>{comment.upvotes}</span>
                </button>
                <button className="flex items-center space-x-1 hover:text-[#76519f]">
                  <span>👎</span>
                  <span>{comment.downvotes}</span>
                </button>
                <button 
                  onClick={() => {
                    setReplyTo(comment.id);
                    setShowReplyForm(comment.id);
                  }}
                  className="hover:text-[#76519f]"
                >
                  Reply
                </button>
                {comment.reply_count > 0 && (
                  <span className="text-gray-400">{comment.reply_count} replies</span>
                )}
              </div>
              <ReportButton 
                contentId={comment.id} 
                contentType="comment"
                size="sm"
              />
            </div>
          </div>
        </div>
        
        {showReplyForm === comment.id && (
          <form onSubmit={handleSubmitComment} className="mt-4 ml-11">
            <MentionTextarea
              value={newComment}
              onChange={setNewComment}
              placeholder="Write your reply... (Type @ to mention someone)"
              rows={3}
            />
            <div className="flex justify-end space-x-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  setShowReplyForm(null);
                  setReplyTo(null);
                  setNewComment('');
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#76519f] text-white text-sm rounded-lg hover:bg-[#6a4a8f] transition-colors"
              >
                Reply
              </button>
            </div>
          </form>
        )}
      </div>
      
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2">
          {comment.replies.map(reply => renderComment(reply, depth + 1))}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-[#fef8e8] via-gray-50 to-gray-100 min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="bg-gradient-to-br from-[#fef8e8] via-gray-50 to-gray-100 min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="text-4xl mb-4">😕</div>
          <h2 className="text-xl font-medium text-gray-900 mb-2">Forum post not found</h2>
          <p className="text-gray-600 mb-4">The post you're looking for might have been moved or deleted.</p>
          <Link 
            href="/community/forums"
            className="inline-flex items-center px-4 py-2 bg-[#76519f] text-white rounded-lg hover:bg-[#6a4a8f] transition-colors"
          >
            Back to Forums
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="bg-gradient-to-br from-[#fef8e8] via-gray-50 to-gray-100 min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <div className="mb-6">
            <nav className="flex items-center space-x-2 text-sm text-gray-500">
              <Link href="/community" className="hover:text-[#76519f]">Community</Link>
              <span>›</span>
              <Link href="/community/forums" className="hover:text-[#76519f]">Forums</Link>
              <span>›</span>
              <Link href={`/community/forums?category=${post.category.id}`} className="hover:text-[#76519f]">
                {post.category.name}
              </Link>
              <span>›</span>
              <span className="text-gray-900">{post.title}</span>
            </nav>
          </div>

          {/* Main Post */}
          <div className="bg-white rounded-lg shadow-sm mb-8">
            <div className="p-6">
              {/* Post Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <span 
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                    style={{ backgroundColor: `${post.category.color}20`, color: post.category.color }}
                  >
                    {post.category.icon} {post.category.name}
                  </span>
                  {post.is_pinned && (
                    <span className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                      📌 Pinned
                    </span>
                  )}
                  {post.is_featured && (
                    <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded">
                      ⭐ Featured
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  {formatDate(post.created_at)}
                </div>
              </div>

              {/* Post Title */}
              <h1 className="text-2xl font-bold text-gray-900 mb-4">{post.title}</h1>

              {/* Post Author */}
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  {post.user.profile_image_url ? (
                    <img 
                      src={post.user.profile_image_url} 
                      alt={post.user.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-500 text-lg">👤</span>
                  )}
                </div>
                <div>
                  <div className="font-medium text-gray-900">{post.user.name}</div>
                  <div className="text-sm text-gray-500">Posted {formatDate(post.created_at)}</div>
                </div>
              </div>

              {/* Post Content */}
              <div className="prose max-w-none mb-6">
                <p className="text-gray-700 whitespace-pre-wrap">{post.content}</p>
              </div>

              {/* Post Image */}
              {post.photo_url && (
                <div className="mb-6">
                  <img 
                    src={post.photo_url} 
                    alt="Post attachment"
                    className="max-w-full h-auto rounded-lg shadow-sm"
                  />
                </div>
              )}

              {/* Post Tags */}
              {post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {post.tags.map((tag) => (
                    <span 
                      key={tag}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#76519f]/10 text-[#76519f] border border-[#76519f]/20"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Post Stats and Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-6 text-sm text-gray-500">
                  <span className="flex items-center space-x-1">
                    <span>👁️</span>
                    <span>{post.view_count} views</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span>❤️</span>
                    <span>{post.like_count} likes</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span>💬</span>
                    <span>{post.comment_count} comments</span>
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <TopicActions topicId={post.id} />
                  <ReportButton 
                    contentId={post.id} 
                    contentType="forum_post"
                    size="sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Comments Section */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Discussion ({post.comment_count})
              </h2>

              {/* New Comment Form */}
              {!post.is_locked && (
                <form onSubmit={handleSubmitComment} className="mb-8">
                  <MentionTextarea
                    value={newComment}
                    onChange={setNewComment}
                    placeholder="Join the discussion... (Type @ to mention someone)"
                    rows={4}
                  />
                  <div className="flex justify-end mt-3">
                    <button
                      type="submit"
                      disabled={!newComment.trim()}
                      className="px-6 py-2 bg-[#76519f] text-white rounded-lg hover:bg-[#6a4a8f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Post Comment
                    </button>
                  </div>
                </form>
              )}

              {post.is_locked && (
                <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center">
                    <span className="text-yellow-600 mr-2">🔒</span>
                    <span className="text-yellow-800 text-sm">
                      This discussion has been locked. No new comments can be added.
                    </span>
                  </div>
                </div>
              )}

              {/* Comments List */}
              <div className="space-y-4">
                {comments.length > 0 ? (
                  comments.map(comment => renderComment(comment))
                ) : (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">💬</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No comments yet</h3>
                    <p className="text-gray-600">
                      {post.is_locked ? 
                        'This discussion is locked.' : 
                        'Be the first to start the discussion!'
                      }
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}