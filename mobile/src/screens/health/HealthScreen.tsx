import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Dimensions,
  Alert,
  Image,
  FlatList,
  Animated,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { Dog, HealthLog } from '../../types/auth';
import { apiService } from '../../services/api';
import { Colors, BorderRadius, Shadows, Spacing } from '../../theme/colors';

const { width } = Dimensions.get('window');

type HealthScreenProps = {
  route: RouteProp<RootStackParamList, 'Health'>;
  navigation: NativeStackNavigationProp<RootStackParamList, 'Health'>;
};

export default function HealthScreen({ route, navigation }: HealthScreenProps) {
  const { dogId } = route.params || {};
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [selectedDog, setSelectedDog] = useState<Dog | null>(null);
  const [recentLogs, setRecentLogs] = useState<HealthLog[]>([]);
  const [healthStats, setHealthStats] = useState({
    avgMood: 0,
    avgEnergy: 0,
    totalExercise: 0,
    logsCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Simple FlatList ref and health stats animation
  const flatListRef = useRef<FlatList>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentDogIndex, setCurrentDogIndex] = useState(0);
  const healthStatsOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadHealthData();
  }, [dogId]);

  // Handle scroll to top when route params change
  useEffect(() => {
    if (route.params?.scrollToTop) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  }, [route.params?.scrollToTop]);

  // Refresh health data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (selectedDog) {
        loadHealthLogs(selectedDog.id);
      }
    }, [selectedDog])
  );

  const loadHealthData = async () => {
    try {
      const dogsData = await apiService.getDogs();
      setDogs(dogsData);

      const targetDog = dogId ? dogsData.find(d => d.id === dogId) : dogsData[0];
      setSelectedDog(targetDog || null);

      if (targetDog) {
        await loadHealthLogs(targetDog.id);
      }
    } catch (error) {
      console.error('Failed to load health data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadHealthData();
  };

  const loadHealthLogs = async (dogId: string) => {
    try {
      const logs = await apiService.getHealthLogs(dogId);

      // Handle case where logs might be null, undefined, or not an array
      const validLogs = Array.isArray(logs) ? logs : [];
      setRecentLogs(validLogs.slice(0, 3));

      // Calculate simple health stats
      if (validLogs.length > 0) {
        const recent7Days = validLogs.slice(0, 7);
        const avgMood = recent7Days.reduce((sum, log) => sum + (log?.mood_score || 0), 0) / recent7Days.length;
        const avgEnergy = recent7Days.reduce((sum, log) => sum + (log?.energy_level || 0), 0) / recent7Days.length;
        const totalExercise = recent7Days.reduce((sum, log) => sum + (log?.exercise_minutes || 0), 0);

        setHealthStats({
          avgMood: parseFloat(avgMood.toFixed(1)),
          avgEnergy: parseFloat(avgEnergy.toFixed(1)),
          totalExercise,
          logsCount: validLogs.length
        });
      } else {
        // Reset stats when no logs
        setHealthStats({
          avgMood: 0,
          avgEnergy: 0,
          totalExercise: 0,
          logsCount: 0
        });
      }
    } catch (error) {
      console.error('Failed to load health logs:', error);
      // Set empty arrays/stats on error
      setRecentLogs([]);
      setHealthStats({
        avgMood: 0,
        avgEnergy: 0,
        totalExercise: 0,
        logsCount: 0
      });
    }
  };

  const onDogChange = (index: number) => {
    if (index !== currentDogIndex) {
      setCurrentDogIndex(index);
      const newDog = dogs[index];
      setSelectedDog(newDog);

      // Animate health stats
      Animated.sequence([
        Animated.timing(healthStatsOpacity, {
          toValue: 0.3,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(healthStatsOpacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();

      loadHealthLogs(newDog.id);
    }
  };

  const navigateToDog = (direction: 'next' | 'prev') => {
    const newIndex = direction === 'next'
      ? (currentDogIndex + 1) % dogs.length
      : currentDogIndex === 0 ? dogs.length - 1 : currentDogIndex - 1;

    flatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
  };

  const renderDogCard = ({ item: dog, index }: { item: Dog; index: number }) => (
    <View style={styles.dogCard}>
      {dogs.length > 1 && (
        <TouchableOpacity style={styles.prevButton} onPress={() => navigateToDog('prev')}>
          <Ionicons name="chevron-back" size={20} color={Colors.primary.mintTeal} />
        </TouchableOpacity>
      )}
      <View style={styles.dogInfo}>
        {dog.photo_url ? (
          <Image
            source={{ uri: dog.photo_url }}
            style={styles.dogPhoto}
          />
        ) : (
          <View style={styles.dogAvatar}>
            <Text style={styles.dogAvatarText}>
              {dog.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View>
          <Text style={styles.dogName}>{dog.name}</Text>
          <Text style={styles.dogBreed}>{dog.breed}</Text>
          {dogs.length > 1 && (
            <Text style={styles.navigationHint}>Swipe to switch dogs</Text>
          )}
        </View>
      </View>
      {dogs.length > 1 && (
        <TouchableOpacity style={styles.nextButton} onPress={() => navigateToDog('next')}>
          <Ionicons name="chevron-forward" size={20} color={Colors.primary.mintTeal} />
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary.mintTeal} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (dogs.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="medical" size={80} color={Colors.ui.textTertiary} />
          <Text style={styles.emptyTitle}>No Dogs Found</Text>
          <Text style={styles.emptyText}>Add a dog first to start health tracking!</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddDog')}
          >
            <Text style={styles.addButtonText}>Add Dog</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Health</Text>
          <TouchableOpacity>
            <Ionicons name="notifications-outline" size={24} color={Colors.ui.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Dog Selector */}
        {dogs.length > 0 && (
          <View style={styles.dogCardContainer}>
            <FlatList
              ref={flatListRef}
              data={dogs}
              renderItem={renderDogCard}
              keyExtractor={(item) => item.id}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / width);
                onDogChange(index);
              }}
              getItemLayout={(data, index) => ({
                length: width,
                offset: width * index,
                index,
              })}
              initialScrollIndex={currentDogIndex}
              style={styles.dogsFlatList}
            />
          </View>
        )}

        {/* Health Overview - Now part of dog info */}
        {selectedDog && (
          <Animated.View
            style={[
              styles.healthOverviewSection,
              { opacity: healthStatsOpacity }
            ]}
          >
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{healthStats.avgMood || 0}/5</Text>
                <Text style={styles.statLabel}>Mood</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{healthStats.avgEnergy || 0}/5</Text>
                <Text style={styles.statLabel}>Energy</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{healthStats.totalExercise}</Text>
                <Text style={styles.statLabel}>Exercise (min)</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{healthStats.logsCount}</Text>
                <Text style={styles.statLabel}>Total Logs</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('DailyLog' as any)}
            >
              <Ionicons name="add-circle" size={32} color={Colors.primary.mintTeal} />
              <Text style={styles.actionTitle}>Add Log</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => Alert.alert('Coming Soon', 'Vet contacts will be available soon!')}
            >
              <Ionicons name="call" size={32} color={Colors.primary.mintTeal} />
              <Text style={styles.actionTitle}>Vet Call</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => Alert.alert('Coming Soon', 'Medication tracking will be available soon!')}
            >
              <Ionicons name="medical" size={32} color={Colors.primary.mintTeal} />
              <Text style={styles.actionTitle}>Meds</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => Alert.alert('Coming Soon', 'Medical records will be available soon!')}
            >
              <Ionicons name="document" size={32} color={Colors.primary.mintTeal} />
              <Text style={styles.actionTitle}>Records</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Logs */}
        {recentLogs.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Logs</Text>
              <TouchableOpacity onPress={() => navigation.navigate('HealthLogs', { dogId: selectedDog?.id })}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.logsContainer}>
              {recentLogs.map((log, index) => (
                <View key={index} style={styles.logCard}>
                  <View style={styles.logHeader}>
                    <Text style={styles.logDate}>
                      {log?.date ? new Date(log.date).toLocaleDateString() : 'No date'}
                    </Text>
                    <View style={styles.moodContainer}>
                      <Ionicons name="happy" size={16} color={Colors.primary.mintTeal} />
                      <Text style={styles.moodText}>{log?.mood_score || 0}/5</Text>
                    </View>
                  </View>
                  <View style={styles.logDetails}>
                    <Text style={styles.logDetail}>
                      Appetite: {log?.appetite_score || 0}/5 • Exercise: {log?.exercise_minutes || 0}min
                    </Text>
                    {log?.symptoms && Array.isArray(log.symptoms) && log.symptoms.length > 0 && (
                      <Text style={styles.symptomsText}>
                        Symptoms: {log.symptoms.join(', ')}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral.fafafa,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.ui.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.mobile.margin,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.ui.textPrimary,
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.ui.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  addButton: {
    backgroundColor: Colors.primary.mintTeal,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: BorderRadius.button,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.ui.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.mobile.margin,
    paddingTop: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: Colors.primary.mutedPurple,
  },
  dogCardContainer: {
    marginBottom: 16,
    height: 100,
  },
  dogsFlatList: {
    flexGrow: 0,
  },
  healthOverviewSection: {
    paddingHorizontal: Spacing.mobile.margin,
    marginBottom: 24,
  },
  dogCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.ui.surface,
    padding: 20,
    borderRadius: BorderRadius.card,
    marginHorizontal: Spacing.mobile.margin,
    width: width - (Spacing.mobile.margin * 2),
    height: 100,
    ...Shadows.small,
  },
  dogInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  dogAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary.mintTeal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dogPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  dogAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.ui.surface,
  },
  dogName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.ui.textPrimary,
    marginBottom: 2,
  },
  dogBreed: {
    fontSize: 14,
    color: Colors.ui.textSecondary,
  },
  navigationHint: {
    fontSize: 11,
    color: Colors.primary.mintTeal,
    marginTop: 2,
    fontStyle: 'italic',
  },
  prevButton: {
    position: 'absolute',
    left: 16,
    top: '50%',
    marginTop: -20,
    padding: 8,
    backgroundColor: Colors.secondary.mintTeal[20],
    borderRadius: 20,
    zIndex: 1,
  },
  nextButton: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -20,
    padding: 8,
    backgroundColor: Colors.secondary.mintTeal[20],
    borderRadius: 20,
    zIndex: 1,
  },
  section: {
    paddingHorizontal: Spacing.mobile.margin,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary.mutedPurple,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    color: Colors.primary.mintTeal,
    fontWeight: '600',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: (width - Spacing.mobile.margin * 2 - 12) / 2,
    backgroundColor: Colors.ui.surface,
    padding: 20,
    borderRadius: BorderRadius.card,
    alignItems: 'center',
    gap: 12,
    ...Shadows.small,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.ui.textPrimary,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.ui.surface,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    ...Shadows.small,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary.mintTeal,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.ui.textTertiary,
    textAlign: 'center',
  },
  logsContainer: {
    gap: 12,
  },
  logCard: {
    backgroundColor: Colors.ui.surface,
    padding: 16,
    borderRadius: BorderRadius.card,
    ...Shadows.small,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logDate: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.ui.textPrimary,
  },
  moodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  moodText: {
    fontSize: 14,
    color: Colors.ui.textSecondary,
  },
  logDetails: {
    gap: 4,
  },
  logDetail: {
    fontSize: 14,
    color: Colors.ui.textSecondary,
  },
  symptomsText: {
    fontSize: 14,
    color: Colors.functional.error,
  },
});