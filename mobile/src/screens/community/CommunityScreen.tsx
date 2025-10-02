import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  FlatList,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../contexts/AuthContext';
import { Colors, BorderRadius, Shadows, Spacing } from '../../theme/colors';
import { apiService } from '../../services/api';
import { CommunityStackParamList } from '../../navigation/BottomTabs';

const { width } = Dimensions.get('window');

type CommunityScreenNavigationProp = NativeStackNavigationProp<CommunityStackParamList, 'CommunityHome'>;

interface CommunityScreenProps {
  navigation: CommunityScreenNavigationProp;
  route?: any;
}

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

export default function CommunityScreen({ navigation, route }: CommunityScreenProps) {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'recent' | 'popular' | 'unanswered'>('recent');
  const scrollViewRef = useRef<ScrollView>(null);
  const [askModalVisible, setAskModalVisible] = useState(false);
  const [newQuestion, setNewQuestion] = useState({ title: '', content: '', category: 'health' });
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<{
    qualityScore: number;
    suggestions: string[];
    suggestedCategory: string;
    suggestedTags: string[];
    confidence: number;
  } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    loadQuestions();
  }, [activeTab]);

  // Handle scroll to top when route params change
  useEffect(() => {
    if (route?.params?.scrollToTop) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  }, [route?.params?.scrollToTop]);

  // Debounced AI analysis when user types
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (newQuestion.title.length > 10 && newQuestion.content.length > 20) {
        analyzeQuestionWithAI();
      } else {
        setAiAnalysis(null);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [newQuestion.title, newQuestion.content]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const response = await apiService.getQuestions();
      const formattedQuestions = response.map((q: any) => ({
        ...q,
        // Keep the hasUpvoted state from the API response (which loads from AsyncStorage)
        // But ensure consistency: if upvotes is 0, hasUpvoted should also be false
        hasUpvoted: q.upvotes > 0 ? (q.hasUpvoted || false) : false,
        // Use answer_count if it exists, otherwise fall back to _count.answers
        answer_count: q.answer_count !== undefined ? q.answer_count : (q._count?.answers || 0)
      }));

      // Sort based on active tab
      let sortedQuestions = [...formattedQuestions];
      if (activeTab === 'popular') {
        sortedQuestions.sort((a, b) => b.upvotes - a.upvotes);
      } else if (activeTab === 'unanswered') {
        sortedQuestions = sortedQuestions.filter(q => q.answer_count === 0);
      } else {
        // Recent - sort by created_at
        sortedQuestions.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }

      setQuestions(sortedQuestions);
    } catch (error) {
      console.error('Failed to load questions:', error);
      setQuestions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadQuestions();
  };

  const analyzeQuestionWithAI = async () => {
    try {
      setAnalyzing(true);

      // Simulate AI analysis - in production, this would call the actual AI API
      const mockAnalysis = {
        qualityScore: Math.floor(Math.random() * 40) + 60, // 60-100 score
        suggestions: [
          'Add more specific details about your dog\'s symptoms',
          'Include your dog\'s age and breed for better advice',
          'Consider mentioning when the issue started'
        ].slice(0, Math.floor(Math.random() * 3) + 1),
        suggestedCategory: newQuestion.title.toLowerCase().includes('food') ? 'food' :
                         newQuestion.title.toLowerCase().includes('train') ? 'training' :
                         newQuestion.title.toLowerCase().includes('behavior') ? 'behavior' : 'health',
        suggestedTags: ['urgent', 'advice-needed', 'first-time'],
        confidence: Math.floor(Math.random() * 30) + 70, // 70-100 confidence
      };

      // Add delay to simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      setAiAnalysis(mockAnalysis);

      // Auto-suggest category if different from current
      if (mockAnalysis.suggestedCategory !== newQuestion.category && mockAnalysis.confidence > 80) {
        setNewQuestion(prev => ({ ...prev, category: mockAnalysis.suggestedCategory }));
      }
    } catch (error) {
      console.error('AI analysis failed:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleUpvote = async (questionId: string) => {
    const questionIndex = questions.findIndex(q => q.id === questionId);
    if (questionIndex === -1) return;

    const updatedQuestions = [...questions];
    const question = updatedQuestions[questionIndex];
    const newUpvoteState = !question.hasUpvoted;

    // Update local state optimistically
    if (newUpvoteState) {
      question.upvotes++;
      question.hasUpvoted = true;
    } else {
      question.upvotes = Math.max(0, question.upvotes - 1);
      question.hasUpvoted = false;
    }

    setQuestions(updatedQuestions);

    // Persist upvote state
    try {
      await apiService.updateQuestionUpvote(questionId, newUpvoteState);
    } catch (error) {
      console.error('Failed to update upvote:', error);
      // Revert the optimistic update if the API call fails
      if (newUpvoteState) {
        question.upvotes = Math.max(0, question.upvotes - 1);
        question.hasUpvoted = false;
      } else {
        question.upvotes++;
        question.hasUpvoted = true;
      }
      setQuestions([...updatedQuestions]);
    }
  };

  const handleAskQuestion = async () => {
    if (!newQuestion.title.trim() || !newQuestion.content.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      setSubmittingQuestion(true);
      await apiService.createQuestion({
        title: newQuestion.title,
        content: newQuestion.content,
        category: newQuestion.category,
        tags: [],
      });
      setAskModalVisible(false);
      setNewQuestion({ title: '', content: '', category: 'health' });
      setAiAnalysis(null);
      setAnalyzing(false);
      loadQuestions();
      Alert.alert('Success', 'Your question has been posted!');
    } catch (error) {
      console.error('Failed to post question:', error);
      Alert.alert('Error', 'Failed to post question. Please try again.');
    } finally {
      setSubmittingQuestion(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / 1000; // in seconds

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

  const QuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickActionsScroll}
      >
        <TouchableOpacity
          style={[styles.quickActionCard, { backgroundColor: Colors.primary.mintTeal }]}
          onPress={() => setAskModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle" size={28} color="#FFFFFF" />
          <Text style={styles.quickActionText}>Ask</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickActionCard, { backgroundColor: Colors.primary.burntOrange }]}
          activeOpacity={0.8}
        >
          <Ionicons name="trophy" size={28} color="#FFFFFF" />
          <Text style={styles.quickActionText}>Top</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickActionCard, { backgroundColor: Colors.primary.mutedPurple }]}
          activeOpacity={0.8}
        >
          <Ionicons name="star" size={28} color="#FFFFFF" />
          <Text style={styles.quickActionText}>Experts</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickActionCard, { backgroundColor: Colors.primary.warmYellow }]}
          activeOpacity={0.8}
        >
          <Ionicons name="bookmark" size={28} color="#FFFFFF" />
          <Text style={styles.quickActionText}>Saved</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickActionCard, { backgroundColor: Colors.primary.mintTeal }]}
          activeOpacity={0.8}
        >
          <Ionicons name="people" size={28} color="#FFFFFF" />
          <Text style={styles.quickActionText}>Forums</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderQuestion = ({ item }: { item: Question }) => (
    <TouchableOpacity
      style={styles.questionCard}
      activeOpacity={0.8}
      onPress={() => navigation.navigate('QuestionDetail', { questionId: item.id, question: item })}
    >
      <View style={styles.questionHeader}>
        <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) }]}>
          <Text style={[styles.categoryText, { color: getCategoryTextColor(item.category) }]}>
            {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
          </Text>
        </View>
        {item.is_resolved && (
          <View style={styles.resolvedBadge}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.functional.success} />
            <Text style={styles.resolvedText}>Resolved</Text>
          </View>
        )}
      </View>

      <Text style={styles.questionTitle} numberOfLines={2}>
        {item.title}
      </Text>

      <Text style={styles.questionContent} numberOfLines={2}>
        {item.content}
      </Text>

      {item.dog && (
        <View style={styles.dogInfo}>
          <Text style={styles.dogInfoText}>
            🐕 {item.dog.name} • {item.dog.breed}
          </Text>
        </View>
      )}

      <View style={styles.statsRow}>
        <TouchableOpacity
          style={styles.statItem}
          onPress={() => handleUpvote(item.id)}
        >
          <Ionicons
            name={(item.hasUpvoted && item.upvotes > 0) ? "arrow-up-circle" : "arrow-up-circle-outline"}
            size={20}
            color={(item.hasUpvoted && item.upvotes > 0) ? Colors.primary.mintTeal : Colors.ui.textSecondary}
          />
          <Text style={[styles.statText, (item.hasUpvoted && item.upvotes > 0) && { color: Colors.primary.mintTeal }]}>
            {item.upvotes}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.statItem}
          onPress={() => navigation.navigate('QuestionDetail', { questionId: item.id, scrollToReplies: true })}
        >
          <Ionicons name="chatbubble-outline" size={18} color={Colors.ui.textSecondary} />
          <Text style={styles.statText}>{item.answer_count}</Text>
        </TouchableOpacity>

        <View style={styles.statItem}>
          <Ionicons name="eye-outline" size={20} color={Colors.ui.textSecondary} />
          <Text style={styles.statText}>{item.view_count}</Text>
        </View>

        <View style={styles.authorSection}>
          <Text style={styles.authorName}>{item.user.name}</Text>
          <Text style={styles.timeText}>{formatTimeAgo(item.created_at)}</Text>
        </View>
      </View>

      {item.tags && item.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {item.tags.map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary.mintTeal]}
            tintColor={Colors.primary.mintTeal}
          />
        }
      >
        {/* Page Title */}
        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>Community</Text>
        </View>

        {/* Quick Actions */}
        <QuickActions />

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'recent' && styles.activeTab]}
            onPress={() => setActiveTab('recent')}
          >
            <Text style={[styles.tabText, activeTab === 'recent' && styles.activeTabText]}>
              Recent
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'popular' && styles.activeTab]}
            onPress={() => setActiveTab('popular')}
          >
            <Text style={[styles.tabText, activeTab === 'popular' && styles.activeTabText]}>
              Popular
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'unanswered' && styles.activeTab]}
            onPress={() => setActiveTab('unanswered')}
          >
            <Text style={[styles.tabText, activeTab === 'unanswered' && styles.activeTabText]}>
              Unanswered
            </Text>
          </TouchableOpacity>
        </View>

        {/* Questions List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary.mintTeal} />
          </View>
        ) : questions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="comment-question-outline" size={64} color={Colors.ui.textTertiary} />
            <Text style={styles.emptyText}>No questions found</Text>
            <TouchableOpacity
              style={styles.askButton}
              onPress={() => setAskModalVisible(true)}
            >
              <Text style={styles.askButtonText}>Ask the First Question</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={questions}
            renderItem={renderQuestion}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            contentContainerStyle={{ paddingHorizontal: Spacing.mobile.margin }}
          />
        )}
      </ScrollView>

      {/* Ask Question Modal */}
      <Modal
        visible={askModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAskModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ask a Question</Text>
              <TouchableOpacity onPress={() => setAskModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.ui.textPrimary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.titleInput}
              placeholder="What's your question?"
              placeholderTextColor={Colors.ui.textTertiary}
              value={newQuestion.title}
              onChangeText={(text) => setNewQuestion({ ...newQuestion, title: text })}
            />

            <TextInput
              style={styles.contentInput}
              placeholder="Provide more details..."
              placeholderTextColor={Colors.ui.textTertiary}
              value={newQuestion.content}
              onChangeText={(text) => setNewQuestion({ ...newQuestion, content: text })}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />

            {/* AI Smart Score Section */}
            {(analyzing || aiAnalysis) && (
              <View style={styles.aiAnalysisSection}>
                <View style={styles.aiAnalysisHeader}>
                  <Ionicons name="sparkles" size={16} color={Colors.primary.mintTeal} />
                  <Text style={styles.aiAnalysisTitle}>AI Smart Analysis</Text>
                  {analyzing && <ActivityIndicator size="small" color={Colors.primary.mintTeal} />}
                </View>

                {aiAnalysis && (
                  <>
                    <View style={styles.qualityScoreContainer}>
                      <Text style={styles.qualityScoreLabel}>Quality Score</Text>
                      <View style={styles.qualityScoreBar}>
                        <View
                          style={[
                            styles.qualityScoreFill,
                            {
                              width: `${aiAnalysis.qualityScore}%`,
                              backgroundColor: aiAnalysis.qualityScore >= 80 ? Colors.functional.success :
                                             aiAnalysis.qualityScore >= 60 ? Colors.primary.warmYellow :
                                             Colors.functional.error
                            }
                          ]}
                        />
                      </View>
                      <Text style={styles.qualityScoreText}>{aiAnalysis.qualityScore}/100</Text>
                    </View>

                    {aiAnalysis.suggestions.length > 0 && (
                      <View style={styles.suggestionsContainer}>
                        <Text style={styles.suggestionsTitle}>💡 Suggestions to improve:</Text>
                        {aiAnalysis.suggestions.map((suggestion, index) => (
                          <Text key={index} style={styles.suggestionText}>• {suggestion}</Text>
                        ))}
                      </View>
                    )}

                    {aiAnalysis.suggestedTags.length > 0 && (
                      <View style={styles.suggestedTagsContainer}>
                        <Text style={styles.suggestedTagsTitle}>Suggested tags:</Text>
                        <View style={styles.suggestedTagsList}>
                          {aiAnalysis.suggestedTags.map((tag, index) => (
                            <View key={index} style={styles.suggestedTag}>
                              <Text style={styles.suggestedTagText}>#{tag}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                  </>
                )}
              </View>
            )}

            <View style={styles.categorySelector}>
              <Text style={styles.categoryLabel}>Category:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {['health', 'behavior', 'training', 'food', 'local'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryOption,
                      newQuestion.category === cat && styles.selectedCategory
                    ]}
                    onPress={() => setNewQuestion({ ...newQuestion, category: cat })}
                  >
                    <Text
                      style={[
                        styles.categoryOptionText,
                        newQuestion.category === cat && styles.selectedCategoryText
                      ]}
                    >
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, submittingQuestion && styles.disabledButton]}
              onPress={handleAskQuestion}
              disabled={submittingQuestion}
            >
              {submittingQuestion ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Post Question</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral.fafafa,
  },
  scrollContainer: {
    paddingBottom: 100,
  },
  titleSection: {
    paddingHorizontal: Spacing.mobile.margin,
    paddingTop: 20,
    paddingBottom: 24,
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: Colors.primary.mutedPurple,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.ui.textSecondary,
    marginTop: 16,
    marginBottom: 24,
  },
  askButton: {
    backgroundColor: Colors.primary.mintTeal,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: BorderRadius.button,
  },
  askButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Quick Actions
  quickActionsContainer: {
    marginVertical: 20,
  },
  quickActionsScroll: {
    paddingHorizontal: Spacing.mobile.margin,
    gap: 12,
  },
  quickActionCard: {
    width: 75,
    height: 75,
    borderRadius: BorderRadius.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    ...Shadows.small,
  },
  quickActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.mobile.margin,
    marginBottom: 20,
    gap: 16,
  },
  tab: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.ui.surface,
  },
  activeTab: {
    backgroundColor: Colors.primary.mintTeal,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.ui.textSecondary,
  },
  activeTabText: {
    color: '#FFFFFF',
  },

  // Question Card
  questionCard: {
    backgroundColor: Colors.ui.surface,
    borderRadius: BorderRadius.card,
    padding: 20,
    ...Shadows.small,
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
    marginBottom: 8,
    lineHeight: 24,
  },
  questionContent: {
    fontSize: 14,
    color: Colors.ui.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  dogInfo: {
    marginBottom: 12,
  },
  dogInfoText: {
    fontSize: 13,
    color: Colors.ui.textSecondary,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginTop: 12,
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
  separator: {
    height: 16,
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.ui.surface,
    borderTopLeftRadius: BorderRadius.card,
    borderTopRightRadius: BorderRadius.card,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.ui.textPrimary,
  },
  titleInput: {
    backgroundColor: Colors.neutral.fafafa,
    borderRadius: BorderRadius.button,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    color: Colors.ui.textPrimary,
  },
  contentInput: {
    backgroundColor: Colors.neutral.fafafa,
    borderRadius: BorderRadius.button,
    padding: 16,
    fontSize: 14,
    marginBottom: 20,
    minHeight: 120,
    color: Colors.ui.textPrimary,
  },
  categorySelector: {
    marginBottom: 24,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.ui.textPrimary,
    marginBottom: 12,
  },
  categoryOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.button,
    backgroundColor: Colors.neutral.fafafa,
    marginRight: 8,
  },
  selectedCategory: {
    backgroundColor: Colors.primary.mintTeal,
  },
  categoryOptionText: {
    fontSize: 14,
    color: Colors.ui.textSecondary,
  },
  selectedCategoryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: Colors.primary.mintTeal,
    paddingVertical: 16,
    borderRadius: BorderRadius.button,
    alignItems: 'center',
    ...Shadows.medium,
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // AI Analysis Styles
  aiAnalysisSection: {
    backgroundColor: '#f0fdfa',
    borderRadius: BorderRadius.card,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#99f6e4',
  },
  aiAnalysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  aiAnalysisTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary.mintTeal,
    flex: 1,
  },
  qualityScoreContainer: {
    marginBottom: 16,
  },
  qualityScoreLabel: {
    fontSize: 12,
    color: Colors.ui.textSecondary,
    marginBottom: 6,
    fontWeight: '500',
  },
  qualityScoreBar: {
    height: 8,
    backgroundColor: Colors.ui.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  qualityScoreFill: {
    height: '100%',
    borderRadius: 4,
  },
  qualityScoreText: {
    fontSize: 12,
    color: Colors.ui.textPrimary,
    fontWeight: '600',
    textAlign: 'right',
  },
  suggestionsContainer: {
    marginBottom: 16,
  },
  suggestionsTitle: {
    fontSize: 13,
    color: Colors.ui.textPrimary,
    fontWeight: '600',
    marginBottom: 8,
  },
  suggestionText: {
    fontSize: 12,
    color: Colors.ui.textSecondary,
    lineHeight: 16,
    marginBottom: 4,
  },
  suggestedTagsContainer: {
    marginBottom: 8,
  },
  suggestedTagsTitle: {
    fontSize: 13,
    color: Colors.ui.textPrimary,
    fontWeight: '600',
    marginBottom: 8,
  },
  suggestedTagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  suggestedTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(45, 212, 191, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.4)',
  },
  suggestedTagText: {
    fontSize: 11,
    color: Colors.primary.mintTeal,
    fontWeight: '500',
  },
});