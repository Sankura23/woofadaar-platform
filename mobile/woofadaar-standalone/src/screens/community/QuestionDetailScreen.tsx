import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../contexts/AuthContext';
import { Colors, BorderRadius, Shadows, Spacing } from '../../theme/colors';
import { apiService } from '../../services/api';
import { CommunityStackParamList } from '../../navigation/BottomTabs';

const { width } = Dimensions.get('window');

interface Question {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  is_resolved: boolean;
  view_count: number;
  upvotes: number;
  answer_count: number;
  created_at: string;
  hasUpvoted?: boolean;
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
  _count?: {
    answers: number;
    comments: number;
  };
}

interface Reply {
  id: string;
  content: string;
  created_at: string;
  upvotes: number;
  is_best_answer: boolean;
  hasUpvoted?: boolean;
  reactions?: {
    paw?: number;
    heart?: number;
    star?: number;
    happy?: number;
  };
  userReactions?: {
    paw?: boolean;
    heart?: boolean;
    star?: boolean;
    happy?: boolean;
  };
  user: {
    id: string;
    name: string;
    profile_image_url?: string;
    is_verified?: boolean;
  };
}

type QuestionDetailScreenNavigationProp = NativeStackNavigationProp<CommunityStackParamList, 'QuestionDetail'>;

interface QuestionDetailScreenProps {
  navigation: QuestionDetailScreenNavigationProp;
  route: {
    params: {
      questionId: string;
      scrollToReplies?: boolean;
      question?: Question;
    };
  };
}

type QuestionDetailScreenComponent = React.FC<QuestionDetailScreenProps>;

