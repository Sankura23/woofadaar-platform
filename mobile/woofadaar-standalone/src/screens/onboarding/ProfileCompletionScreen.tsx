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
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { Colors, BorderRadius, Shadows, Spacing, Typography } from '../../theme/colors';
import { apiService } from '../../services/api';
import defaultApiService from '../../services/api';

const finalApiService = apiService || defaultApiService;

const { width, height } = Dimensions.get('window');

type ProfileCompletionScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ProfileCompletion'>;
};

export default function ProfileCompletionScreen({ navigation }: ProfileCompletionScreenProps) {
  const { onboardingData, updateProfileData } = useOnboarding();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const profileData = onboardingData.profileData;

  const handleUpdateProfileData = (field: string, value: string) => {
    updateProfileData({ [field]: value });
  };

  const pickImage = async () => {
    Alert.alert(
      'Add Profile Photo',
      'Choose how you want to add your photo',
      [
        { text: 'Camera', onPress: () => launchCamera() },
        { text: 'Gallery', onPress: () => launchGallery() },
        { text: 'Skip', style: 'cancel' },
      ]
    );
  };

  const launchCamera = async () => {
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
      setSelectedImage(result.assets[0].uri);
      uploadImage(result.assets[0].uri);
    }
  };

  const launchGallery = async () => {
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
      setSelectedImage(result.assets[0].uri);
      uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (imageUri: string) => {
    setImageLoading(true);
    try {
      const imageUrl = await finalApiService.uploadProfileImage(imageUri);
      updateProfileData({ profileImage: imageUrl });
      Alert.alert('Success', 'Photo uploaded successfully!');
    } catch (error: any) {
      console.error('Image upload error:', error);
      let errorMessage = 'Failed to upload image. Please try again.';

      if (error?.message?.toLowerCase().includes('timeout') ||
          error?.message?.toLowerCase().includes('network')) {
        errorMessage = 'Upload timed out. Please check your internet connection and try again.';
      }

      Alert.alert('Upload Failed', errorMessage);
      setSelectedImage(null);
    } finally {
      setImageLoading(false);
    }
  };

  const saveProfileToBackend = async () => {
    try {
      setIsLoading(true);

      // Prepare profile data for API
      const profileToSave = {
        location: profileData.location || '',
        experience_level: profileData.experienceLevel || 'beginner',
        preferred_language: profileData.language || 'English',
      };

      // Update user profile
      await finalApiService.updateUserProfile(profileToSave);
      return true;
    } catch (error) {
      console.error('Failed to save profile:', error);

      // Show error but allow continuing
      Alert.alert(
        'Couldn\'t Save Profile Info',
        'We couldn\'t save your profile information. You can update it later from Settings.',
        [
          {
            text: 'Try Again',
            onPress: () => saveProfileToBackend(),
          },
          {
            text: 'Continue Anyway',
            onPress: () => navigation.navigate('Preferences'),
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
      // Last step - save profile data before proceeding
      const saved = await saveProfileToBackend();
      if (saved) {
        navigation.navigate('Preferences');
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      navigation.navigate('DogSetup');
    }
  };

  const handleSkip = () => {
    navigation.navigate('Preferences');
  };

  const steps = [
    {
      question: "Tell us a bit about yourself!",
      subtitle: "Share your story as a dog parent - what made you fall in love with dogs?",
      placeholder: "e.g., I have always loved dogs since childhood. My journey with dogs began when...",
      field: 'bio',
      type: 'text-area',
      illustration: require('../../../assets/Purple Woofadaar Dog 1.png'),
    },
    {
      question: "Let's add your profile photo!",
      subtitle: "A photo helps other dog parents connect with you",
      field: 'profileImage',
      type: 'photo',
      optional: true,
      illustration: require('../../../assets/Orange Woofadaar Dog 2.png'),
    },
    {
      question: "How would you describe your experience with dogs?",
      field: 'experience',
      type: 'choice',
      choices: [
        { label: '🌱 First-time Dog Parent', subtitle: 'This is my first furry companion', value: 'beginner' },
        { label: '🌿 Some Experience', subtitle: 'I have had dogs before or grown up with them', value: 'intermediate' },
        { label: '🌳 Very Experienced', subtitle: 'I have been a dog parent for many years', value: 'experienced' },
        { label: '👨‍⚕️ Professional', subtitle: 'I am a trainer, vet, or work with dogs', value: 'professional' },
      ],
      illustration: require('../../../assets/Orange Woofadaar Dog 1.png'),
    },
    {
      question: "Where are you and your pup located?",
      subtitle: "This helps us connect you with local dog parents and events",
      field: 'location',
      type: 'choice',
      choices: [
        { label: 'Mumbai', value: 'Mumbai' },
        { label: 'Delhi', value: 'Delhi' },
        { label: 'Bangalore', value: 'Bangalore' },
        { label: 'Chennai', value: 'Chennai' },
        { label: 'Kolkata', value: 'Kolkata' },
        { label: 'Hyderabad', value: 'Hyderabad' },
        { label: 'Pune', value: 'Pune' },
        { label: 'Ahmedabad', value: 'Ahmedabad' },
        { label: 'Other City', value: 'Other' },
      ],
      illustration: require('../../../assets/Teal Woofadaar Dog 1.png'),
    },
    {
      question: "What topics interest you most?",
      subtitle: "This helps us personalize your feed with relevant content",
      placeholder: "e.g., Training tips, Health & nutrition, Grooming, Playdates",
      field: 'interests',
      type: 'text',
      illustration: require('../../../assets/Yellow Woofadaar Dog 1.png'),
    },
    {
      question: "Want to share your contact for emergency help?",
      subtitle: "Optional - for connecting with nearby dog parents in emergencies",
      placeholder: "Enter your phone number (optional)",
      field: 'phoneNumber',
      type: 'text',
      optional: true,
      illustration: require('../../../assets/Purple Woofadaar Dog 2.png'),
    },
  ];

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const canProceed = profileData[currentStepData.field as keyof typeof profileData] !== '' || currentStepData.optional;

  const renderInput = () => {
    if (currentStepData.type === 'photo') {
      return (
        <View style={styles.photoContainer}>
          <TouchableOpacity style={styles.photoUploadButton} onPress={pickImage}>
            {selectedImage || profileData.profileImage ? (
              <Image
                source={{ uri: selectedImage || profileData.profileImage }}
                style={styles.uploadedPhoto}
              />
            ) : (
              <View style={styles.photoPlaceholder}>
                <View style={styles.photoIconContainer}>
                  <Ionicons name="camera-outline" size={28} color={Colors.primary.mutedPurple} />
                </View>
                <Text style={styles.photoPlaceholderText}>Add Photo</Text>
              </View>
            )}
            {imageLoading && (
              <View style={styles.photoLoadingOverlay}>
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
                profileData[currentStepData.field as keyof typeof profileData] === choice.value && styles.choiceButtonSelected
              ]}
              onPress={() => handleUpdateProfileData(currentStepData.field, choice.value)}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.choiceText,
                profileData[currentStepData.field as keyof typeof profileData] === choice.value && styles.choiceTextSelected
              ]}>
                {choice.label}
              </Text>
              {choice.subtitle && (
                <Text style={[
                  styles.choiceSubtitle,
                  profileData[currentStepData.field as keyof typeof profileData] === choice.value && styles.choiceSubtitleSelected
                ]}>
                  {choice.subtitle}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    if (currentStepData.type === 'text-area') {
      return (
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.conversationInput, styles.textArea]}
            value={profileData[currentStepData.field as keyof typeof profileData]}
            onChangeText={(value) => handleUpdateProfileData(currentStepData.field, value)}
            placeholder={currentStepData.placeholder}
            placeholderTextColor={Colors.ui.textTertiary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            autoFocus
          />
        </View>
      );
    }

    return (
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.conversationInput}
          value={profileData[currentStepData.field as keyof typeof profileData]}
          onChangeText={(value) => handleUpdateProfileData(currentStepData.field, value)}
          placeholder={currentStepData.placeholder}
          placeholderTextColor={Colors.ui.textTertiary}
          autoCapitalize="words"
          autoFocus
          keyboardType={currentStepData.field === 'phoneNumber' ? 'phone-pad' : 'default'}
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
          {/* Back Button */}
          <View style={styles.backButtonContainer}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              activeOpacity={0.7}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          </View>

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
                <ActivityIndicator color={Colors.surface.white} />
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
              <Text style={styles.skipButtonText}>
                {currentStepData.optional ? 'Skip this question' : 'Skip this step'}
              </Text>
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
    fontWeight: Typography.fontWeights.medium,
  },
  illustrationContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  dogIllustration: {
    width: width * 0.35,
    height: width * 0.35,
  },
  questionContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  question: {
    fontSize: Typography.fontSizes.h5,
    fontWeight: Typography.fontWeights.bold,
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
    fontWeight: Typography.fontWeights.medium,
  },
  textArea: {
    height: 120,
    paddingTop: 16,
    textAlign: 'left',
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
    fontWeight: Typography.fontWeights.medium,
    color: Colors.ui.textPrimary,
    marginBottom: 4,
  },
  choiceTextSelected: {
    color: Colors.primary.mutedPurple,
    fontWeight: Typography.fontWeights.semiBold,
  },
  choiceSubtitle: {
    fontSize: Typography.fontSizes.caption,
    color: Colors.ui.textSecondary,
    textAlign: 'center',
  },
  choiceSubtitleSelected: {
    color: Colors.secondary.mutedPurple[80],
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
    fontWeight: Typography.fontWeights.bold,
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
    fontWeight: Typography.fontWeights.medium,
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
    fontWeight: Typography.fontWeights.medium,
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  photoUploadButton: {
    position: 'relative',
  },
  uploadedPhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: Colors.primary.mutedPurple,
  },
  photoPlaceholder: {
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
  photoIconContainer: {
    marginBottom: 8,
    opacity: 0.8,
  },
  photoPlaceholderText: {
    fontSize: Typography.fontSizes.caption,
    color: Colors.primary.mutedPurple,
    textAlign: 'center',
    fontWeight: Typography.fontWeights.semiBold,
  },
  photoLoadingOverlay: {
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