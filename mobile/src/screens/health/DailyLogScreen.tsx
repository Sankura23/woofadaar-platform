import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
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
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text>Loading dogs...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (dogs.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No dogs found. Add a dog first!</Text>
          <TouchableOpacity 
            style={styles.button}
            onPress={() => navigation.navigate('AddDog')}
          >
            <Text style={styles.buttonText}>Add Dog</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Card>
          <CardHeader>
            <CardTitle>🏥 Daily Health Log</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Dog Selection */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Select Dog</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedDog?.id || ''}
                  onValueChange={(dogId) => {
                    const dog = dogs.find(d => d.id === dogId);
                    setSelectedDog(dog || null);
                    updateHealthLog('dogId', dogId);
                  }}
                  style={styles.picker}
                >
                  {dogs.map((dog) => (
                    <Picker.Item key={dog.id} label={`${dog.name} (${dog.breed})`} value={dog.id} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Date */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Date</Text>
              <TextInput
                style={styles.input}
                value={healthLog.date}
                onChangeText={(value) => updateHealthLog('date', value)}
                placeholder="YYYY-MM-DD"
              />
            </View>

            {/* Mood Score */}
            <Text style={styles.sectionTitle}>Mood & Behavior</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Mood Score</Text>
              <View style={styles.scoreContainer}>
                {MOOD_OPTIONS.map((mood) => (
                  <TouchableOpacity
                    key={mood.value}
                    style={[
                      styles.scoreButton,
                      { backgroundColor: mood.color },
                      healthLog.mood_score === mood.value && styles.scoreButtonSelected
                    ]}
                    onPress={() => updateHealthLog('mood_score', mood.value)}
                  >
                    <Text style={styles.scoreEmoji}>{mood.emoji}</Text>
                    <Text style={styles.scoreLabel}>{mood.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.halfInputContainer}>
                <Text style={styles.label}>Appetite (1-5)</Text>
                <TextInput
                  style={styles.input}
                  value={healthLog.appetite_score.toString()}
                  onChangeText={(value) => updateHealthLog('appetite_score', parseInt(value) || 1)}
                  keyboardType="numeric"
                  placeholder="5"
                />
              </View>

              <View style={styles.halfInputContainer}>
                <Text style={styles.label}>Energy Level (1-5)</Text>
                <TextInput
                  style={styles.input}
                  value={healthLog.energy_level.toString()}
                  onChangeText={(value) => updateHealthLog('energy_level', parseInt(value) || 1)}
                  keyboardType="numeric"
                  placeholder="5"
                />
              </View>
            </View>

            {/* Exercise */}
            <Text style={styles.sectionTitle}>Exercise & Activity</Text>
            
            <View style={styles.row}>
              <View style={styles.halfInputContainer}>
                <Text style={styles.label}>Exercise Minutes</Text>
                <TextInput
                  style={styles.input}
                  value={healthLog.exercise_minutes.toString()}
                  onChangeText={(value) => updateHealthLog('exercise_minutes', parseInt(value) || 0)}
                  keyboardType="numeric"
                  placeholder="30"
                />
              </View>

              <View style={styles.halfInputContainer}>
                <Text style={styles.label}>Exercise Type</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={healthLog.exercise_type}
                    onValueChange={(value) => updateHealthLog('exercise_type', value)}
                    style={styles.picker}
                  >
                    {EXERCISE_TYPES.map((type) => (
                      <Picker.Item key={type} label={type} value={type} />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>

            {/* Food & Water */}
            <Text style={styles.sectionTitle}>Food & Water</Text>
            
            <View style={styles.row}>
              <View style={styles.halfInputContainer}>
                <Text style={styles.label}>Food Amount</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={healthLog.food_amount}
                    onValueChange={(value) => updateHealthLog('food_amount', value)}
                    style={styles.picker}
                  >
                    {FOOD_AMOUNT_OPTIONS.map((amount) => (
                      <Picker.Item key={amount} label={amount} value={amount} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.halfInputContainer}>
                <Text style={styles.label}>Food Type</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={healthLog.food_type}
                    onValueChange={(value) => updateHealthLog('food_type', value)}
                    style={styles.picker}
                  >
                    {FOOD_TYPES.map((type) => (
                      <Picker.Item key={type} label={type} value={type} />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Water Intake</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={healthLog.water_intake}
                  onValueChange={(value) => updateHealthLog('water_intake', value)}
                  style={styles.picker}
                >
                  {WATER_INTAKE_OPTIONS.map((intake) => (
                    <Picker.Item key={intake} label={intake} value={intake} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Symptoms */}
            <Text style={styles.sectionTitle}>Symptoms (if any)</Text>
            <Text style={styles.subtitle}>Select all that apply:</Text>
            
            <View style={styles.symptomsContainer}>
              {COMMON_SYMPTOMS.map((symptom) => (
                <TouchableOpacity
                  key={symptom}
                  style={[
                    styles.symptomButton,
                    healthLog.symptoms.includes(symptom) && styles.symptomButtonSelected
                  ]}
                  onPress={() => toggleSymptom(symptom)}
                >
                  <Text style={[
                    styles.symptomText,
                    healthLog.symptoms.includes(symptom) && styles.symptomTextSelected
                  ]}>
                    {symptom}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Notes */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={healthLog.notes}
                onChangeText={(value) => updateHealthLog('notes', value)}
                placeholder="Any additional observations, behaviors, or notes..."
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Weather */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Weather</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={healthLog.weather}
                  onValueChange={(value) => updateHealthLog('weather', value)}
                  style={styles.picker}
                >
                  {WEATHER_OPTIONS.map((weather) => (
                    <Picker.Item key={weather} label={weather} value={weather} />
                  ))}
                </Picker>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              <Text style={styles.submitButtonText}>
                {isLoading ? 'Saving...' : 'Save Health Log'}
              </Text>
            </TouchableOpacity>
          </CardContent>
        </Card>
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
    padding: 20,
  },
  scrollContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 20,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  inputContainer: {
    marginBottom: 16,
  },
  halfInputContainer: {
    flex: 1,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
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
  scoreContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  scoreButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 60,
  },
  scoreButtonSelected: {
    borderWidth: 3,
    borderColor: '#1f2937',
  },
  scoreEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  scoreLabel: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  symptomsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  symptomButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ef4444',
    backgroundColor: '#ffffff',
  },
  symptomButtonSelected: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  symptomText: {
    fontSize: 14,
    color: '#ef4444',
  },
  symptomTextSelected: {
    color: '#ffffff',
  },
  submitButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 18,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});