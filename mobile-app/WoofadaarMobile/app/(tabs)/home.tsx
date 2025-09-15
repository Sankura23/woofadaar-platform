import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import { apiClient } from '../../src/services/api';

export default function HomeScreen() {
  const { user, token } = useAuthStore();
  const [dogs, setDogs] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [greetingAnimation] = useState(new Animated.Value(0));

  useEffect(() => {
    if (token) {
      apiClient.setToken(token);
      loadDogs();
    }

    // Animate greeting
    Animated.spring(greetingAnimation, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [token]);

  const loadDogs = async () => {
    try {
      const response = await apiClient.dogs.getAll();
      if (response.success && response.data) {
        setDogs(Array.isArray(response.data) ? response.data : (response.data as any)?.dogs || []);
      }
    } catch (error) {
      console.error('Error loading dogs:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDogs();
    setRefreshing(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Animated.View
            style={[
              styles.greetingContainer,
              {
                transform: [
                  {
                    translateY: greetingAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0],
                    }),
                  },
                ],
                opacity: greetingAnimation,
              },
            ]}
          >
            <Text style={styles.greeting}>
              {getGreeting()}, {user?.name || 'Dog Parent'}! 👋
            </Text>
            <Text style={styles.subtitle}>Welcome to Woofadaar</Text>
          </Animated.View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/modals/camera')}
            >
              <Ionicons name="camera" size={24} color="#f97316" />
              <Text style={styles.actionText}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/health')}
            >
              <Ionicons name="add-circle" size={24} color="#f97316" />
              <Text style={styles.actionText}>Log Health</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/community')}
            >
              <Ionicons name="chatbubbles" size={24} color="#f97316" />
              <Text style={styles.actionText}>Ask Community</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/dogs')}
            >
              <Ionicons name="paw" size={24} color="#f97316" />
              <Text style={styles.actionText}>My Dogs</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Health Reminders */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Reminders</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.reminderCard}>
            <View style={styles.reminderIcon}>
              <Ionicons name="medical" size={20} color="#fff" />
            </View>
            <View style={styles.reminderContent}>
              <Text style={styles.reminderTitle}>Vaccination Due</Text>
              <Text style={styles.reminderSubtitle}>Annual booster for Max</Text>
            </View>
            <TouchableOpacity style={styles.reminderAction}>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          <View style={styles.reminderCard}>
            <View style={[styles.reminderIcon, { backgroundColor: '#10b981' }]}>
              <Ionicons name="restaurant" size={20} color="#fff" />
            </View>
            <View style={styles.reminderContent}>
              <Text style={styles.reminderTitle}>Feeding Time</Text>
              <Text style={styles.reminderSubtitle}>Evening meal in 2 hours</Text>
            </View>
            <TouchableOpacity style={styles.reminderAction}>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        </View>

        {/* My Dogs Summary */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Dogs ({dogs.length})</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/dogs')}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>

          {dogs.length === 0 ? (
            <TouchableOpacity 
              style={styles.emptyState}
              onPress={() => router.push('/(tabs)/dogs')}
            >
              <Ionicons name="paw" size={48} color="#d1d5db" />
              <Text style={styles.emptyTitle}>No dogs added yet</Text>
              <Text style={styles.emptySubtitle}>Tap to add your first furry friend!</Text>
            </TouchableOpacity>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {dogs.slice(0, 3).map((dog: any) => (
                <View key={dog.id} style={styles.dogCard}>
                  {dog.photoUrl ? (
                    <Image source={{ uri: dog.photoUrl }} style={styles.dogImage} />
                  ) : (
                    <View style={styles.dogPlaceholder}>
                      <Ionicons name="paw" size={32} color="#f97316" />
                    </View>
                  )}
                  <Text style={styles.dogName}>{dog.name}</Text>
                  <Text style={styles.dogBreed}>{dog.breed}</Text>
                  <View style={styles.dogStats}>
                    <Text style={styles.dogAge}>{dog.age}y</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          
          <View style={styles.activityCard}>
            <View style={styles.activityIcon}>
              <Ionicons name="camera" size={16} color="#f97316" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Photo uploaded</Text>
              <Text style={styles.activityTime}>2 hours ago</Text>
            </View>
          </View>

          <View style={styles.activityCard}>
            <View style={styles.activityIcon}>
              <Ionicons name="medical" size={16} color="#10b981" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Health log updated</Text>
              <Text style={styles.activityTime}>1 day ago</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fef8e8',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#f97316',
    padding: 24,
    paddingBottom: 32,
  },
  greetingContainer: {
    alignItems: 'center',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    marginTop: 4,
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  seeAll: {
    fontSize: 16,
    color: '#f97316',
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    width: '48%',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 8,
  },
  reminderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  reminderIcon: {
    backgroundColor: '#f97316',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reminderContent: {
    flex: 1,
    marginLeft: 16,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  reminderSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  reminderAction: {
    padding: 4,
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'center',
  },
  dogCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginRight: 16,
    width: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  dogImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  dogPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fef8e8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dogName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 12,
  },
  dogBreed: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  dogStats: {
    marginTop: 8,
  },
  dogAge: {
    fontSize: 12,
    color: '#f97316',
    fontWeight: '600',
  },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  activityIcon: {
    backgroundColor: '#fef8e8',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: {
    marginLeft: 12,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  activityTime: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
});