import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { Colors, BorderRadius, Shadows, Spacing, Typography } from '../../theme/colors';
import { apiService } from '../../services/api';

const createDogAPI = async (dogData: any) => {
  const authToken = await AsyncStorage.getItem('authToken');
  console.log('Token retrieved from storage:', authToken ? `${authToken.substring(0, 20)}...` : 'null');

  if (!authToken) {
    throw new Error('No authentication token found');
  }

  // Validate token format before sending
  if (authToken.length < 50) {
    console.error('Token appears to be malformed, length:', authToken.length);
    throw new Error('Invalid token format');
  }

  const response = await fetch('http://192.168.1.7:3000/api/dogs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify(dogData),
  });

  const responseText = await response.text();
  console.log('Dog creation response:', responseText);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}, body: ${responseText}`);
  }

  return JSON.parse(responseText);
};

const { width, height } = Dimensions.get('window');

type DogSetupScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'DogSetup'>;
};

export default function DogSetupScreen({ navigation }: DogSetupScreenProps) {
  const { onboardingData, updateDogData } = useOnboarding();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDogImage, setSelectedDogImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const dogData = onboardingData.dogData;

  // Parse existing age data for dropdowns
  const parseExistingAge = (ageString: string) => {
    if (!ageString) return { years: 0, months: 0 };

    const lowerAge = ageString.toLowerCase();
    let years = 0, months = 0;

    const yearMatch = lowerAge.match(/(\d+)\s*(year|yr)/);
    if (yearMatch) years = parseInt(yearMatch[1]);

    const monthMatch = lowerAge.match(/(\d+)\s*(month|mo)/);
    if (monthMatch) months = parseInt(monthMatch[1]);

    // If no keywords found, try to extract total months
    if (years === 0 && months === 0) {
      const totalMonths = parseInt(ageString) || 0;
      years = Math.floor(totalMonths / 12);
      months = totalMonths % 12;
    }

    return { years, months };
  };

  const currentAge = parseExistingAge(dogData.age || '');
  const [selectedYears, setSelectedYears] = useState(currentAge.years);
  const [selectedMonths, setSelectedMonths] = useState(currentAge.months);

  const handleUpdateDogData = (field: string, value: string) => {
    updateDogData({ [field]: value });
  };

  const pickDogImage = async () => {
    Alert.alert(
      'Add Dog Photo',
      'Choose how you want to add your dog\'s photo',
      [
        { text: 'Camera', onPress: () => launchDogCamera() },
        { text: 'Gallery', onPress: () => launchDogGallery() },
        { text: 'Skip', style: 'cancel' },
      ]
    );
  };

  const launchDogCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Sorry, we need camera permissions to take photos!');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedDogImage(result.assets[0].uri);
      uploadDogImage(result.assets[0].uri);
    }
  };

  const launchDogGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Sorry, we need photo library permissions!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedDogImage(result.assets[0].uri);
      uploadDogImage(result.assets[0].uri);
    }
  };

  const uploadDogImage = async (imageUri: string) => {
    setImageLoading(true);
    try {
      const imageUrl = await apiService.uploadProfileImage(imageUri);
      updateDogData({ photo: imageUrl });
      Alert.alert('Success', 'Dog photo uploaded successfully!');
    } catch (error: any) {
      console.error('Dog image upload error:', error);
      let errorMessage = 'Failed to upload image. Please try again.';

      if (error?.message?.toLowerCase().includes('timeout') ||
          error?.message?.toLowerCase().includes('network')) {
        errorMessage = 'Upload timed out. Please check your internet connection and try again.';
      }

      Alert.alert('Upload Failed', errorMessage);
      setSelectedDogImage(null);
    } finally {
      setImageLoading(false);
    }
  };

  const handleAgeUpdate = (years: number, months: number) => {
    setSelectedYears(years);
    setSelectedMonths(months);
    // Convert to total months for storage
    const totalMonths = years * 12 + months;
    const ageString = `${years} years, ${months} months`;
    updateDogData({ age: ageString });
  };

  const saveDogToBackend = async () => {
    try {
      setIsLoading(true);

      // Parse age from natural language to months
      const parseAgeToMonths = (ageString: string): number => {
        if (!ageString) return 0;

        const lowerAge = ageString.toLowerCase();
        let totalMonths = 0;

        // Extract years
        const yearMatch = lowerAge.match(/(\d+)\s*(year|yr)/);
        if (yearMatch) {
          totalMonths += parseInt(yearMatch[1]) * 12;
        }

        // Extract months
        const monthMatch = lowerAge.match(/(\d+)\s*(month|mo)/);
        if (monthMatch) {
          totalMonths += parseInt(monthMatch[1]);
        }

        // If no year/month keywords found, try to parse as a number
        if (totalMonths === 0) {
          const numericMatch = ageString.match(/(\d+)/);
          if (numericMatch) {
            // Assume it's years if > 24, otherwise months
            const num = parseInt(numericMatch[1]);
            totalMonths = num > 24 ? num : num * 12;
          }
        }

        return totalMonths;
      };

      // Prepare dog data for API
      const dogToSave = {
        name: dogData.name || '',
        breed: dogData.breed || '',
        age_months: parseAgeToMonths(dogData.age || ''),
        weight_kg: parseFloat(dogData.weight || '0'),
        gender: dogData.gender || 'male',
        personality_traits: dogData.personality?.split(',').map(t => t.trim()) || [],
        vaccination_status: 'unknown',
        spayed_neutered: false,
        location: '',
      };

      // Save to backend
      await createDogAPI(dogToSave);
      return true;
    } catch (error) {
      console.error('Failed to save dog:', error);

      // Show error but allow continuing
      Alert.alert(
        'Couldn\'t Save Dog Info',
        'We couldn\'t save your dog information. You can add it later from My Dogs.',
        [
          {
            text: 'Try Again',
            onPress: () => saveDogToBackend(),
          },
          {
            text: 'Continue Anyway',
            onPress: () => navigation.navigate('ProfileCompletion'),
            style: 'cancel',
          },
        ]
      );
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Last step - save dog data before proceeding
      const saved = await saveDogToBackend();
      if (saved) {
        navigation.navigate('ProfileCompletion');
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      navigation.navigate('Welcome');
    }
  };

  const handleSkip = () => {
    navigation.navigate('ProfileCompletion');
  };

  // Get personalized questions based on dog's name
  const getPersonalizedSteps = () => {
    const dogName = dogData.name || '';
    const hasDogName = dogName.trim() !== '';

    return [
      {
        question: "What's your furry friend's name?",
        placeholder: "Enter your dog's name",
        field: 'name',
        type: 'text',
        illustration: require('../../../assets/Teal Woofadaar Dog 1.png'),
      },
      {
        question: hasDogName ? `Let's add a photo of ${dogName}!` : "Let's add a photo of your dog!",
        subtitle: hasDogName ? `Show off adorable ${dogName} to the community` : "Show off your adorable pup to the community",
        field: 'photo',
        type: 'dog_photo',
        optional: true,
        illustration: require('../../../assets/Orange Woofadaar Dog 2.png'),
      },
      {
        question: hasDogName ? `What breed is ${dogName}?` : "What breed is your dog?",
        subtitle: "Don't worry if you're not sure - mixed breed is perfectly fine!",
        placeholder: "e.g., Golden Retriever, Mixed breed",
        field: 'breed',
        type: 'text',
        illustration: require('../../../assets/Orange Woofadaar Dog 1.png'),
      },
      {
        question: hasDogName ? `How old is ${dogName}?` : "How old is your pup?",
        subtitle: hasDogName ? `Select ${dogName}'s age for better health recommendations` : "Select your dog's age for better health recommendations",
        field: 'age',
        type: 'age_dropdown',
        illustration: require('../../../assets/Purple Woofadaar Dog 1.png'),
      },
      {
        question: hasDogName ? `Is ${dogName} a boy or girl?` : "Is your dog a boy or girl?",
        field: 'gender',
        type: 'choice',
        choices: [
          { label: 'Good Boy', value: 'male' },
          { label: 'Good Girl', value: 'female' },
        ],
        illustration: require('../../../assets/Yellow Woofadaar Dog 1.png'),
      },
      {
        question: hasDogName ? `What's ${dogName}'s weight?` : "What's their weight?",
        subtitle: hasDogName ? `This helps us give ${dogName} better health and nutrition advice` : "This helps us give better health and nutrition advice",
        placeholder: "e.g., 25 kg",
        field: 'weight',
        type: 'text',
        illustration: require('../../../assets/Teal Woofadaar Dog 2.png'),
      },
      {
        question: hasDogName ? `How would you describe ${dogName}'s personality?` : "How would you describe their personality?",
        field: 'personality',
        type: 'choice',
        choices: [
          { label: 'Friendly & Social', value: 'friendly' },
          { label: 'Energetic & Playful', value: 'energetic' },
          { label: 'Calm & Gentle', value: 'calm' },
          { label: 'Protective & Alert', value: 'protective' },
          { label: 'Shy & Reserved', value: 'shy' },
        ],
        illustration: require('../../../assets/Orange Woofadaar Dog 2.png'),
      },
    ];
  };

  const steps = getPersonalizedSteps();
  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  const canProceed = (() => {
    if (currentStepData.type === 'age_dropdown') {
      // For age dropdown, user can always proceed (defaults to 0 years, 0 months is valid)
      return true;
    }
    return dogData[currentStepData.field as keyof typeof dogData] !== '';
  })();

  const renderInput = () => {
    if (currentStepData.type === 'dog_photo') {
      return (
        <View style={styles.dogPhotoContainer}>
          <TouchableOpacity style={styles.dogPhotoUploadButton} onPress={pickDogImage}>
            {selectedDogImage || dogData.photo ? (
              <Image
                source={{ uri: selectedDogImage || dogData.photo }}
                style={styles.uploadedDogPhoto}
              />
            ) : (
              <View style={styles.dogPhotoPlaceholder}>
                <View style={styles.dogPhotoIconContainer}>
                  <Ionicons name="camera-outline" size={28} color={Colors.primary.mutedPurple} />
                </View>
                <Text style={styles.dogPhotoPlaceholderText}>Add Photo</Text>
              </View>
            )}
            {imageLoading && (
              <View style={styles.dogPhotoLoadingOverlay}>
                <ActivityIndicator color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>
        </View>
      );
    }

    if (currentStepData.type === 'choice') {
      return (
        <View style={styles.choicesContainer}>
          {currentStepData.choices?.map((choice, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.choiceButton,
                dogData[currentStepData.field as keyof typeof dogData] === choice.value && styles.choiceButtonSelected
              ]}
              onPress={() => handleUpdateDogData(currentStepData.field, choice.value)}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.choiceText,
                dogData[currentStepData.field as keyof typeof dogData] === choice.value && styles.choiceTextSelected
              ]}>
                {choice.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    if (currentStepData.type === 'age_dropdown') {
      return (
        <View style={styles.ageDropdownContainer}>
          <View style={styles.ageRow}>
            <View style={styles.ageDropdownGroup}>
              <Text style={styles.ageLabel}>Years</Text>
              <View style={styles.agePickerContainer}>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((year) => (
                  <TouchableOpacity
                    key={year}
                    style={[
                      styles.ageOption,
                      selectedYears === year && styles.ageOptionSelected
                    ]}
                    onPress={() => handleAgeUpdate(year, selectedMonths)}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.ageOptionText,
                      selectedYears === year && styles.ageOptionTextSelected
                    ]}>
                      {year}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.ageDropdownGroup}>
              <Text style={styles.ageLabel}>Months</Text>
              <View style={styles.agePickerContainer}>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((month) => (
                  <TouchableOpacity
                    key={month}
                    style={[
                      styles.ageOption,
                      selectedMonths === month && styles.ageOptionSelected
                    ]}
                    onPress={() => handleAgeUpdate(selectedYears, month)}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.ageOptionText,
                      selectedMonths === month && styles.ageOptionTextSelected
                    ]}>
                      {month}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.conversationInput}
          value={dogData[currentStepData.field as keyof typeof dogData]}
          onChangeText={(value) => handleUpdateDogData(currentStepData.field, value)}
          placeholder={currentStepData.placeholder}
          placeholderTextColor={Colors.ui.textTertiary}
          autoCapitalize="words"
          autoFocus
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back Button - Arrow Only */}
          {currentStep > 0 && (
            <TouchableOpacity
              style={styles.backArrowButton}
              onPress={handleBack}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.primary.mutedPurple} />
            </TouchableOpacity>
          )}

          {/* Progress */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${((currentStep + 1) / steps.length) * 100}%` }]} />
            </View>
            <Text style={styles.progressText}>{currentStep + 1} of {steps.length}</Text>
          </View>

          {/* Illustration */}
          <View style={styles.illustrationContainer}>
            <Image
              source={currentStepData.illustration}
              style={styles.dogIllustration}
              resizeMode="contain"
            />
          </View>

          {/* Question */}
          <View style={styles.questionContainer}>
            <Text style={styles.question}>{currentStepData.question}</Text>
            {currentStepData.subtitle && (
              <Text style={styles.subtitle}>{currentStepData.subtitle}</Text>
            )}
          </View>

          {/* Input */}
          <View style={styles.answerContainer}>
            {renderInput()}
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.primaryButton, (!canProceed || isLoading) && styles.primaryButtonDisabled]}
              onPress={handleNext}
              activeOpacity={0.8}
              disabled={!canProceed || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={[styles.primaryButtonText, !canProceed && styles.primaryButtonTextDisabled]}>
                  {isLastStep ? 'Continue' : 'Next'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              activeOpacity={0.7}
            >
              <Text style={styles.skipButtonText}>Skip this step</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.ui.surface,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: Spacing.mobile.margin,
    paddingTop: 20,
    paddingBottom: 40,
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: Colors.ui.background,
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: 4,
    backgroundColor: Colors.primary.mutedPurple,
    borderRadius: 2,
  },
  progressText: {
    fontSize: Typography.fontSizes.caption,
    color: Colors.ui.textTertiary,
    fontWeight: '500',
  },
  illustrationContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  dogIllustration: {
    width: width * 0.42, // 20% bigger
    height: width * 0.42, // 20% bigger
  },
  questionContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  question: {
    fontSize: Typography.fontSizes.h5,
    fontWeight: '700',
    color: Colors.primary.mutedPurple,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: Typography.fontSizes.body2,
    color: Colors.ui.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  answerContainer: {
    marginBottom: 40,
  },
  inputContainer: {
    marginBottom: 20,
  },
  conversationInput: {
    borderWidth: 2,
    borderColor: Colors.primary.mutedPurple,
    borderRadius: BorderRadius.input,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: Typography.fontSizes.body1,
    backgroundColor: Colors.ui.surface,
    color: Colors.ui.textPrimary,
    textAlign: 'center',
    fontWeight: '500',
  },
  choicesContainer: {
    gap: 12,
  },
  choiceButton: {
    backgroundColor: Colors.ui.background,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: BorderRadius.button,
    borderWidth: 2,
    borderColor: Colors.ui.border,
    alignItems: 'center',
  },
  choiceButtonSelected: {
    backgroundColor: Colors.secondary.mutedPurple[20],
    borderColor: Colors.primary.mutedPurple,
  },
  choiceText: {
    fontSize: Typography.fontSizes.body1,
    fontWeight: '500',
    color: Colors.ui.textPrimary,
  },
  choiceTextSelected: {
    color: Colors.primary.mutedPurple,
    fontWeight: '600',
  },
  buttonContainer: {
    gap: 16,
    marginTop: 'auto',
  },
  primaryButton: {
    backgroundColor: Colors.primary.mutedPurple,
    paddingVertical: 16,
    borderRadius: BorderRadius.button,
    alignItems: 'center',
    ...Shadows.small,
  },
  primaryButtonDisabled: {
    backgroundColor: Colors.ui.textDisabled,
  },
  primaryButtonText: {
    color: Colors.ui.surface,
    fontSize: Typography.fontSizes.body1,
    fontWeight: '700',
  },
  primaryButtonTextDisabled: {
    color: Colors.ui.textTertiary,
  },
  skipButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  skipButtonText: {
    color: Colors.ui.textTertiary,
    fontSize: Typography.fontSizes.body1,
    fontWeight: '500',
  },
  backButtonContainer: {
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    color: Colors.primary.mutedPurple,
    fontSize: Typography.fontSizes.body1,
    fontWeight: '500',
  },
  ageDropdownContainer: {
    marginBottom: 20,
  },
  ageRow: {
    flexDirection: 'row',
    gap: 20,
    justifyContent: 'center',
  },
  ageDropdownGroup: {
    flex: 1,
    alignItems: 'center',
  },
  ageLabel: {
    fontSize: Typography.fontSizes.body1,
    fontWeight: '600',
    color: Colors.primary.mutedPurple,
    marginBottom: 12,
    textAlign: 'center',
  },
  agePickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    maxHeight: 200,
  },
  ageOption: {
    minWidth: 40,
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.button,
    borderWidth: 2,
    borderColor: Colors.ui.border,
    backgroundColor: Colors.ui.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  ageOptionSelected: {
    backgroundColor: Colors.primary.mutedPurple,
    borderColor: Colors.primary.mutedPurple,
  },
  ageOptionText: {
    fontSize: Typography.fontSizes.body1,
    fontWeight: '500',
    color: Colors.ui.textPrimary,
  },
  ageOptionTextSelected: {
    color: Colors.ui.surface,
    fontWeight: '700',
  },
  dogPhotoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  dogPhotoUploadButton: {
    position: 'relative',
  },
  uploadedDogPhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: Colors.primary.mutedPurple,
  },
  dogPhotoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.secondary.mutedPurple[10],
    borderWidth: 2,
    borderColor: Colors.primary.mutedPurple,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dogPhotoIconContainer: {
    marginBottom: 8,
    opacity: 0.8,
  },
  dogPhotoPlaceholderText: {
    fontSize: Typography.fontSizes.caption,
    color: Colors.primary.mutedPurple,
    textAlign: 'center',
    fontWeight: Typography.fontWeights.semiBold,
  },
  dogPhotoLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
});