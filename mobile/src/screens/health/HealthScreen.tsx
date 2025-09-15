import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity 
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Dog, HealthLog } from '../../types/auth';
import { apiService } from '../../services/api';

type HealthScreenProps = {
  route: RouteProp<RootStackParamList, 'Health'>;
  navigation: NativeStackNavigationProp<RootStackParamList, 'Health'>;
};

export default function HealthScreen({ route, navigation }: HealthScreenProps) {
  const { dogId } = route.params || {};
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [recentLogs, setRecentLogs] = useState<HealthLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHealthData();
  }, [dogId]);

  const loadHealthData = async () => {
    try {
      const dogsData = await apiService.getDogs();
      setDogs(dogsData);
      
      if (dogId) {
        const logs = await apiService.getHealthLogs(dogId);
        setRecentLogs(logs.slice(0, 5)); // Show recent 5 logs
      }
    } catch (error) {
      console.error('Failed to load health data:', error);
    } finally {
      setLoading(false);
    }
  };

  const healthFeatures = [
    {
      title: '📝 Daily Log',
      description: 'Record mood, appetite, exercise, and symptoms',
      onPress: () => navigation.navigate('DailyLog' as any),
      color: '#2563eb'
    },
    {
      title: '📊 Health Analytics',
      description: 'View trends and patterns in health data',
      onPress: () => console.log('Analytics coming soon'),
      color: '#10b981'
    },
    {
      title: '💊 Medications',
      description: 'Track medications and set reminders',
      onPress: () => console.log('Medications coming soon'),
      color: '#8b5cf6'
    },
    {
      title: '🏥 Appointments',
      description: 'Schedule and manage vet appointments',
      onPress: () => console.log('Appointments coming soon'),
      color: '#f59e0b'
    },
    {
      title: '📋 Medical Records',
      description: 'Store and share medical documents',
      onPress: () => console.log('Records coming soon'),
      color: '#ef4444'
    },
    {
      title: '🆘 Emergency',
      description: 'Quick access to emergency info and contacts',
      onPress: () => console.log('Emergency coming soon'),
      color: '#dc2626'
    }
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text>Loading health data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Card>
          <CardHeader>
            <CardTitle>🏥 Health & Wellness Hub</CardTitle>
          </CardHeader>
          <CardContent>
            <Text style={styles.subtitle}>
              Complete health tracking for your furry family
            </Text>
          </CardContent>
        </Card>

        {dogs.length === 0 ? (
          <Card>
            <CardContent>
              <Text style={styles.emptyText}>
                No dogs found. Add a dog first to start health tracking!
              </Text>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => navigation.navigate('AddDog')}
              >
                <Text style={styles.addButtonText}>Add Dog</Text>
              </TouchableOpacity>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>📈 Quick Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{dogs.length}</Text>
                    <Text style={styles.statLabel}>Dogs</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{recentLogs.length}</Text>
                    <Text style={styles.statLabel}>Recent Logs</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>
                      {recentLogs.length > 0 ? 
                        Math.round(recentLogs.reduce((sum, log) => sum + log.mood_score, 0) / recentLogs.length) 
                        : 0}
                    </Text>
                    <Text style={styles.statLabel}>Avg Mood</Text>
                  </View>
                </View>
              </CardContent>
            </Card>

            {/* Health Features Grid */}
            <Text style={styles.sectionTitle}>Health Features</Text>
            <View style={styles.featuresGrid}>
              {healthFeatures.map((feature, index) => (
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

            {/* Recent Health Logs */}
            {recentLogs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>📝 Recent Health Logs</CardTitle>
                </CardHeader>
                <CardContent>
                  {recentLogs.map((log, index) => (
                    <View key={index} style={styles.logItem}>
                      <View style={styles.logHeader}>
                        <Text style={styles.logDate}>{log.date}</Text>
                        <Text style={styles.logMood}>Mood: {log.mood_score}/5</Text>
                      </View>
                      {log.symptoms.length > 0 && (
                        <Text style={styles.logSymptoms}>
                          Symptoms: {log.symptoms.join(', ')}
                        </Text>
                      )}
                      {log.notes && (
                        <Text style={styles.logNotes}>{log.notes}</Text>
                      )}
                    </View>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  addButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: 'center',
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  featuresGrid: {
    gap: 12,
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
  logItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  logDate: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  logMood: {
    fontSize: 14,
    color: '#2563eb',
  },
  logSymptoms: {
    fontSize: 14,
    color: '#ef4444',
    marginBottom: 2,
  },
  logNotes: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
});