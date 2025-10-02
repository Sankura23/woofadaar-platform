import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { DogFormData, INDIAN_DOG_BREEDS, PERSONALITY_TRAITS, INDIAN_CITIES } from '../../types/dog';
import { apiService } from '../../services/api';
import ModalPicker from '../../components/ModalPicker';

type AddDogScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AddDog'>;
};


export default function AddDogScreen({ navigation }: AddDogScreenProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<DogFormData>({
    name: '',
    breed: '',
    age_months: 12,
    weight_kg: 10,
    gender: 'male',
    health_id: '',
    kennel_club_registration: '',
    vaccination_status: 'up_to_date',
    spayed_neutered: false,
    microchip_id: '',
    emergency_contact: '',
    emergency_phone: '',
    medical_notes: '',
    personality_traits: [],
    location: 'Mumbai',
    photo_url: '',
  });

  const updateFormData = (field: keyof DogFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const togglePersonalityTrait = (trait: string) => {
    setFormData(prev => ({
      ...prev,
      personality_traits: prev.personality_traits.includes(trait)
        ? prev.personality_traits.filter(t => t !== trait)
        : [...prev.personality_traits, trait]
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.breed) {
      Alert.alert('Error', 'Please fill in the required fields (Name and Breed)');
      return;
    }

    setIsLoading(true);
    try {
      const dogData = {
        ...formData,
        age: Math.floor(formData.age_months / 12), // Convert months to years for compatibility
        weight: formData.weight_kg,
      };

      await apiService.createDog(dogData);
      Alert.alert(
        'Success!',
        `${formData.name} has been added to your pack!`,
        [{ text: 'OK', onPress: () => navigation.navigate('Dogs') }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to create dog profile');
      console.error('Create dog error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Card>
          <CardHeader>
            <CardTitle>🐕 Add Your Dog</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Basic Information */}
            <Text style={styles.sectionTitle}>Basic Information</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(value) => updateFormData('name', value)}
                placeholder="Your dog's name"
                placeholderTextColor="#9ca3af"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Breed *</Text>
              <ModalPicker
                selectedValue={formData.breed}
                items={INDIAN_DOG_BREEDS.map(breed => ({ label: breed, value: breed }))}
                onValueChange={(value) => updateFormData('breed', value)}
                placeholder="Select breed"
              />
            </View>

            <View style={styles.row}>
              <View style={styles.halfInputContainer}>
                <Text style={styles.label}>Age (months)</Text>
                <TextInput
                  style={styles.input}
                  value={formData.age_months.toString()}
                  onChangeText={(value) => updateFormData('age_months', parseInt(value) || 0)}
                  placeholder="12"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.halfInputContainer}>
                <Text style={styles.label}>Weight (kg)</Text>
                <TextInput
                  style={styles.input}
                  value={formData.weight_kg.toString()}
                  onChangeText={(value) => updateFormData('weight_kg', parseFloat(value) || 0)}
                  placeholder="10"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Gender</Text>
              <ModalPicker
                selectedValue={formData.gender}
                items={[
                  { label: 'Male', value: 'male' },
                  { label: 'Female', value: 'female' }
                ]}
                onValueChange={(value) => updateFormData('gender', value)}
                placeholder="Select gender"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Location</Text>
              <ModalPicker
                selectedValue={formData.location}
                items={INDIAN_CITIES.map(city => ({ label: city, value: city }))}
                onValueChange={(value) => updateFormData('location', value)}
                placeholder="Select location"
              />
            </View>

            {/* Health Information */}
            <Text style={styles.sectionTitle}>Health Information</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Vaccination Status</Text>
              <ModalPicker
                selectedValue={formData.vaccination_status}
                items={[
                  { label: 'Up to Date', value: 'up_to_date' },
                  { label: 'Pending', value: 'pending' },
                  { label: 'Not Started', value: 'not_started' }
                ]}
                onValueChange={(value) => updateFormData('vaccination_status', value)}
                placeholder="Select status"
              />
            </View>

            <View style={styles.switchContainer}>
              <Text style={styles.label}>Spayed/Neutered</Text>
              <Switch
                value={formData.spayed_neutered}
                onValueChange={(value) => updateFormData('spayed_neutered', value)}
                trackColor={{ false: '#d1d5db', true: '#3bbca8' }}
                thumbColor={formData.spayed_neutered ? '#ffffff' : '#f4f3f4'}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Medical Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.medical_notes}
                onChangeText={(value) => updateFormData('medical_notes', value)}
                placeholder="Any medical conditions, allergies, or notes..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Emergency Contact */}
            <Text style={styles.sectionTitle}>Emergency Contact</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Emergency Contact Name</Text>
              <TextInput
                style={styles.input}
                value={formData.emergency_contact}
                onChangeText={(value) => updateFormData('emergency_contact', value)}
                placeholder="Contact person name"
                placeholderTextColor="#9ca3af"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Emergency Phone</Text>
              <TextInput
                style={styles.input}
                value={formData.emergency_phone}
                onChangeText={(value) => updateFormData('emergency_phone', value)}
                placeholder="+91 XXXXX XXXXX"
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
              />
            </View>

            {/* Personality Traits */}
            <Text style={styles.sectionTitle}>Personality Traits</Text>
            <Text style={styles.subtitle}>Select all that apply:</Text>

            <View style={styles.traitsContainer}>
              {PERSONALITY_TRAITS.map((trait) => (
                <TouchableOpacity
                  key={trait}
                  style={[
                    styles.traitButton,
                    formData.personality_traits.includes(trait) && styles.traitButtonSelected
                  ]}
                  onPress={() => togglePersonalityTrait(trait)}
                >
                  <Text style={[
                    styles.traitText,
                    formData.personality_traits.includes(trait) && styles.traitTextSelected
                  ]}>
                    {trait}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              <Text style={styles.submitButtonText}>
                {isLoading ? 'Adding Dog...' : 'Add Dog'}
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
  scrollContainer: {
    padding: 20,
    paddingBottom: 100,
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
    color: '#374151',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  traitsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  traitButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  traitButtonSelected: {
    backgroundColor: '#3bbca8',
    borderColor: '#3bbca8',
  },
  traitText: {
    fontSize: 14,
    color: '#374151',
  },
  traitTextSelected: {
    color: '#ffffff',
  },
  submitButton: {
    backgroundColor: '#3bbca8',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#3bbca8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});