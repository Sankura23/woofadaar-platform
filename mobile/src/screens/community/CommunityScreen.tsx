import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Question, QUESTION_CATEGORIES } from '../../types/community';
import { apiService } from '../../services/api';

type CommunityScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Community'>;
};

export default function CommunityScreen({ navigation }: CommunityScreenProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    loadQuestions();
  }, [selectedCategory]);

  const loadQuestions = async () => {
    try {
      const questionsData = await apiService.getQuestions();
      
      // Filter by category if selected
      const filteredQuestions = selectedCategory 
        ? questionsData.filter(q => q.category === selectedCategory)
        : questionsData;
      
      // Sort by most recent
      const sortedQuestions = filteredQuestions.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      setQuestions(sortedQuestions);
    } catch (error) {
      console.error('Failed to load questions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadQuestions();
  };

  const filteredQuestions = questions.filter(question =>
    question.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    question.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  const communityFeatures = [
    {
      title: '❓ Ask Question',
      description: 'Get help from the community',
      onPress: () => console.log('Ask question coming soon'),
      color: '#2563eb'
    },
    {
      title: '🏆 Leaderboard',
      description: 'See top contributors',
      onPress: () => console.log('Leaderboard coming soon'),
      color: '#f59e0b'
    },
    {
      title: '🎯 My Questions',
      description: 'View your questions and answers',
      onPress: () => console.log('My questions coming soon'),
      color: '#10b981'
    },
    {
      title: '💡 Expert Advice',
      description: 'Connect with verified experts',
      onPress: () => console.log('Expert advice coming soon'),
      color: '#8b5cf6'
    }
  ];

  const getCategoryIcon = (category: string) => {
    const cat = QUESTION_CATEGORIES.find(c => c.value === category);
    return cat ? cat.icon : '🐕';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Card>
          <CardHeader>
            <CardTitle>👥 Dog Parent Community</CardTitle>
          </CardHeader>
          <CardContent>
            <Text style={styles.subtitle}>
              Connect, learn, and share with fellow dog parents across India
            </Text>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.featuresGrid}>
          {communityFeatures.map((feature, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.featureCard, { borderLeftColor: feature.color }]}
              onPress={feature.onPress}
            >
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>{feature.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search and Filter */}
        <Card>
          <CardContent>
            <Text style={styles.label}>Search Questions</Text>
            <TextInput
              style={styles.searchInput}
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder="Search questions..."
              placeholderTextColor="#9ca3af"
            />
            
            <Text style={styles.label}>Filter by Category</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedCategory}
                onValueChange={setSelectedCategory}
                style={styles.picker}
              >
                {QUESTION_CATEGORIES.map((category) => (
                  <Picker.Item 
                    key={category.value} 
                    label={`${category.icon} ${category.label}`} 
                    value={category.value} 
                  />
                ))}
              </Picker>
            </View>
          </CardContent>
        </Card>

        {/* Questions List */}
        <Text style={styles.sectionTitle}>
          Recent Questions ({filteredQuestions.length})
        </Text>

        {loading ? (
          <Card>
            <CardContent>
              <Text style={styles.centerText}>Loading questions...</Text>
            </CardContent>
          </Card>
        ) : filteredQuestions.length === 0 ? (
          <Card>
            <CardContent>
              <Text style={styles.centerText}>
                {searchTerm || selectedCategory 
                  ? 'No questions found matching your criteria'
                  : 'No questions yet. Be the first to ask!'}
              </Text>
            </CardContent>
          </Card>
        ) : (
          filteredQuestions.map((question) => (
            <Card key={question.id}>
              <CardContent>
                <TouchableOpacity 
                  onPress={() => console.log('Open question:', question.id)}
                >
                  <View style={styles.questionHeader}>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryText}>
                        {getCategoryIcon(question.category)} {question.category}
                      </Text>
                    </View>
                    {question.is_resolved && (
                      <View style={styles.resolvedBadge}>
                        <Text style={styles.resolvedText}>✓ Resolved</Text>
                      </View>
                    )}
                  </View>
                  
                  <Text style={styles.questionTitle}>{question.title}</Text>
                  <Text style={styles.questionContent} numberOfLines={3}>
                    {question.content}
                  </Text>
                  
                  <View style={styles.questionStats}>
                    <Text style={styles.statText}>👁 {question.view_count}</Text>
                    <Text style={styles.statText}>👍 {question.upvotes}</Text>
                    <Text style={styles.statText}>💬 {question.answer_count}</Text>
                  </View>
                  
                  <View style={styles.questionFooter}>
                    <Text style={styles.authorText}>
                      by {question.user.name}
                      {question.dog && ` • ${question.dog.name} (${question.dog.breed})`}
                    </Text>
                    <Text style={styles.timeText}>
                      {formatTimeAgo(question.created_at)}
                    </Text>
                  </View>
                  
                  {question.tags.length > 0 && (
                    <View style={styles.tagsContainer}>
                      {question.tags.slice(0, 3).map((tag, index) => (
                        <View key={index} style={styles.tag}>
                          <Text style={styles.tagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              </CardContent>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    padding: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginVertical: 16,
  },
  featuresGrid: {
    gap: 12,
    marginBottom: 20,
  },
  featureCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  picker: {
    height: 50,
  },
  centerText: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 16,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '500',
  },
  resolvedBadge: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  resolvedText: {
    fontSize: 12,
    color: '#16a34a',
    fontWeight: '500',
  },
  questionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  questionContent: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  questionStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  statText: {
    fontSize: 12,
    color: '#6b7280',
  },
  questionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  authorText: {
    fontSize: 12,
    color: '#4b5563',
    flex: 1,
  },
  timeText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  tag: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 11,
    color: '#6b7280',
  },
});