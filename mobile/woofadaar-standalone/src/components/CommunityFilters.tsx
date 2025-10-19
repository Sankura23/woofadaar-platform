import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, Shadows, Spacing } from '../theme/colors';

export interface FilterOptions {
  category: string;
  sortBy: 'recent' | 'popular' | 'unanswered' | 'myQuestions' | 'saved';
  showExperts: boolean;
}

interface CommunityFiltersProps {
  activeFilters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
  onAskPress: () => void;
}

const categories = [
  { id: 'all', name: 'All', icon: 'apps', backgroundColor: Colors.primary.mintTeal },
  { id: 'health', name: 'Health', icon: 'medical', backgroundColor: Colors.primary.burntOrange },
  { id: 'behavior', name: 'Behavior', icon: 'happy', backgroundColor: Colors.primary.mutedPurple },
  { id: 'training', name: 'Training', icon: 'school', backgroundColor: Colors.primary.warmYellow },
  { id: 'food', name: 'Food', icon: 'restaurant', backgroundColor: '#4ECDC4' },
  { id: 'local', name: 'Local', icon: 'location', backgroundColor: '#FF6B6B' },
  { id: 'grooming', name: 'Grooming', icon: 'cut', backgroundColor: '#9B59B6' },
  { id: 'adoption', name: 'Adoption', icon: 'heart', backgroundColor: '#F06292' },
  { id: 'travel', name: 'Travel', icon: 'airplane', backgroundColor: '#42A5F5' },
  { id: 'lifestyle', name: 'Lifestyle', icon: 'home', backgroundColor: '#66BB6A' },
  { id: 'events', name: 'Events', icon: 'calendar', backgroundColor: '#FFA726' },
];

export default function CommunityFilters({
  activeFilters,
  onFilterChange,
  onAskPress,
}: CommunityFiltersProps) {
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const handleCategoryChange = (categoryId: string) => {
    onFilterChange({ ...activeFilters, category: categoryId });
  };

  const handleSortChange = (sortBy: FilterOptions['sortBy']) => {
    onFilterChange({ ...activeFilters, sortBy });
    setDropdownVisible(false);
  };

  const renderCategoryIcon = (category: typeof categories[0]) => {
    const iconProps = { size: 20, color: '#FFFFFF' };

    switch (category.icon) {
      case 'medical':
        return <Ionicons name="medical" {...iconProps} />;
      case 'happy':
        return <Ionicons name="happy" {...iconProps} />;
      case 'school':
        return <Ionicons name="school" {...iconProps} />;
      case 'restaurant':
        return <Ionicons name="restaurant" {...iconProps} />;
      case 'location':
        return <Ionicons name="location" {...iconProps} />;
      case 'cut':
        return <Ionicons name="cut" {...iconProps} />;
      case 'heart':
        return <Ionicons name="heart" {...iconProps} />;
      case 'airplane':
        return <Ionicons name="airplane" {...iconProps} />;
      case 'home':
        return <Ionicons name="home" {...iconProps} />;
      case 'calendar':
        return <Ionicons name="calendar" {...iconProps} />;
      default:
        return <Ionicons name="apps" {...iconProps} />;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Row with Ask Button */}
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Categories</Text>
        <TouchableOpacity
          style={styles.askButton}
          onPress={onAskPress}
        >
          <Ionicons name="add" size={14} color="#fff" />
          <Text style={styles.askButtonText}>Ask</Text>
        </TouchableOpacity>
      </View>

      {/* Category Buttons Row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScrollContainer}
        contentContainerStyle={styles.categoryScrollContent}
      >
        {categories.map((category) => (
          <View key={category.id} style={styles.categoryItem}>
            <TouchableOpacity
              style={[
                styles.categoryButton,
                { backgroundColor: category.backgroundColor },
                activeFilters.category === category.id && styles.categoryButtonActive
              ]}
              onPress={() => handleCategoryChange(category.id)}
              activeOpacity={0.8}
            >
              {renderCategoryIcon(category)}
            </TouchableOpacity>
            <Text style={styles.categoryLabel}>
              {category.name}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Sort Filter Row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.sortRow}
        contentContainerStyle={styles.sortContent}
      >
        {/* My Questions Chip - Always First */}
        <TouchableOpacity
          style={[
            styles.sortChip,
            activeFilters.sortBy === 'myQuestions' && styles.sortChipActive,
          ]}
          onPress={() => handleSortChange('myQuestions')}
        >
          <Ionicons
            name="person"
            size={14}
            color={activeFilters.sortBy === 'myQuestions' ? '#fff' : Colors.ui.textSecondary}
          />
          <Text style={[
            styles.sortChipText,
            activeFilters.sortBy === 'myQuestions' && styles.sortChipTextActive,
          ]}>
            My Questions
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.sortChip,
            activeFilters.sortBy === 'recent' && styles.sortChipActive,
          ]}
          onPress={() => handleSortChange('recent')}
        >
          <Text style={[
            styles.sortChipText,
            activeFilters.sortBy === 'recent' && styles.sortChipTextActive,
          ]}>
            Recent
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.sortChip,
            activeFilters.sortBy === 'popular' && styles.sortChipActive,
          ]}
          onPress={() => handleSortChange('popular')}
        >
          <Text style={[
            styles.sortChipText,
            activeFilters.sortBy === 'popular' && styles.sortChipTextActive,
          ]}>
            Popular
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.sortChip,
            activeFilters.sortBy === 'unanswered' && styles.sortChipActive,
          ]}
          onPress={() => handleSortChange('unanswered')}
        >
          <Text style={[
            styles.sortChipText,
            activeFilters.sortBy === 'unanswered' && styles.sortChipTextActive,
          ]}>
            Unanswered
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.sortChip,
            activeFilters.sortBy === 'saved' && styles.sortChipActive,
          ]}
          onPress={() => handleSortChange('saved')}
        >
          <Ionicons
            name="bookmark"
            size={14}
            color={activeFilters.sortBy === 'saved' ? '#fff' : Colors.ui.textSecondary}
          />
          <Text style={[
            styles.sortChipText,
            activeFilters.sortBy === 'saved' && styles.sortChipTextActive,
          ]}>
            Saved
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.ui.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.ui.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.mobile.margin,
    paddingTop: 12,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.ui.textPrimary,
  },
  categoryScrollContainer: {
    paddingVertical: 16,
  },
  categoryScrollContent: {
    paddingHorizontal: 16,
  },
  sortRow: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  sortContent: {
    gap: 8,
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.card,
    backgroundColor: Colors.ui.surface,
    marginRight: 8,
    gap: 6,
    ...Shadows.small,
  },
  sortChipActive: {
    backgroundColor: Colors.primary.mintTeal,
    ...Shadows.medium,
  },
  sortChipText: {
    fontSize: 13,
    color: Colors.ui.textSecondary,
    fontWeight: '600',
  },
  sortChipTextActive: {
    color: '#fff',
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.ui.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.ui.border,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: 12,
  },
  categoryButton: {
    width: 55,
    height: 55,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.small,
  },
  categoryLabel: {
    color: Colors.ui.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  categoryButtonActive: {
    transform: [{ scale: 1.05 }],
    ...Shadows.medium,
  },
  askButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary.mintTeal,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.card,
    gap: 6,
    ...Shadows.small,
  },
  askButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});