import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HealthLog } from '../../types/auth';
import { apiService } from '../../services/api';
import { Colors, BorderRadius, Shadows, Spacing } from '../../theme/colors';

type HealthLogsScreenProps = {
  route: RouteProp<any, 'HealthLogs'>;
  navigation: NativeStackNavigationProp<any, 'HealthLogs'>;
};

export default function HealthLogsScreen({ route, navigation }: HealthLogsScreenProps) {
  const { dogId } = route.params || {};
  const [healthLogs, setHealthLogs] = useState<HealthLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHealthLogs();
  }, [dogId]);

  const loadHealthLogs = async () => {
    try {
      setLoading(true);
      const logs = await apiService.getHealthLogs(dogId);
      const validLogs = Array.isArray(logs) ? logs : [];
      setHealthLogs(validLogs);
    } catch (error) {
      console.error('Failed to load health logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMoodEmoji = (mood: number) => {
    if (mood >= 8) return '😄';
    if (mood >= 6) return '😊';
    if (mood >= 4) return '😐';
    if (mood >= 2) return '😟';
    return '😔';
  };

  const getEnergyIcon = (energy: number) => {
    if (energy >= 8) return 'battery-full';
    if (energy >= 6) return 'battery-three-quarters';
    if (energy >= 4) return 'battery-half';
    if (energy >= 2) return 'battery-quarter';
    return 'battery-empty';
  };

  const renderLogItem = ({ item }: { item: HealthLog }) => (
    <TouchableOpacity style={styles.logCard}>
      <View style={styles.logHeader}>
        <Text style={styles.logDate}>
          {new Date(item.date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </Text>
        <Text style={styles.logTime}>
          {new Date(item.date).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Mood</Text>
          <View style={styles.metricValue}>
            <Text style={styles.emoji}>{getMoodEmoji(item.mood_score)}</Text>
            <Text style={styles.score}>{item.mood_score}/10</Text>
          </View>
        </View>

        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Energy</Text>
          <View style={styles.metricValue}>
            <Ionicons
              name={getEnergyIcon(item.energy_level) as any}
              size={24}
              color={item.energy_level >= 6 ? Colors.functional.success : Colors.ui.textSecondary}
            />
            <Text style={styles.score}>{item.energy_level}/10</Text>
          </View>
        </View>

        {item.exercise_minutes > 0 && (
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Exercise</Text>
            <View style={styles.metricValue}>
              <Ionicons name="walk" size={24} color={Colors.primary.mintTeal} />
              <Text style={styles.score}>{item.exercise_minutes} min</Text>
            </View>
          </View>
        )}
      </View>

      {item.notes && (
        <View style={styles.notesSection}>
          <Text style={styles.notesLabel}>Notes:</Text>
          <Text style={styles.notesText}>{item.notes}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={Colors.ui.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Health Logs</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary.mintTeal} />
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
        <Text style={styles.headerTitle}>Health Logs</Text>
        <TouchableOpacity onPress={() => navigation.navigate('DailyLog', { dogId })}>
          <Ionicons name="add-circle-outline" size={24} color={Colors.primary.mintTeal} />
        </TouchableOpacity>
      </View>

      {healthLogs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="clipboard-outline" size={64} color={Colors.ui.textTertiary} />
          <Text style={styles.emptyText}>No health logs yet</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('DailyLog', { dogId })}
          >
            <Text style={styles.addButtonText}>Add First Log</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={healthLogs}
          renderItem={renderLogItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: Spacing.mobile.margin,
  },
  logCard: {
    backgroundColor: Colors.ui.surface,
    borderRadius: BorderRadius.card,
    padding: 16,
    marginBottom: 12,
    ...Shadows.small,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  logDate: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.ui.textPrimary,
  },
  logTime: {
    fontSize: 14,
    color: Colors.ui.textSecondary,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  metric: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.ui.textSecondary,
    marginBottom: 4,
  },
  metricValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emoji: {
    fontSize: 24,
  },
  score: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.ui.textPrimary,
  },
  notesSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.ui.border,
    paddingTop: 12,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.ui.textSecondary,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: Colors.ui.textPrimary,
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: Colors.ui.textSecondary,
    marginTop: 16,
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: Colors.primary.mintTeal,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: BorderRadius.button,
  },
  addButtonText: {
    color: Colors.neutral.milkWhite,
    fontSize: 16,
    fontWeight: '600',
  },
});