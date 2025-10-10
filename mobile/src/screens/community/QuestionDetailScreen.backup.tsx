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

  const loadQuestionDetails = async () => {
    try {
      setLoading(true);

      // Get the question data from the community screen navigation params
      // Since the question is already loaded in CommunityScreen, we can get it from route params
      if (route.params.question) {
        // Preserve the upvote state from the community screen
        setQuestion({ ...route.params.question });
      } else {
        // If no question data passed, try API and get the upvote state
        const questionResponse = await apiService.getQuestion(questionId);
        // Check upvote state from AsyncStorage
        const storedUpvotes = await AsyncStorage.getItem('woofadaar_upvotes');
        const upvotes = storedUpvotes ? JSON.parse(storedUpvotes) : {};
        setQuestion({
          ...questionResponse,
          hasUpvoted: upvotes[questionId] || false
        });
      }

      // Get actual replies from API
      const repliesData = await apiService.getQuestionReplies(questionId);
      setReplies(repliesData.map((reply: any) => ({
        ...reply,
        hasUpvoted: false
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

    // Persist upvote state using the same method as CommunityScreen
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
      // Call API to submit reply
      await apiService.createReply(questionId, replyText);

      // Refresh replies from API to get complete data
      const repliesData = await apiService.getQuestionReplies(questionId);
      setReplies(repliesData.map((reply: any) => ({
        ...reply,
        hasUpvoted: false
      })));

      setReplyText('');
      Alert.alert('Success', 'Your reply has been posted!');
    } catch (error) {
      console.error('Failed to submit reply:', error);
      Alert.alert('Error', 'Failed to submit reply. Please try again.');
    } finally {
      setSubmittingReply(false);
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
      health: '#86efac',
      behavior: '#fbbf24',
      training: '#a78bfa',
      food: '#fda4af',
      local: '#93c5fd',
      default: '#e5e7eb',
    };
    return colors[category] || colors.default;
  };

  const getCategoryTextColor = (category: string) => {
    const colors: { [key: string]: string } = {
      health: '#166534',
      behavior: '#854d0e',
      training: '#6b21a8',
      food: '#be123c',
      local: '#1e40af',
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
                <Text style={styles.authorName}>{question.user.name}</Text>
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
                  </View>

                  <Text style={styles.replyContent}>{reply.content}</Text>

                  <View style={styles.replyActions}>
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
                    <TouchableOpacity style={styles.replyAction}>
                      <Ionicons name="chatbubble-outline" size={14} color={Colors.ui.textSecondary} />
                      <Text style={styles.replyActionText}>Reply</Text>
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
    marginBottom: 10,
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
});