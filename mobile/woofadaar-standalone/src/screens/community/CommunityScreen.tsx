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
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../contexts/AuthContext';
import { Colors, BorderRadius, Shadows, Spacing } from '../../theme/colors';
import { apiService } from '../../services/api';
import { CommunityStackParamList } from '../../navigation/BottomTabs';
import { QuestionSkeleton } from '../../components/SkeletonLoader';
import CommunityFilters, { FilterOptions } from '../../components/CommunityFilters';

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
  user?: {
    id: string;
    name: string;
    profile_image_url?: string;
  };
  User?: {
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
  console.log('🔍 CommunityScreen component rendered');
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [cachedQuestions, setCachedQuestions] = useState<Question[]>([]);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    category: 'all',
    sortBy: 'recent',
    showExperts: false,
  });
  const [menuModalVisible, setMenuModalVisible] = useState(false);
  const menuSlideAnim = useRef(new Animated.Value(300)).current;

  const handleMenuPress = () => {
    setMenuModalVisible(true);
    menuSlideAnim.setValue(300); // Reset position
    // Slide up animation
    Animated.timing(menuSlideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleCloseMenu = () => {
    // Slide down animation
    Animated.timing(menuSlideAnim, {
      toValue: 300,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setMenuModalVisible(false);
    });
  };

  const handleOpenAskModal = () => {
    setAskModalVisible(true);
    askSlideAnim.setValue(600); // Reset position
    // Slide up animation
    Animated.timing(askSlideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleCloseAskModal = () => {
    // Slide down animation
    Animated.timing(askSlideAnim, {
      toValue: 600,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setAskModalVisible(false);
      askSlideAnim.setValue(600); // Reset for next open
    });
  };

  // Category definitions
  const categories = [
    { id: 'all', name: 'All', icon: 'apps' },
    { id: 'health', name: 'Health', icon: 'medical' },
    { id: 'behavior', name: 'Behavior', icon: 'happy' },
    { id: 'training', name: 'Training', icon: 'school' },
    { id: 'food', name: 'Food', icon: 'restaurant' },
    { id: 'local', name: 'Local', icon: 'location' },
    { id: 'grooming', name: 'Grooming', icon: 'cut' },
    { id: 'adoption', name: 'Adoption', icon: 'heart' },
    { id: 'travel', name: 'Travel', icon: 'airplane' },
    { id: 'lifestyle', name: 'Lifestyle', icon: 'home' },
    { id: 'events', name: 'Events', icon: 'calendar' },
  ];

  const handleCategoryChange = (categoryId: string) => {
    setFilters({ ...filters, category: categoryId });
  };
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const ITEMS_PER_PAGE = 20;
  const scrollViewRef = useRef<ScrollView>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editFormData, setEditFormData] = useState({ title: '', content: '', category: 'health' });
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [savedQuestions, setSavedQuestions] = useState<string[]>([]);
  const [askModalVisible, setAskModalVisible] = useState(false);
  const askSlideAnim = useRef(new Animated.Value(600)).current;
  const [newQuestion, setNewQuestion] = useState({
    title: '',
    content: '',
    category: 'health',
    imageUri: null as string | null,
  });
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<{
    qualityScore: number;
    suggestions: string[];
    detectedCategory?: string;
    suggestedCategory?: string;
    suggestedTags?: string[];
    confidence: string | number;
  } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Initial data load when component mounts
  useEffect(() => {
    console.log('🔍 CommunityScreen initial mount useEffect');
    loadQuestions();
    loadSavedQuestions();
  }, []);

  // Load saved questions
  const loadSavedQuestions = async () => {
    try {
      const saved = await apiService.getSavedQuestions();
      setSavedQuestions(saved);
    } catch (error) {
      console.error('Failed to load saved questions:', error);
    }
  };

  // Handle tab changes
  useEffect(() => {
    console.log('🔍 CommunityScreen activeTab useEffect triggered - sortBy:', filters.sortBy, 'cachedQuestions.length:', cachedQuestions.length);
    if (cachedQuestions.length > 0) {
      // If we have cached data, just apply the filter
      console.log('🔍 Using cached data, applying filter');
      applyTabFilter(cachedQuestions);
    }
    // Don't load from API here - that's handled by the initial mount useEffect
  }, [filters.sortBy, cachedQuestions]);

  // Handle scroll to top when route params change
  useEffect(() => {
    if (route?.params?.scrollToTop) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  }, [route?.params?.scrollToTop]);

  // Handle updated question data from detail screen
  useEffect(() => {
    if (route?.params?.updatedQuestion) {
      const { id, answer_count } = route.params.updatedQuestion;
      // Update the cached questions
      const updateCachedQuestions = (questionsData: Question[]) => {
        return questionsData.map(q =>
          q.id === id ? { ...q, answer_count } : q
        );
      };

      setCachedQuestions(prev => updateCachedQuestions(prev));
      setQuestions(prev => updateCachedQuestions(prev));

      // Clear the route params to prevent re-processing
      navigation.setParams({ updatedQuestion: null });
    }
  }, [route?.params?.updatedQuestion, navigation]);

  // Debounced AI analysis when user types
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (newQuestion.title.length > 5 && newQuestion.content.length > 10) {
        analyzeQuestionWithAI().catch((error) => {
          console.error('AI analysis failed in useEffect:', error);
          setAiAnalysis(null);
          setAnalyzing(false);
        });
      } else {
        setAiAnalysis(null);
        setAnalyzing(false);
      }
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [newQuestion.title, newQuestion.content]);

  const loadQuestions = async (forceRefresh = false) => {
    try {
      console.log('🔥 Loading questions, forceRefresh:', forceRefresh);

      // Clear cache if force refresh requested
      if (forceRefresh) {
        await AsyncStorage.removeItem('woofadaar_questions');
        setCachedQuestions([]);
      }

      setLoading(cachedQuestions.length === 0 || forceRefresh);

      const response = await apiService.getQuestions();
      console.log('🔥 API Response received:', response?.length, 'questions');

      if (!response || response.length === 0) {
        console.log('🔥 No questions received from API');
        setQuestions([]);
        setCachedQuestions([]);
        return;
      }

      const formattedQuestions = response.map((q: any) => ({
        ...q,
        // Ensure hasUpvoted is properly set
        hasUpvoted: q.hasUpvoted || false,
        // Use answer_count from backend
        answer_count: q.answer_count || 0,
        // Ensure _count exists for compatibility
        _count: q._count || { answers: q.answer_count || 0, comments: 0 }
      }));

      console.log('🔥 Formatted questions:', formattedQuestions?.length, 'questions');

      // Update cached data
      setCachedQuestions(formattedQuestions);
      setLastFetchTime(Date.now());

      // Apply current tab filter
      console.log('🔥 Applying tab filter to', formattedQuestions?.length, 'questions');
      applyTabFilter(formattedQuestions);

      console.log('🔥 Questions loaded successfully');
    } catch (error: any) {
      console.error('🔥 Failed to load questions:', error);
      console.error('🔥 Error details:', error.message);

      // If we have cached data and this isn't a forced refresh, use cached data
      if (cachedQuestions.length > 0 && !forceRefresh) {
        console.log('🔥 Using cached questions due to API error');
        applyTabFilter(cachedQuestions);
      } else {
        console.log('🔥 No cached data available, showing empty state');
        setQuestions([]);
        setCachedQuestions([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyTabFilter = (questionsData: Question[], resetPagination = true) => {
    console.log('🔍 applyTabFilter called with:', questionsData?.length, 'questions, sortBy:', filters.sortBy);

    let sortedQuestions = [...questionsData];
    console.log('🔍 After spread operator:', sortedQuestions?.length, 'questions');

    if (filters.sortBy === 'popular') {
      sortedQuestions.sort((a, b) => b.upvotes - a.upvotes);
      console.log('🔍 After popular sort:', sortedQuestions?.length, 'questions');
    } else if (filters.sortBy === 'unanswered') {
      sortedQuestions = sortedQuestions.filter(q => q.answer_count === 0);
      console.log('🔍 After unanswered filter:', sortedQuestions?.length, 'questions');
    } else if (filters.sortBy === 'saved') {
      sortedQuestions = sortedQuestions.filter(q => savedQuestions.includes(q.id));
      console.log('🔍 After saved filter:', sortedQuestions?.length, 'questions');
    } else if (filters.sortBy === 'myQuestions') {
      sortedQuestions = sortedQuestions.filter(q =>
        q.User?.id === user?.id || q.user?.id === user?.id
      );
      console.log('🔍 After myQuestions filter:', sortedQuestions?.length, 'questions');
    } else {
      // Recent - sort by created_at
      sortedQuestions.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      console.log('🔍 After recent sort:', sortedQuestions?.length, 'questions');
    }

    if (resetPagination) {
      // Show first page only
      const paginatedQuestions = sortedQuestions.slice(0, ITEMS_PER_PAGE);
      console.log('🔍 About to setQuestions with:', paginatedQuestions?.length, 'questions (ITEMS_PER_PAGE:', ITEMS_PER_PAGE, ')');
      setQuestions(paginatedQuestions);
      setCurrentPage(1);
      setHasMoreData(sortedQuestions.length > ITEMS_PER_PAGE);
    } else {
      // Add to existing questions (for load more)
      const newQuestions = sortedQuestions.slice(0, currentPage * ITEMS_PER_PAGE);
      console.log('🔍 About to setQuestions (load more) with:', newQuestions?.length, 'questions');
      setQuestions(newQuestions);
      setHasMoreData(sortedQuestions.length > newQuestions.length);
    }
  };

  const loadMoreQuestions = () => {
    if (loadingMore || !hasMoreData) return;

    setLoadingMore(true);
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);

    // Simulate loading delay for better UX
    setTimeout(() => {
      applyTabFilter(cachedQuestions, false);
      setLoadingMore(false);
    }, 300);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadQuestions(true); // Force refresh
  };

  const analyzeQuestionWithAI = async () => {
    try {
      setAnalyzing(true);

      const questionText = `${newQuestion.title}\n\n${newQuestion.content}`.trim();

      // Skip analysis for very short content
      if (questionText.length < 10) {
        setAiAnalysis(null);
        setAnalyzing(false);
        return;
      }

      // Call AI analysis service with error handling
      const analysis = await apiService.analyzeQuestionWithAI({
        title: newQuestion.title || '',
        content: newQuestion.content || '',
        category: newQuestion.category || 'health'
      });

      // Validate analysis response
      if (analysis && typeof analysis.qualityScore === 'number') {
        setAiAnalysis(analysis);
      } else {
        console.warn('Invalid analysis response:', analysis);
        setAiAnalysis(null);
      }

    } catch (error) {
      console.error('AI analysis failed:', error);

      // Create safe fallback analysis
      try {
        const combinedText = `${newQuestion.title || ''} ${newQuestion.content || ''}`.trim();
        const wordCount = combinedText.split(/\s+/).filter(word => word.length > 0).length;

        const fallbackAnalysis = {
          qualityScore: Math.min(30 + (wordCount * 2), 85),
          suggestions: [
            wordCount < 10 ? 'Add more details about your situation' : 'Consider adding your dog\'s breed and age'
          ],
          detectedCategory: newQuestion.category || 'health',
          confidence: 'low'
        };

        setAiAnalysis(fallbackAnalysis);
      } catch (fallbackError) {
        console.error('Fallback analysis also failed:', fallbackError);
        setAiAnalysis(null);
      }
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

  const handleSaveQuestion = async (questionId: string) => {
    try {
      const isSaved = savedQuestions.includes(questionId);

      if (isSaved) {
        await apiService.unsaveQuestion(questionId);
        setSavedQuestions(prev => prev.filter(id => id !== questionId));
        Alert.alert('Removed', 'Question removed from saved list');
      } else {
        await apiService.saveQuestion(questionId);
        setSavedQuestions(prev => [...prev, questionId]);
        Alert.alert('Saved', 'Question saved successfully');
      }
    } catch (error: any) {
      console.error('Failed to save/unsave question:', error);
      Alert.alert('Error', 'Failed to save question. Please try again.');
    }
  };

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question);
    setEditFormData({
      title: question.title,
      content: question.content,
      category: question.category
    });
    setEditModalVisible(true);
  };

  const handleSubmitEdit = async () => {
    if (!editingQuestion || !editFormData.title.trim() || !editFormData.content.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      setSubmittingEdit(true);
      await apiService.editQuestion(editingQuestion.id, {
        title: editFormData.title,
        content: editFormData.content,
        category: editFormData.category
      });

      setEditModalVisible(false);
      setEditingQuestion(null);
      Alert.alert('Success', 'Question updated successfully');

      // Force refresh to show updated question
      setCachedQuestions([]);
      setLastFetchTime(0);
      loadQuestions(true);
    } catch (error: any) {
      console.error('Failed to edit question:', error);
      Alert.alert('Error', error.message || 'Failed to update question. Please try again.');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string, questionTitle: string) => {
    Alert.alert(
      'Delete Question',
      `Are you sure you want to delete "${questionTitle}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deleteQuestion(questionId);
              Alert.alert('Success', 'Question deleted successfully');
              // Force complete refresh
              setCachedQuestions([]);
              setLastFetchTime(0);
              loadQuestions(true);
            } catch (error: any) {
              console.error('Failed to delete question:', error);
              Alert.alert('Error', error.message || 'Failed to delete question. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleAskQuestion = async () => {
    if (!newQuestion.title.trim() || !newQuestion.content.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      setSubmittingQuestion(true);
      console.log('🔥 Submitting question:', newQuestion);

      const result = await apiService.createQuestion({
        title: newQuestion.title,
        content: newQuestion.content,
        category: newQuestion.category,
        tags: [],
      });

      console.log('🔥 Question created successfully:', result);

      // Close modal and reset form
      handleCloseAskModal();
      setNewQuestion({ title: '', content: '', category: 'health', imageUri: null });
      setAiAnalysis(null);
      setAnalyzing(false);

      // Force complete refresh to show new question
      setCachedQuestions([]);
      setLastFetchTime(0);
      setLoading(true);
      await loadQuestions(true);

      Alert.alert('Success', 'Your question has been posted and will appear shortly!');
    } catch (error: any) {
      console.error('🔥 Failed to post question:', error);
      Alert.alert('Error', error.message || 'Failed to post question. Please try again.');
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

  const CategoryButtons = () => (
    <View style={styles.categorySection}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScrollContent}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryChip,
              filters.category === category.id && styles.categoryChipActive,
            ]}
            onPress={() => handleCategoryChange(category.id)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.categoryChipText,
              filters.category === category.id && styles.categoryChipTextActive,
            ]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
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
        <View style={styles.questionHeaderLeft}>
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
        <TouchableOpacity
          style={styles.questionMenuButton}
          onPress={(e) => {
            e.stopPropagation();
            const isOwnQuestion = item.User?.id === user?.id || item.user?.id === user?.id;
            const options = [];

            // Save option for all questions
            const isSaved = savedQuestions.includes(item.id);
            options.push({
              text: isSaved ? 'Unsave' : 'Save',
              onPress: () => handleSaveQuestion(item.id)
            });

            if (isOwnQuestion) {
              // Own questions: Edit and Delete
              options.push({ text: 'Edit', onPress: () => handleEditQuestion(item) });
              options.push({
                text: 'Delete',
                onPress: () => handleDeleteQuestion(item.id, item.title),
                style: 'destructive'
              });
            } else {
              // Other's questions: Report
              options.push({ text: 'Report', onPress: () => console.log('Report question') });
            }

            options.push({ text: 'Cancel', style: 'cancel' });

            Alert.alert('Question Options', `Options for: ${item.title}`, options);
          }}
        >
          <Ionicons name="ellipsis-horizontal" size={16} color={Colors.ui.textSecondary} />
        </TouchableOpacity>
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
          onPress={() => navigation.navigate('QuestionDetail', { questionId: item.id, question: item, scrollToReplies: true })}
        >
          <Ionicons name="chatbubble-outline" size={18} color={Colors.ui.textSecondary} />
          <Text style={styles.statText}>{item.answer_count !== undefined ? item.answer_count : (item._count?.answers || 0)}</Text>
        </TouchableOpacity>

        <View style={styles.statItem}>
          <Ionicons name="eye-outline" size={20} color={Colors.ui.textSecondary} />
          <Text style={styles.statText}>{item.view_count}</Text>
        </View>

        <View style={styles.authorSection}>
          <Text style={styles.authorName}>{item.User?.name || item.user?.name || 'Unknown User'}</Text>
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
          <TouchableOpacity style={styles.headerMenuButton} onPress={handleMenuPress}>
            <Ionicons name="ellipsis-vertical" size={24} color={Colors.ui.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Categories moved to CommunityFilters component */}

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <CommunityFilters
            activeFilters={filters}
            onFilterChange={setFilters}
            onAskPress={handleOpenAskModal}
          />
        </View>

        {/* Questions List */}
        {(() => {
          console.log('🔍 RENDER: Current questions state length:', questions?.length, 'loading:', loading);
          console.log('🔍 RENDER: Questions array:', questions);
          return null;
        })()}
        {loading ? (
          <View style={styles.questionsContainer}>
            <QuestionSkeleton />
            <QuestionSkeleton />
            <QuestionSkeleton />
            <QuestionSkeleton />
            <QuestionSkeleton />
          </View>
        ) : questions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="comment-question-outline" size={64} color={Colors.ui.textTertiary} />
            <Text style={styles.emptyText}>No questions found</Text>
            <TouchableOpacity
              style={styles.askButton}
              onPress={handleOpenAskModal}
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
            onEndReached={loadMoreQuestions}
            onEndReachedThreshold={0.3}
            ListFooterComponent={() =>
              loadingMore ? (
                <View style={styles.loadMoreContainer}>
                  <ActivityIndicator size="small" color={Colors.primary.mintTeal} />
                  <Text style={styles.loadMoreText}>Loading more questions...</Text>
                </View>
              ) : !hasMoreData && questions.length > 0 ? (
                <View style={styles.endContainer}>
                  <Text style={styles.endText}>You've reached the end!</Text>
                </View>
              ) : null
            }
          />
        )}
      </ScrollView>

      {/* Ask Question Modal */}
      <Modal
        visible={askModalVisible}
        animationType="none"
        transparent={true}
        onRequestClose={handleCloseAskModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={handleCloseAskModal}
          />
          <Animated.View style={[styles.modalContent, { transform: [{ translateY: askSlideAnim }] }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ask a Question</Text>
              <TouchableOpacity onPress={handleCloseAskModal}>
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
                  {analyzing === true && <ActivityIndicator size="small" color={Colors.primary.mintTeal} />}
                </View>

                {aiAnalysis && aiAnalysis.qualityScore !== undefined && (
                  <>
                    <View style={styles.qualityScoreContainer}>
                      <Text style={styles.qualityScoreLabel}>Quality Score</Text>
                      <View style={styles.qualityScoreBar}>
                        <View
                          style={[
                            styles.qualityScoreFill,
                            {
                              width: `${Math.max(0, Math.min(100, aiAnalysis.qualityScore))}%`,
                              backgroundColor: aiAnalysis.qualityScore >= 80 ? Colors.functional.success :
                                             aiAnalysis.qualityScore >= 60 ? Colors.primary.warmYellow :
                                             Colors.functional.error
                            }
                          ]}
                        />
                      </View>
                      <Text style={styles.qualityScoreText}>{Math.round(aiAnalysis.qualityScore)}/100</Text>
                    </View>

                    {Array.isArray(aiAnalysis.suggestions) && aiAnalysis.suggestions.length > 0 && (
                      <View style={styles.suggestionsContainer}>
                        <Text style={styles.suggestionsTitle}>💡 Suggestions to improve:</Text>
                        {aiAnalysis.suggestions.map((suggestion, index) => (
                          <Text key={index} style={styles.suggestionText}>• {suggestion}</Text>
                        ))}
                      </View>
                    )}

                    {Array.isArray(aiAnalysis.suggestedTags) && aiAnalysis.suggestedTags.length > 0 && (
                      <View style={styles.suggestedTagsContainer}>
                        <Text style={styles.suggestedTagsTitle}>Suggested tags:</Text>
                        <View style={styles.suggestedTagsList}>
                          {aiAnalysis.suggestedTags.map((tag, index) => (
                            <View key={index} style={styles.suggestedTag}>
                              <Text style={styles.suggestedTagText}>#{String(tag)}</Text>
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
                {['health', 'behavior', 'training', 'food', 'local', 'grooming', 'adoption', 'travel', 'lifestyle', 'events'].map((cat) => (
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
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Question Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.editModalContainer}
        >
          <View style={styles.editModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Question</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.ui.textPrimary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.titleInput}
              placeholder="Question title"
              placeholderTextColor={Colors.ui.textTertiary}
              value={editFormData.title}
              onChangeText={(text) => setEditFormData({ ...editFormData, title: text })}
            />

            <TextInput
              style={styles.contentInput}
              placeholder="Provide more details..."
              placeholderTextColor={Colors.ui.textTertiary}
              value={editFormData.content}
              onChangeText={(text) => setEditFormData({ ...editFormData, content: text })}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />

            <View style={styles.categorySelector}>
              <Text style={styles.categoryLabel}>Category:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {['health', 'behavior', 'training', 'food', 'local', 'grooming', 'adoption', 'travel', 'lifestyle', 'events'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryOption,
                      editFormData.category === cat && styles.selectedCategory
                    ]}
                    onPress={() => setEditFormData({ ...editFormData, category: cat })}
                  >
                    <Text
                      style={[
                        styles.categoryOptionText,
                        editFormData.category === cat && styles.selectedCategoryText
                      ]}
                    >
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, submittingEdit && styles.disabledButton]}
              onPress={handleSubmitEdit}
              disabled={submittingEdit}
            >
              {submittingEdit ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Update Question</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Community Menu Modal */}
      <Modal
        visible={menuModalVisible}
        animationType="none"
        transparent={true}
        onRequestClose={handleCloseMenu}
      >
        <View style={styles.menuModalOverlay}>
          <Animated.View style={[styles.menuModalContent, { transform: [{ translateY: menuSlideAnim }] }]}>
            <Text style={styles.menuModalTitle}>Community Options</Text>

            <TouchableOpacity style={styles.menuOption}>
              <Ionicons name="star" size={20} color={Colors.primary.mintTeal} />
              <Text style={styles.menuOptionText}>Top Contributors</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuOption}>
              <Ionicons name="school" size={20} color={Colors.primary.mintTeal} />
              <Text style={styles.menuOptionText}>Expert Verification</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuOption}>
              <Ionicons name="help-circle" size={20} color={Colors.primary.mintTeal} />
              <Text style={styles.menuOptionText}>Community Guidelines</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuCloseButton}
              onPress={handleCloseMenu}
            >
              <Text style={styles.menuCloseText}>Close</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.mobile.margin,
    paddingTop: 20,
    paddingBottom: 24,
  },
  headerMenuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.ui.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.small,
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: Colors.primary.mutedPurple,
  },
  questionsContainer: {
    paddingHorizontal: Spacing.mobile.margin,
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
  questionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  questionMenuButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
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
  loadMoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadMoreText: {
    fontSize: 14,
    color: Colors.ui.textSecondary,
    fontWeight: '500',
  },
  endContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  endText: {
    fontSize: 14,
    color: Colors.ui.textTertiary,
    fontWeight: '500',
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
  menuModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menuModalContent: {
    backgroundColor: Colors.ui.surface,
    borderTopLeftRadius: BorderRadius.large,
    borderTopRightRadius: BorderRadius.large,
    padding: 24,
    paddingBottom: 40,
  },
  menuModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.ui.textPrimary,
    marginBottom: 20,
    textAlign: 'center',
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.ui.border,
    gap: 12,
  },
  menuOptionText: {
    fontSize: 16,
    color: Colors.ui.textPrimary,
    fontWeight: '500',
  },
  menuCloseButton: {
    backgroundColor: Colors.ui.border,
    paddingVertical: 12,
    borderRadius: BorderRadius.button,
    marginTop: 20,
    alignItems: 'center',
  },
  menuCloseText: {
    fontSize: 16,
    color: Colors.ui.textSecondary,
    fontWeight: '600',
  },
  categorySection: {
    paddingHorizontal: Spacing.mobile.margin,
    paddingVertical: 12,
  },
  categoryScrollContent: {
    paddingRight: 12,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: BorderRadius.large,
    backgroundColor: Colors.ui.surface,
    borderWidth: 1,
    borderColor: Colors.ui.border,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary.mintTeal,
    borderColor: Colors.primary.mintTeal,
  },
  categoryChipText: {
    fontSize: 14,
    color: Colors.ui.textSecondary,
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  // Edit Modal Styles
  editModalContainer: {
    flex: 1,
    backgroundColor: Colors.ui.surface,
  },
  editModalContent: {
    flex: 1,
    padding: 24,
    paddingTop: 60,
  },
});