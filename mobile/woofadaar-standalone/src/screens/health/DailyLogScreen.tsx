import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import {
  HealthLog,
  MOOD_OPTIONS,
  EXERCISE_TYPES,
  FOOD_TYPES,
  FOOD_AMOUNT_OPTIONS,
  WATER_INTAKE_OPTIONS,
  WEATHER_OPTIONS,
  COMMON_SYMPTOMS
} from '../../types/health';
import { Dog } from '../../types/auth';
import { apiService } from '../../services/api';
import { Colors, BorderRadius, Shadows, Spacing, Typography } from '../../theme/colors';

type DailyLogScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Health'>;
};

export default function DailyLogScreen({ navigation }: DailyLogScreenProps) {
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [selectedDog, setSelectedDog] = useState<Dog | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingDogs, setLoadingDogs] = useState(true);
  
  const [healthLog, setHealthLog] = useState<HealthLog>({
    dogId: '',
    date: new Date().toISOString().split('T')[0],
    mood_score: 5,
    appetite_score: 5,
    energy_level: 5,
    exercise_minutes: 30,
    exercise_type: 'Walk',
    food_amount: 'Normal',
    food_type: 'Dry Kibble',
    water_intake: 'Normal',
    symptoms: [],
    notes: '',
    weather: 'Sunny',
  });

  useEffect(() => {
    loadDogs();
  }, []);

  const loadDogs = async () => {
    try {
      const dogsData = await apiService.getDogs();
      setDogs(dogsData);
      if (dogsData.length > 0) {
        setSelectedDog(dogsData[0]);
        setHealthLog(prev => ({ ...prev, dogId: dogsData[0].id }));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load dogs');
      console.error('Load dogs error:', error);
    } finally {
      setLoadingDogs(false);
    }
  };

  const updateHealthLog = (field: keyof HealthLog, value: any) => {
    setHealthLog(prev => ({ ...prev, [field]: value }));
  };

  const toggleSymptom = (symptom: string) => {
    setHealthLog(prev => ({
      ...prev,
      symptoms: prev.symptoms.includes(symptom)
        ? prev.symptoms.filter(s => s !== symptom)
        : [...prev.symptoms, symptom]
    }));
  };

  const handleSubmit = async () => {
    if (!selectedDog) {
      Alert.alert('Error', 'Please select a dog');
      return;
    }

    setIsLoading(true);
    try {
      await apiService.createHealthLog(healthLog);
      Alert.alert(
        'Success!',
        `Health log saved for ${selectedDog.name}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save health log');
      console.error('Create health log error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getMoodOption = (value: number) => MOOD_OPTIONS.find(m => m.value === value);

  if (loadingDogs) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary.mintTeal} />
          <Text style={styles.loadingText}>Loading dogs...</Text>
        </View>
      </View>
    );
  }

  if (dogs.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyStateContainer}>
          <Ionicons name="medical" size={80} color={Colors.ui.textTertiary} />
          <Text style={styles.emptyStateTitle}>No Dogs Found</Text>
          <Text style={styles.emptyStateText}>Add a dog first to start logging health data!</Text>
          <TouchableOpacity
            style={styles.addDogButton}
            onPress={() => navigation.navigate('AddDog')}
          >
            <Ionicons name="add" size={20} color={Colors.ui.surface} />
            <Text style={styles.addDogButtonText}>Add Dog</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.ui.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daily Health Log</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        <View style={styles.formContainer}>
            {/* Dog Selection */}
            <View style={styles.dogSelectionSection}>
              <Text style={styles.sectionTitle}>Select Dog</Text>
              <View style={styles.dogSelectionContainer}>
                {dogs.map((dog) => (
                  <TouchableOpacity
                    key={dog.id}
                    style={[
                      styles.dogSelectionCard,
                      selectedDog?.id === dog.id && styles.dogSelectionCardSelected
                    ]}
                    onPress={() => {
                      setSelectedDog(dog);
                      updateHealthLog('dogId', dog.id);
                    }}
                  >
                    {dog.imageUrl ? (
                      <Image source={{ uri: dog.imageUrl }} style={styles.dogSelectionAvatar} />
                    ) : (
                      <View style={styles.dogSelectionAvatarPlaceholder}>
                        <Text style={styles.dogSelectionAvatarText}>
                          {dog.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.dogSelectionInfo}>
                      <Text style={styles.dogSelectionName}>{dog.name}</Text>
                      <Text style={styles.dogSelectionBreed}>{dog.breed}</Text>
                    </View>
                    {selectedDog?.id === dog.id && (
                      <Ionicons name="checkmark-circle" size={24} color={Colors.primary.mintTeal} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Date */}
            <View style={styles.inputSection}>
              <Text style={styles.sectionTitle}>Log Date</Text>
              <View style={styles.dateContainer}>
                <Ionicons name="calendar" size={20} color={Colors.primary.mintTeal} />
                <TextInput
                  style={styles.dateInput}
                  value={healthLog.date}
                  onChangeText={(value) => updateHealthLog('date', value)}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={Colors.ui.textTertiary}
                />
              </View>
            </View>

            {/* Mood & Behavior Section */}
            <View style={styles.moodSection}>
              <Text style={styles.sectionTitle}>Mood & Behavior</Text>
              <Text style={styles.sectionSubtitle}>How is {selectedDog?.name || 'your dog'} feeling today?</Text>

              <View style={styles.moodGrid}>
                {MOOD_OPTIONS.map((mood) => (
                  <TouchableOpacity
                    key={mood.value}
                    style={[
                      styles.moodCard,
                      { backgroundColor: `${mood.color}20` },
                      healthLog.mood_score === mood.value && styles.moodCardSelected
                    ]}
                    onPress={() => updateHealthLog('mood_score', mood.value)}
                  >
                    <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                    <Text style={[styles.moodLabel, { color: mood.color }]}>{mood.label}</Text>
                    {healthLog.mood_score === mood.value && (
                      <View style={styles.selectedIndicator}>
                        <Ionicons name="checkmark-circle" size={20} color={mood.color} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <Ionicons name="restaurant" size={20} color={Colors.primary.burntOrange} />
                  <Text style={styles.metricTitle}>Appetite</Text>
                </View>
                <View style={styles.sliderContainer}>
                  <View style={styles.sliderLabels}>
                    <Text style={styles.sliderLabel}>Poor</Text>
                    <Text style={styles.sliderLabel}>Excellent</Text>
                  </View>
                  <View style={styles.scoreButtons}>
                    {[1, 2, 3, 4, 5].map((score) => (
                      <TouchableOpacity
                        key={score}
                        style={[
                          styles.scoreButton,
                          healthLog.appetite_score === score && styles.scoreButtonSelected
                        ]}
                        onPress={() => updateHealthLog('appetite_score', score)}
                      >
                        <Text style={[
                          styles.scoreButtonText,
                          healthLog.appetite_score === score && styles.scoreButtonTextSelected
                        ]}>{score}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <Ionicons name="flash" size={20} color={Colors.primary.warmYellow} />
                  <Text style={styles.metricTitle}>Energy</Text>
                </View>
                <View style={styles.sliderContainer}>
                  <View style={styles.sliderLabels}>
                    <Text style={styles.sliderLabel}>Low</Text>
                    <Text style={styles.sliderLabel}>High</Text>
                  </View>
                  <View style={styles.scoreButtons}>
                    {[1, 2, 3, 4, 5].map((score) => (
                      <TouchableOpacity
                        key={score}
                        style={[
                          styles.scoreButton,
                          healthLog.energy_level === score && styles.scoreButtonSelected
                        ]}
                        onPress={() => updateHealthLog('energy_level', score)}
                      >
                        <Text style={[
                          styles.scoreButtonText,
                          healthLog.energy_level === score && styles.scoreButtonTextSelected
                        ]}>{score}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </View>

            {/* Exercise Section */}
            <View style={styles.exerciseSection}>
              <Text style={styles.sectionTitle}>Exercise & Activity</Text>

              <View style={styles.exerciseContainer}>
                <View style={styles.exerciseMinutesCard}>
                  <View style={styles.exerciseHeader}>
                    <Ionicons name="walk" size={20} color={Colors.primary.mintTeal} />
                    <Text style={styles.exerciseTitle}>Exercise Duration</Text>
                  </View>
                  <View style={styles.minutesInputContainer}>
                    <TextInput
                      style={styles.minutesInput}
                      value={healthLog.exercise_minutes.toString()}
                      onChangeText={(value) => updateHealthLog('exercise_minutes', parseInt(value) || 0)}
                      keyboardType="numeric"
                      placeholder="30"
                      placeholderTextColor={Colors.ui.textTertiary}
                    />
                    <Text style={styles.minutesLabel}>minutes</Text>
                  </View>
                </View>

                <View style={styles.exerciseTypesCard}>
                  <Text style={styles.exerciseTypesTitle}>Activity Type</Text>
                  <View style={styles.exerciseTypesGrid}>
                    {EXERCISE_TYPES.map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.exerciseTypeButton,
                          healthLog.exercise_type === type && styles.exerciseTypeButtonSelected
                        ]}
                        onPress={() => updateHealthLog('exercise_type', type)}
                      >
                        <Text style={[
                          styles.exerciseTypeText,
                          healthLog.exercise_type === type && styles.exerciseTypeTextSelected
                        ]}>{type}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </View>

            {/* Food & Water */}
            <View style={styles.foodWaterSection}>
              <Text style={styles.sectionTitle}>Food & Water</Text>

              {/* Food Amount */}
              <View style={styles.foodCard}>
                <View style={styles.foodHeader}>
                  <Ionicons name="restaurant" size={20} color={Colors.primary.burntOrange} />
                  <Text style={styles.foodTitle}>Food Amount</Text>
                </View>
                <View style={styles.optionsGrid}>
                  {FOOD_AMOUNT_OPTIONS.map((amount) => (
                    <TouchableOpacity
                      key={amount}
                      style={[
                        styles.optionButton,
                        healthLog.food_amount === amount && styles.optionButtonSelected
                      ]}
                      onPress={() => updateHealthLog('food_amount', amount)}
                    >
                      <Text style={[
                        styles.optionText,
                        healthLog.food_amount === amount && styles.optionTextSelected
                      ]}>{amount}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Food Type */}
              <View style={styles.foodCard}>
                <View style={styles.foodHeader}>
                  <Ionicons name="nutrition" size={20} color={Colors.primary.burntOrange} />
                  <Text style={styles.foodTitle}>Food Type</Text>
                </View>
                <View style={styles.optionsGrid}>
                  {FOOD_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.optionButton,
                        healthLog.food_type === type && styles.optionButtonSelected
                      ]}
                      onPress={() => updateHealthLog('food_type', type)}
                    >
                      <Text style={[
                        styles.optionText,
                        healthLog.food_type === type && styles.optionTextSelected
                      ]}>{type}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Water Intake */}
              <View style={styles.foodCard}>
                <View style={styles.foodHeader}>
                  <Ionicons name="water" size={20} color={Colors.primary.coolBlue} />
                  <Text style={styles.foodTitle}>Water Intake</Text>
                </View>
                <View style={styles.optionsGrid}>
                  {WATER_INTAKE_OPTIONS.map((intake) => (
                    <TouchableOpacity
                      key={intake}
                      style={[
                        styles.optionButton,
                        healthLog.water_intake === intake && styles.optionButtonSelected
                      ]}
                      onPress={() => updateHealthLog('water_intake', intake)}
                    >
                      <Text style={[
                        styles.optionText,
                        healthLog.water_intake === intake && styles.optionTextSelected
                      ]}>{intake}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Symptoms Section */}
            <View style={styles.symptomsSection}>
              <View style={styles.symptomsHeader}>
                <Ionicons name="medical" size={20} color={Colors.functional.error} />
                <Text style={styles.sectionTitle}>Health Symptoms</Text>
              </View>
              <Text style={styles.sectionSubtitle}>Select any symptoms observed today (optional)</Text>

              <View style={styles.symptomsGrid}>
                {COMMON_SYMPTOMS.map((symptom) => (
                  <TouchableOpacity
                    key={symptom}
                    style={[
                      styles.symptomChip,
                      healthLog.symptoms.includes(symptom) && styles.symptomChipSelected
                    ]}
                    onPress={() => toggleSymptom(symptom)}
                  >
                    <Text style={[
                      styles.symptomChipText,
                      healthLog.symptoms.includes(symptom) && styles.symptomChipTextSelected
                    ]}>
                      {symptom}
                    </Text>
                    {healthLog.symptoms.includes(symptom) && (
                      <Ionicons name="checkmark" size={14} color={Colors.ui.surface} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Notes */}
            <View style={styles.notesSection}>
              <Text style={styles.sectionTitle}>Additional Notes</Text>
              <TextInput
                style={styles.notesInput}
                value={healthLog.notes}
                onChangeText={(value) => updateHealthLog('notes', value)}
                placeholder="Any additional observations, behaviors, or notes..."
                placeholderTextColor={Colors.ui.textTertiary}
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Weather */}
            <View style={styles.weatherSection}>
              <View style={styles.weatherHeader}>
                <Ionicons name="sunny" size={20} color={Colors.primary.warmYellow} />
                <Text style={styles.sectionTitle}>Weather</Text>
              </View>
              <View style={styles.weatherGrid}>
                {WEATHER_OPTIONS.map((weather) => (
                  <TouchableOpacity
                    key={weather}
                    style={[
                      styles.weatherButton,
                      healthLog.weather === weather && styles.weatherButtonSelected
                    ]}
                    onPress={() => updateHealthLog('weather', weather)}
                  >
                    <Text style={styles.weatherEmoji}>
                      {weather === 'Sunny' ? '☀️' :
                       weather === 'Cloudy' ? '☁️' :
                       weather === 'Rainy' ? '🌧️' :
                       weather === 'Snowy' ? '❄️' : '🌤️'}
                    </Text>
                    <Text style={[
                      styles.weatherText,
                      healthLog.weather === weather && styles.weatherTextSelected
                    ]}>{weather}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Submit Section */}
            <View style={styles.submitSection}>
              <TouchableOpacity
                style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={Colors.ui.surface} />
                ) : (
                  <Ionicons name="checkmark-circle" size={20} color={Colors.ui.surface} />
                )}
                <Text style={styles.submitButtonText}>
                  {isLoading ? 'Saving Log...' : 'Save Health Log'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.submitHint}>
                Your log will be saved and can be viewed in the health analytics section.
              </Text>
            </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.ui.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSizes.body1,
    color: Colors.ui.textSecondary,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.mobile.margin,
  },
  emptyStateTitle: {
    fontSize: Typography.fontSizes.h5,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.ui.textPrimary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyStateText: {
    fontSize: Typography.fontSizes.body1,
    color: Colors.ui.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  addDogButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary.mintTeal,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.button,
    gap: Spacing.sm,
  },
  addDogButtonText: {
    fontSize: Typography.fontSizes.body1,
    fontWeight: Typography.fontWeights.semiBold,
    color: Colors.ui.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.mobile.margin,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.ui.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.ui.divider,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.ui.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.fontSizes.h6,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.ui.textPrimary,
  },
  headerSpacer: {
    width: 40,
  },
  scrollContainer: {
    paddingBottom: 120,
  },
  formContainer: {
    paddingHorizontal: Spacing.mobile.margin,
    paddingTop: Spacing.lg,
    gap: Spacing.xl,
  },
  dogSelectionSection: {
    gap: Spacing.md,
  },
  dogSelectionContainer: {
    gap: Spacing.sm,
  },
  dogSelectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.ui.surface,
    borderRadius: BorderRadius.card,
    padding: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.ui.border,
    gap: Spacing.md,
    ...Shadows.small,
  },
  dogSelectionCardSelected: {
    borderColor: Colors.primary.mintTeal,
    backgroundColor: Colors.secondary.mintTeal[20],
  },
  dogSelectionAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  dogSelectionAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary.mintTeal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dogSelectionAvatarText: {
    fontSize: Typography.fontSizes.h6,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.ui.surface,
  },
  dogSelectionInfo: {
    flex: 1,
    gap: 2,
  },
  dogSelectionName: {
    fontSize: Typography.fontSizes.body1,
    fontWeight: Typography.fontWeights.semiBold,
    color: Colors.ui.textPrimary,
  },
  dogSelectionBreed: {
    fontSize: Typography.fontSizes.body2,
    color: Colors.ui.textSecondary,
  },
  inputSection: {
    gap: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.h6,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary.mutedPurple,
  },
  sectionSubtitle: {
    fontSize: Typography.fontSizes.body2,
    color: Colors.ui.textSecondary,
    marginTop: -Spacing.sm,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.ui.surface,
    borderRadius: BorderRadius.input,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.ui.border,
    gap: Spacing.sm,
    ...Shadows.small,
  },
  dateInput: {
    flex: 1,
    fontSize: Typography.fontSizes.body1,
    color: Colors.ui.textPrimary,
  },
  moodSection: {
    gap: Spacing.md,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  moodCard: {
    width: '30%',
    borderRadius: BorderRadius.card,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    ...Shadows.small,
  },
  moodCardSelected: {
    borderColor: Colors.primary.mintTeal,
  },
  moodEmoji: {
    fontSize: 24,
  },
  moodLabel: {
    fontSize: Typography.fontSizes.body2,
    fontWeight: Typography.fontWeights.medium,
    textAlign: 'center',
  },
  selectedIndicator: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
  },
  metricsRow: {
    gap: Spacing.md,
  },
  metricCard: {
    backgroundColor: Colors.ui.surface,
    borderRadius: BorderRadius.card,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadows.small,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  metricTitle: {
    fontSize: Typography.fontSizes.body1,
    fontWeight: Typography.fontWeights.semiBold,
    color: Colors.ui.textPrimary,
  },
  sliderContainer: {
    gap: Spacing.sm,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLabel: {
    fontSize: Typography.fontSizes.caption,
    color: Colors.ui.textTertiary,
  },
  scoreButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scoreButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.ui.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.ui.border,
  },
  scoreButtonSelected: {
    backgroundColor: Colors.primary.mintTeal,
    borderColor: Colors.primary.mintTeal,
  },
  scoreButtonText: {
    fontSize: Typography.fontSizes.body2,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.ui.textSecondary,
  },
  scoreButtonTextSelected: {
    color: Colors.ui.surface,
  },
  exerciseSection: {
    gap: Spacing.md,
  },
  exerciseContainer: {
    gap: Spacing.md,
  },
  exerciseMinutesCard: {
    backgroundColor: Colors.ui.surface,
    borderRadius: BorderRadius.card,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadows.small,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  exerciseTitle: {
    fontSize: Typography.fontSizes.body1,
    fontWeight: Typography.fontWeights.semiBold,
    color: Colors.ui.textPrimary,
  },
  minutesInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  minutesInput: {
    flex: 1,
    backgroundColor: Colors.ui.background,
    borderRadius: BorderRadius.input,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.fontSizes.h5,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.ui.textPrimary,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: Colors.ui.border,
  },
  minutesLabel: {
    fontSize: Typography.fontSizes.body1,
    color: Colors.ui.textSecondary,
  },
  exerciseTypesCard: {
    backgroundColor: Colors.ui.surface,
    borderRadius: BorderRadius.card,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadows.small,
  },
  exerciseTypesTitle: {
    fontSize: Typography.fontSizes.body1,
    fontWeight: Typography.fontWeights.semiBold,
    color: Colors.ui.textPrimary,
  },
  exerciseTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  exerciseTypeButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.buttonSmall,
    borderWidth: 1,
    borderColor: Colors.ui.border,
    backgroundColor: Colors.ui.background,
  },
  exerciseTypeButtonSelected: {
    backgroundColor: Colors.primary.mintTeal,
    borderColor: Colors.primary.mintTeal,
  },
  exerciseTypeText: {
    fontSize: Typography.fontSizes.body2,
    color: Colors.ui.textSecondary,
    fontWeight: Typography.fontWeights.medium,
  },
  exerciseTypeTextSelected: {
    color: Colors.ui.surface,
  },
  symptomsSection: {
    gap: Spacing.md,
  },
  symptomsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  symptomsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  symptomChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.buttonSmall,
    borderWidth: 1,
    borderColor: Colors.functional.error,
    backgroundColor: Colors.ui.surface,
    gap: 4,
  },
  symptomChipSelected: {
    backgroundColor: Colors.functional.error,
    borderColor: Colors.functional.error,
  },
  symptomChipText: {
    fontSize: Typography.fontSizes.body2,
    color: Colors.functional.error,
    fontWeight: Typography.fontWeights.medium,
  },
  symptomChipTextSelected: {
    color: Colors.ui.surface,
  },
  submitSection: {
    gap: Spacing.md,
    alignItems: 'center',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary.mintTeal,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.button,
    gap: Spacing.sm,
    minWidth: 200,
    ...Shadows.small,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.ui.textTertiary,
  },
  submitButtonText: {
    fontSize: Typography.fontSizes.body1,
    fontWeight: Typography.fontWeights.semiBold,
    color: Colors.ui.surface,
  },
  submitHint: {
    fontSize: Typography.fontSizes.body2,
    color: Colors.ui.textTertiary,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  // Food & Water Section Styles
  foodWaterSection: {
    gap: Spacing.lg,
  },
  foodCard: {
    backgroundColor: Colors.ui.surface,
    borderRadius: BorderRadius.card,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadows.small,
  },
  foodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  foodTitle: {
    fontSize: Typography.fontSizes.body1,
    fontWeight: Typography.fontWeights.semiBold,
    color: Colors.ui.textPrimary,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  optionButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.buttonSmall,
    borderWidth: 1,
    borderColor: Colors.ui.border,
    backgroundColor: Colors.ui.background,
    minWidth: 80,
    alignItems: 'center',
  },
  optionButtonSelected: {
    backgroundColor: Colors.primary.mintTeal,
    borderColor: Colors.primary.mintTeal,
  },
  optionText: {
    fontSize: Typography.fontSizes.body2,
    color: Colors.ui.textSecondary,
    fontWeight: Typography.fontWeights.medium,
    textAlign: 'center',
  },
  optionTextSelected: {
    color: Colors.ui.surface,
  },
  // Weather Section Styles
  weatherSection: {
    gap: Spacing.md,
  },
  weatherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  weatherGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  weatherButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.ui.surface,
    borderRadius: BorderRadius.card,
    padding: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.ui.border,
    minWidth: 80,
    gap: Spacing.xs,
    ...Shadows.small,
  },
  weatherButtonSelected: {
    borderColor: Colors.primary.warmYellow,
    backgroundColor: Colors.secondary.warmYellow[20],
  },
  weatherEmoji: {
    fontSize: 24,
  },
  weatherText: {
    fontSize: Typography.fontSizes.body2,
    color: Colors.ui.textSecondary,
    fontWeight: Typography.fontWeights.medium,
    textAlign: 'center',
  },
  weatherTextSelected: {
    color: Colors.primary.warmYellow,
    fontWeight: Typography.fontWeights.semiBold,
  },
  // Notes Section Styles
  notesSection: {
    gap: Spacing.md,
  },
  notesInput: {
    backgroundColor: Colors.ui.surface,
    borderRadius: BorderRadius.input,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.fontSizes.body1,
    color: Colors.ui.textPrimary,
    borderWidth: 1,
    borderColor: Colors.ui.border,
    minHeight: 100,
    textAlignVertical: 'top',
    ...Shadows.small,
  },
});