export default function QuestionDetailScreen({ navigation, route }: QuestionDetailScreenProps) {
  const { user } = useAuth();
  const { questionId, scrollToReplies } = route.params;
  const scrollViewRef = useRef<ScrollView>(null);
  const repliesSectionRef = useRef<View>(null);

  const [question, setQuestion] = useState<Question | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  // New state for comment features
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [showMoreMenu, setShowMoreMenu] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState<string | null>(null);

  useEffect(() => {
    loadQuestionDetails();
  }, [questionId]);

  useEffect(() => {
    if (scrollToReplies && repliesSectionRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 500);
    }
  }, [scrollToReplies, replies]);

  // Sync reply count back to community screen when navigation state changes
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      // Navigate back to Community with updated reply count for this question
      navigation.navigate('CommunityHome', {
        scrollToTop: false,
        updatedQuestion: question ? {
          id: questionId,
          answer_count: replies.length
        } : null
      });
    });

    return unsubscribe;
  }, [navigation, questionId, replies.length, question]);

  const loadQuestionDetails = async () => {
    try {
      setLoading(true);

      // Clear any cached replies to force fresh data
      await AsyncStorage.removeItem(`woofadaar_replies_${questionId}`);

      // Use the same data source as CommunityScreen for consistency
      if (route.params.question) {
        // Preserve the upvote state from the community screen
        setQuestion({ ...route.params.question });
      } else {
        // If no question data passed, use the same method as CommunityScreen
        const allQuestions = await apiService.getQuestions();
        const foundQuestion = allQuestions.find(q => q.id === questionId);
        if (foundQuestion) {
          setQuestion(foundQuestion);
        } else {
          throw new Error('Question not found');
        }
      }

      // Use the same method as CommunityScreen to get replies
      const repliesData = await apiService.getQuestionReplies(questionId);
      setReplies(repliesData.map((reply: any) => ({
        ...reply,
        hasUpvoted: false,
        reactions: reply.reactions || { paw: 0, heart: 0, star: 0, happy: 0 },
        userReactions: reply.userReactions || { paw: false, heart: false, star: false, happy: false }
      })));
    } catch (error) {
      console.error('Failed to load question details:', error);
      Alert.alert('Error', 'Failed to load question details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpvoteQuestion = async () => {
    if (!question) return;

    const updatedQuestion = { ...question };
    const newUpvoteState = !updatedQuestion.hasUpvoted;

    // Update local state optimistically
    if (newUpvoteState) {
      updatedQuestion.upvotes++;
      updatedQuestion.hasUpvoted = true;
    } else {
      updatedQuestion.upvotes = Math.max(0, updatedQuestion.upvotes - 1);
      updatedQuestion.hasUpvoted = false;
    }

    setQuestion(updatedQuestion);

    // Use the same API service method as CommunityScreen
    try {
      await apiService.updateQuestionUpvote(question.id, newUpvoteState);
    } catch (error) {
      console.error('Failed to update upvote:', error);
      // Revert the optimistic update if the API call fails
      if (newUpvoteState) {
        updatedQuestion.upvotes = Math.max(0, updatedQuestion.upvotes - 1);
        updatedQuestion.hasUpvoted = false;
      } else {
        updatedQuestion.upvotes++;
        updatedQuestion.hasUpvoted = true;
      }
      setQuestion({ ...updatedQuestion });
    }
  };

  const handleUpvoteReply = async (replyId: string) => {
    const updatedReplies = replies.map(reply => {
      if (reply.id === replyId) {
        const updatedReply = { ...reply };
        if (updatedReply.hasUpvoted) {
          updatedReply.upvotes--;
          updatedReply.hasUpvoted = false;
        } else {
          updatedReply.upvotes++;
          updatedReply.hasUpvoted = true;
        }
        return updatedReply;
      }
      return reply;
    });
    setReplies(updatedReplies);
    // TODO: Call API to persist upvote
  };

  const handleSubmitReply = async () => {
    if (!replyText.trim()) {
      Alert.alert('Error', 'Please enter a reply');
      return;
    }

    try {
      setSubmittingReply(true);
      // Use the same API service method as used elsewhere
      await apiService.createReply(questionId, replyText);

      // Refresh replies using the same method as loadQuestionDetails (force refresh after creating)
      const repliesData = await apiService.getQuestionReplies(questionId, true);
      setReplies(repliesData.map((reply: any) => ({
        ...reply,
        hasUpvoted: false,
        reactions: reply.reactions || { paw: 0, heart: 0, star: 0, happy: 0 },
        userReactions: reply.userReactions || { paw: false, heart: false, star: false, happy: false }
      })));

      // Update question object to reflect new reply count
      if (question) {
        const updatedQuestion = {
          ...question,
          answer_count: repliesData.length,
          _count: { ...question._count, answers: repliesData.length }
        };
        setQuestion(updatedQuestion);
      }

      setReplyText('');
      Alert.alert('Success', 'Your reply has been posted!');
    } catch (error: any) {
      console.error('Failed to submit reply:', error);

      // Check if it's an authentication error
      if (error?.message?.includes('log in again') || error?.message?.includes('session has expired')) {
        Alert.alert(
          'Session Expired',
          error.message,
          [
            { text: 'OK', onPress: () => {
              // Navigate back to login - the auth context will handle this
              // since the token was cleared in the API service
              navigation.navigate('Login');
            }}
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to submit reply. Please try again.');
      }
    } finally {
      setSubmittingReply(false);
    }
  };

  // New handler functions for comment features
  const handleDeleteReply = async (replyId: string) => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Use API service method to delete reply
              await apiService.deleteReply(questionId, replyId);

              // Refresh replies to ensure data consistency (force refresh after deleting)
              const repliesData = await apiService.getQuestionReplies(questionId, true);
              setReplies(repliesData.map((reply: any) => ({
                ...reply,
                hasUpvoted: false,
                reactions: reply.reactions || { paw: 0, heart: 0, star: 0, happy: 0 },
                userReactions: reply.userReactions || { paw: false, heart: false, star: false, happy: false }
              })));

              // Update question object to reflect new reply count
              if (question) {
                const updatedQuestion = {
                  ...question,
                  answer_count: repliesData.length,
                  _count: { ...question._count, answers: repliesData.length }
                };
                setQuestion(updatedQuestion);
              }

              Alert.alert('Success', 'Comment deleted successfully');
            } catch (error) {
              console.error('Failed to delete reply:', error);
              Alert.alert('Error', 'Failed to delete comment');
            }
          }
        }
      ]
    );
  };

  const handleEditReply = (replyId: string, currentText: string) => {
    setEditingReplyId(replyId);
    setEditingText(currentText);
    setShowMoreMenu(null);
  };

  const handleSaveEdit = async (replyId: string) => {
    if (!editingText.trim()) {
      Alert.alert('Error', 'Comment cannot be empty');
      return;
    }

    try {
      // Use API service method to edit reply
      await apiService.editReply(questionId, replyId, editingText);

      // Refresh replies to ensure data consistency (force refresh after editing)
      const repliesData = await apiService.getQuestionReplies(questionId, true);
      setReplies(repliesData.map((reply: any) => ({
        ...reply,
        hasUpvoted: false,
        reactions: reply.reactions || { paw: 0, heart: 0, star: 0, happy: 0 },
        userReactions: reply.userReactions || { paw: false, heart: false, star: false, happy: false }
      })));

      setEditingReplyId(null);
      setEditingText('');
      Alert.alert('Success', 'Comment updated successfully');
    } catch (error) {
      console.error('Failed to edit reply:', error);
      Alert.alert('Error', 'Failed to update comment');
    }
  };

  const handleCancelEdit = () => {
    setEditingReplyId(null);
    setEditingText('');
  };

  const handleReportReply = (replyId: string) => {
    setShowReportModal(replyId);
    setShowMoreMenu(null);
  };

  const handleSubmitReport = async (replyId: string, reason: string) => {
    try {
      // Use API service method to report reply
      await apiService.reportReply(questionId, replyId, reason);

      setShowReportModal(null);
      Alert.alert('Success', 'Comment reported successfully. Thank you for helping keep our community safe.');
    } catch (error) {
      console.error('Failed to report reply:', error);
      Alert.alert('Error', 'Failed to report comment');
    }
  };

  const handleToggleReaction = async (replyId: string, reaction: string) => {
    try {
      const reply = replies.find(r => r.id === replyId);
      if (!reply) return;

      // Update local state optimistically
      setReplies(replies.map(r => {
        if (r.id === replyId) {
          const reactions = { ...r.reactions } || {};
          const userReactions = { ...r.userReactions } || {};

          if (userReactions[reaction]) {
            // Remove reaction
            reactions[reaction] = Math.max(0, (reactions[reaction] || 0) - 1);
            userReactions[reaction] = false;
          } else {
            // Add reaction
            reactions[reaction] = (reactions[reaction] || 0) + 1;
            userReactions[reaction] = true;
          }

          return { ...r, reactions, userReactions };
        }
        return r;
      }));

      // Use API service method to toggle reaction
      await apiService.toggleReplyReaction(questionId, replyId, reaction);

      console.log(`Toggled ${reaction} reaction on reply ${replyId}`);
    } catch (error) {
      console.error('Failed to toggle reaction:', error);
      // Revert optimistic update on error by refreshing data
      try {
        const repliesData = await apiService.getQuestionReplies(questionId, true);
        setReplies(repliesData.map((reply: any) => ({
          ...reply,
          hasUpvoted: false,
          reactions: reply.reactions || { paw: 0, heart: 0, star: 0, happy: 0 },
          userReactions: reply.userReactions || { paw: false, heart: false, star: false, happy: false }
        })));
      } catch (revertError) {
        console.error('Failed to revert reaction state:', revertError);
      }
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / 1000;

    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      health: '#e05a37',
      behavior: '#76519f',
      training: '#ffa602',
      food: '#4ECDC4',
      local: '#FF6B6B',
      default: '#e5e7eb',
    };
    return colors[category] || colors.default;
  };

  const getCategoryTextColor = (category: string) => {
    const colors: { [key: string]: string } = {
      health: '#ffffff',
      behavior: '#ffffff',
      training: '#000000',
      food: '#ffffff',
      local: '#ffffff',
      default: '#6b7280',
    };
    return colors[category] || colors.default;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={Colors.ui.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Question</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary.mintTeal} />
        </View>
      </SafeAreaView>
    );
  }

  if (!question) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={Colors.ui.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Question</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Question not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.ui.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Question</Text>
        <TouchableOpacity>
          <Ionicons name="bookmark-outline" size={24} color={Colors.ui.textSecondary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Question Card */}
          <View style={[styles.questionCard, replies.length > 0 && styles.questionCardWithReplies]}>
            <View style={styles.questionHeader}>
              <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(question.category || 'default') }]}>
                <Text style={[styles.categoryText, { color: getCategoryTextColor(question.category || 'default') }]}>
                  {question.category ? question.category.charAt(0).toUpperCase() + question.category.slice(1) : 'General'}
                </Text>
              </View>
              {question.is_resolved && (
                <View style={styles.resolvedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.functional.success} />
                  <Text style={styles.resolvedText}>Resolved</Text>
                </View>
              )}
            </View>

            <Text style={styles.questionTitle}>{question.title}</Text>
            <Text style={styles.questionContent}>{question.content}</Text>

            {question.dog && (
              <View style={styles.dogInfo}>
                <Text style={styles.dogInfoText}>
                  🐕 {question.dog.name} • {question.dog.breed}
                </Text>
              </View>
            )}

            <View style={styles.statsRow}>
              <TouchableOpacity style={styles.statItem} onPress={handleUpvoteQuestion}>
                <Ionicons
                  name={question.hasUpvoted ? "arrow-up-circle" : "arrow-up-circle-outline"}
                  size={20}
                  color={question.hasUpvoted ? Colors.primary.mintTeal : Colors.ui.textSecondary}
                />
                <Text style={[styles.statText, question.hasUpvoted && { color: Colors.primary.mintTeal }]}>
                  {question.upvotes}
                </Text>
              </TouchableOpacity>

              <View style={styles.statItem}>
                <Ionicons name="chatbubble-outline" size={18} color={Colors.ui.textSecondary} />
                <Text style={styles.statText}>{replies.length}</Text>
              </View>

              <View style={styles.statItem}>
                <Ionicons name="eye-outline" size={20} color={Colors.ui.textSecondary} />
                <Text style={styles.statText}>{question.view_count}</Text>
              </View>

              <View style={styles.authorSection}>
                <Text style={styles.authorName}>{question.user?.name || 'Unknown User'}</Text>
                <Text style={styles.timeText}>{formatTimeAgo(question.created_at)}</Text>
              </View>
            </View>

            {question.tags && question.tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {question.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Replies Section - Now inside question card */}
          <View ref={repliesSectionRef} style={styles.repliesSection}>
            <View style={styles.repliesTitleContainer}>
              <Text style={styles.repliesTitle}>
                {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
              </Text>
              <View style={styles.repliesDivider} />
            </View>

            {replies.length === 0 ? (
              <View style={styles.noRepliesContainer}>
                <MaterialCommunityIcons name="comment-outline" size={32} color={Colors.ui.textTertiary} />
                <Text style={styles.noRepliesText}>No replies yet</Text>
                <Text style={styles.noRepliesSubtext}>Be the first to share your thoughts!</Text>
              </View>
            ) : (
              replies.map((reply, index) => (
                <View key={reply.id || `reply-${index}`} style={[
                  styles.replyItem,
                  index === replies.length - 1 && styles.lastReplyItem
                ]}>
                  {reply.is_best_answer && (
                    <View style={styles.bestAnswerBadge}>
                      <Ionicons name="checkmark-circle" size={14} color={Colors.functional.success} />
                      <Text style={styles.bestAnswerText}>Best Answer</Text>
                    </View>
                  )}

                  <View style={styles.replyHeader}>
                    <View style={styles.replyAuthor}>
                      <View style={styles.authorAvatar}>
                        <Text style={styles.authorAvatarText}>
                          {reply.user?.name?.charAt(0)?.toUpperCase() || '?'}
                        </Text>
                      </View>
                      <View style={styles.replyAuthorInfo}>
                        <View style={styles.authorNameRow}>
                          <Text style={styles.replyAuthorName}>{reply.user?.name || 'Unknown User'}</Text>
                          {reply.user?.is_verified && (
                            <Ionicons name="checkmark-circle" size={14} color={Colors.primary.mintTeal} />
                          )}
                        </View>
                        <Text style={styles.replyTimeText}>{formatTimeAgo(reply.created_at)}</Text>
                      </View>
                    </View>

                    {/* More Menu */}
                    <TouchableOpacity
                      style={styles.moreMenuButton}
                      onPress={() => setShowMoreMenu(showMoreMenu === reply.id ? null : reply.id)}
                    >
                      <Ionicons name="ellipsis-horizontal" size={16} color={Colors.ui.textSecondary} />
                    </TouchableOpacity>

                    {/* More Menu Options */}
                    {showMoreMenu === reply.id && (
                      <View style={styles.moreMenuContainer}>
                        <TouchableOpacity
                          style={styles.menuOverlayBackground}
                          onPress={() => setShowMoreMenu(null)}
                          activeOpacity={1}
                        />
                        <View style={styles.moreMenuContent}>
                          {reply.user?.id === user?.id ? (
                            <>
                              <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => handleEditReply(reply.id, reply.content)}
                              >
                                <Ionicons name="create-outline" size={16} color={Colors.ui.textPrimary} />
                                <Text style={styles.menuItemText}>Edit</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => handleDeleteReply(reply.id)}
                              >
                                <Ionicons name="trash-outline" size={16} color={Colors.functional.error} />
                                <Text style={[styles.menuItemText, { color: Colors.functional.error }]}>Delete</Text>
                              </TouchableOpacity>
                            </>
                          ) : (
                            <TouchableOpacity
                              style={styles.menuItem}
                              onPress={() => handleReportReply(reply.id)}
                            >
                              <Ionicons name="flag-outline" size={16} color={Colors.functional.error} />
                              <Text style={[styles.menuItemText, { color: Colors.functional.error }]}>Report</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    )}
                  </View>

                  {editingReplyId === reply.id ? (
                    <View style={styles.editContainer}>
                      <TextInput
                        style={styles.editInput}
                        value={editingText}
                        onChangeText={setEditingText}
                        multiline
                        placeholder="Edit your comment..."
                        placeholderTextColor={Colors.ui.textTertiary}
                        autoFocus
                      />
                      <View style={styles.editActions}>
                        <TouchableOpacity
                          style={styles.cancelEditButton}
                          onPress={handleCancelEdit}
                        >
                          <Text style={styles.cancelEditText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.saveEditButton}
                          onPress={() => handleSaveEdit(reply.id)}
                        >
                          <Text style={styles.saveEditText}>Save</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <Text style={styles.replyContent}>{reply.content}</Text>
                  )}

                  <View style={styles.replyActions}>
                    {/* Pet-themed reactions */}
                    <View style={styles.reactionsContainer}>
                      {[
                        { type: 'paw', icon: 'paw', library: 'MaterialCommunityIcons', color: '#FF6B6B' },
                        { type: 'heart', icon: 'heart', library: 'Ionicons', color: '#FF69B4' },
                        { type: 'star', icon: 'star', library: 'Ionicons', color: '#FFD700' },
                        { type: 'happy', icon: 'emoticon-happy', library: 'MaterialCommunityIcons', color: '#4ECDC4' },
                      ].map((reaction) => {
                        const isActive = reply.userReactions?.[reaction.type] || false;
                        const count = reply.reactions?.[reaction.type] || 0;
                        const IconComponent = reaction.library === 'MaterialCommunityIcons' ? MaterialCommunityIcons : Ionicons;

                        return (
                          <TouchableOpacity
                            key={reaction.type}
                            style={[styles.reactionButton, isActive && styles.activeReaction]}
                            onPress={() => handleToggleReaction(reply.id, reaction.type)}
                          >
                            <IconComponent
                              name={reaction.icon as any}
                              size={16}
                              color={isActive ? reaction.color : Colors.ui.textTertiary}
                            />
                            {count > 0 && (
                              <Text style={[styles.reactionCount, isActive && { color: reaction.color }]}>
                                {count}
                              </Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Original upvote for compatibility */}
                    <TouchableOpacity
                      style={styles.replyAction}
                      onPress={() => handleUpvoteReply(reply.id)}
                    >
                      <Ionicons
                        name={reply.hasUpvoted ? "arrow-up-circle" : "arrow-up-circle-outline"}
                        size={16}
                        color={reply.hasUpvoted ? Colors.primary.mintTeal : Colors.ui.textSecondary}
                      />
                      <Text style={[styles.replyActionText, reply.hasUpvoted && { color: Colors.primary.mintTeal }]}>
                        {reply.upvotes}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>

        {/* Reply Input */}
        <View style={styles.replyInputContainer}>
          <TextInput
            style={styles.replyInput}
            placeholder="Write your reply..."
            placeholderTextColor={Colors.ui.textTertiary}
            value={replyText}
            onChangeText={setReplyText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.submitReplyButton, !replyText.trim() && styles.disabledButton]}
            onPress={handleSubmitReply}
            disabled={!replyText.trim() || submittingReply}
          >
            {submittingReply ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>

        {/* Report Modal */}
        <Modal
          visible={showReportModal !== null}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowReportModal(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.reportModal}>
              <View style={styles.reportHeader}>
                <Text style={styles.reportTitle}>Report Comment</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowReportModal(null)}
                >
                  <Ionicons name="close" size={24} color={Colors.ui.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.reportSubtitle}>
                Please select a reason for reporting this comment:
              </Text>

              <View style={styles.reportReasons}>
                {[
                  { id: 'spam', label: 'Spam or misleading', icon: 'warning-outline' },
                  { id: 'harassment', label: 'Harassment or bullying', icon: 'person-remove-outline' },
                  { id: 'inappropriate', label: 'Inappropriate content', icon: 'eye-off-outline' },
                  { id: 'misinformation', label: 'False or harmful information', icon: 'information-circle-outline' },
                  { id: 'other', label: 'Other safety concern', icon: 'shield-outline' },
                ].map((reason) => (
                  <TouchableOpacity
                    key={reason.id}
                    style={styles.reportReason}
                    onPress={() => handleSubmitReport(showReportModal!, reason.id)}
                  >
                    <Ionicons name={reason.icon as any} size={20} color={Colors.functional.error} />
                    <Text style={styles.reportReasonText}>{reason.label}</Text>
                    <Ionicons name="chevron-forward" size={16} color={Colors.ui.textTertiary} />
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.cancelReportButton}
                onPress={() => setShowReportModal(null)}
              >
                <Text style={styles.cancelReportText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral.fafafa,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.mobile.margin,
    paddingVertical: 16,
    backgroundColor: Colors.ui.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.ui.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.ui.textPrimary,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: Colors.ui.textSecondary,
  },

  // Question Card Styles
  questionCard: {
    backgroundColor: Colors.ui.surface,
    padding: 20,
    marginHorizontal: Spacing.mobile.margin,
    marginTop: 16,
    borderRadius: BorderRadius.card,
    ...Shadows.small,
  },
  questionCardWithReplies: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginBottom: 0,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  resolvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#dcfce7',
    borderRadius: 12,
  },
  resolvedText: {
    fontSize: 12,
    color: Colors.functional.success,
    fontWeight: '600',
  },
  questionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.ui.textPrimary,
    marginBottom: 12,
    lineHeight: 24,
  },
  questionContent: {
    fontSize: 14,
    color: Colors.ui.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  dogInfo: {
    marginBottom: 16,
  },
  dogInfoText: {
    fontSize: 14,
    color: Colors.ui.textSecondary,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 20,
  },
  statText: {
    fontSize: 13,
    color: Colors.ui.textSecondary,
    fontWeight: '500',
  },
  authorSection: {
    marginLeft: 'auto',
    alignItems: 'flex-end',
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.ui.textPrimary,
  },
  timeText: {
    fontSize: 12,
    color: Colors.ui.textTertiary,
    marginTop: 2,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: Colors.neutral.fafafa,
  },
  tagText: {
    fontSize: 12,
    color: Colors.ui.textSecondary,
    fontWeight: '500',
  },

  // Replies Section - Integrated into question card
  repliesSection: {
    backgroundColor: Colors.ui.surface,
    marginHorizontal: Spacing.mobile.margin,
    marginTop: -8,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: BorderRadius.card,
    borderBottomRightRadius: BorderRadius.card,
    ...Shadows.small,
  },
  repliesTitleContainer: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  repliesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.ui.textPrimary,
    marginBottom: 12,
  },
  repliesDivider: {
    height: 1,
    backgroundColor: Colors.ui.border,
    marginHorizontal: -20,
  },
  replyItem: {
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.ui.border,
    paddingHorizontal: Spacing.mobile.padding,
  },
  lastReplyItem: {
    borderBottomWidth: 0,
  },
  bestAnswerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  bestAnswerText: {
    fontSize: 11,
    color: Colors.functional.success,
    fontWeight: '600',
  },
  replyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    position: 'relative',
  },
  replyAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  replyAuthorInfo: {
    flex: 1,
  },
  authorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(45, 212, 191, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary.mintTeal,
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  replyAuthorName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.ui.textPrimary,
  },
  replyTimeText: {
    fontSize: 11,
    color: Colors.ui.textTertiary,
    marginTop: 2,
  },
  replyContent: {
    fontSize: 13,
    color: Colors.ui.textSecondary,
    lineHeight: 19,
    marginBottom: 10,
    paddingLeft: 42,
  },
  replyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingLeft: 42,
  },
  replyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  replyActionText: {
    fontSize: 11,
    color: Colors.ui.textSecondary,
    fontWeight: '500',
  },

  // No Replies Empty State
  noRepliesContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  noRepliesText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.ui.textSecondary,
    marginTop: 12,
    marginBottom: 4,
  },
  noRepliesSubtext: {
    fontSize: 14,
    color: Colors.ui.textTertiary,
    textAlign: 'center',
  },

  // Reply Input
  replyInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.mobile.margin,
    paddingVertical: 16,
    backgroundColor: Colors.ui.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.ui.border,
    gap: 12,
  },
  replyInput: {
    flex: 1,
    backgroundColor: Colors.neutral.fafafa,
    borderRadius: BorderRadius.input,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.ui.textPrimary,
    maxHeight: 100,
  },
  submitReplyButton: {
    backgroundColor: Colors.primary.mintTeal,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.small,
  },
  disabledButton: {
    opacity: 0.5,
  },

  // Edit Comment Styles
  editContainer: {
    marginBottom: 10,
    paddingLeft: 42,
  },
  editInput: {
    backgroundColor: Colors.ui.surface,
    borderRadius: BorderRadius.input,
    borderWidth: 1,
    borderColor: Colors.ui.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: Colors.ui.textPrimary,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  cancelEditButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.small,
    backgroundColor: Colors.ui.background,
    borderWidth: 1,
    borderColor: Colors.ui.border,
  },
  cancelEditText: {
    fontSize: 12,
    color: Colors.ui.textSecondary,
    fontWeight: '500',
  },
  saveEditButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.small,
    backgroundColor: Colors.primary.mintTeal,
  },
  saveEditText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Report Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportModal: {
    backgroundColor: Colors.ui.surface,
    borderRadius: BorderRadius.card,
    margin: 20,
    maxWidth: 400,
    width: '90%',
    ...Shadows.large,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.ui.border,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.ui.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  reportSubtitle: {
    fontSize: 14,
    color: Colors.ui.textSecondary,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    lineHeight: 20,
  },
  reportReasons: {
    paddingHorizontal: 20,
  },
  reportReason: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.ui.border,
  },
  reportReasonText: {
    fontSize: 14,
    color: Colors.ui.textPrimary,
    marginLeft: 12,
    flex: 1,
  },
  cancelReportButton: {
    padding: 20,
    alignItems: 'center',
  },
  cancelReportText: {
    fontSize: 14,
    color: Colors.ui.textSecondary,
    fontWeight: '500',
  },

  // Pet-themed Reactions Styles
  reactionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 16,
  },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.small,
    backgroundColor: Colors.ui.background,
    borderWidth: 1,
    borderColor: Colors.ui.border,
    gap: 4,
  },
  activeReaction: {
    backgroundColor: Colors.ui.surface,
    borderColor: Colors.primary.mintTeal,
  },
  reactionCount: {
    fontSize: 11,
    color: Colors.ui.textSecondary,
    fontWeight: '600',
  },

  // More Menu Button Styles
  moreMenuButton: {
    padding: 8,
    borderRadius: BorderRadius.small,
    marginRight: 24,
    position: 'relative',
    right: 8,
  },
  moreMenuContainer: {
    position: 'absolute',
    top: -1000,
    right: 0,
    left: -width,
    bottom: -1000,
    zIndex: 1000,
  },
  menuOverlayBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  moreMenuContent: {
    position: 'absolute',
    top: 1032,
    right: 32,
    backgroundColor: Colors.ui.surface,
    borderRadius: BorderRadius.card,
    borderWidth: 1,
    borderColor: Colors.ui.border,
    minWidth: 120,
    maxWidth: 140,
    zIndex: 1001,
    ...Shadows.medium,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  menuItemText: {
    fontSize: 14,
    color: Colors.ui.textPrimary,
    fontWeight: '500',
  },
});