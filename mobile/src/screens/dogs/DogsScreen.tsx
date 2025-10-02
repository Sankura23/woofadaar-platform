import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../../App';
import { apiService } from '../../services/api';
import { Dog } from '../../types/auth';
import { Colors, BorderRadius, Shadows, Spacing } from '../../theme/colors';

const { width } = Dimensions.get('window');

type DogsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Dogs'>;
  route?: any;
};

export default function DogsScreen({ navigation, route }: DogsScreenProps) {
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadDogs();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadDogs();
    }, [])
  );

  // Handle scroll to top when route params change
  useEffect(() => {
    if (route?.params?.scrollToTop) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  }, [route?.params?.scrollToTop]);

  const loadDogs = async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setLoading(true);
      }
      const dogsData = await apiService.getDogs();
      const transformedDogs = dogsData.map(dog => ({
        ...dog,
        age: dog.age_months ? Math.floor(dog.age_months / 12) : 0,
        weight: dog.weight_kg || 0,
        healthId: dog.health_id,
      }));
      setDogs(transformedDogs);
    } catch (error) {
      console.error('Failed to load dogs:', error);
    } finally {
      if (!isRefresh) {
        setLoading(false);
      }
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDogs(true);
  };

  const getBreedEmoji = (breed: string) => {
    const breedMap: { [key: string]: string } = {
      'golden retriever': '🐕',
      'german shepherd': '🐺',
      'labrador': '🦮',
      'beagle': '🐶',
      'poodle': '🐩',
      'bulldog': '🐕‍🦺',
    };
    return breedMap[breed.toLowerCase()] || '🐕';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your dogs...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
        showsVerticalScrollIndicator={false}
      >
        {/* Page Title */}
        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>My Dogs</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('AddDog')}
          >
            <Ionicons name="add-circle" size={32} color={Colors.primary.mintTeal} />
          </TouchableOpacity>
        </View>

        {/* Dogs Grid */}
        {dogs.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="paw" size={60} color={Colors.ui.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>No Dogs Yet</Text>
            <Text style={styles.emptyText}>
              Add your first furry friend to start tracking their health and wellness
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('AddDog')}
            >
              <Text style={styles.emptyButtonText}>Add First Dog</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.dogsGrid}>
            {dogs.map((dog) => (
              <TouchableOpacity
                key={dog.id}
                style={styles.dogCard}
                onPress={() => navigation.navigate('Health', { dogId: dog.id })}
                activeOpacity={0.7}
              >
                {/* Dog Photo/Avatar */}
                <View style={styles.dogImageContainer}>
                  {dog.photo_url ? (
                    <Image
                      source={{ uri: dog.photo_url }}
                      style={styles.dogImage}
                    />
                  ) : (
                    <View style={styles.dogImagePlaceholder}>
                      <Text style={styles.dogEmoji}>{getBreedEmoji(dog.breed)}</Text>
                    </View>
                  )}
                  {dog.healthId && (
                    <View style={styles.healthBadge}>
                      <Ionicons name="medical" size={12} color={Colors.ui.surface} />
                    </View>
                  )}
                </View>

                {/* Dog Info */}
                <View style={styles.dogInfo}>
                  <Text style={styles.dogName} numberOfLines={1}>{dog.name}</Text>
                  <Text style={styles.dogBreed} numberOfLines={1}>{dog.breed}</Text>

                  <View style={styles.dogStats}>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{dog.age}</Text>
                      <Text style={styles.statLabel}>years</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{dog.weight}</Text>
                      <Text style={styles.statLabel}>kg</Text>
                    </View>
                  </View>
                </View>

                {/* Quick Actions */}
                <View style={styles.quickActions}>
                  <TouchableOpacity
                    style={styles.quickAction}
                    onPress={(e) => {
                      e.stopPropagation();
                      navigation.navigate('EditDog', { dog });
                    }}
                  >
                    <Ionicons name="create-outline" size={16} color={Colors.primary.mintTeal} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quickAction}
                    onPress={(e) => {
                      e.stopPropagation();
                      navigation.navigate('Health', { dogId: dog.id });
                    }}
                  >
                    <Ionicons name="heart" size={16} color={Colors.primary.mintTeal} />
                  </TouchableOpacity>

                  {dog.healthId && (
                    <TouchableOpacity
                      style={styles.quickAction}
                      onPress={(e) => {
                        e.stopPropagation();
                        navigation.navigate('DogId', {
                          dogId: dog.id,
                          dogName: dog.name,
                        });
                      }}
                    >
                      <Ionicons name="qr-code" size={16} color={Colors.primary.mintTeal} />
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.ui.textSecondary,
  },
  titleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.mobile.margin,
    paddingTop: 20,
    paddingBottom: 24,
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: Colors.primary.mutedPurple,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: Spacing.mobile.margin,
    paddingTop: 80,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.secondary.mintTeal[20],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.ui.textPrimary,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.ui.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  emptyButton: {
    backgroundColor: Colors.primary.mintTeal,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: BorderRadius.button,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.ui.surface,
  },
  dogsGrid: {
    paddingHorizontal: Spacing.mobile.margin,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  dogCard: {
    width: (width - (Spacing.mobile.margin * 2) - 16) / 2,
    backgroundColor: Colors.ui.surface,
    borderRadius: BorderRadius.card,
    padding: 16,
    alignItems: 'center',
    ...Shadows.small,
  },
  dogImageContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  dogImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  dogImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary.mintTeal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dogEmoji: {
    fontSize: 36,
  },
  healthBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.functional.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.ui.surface,
  },
  dogInfo: {
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  dogName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.ui.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  dogBreed: {
    fontSize: 14,
    color: Colors.ui.textSecondary,
    marginBottom: 12,
    textAlign: 'center',
  },
  dogStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary.mintTeal,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.ui.textTertiary,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.ui.divider,
    marginHorizontal: 8,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  quickAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.secondary.mintTeal[20],
    alignItems: 'center',
    justifyContent: 'center',
  },
});