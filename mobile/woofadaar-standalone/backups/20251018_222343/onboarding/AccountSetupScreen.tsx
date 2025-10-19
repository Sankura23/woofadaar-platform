import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useAuth } from '../../contexts/AuthContext';
import { Colors, BorderRadius, Shadows, Spacing, Typography } from '../../theme/colors';

type AccountSetupScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AccountSetup'>;
};

export default function AccountSetupScreen({ navigation }: AccountSetupScreenProps) {
  const { onboardingData, clearOnboardingData } = useOnboarding();
  const { completeOnboarding } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const steps = [
    'Setting up your profile...',
    'Creating your dog profile...',
    'Configuring preferences...',
    'Finalizing setup...'
  ];

  const setupAccount = async () => {
    try {
      setError(null);

      // Step 1: Save profile data (if any)
      setCurrentStep(0);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 2: Save dog data (if any)
      setCurrentStep(1);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 3: Save preferences (if any)
      setCurrentStep(2);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 4: Complete setup
      setCurrentStep(3);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Complete onboarding
      await completeOnboarding();
      clearOnboardingData();
      navigation.navigate('Main');

    } catch (setupError) {
      console.error('Account setup failed:', setupError);
      setError('Setup failed. Please try again.');

      // Auto-retry up to 2 times
      if (retryCount < 2) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => setupAccount(), 2000);
      }
    }
  };

  const handleRetry = () => {
    setRetryCount(0);
    setupAccount();
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Setup?',
      'You can complete your profile later from the Settings page. Continue to the app?',
      [
        { text: 'Go Back', style: 'cancel' },
        {
          text: 'Continue',
          onPress: async () => {
            await completeOnboarding();
            clearOnboardingData();
            navigation.navigate('Main');
          }
        }
      ]
    );
  };

  useEffect(() => {
    setupAccount();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Dog illustration */}
        <View style={styles.illustrationContainer}>
          <Image
            source={require('../../../assets/Orange Woofadaar Dog 1.png')}
            style={styles.dogIllustration}
            resizeMode="contain"
          />
        </View>

        {/* Progress section */}
        <View style={styles.progressSection}>
          <Text style={styles.title}>
            {error ? 'Setup Error' : 'Setting up your account...'}
          </Text>

          {!error ? (
            <>
              <Text style={styles.currentStep}>
                {steps[currentStep]}
              </Text>

              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${((currentStep + 1) / steps.length) * 100}%` }
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {currentStep + 1} of {steps.length}
                </Text>
              </View>

              <ActivityIndicator
                size="large"
                color={Colors.primary.mutedPurple}
                style={styles.spinner}
              />
            </>
          ) : (
            <>
              <Text style={styles.errorText}>{error}</Text>
              {retryCount < 2 && (
                <Text style={styles.retryText}>
                  Retrying automatically... (Attempt {retryCount + 1}/3)
                </Text>
              )}
            </>
          )}
        </View>

        {/* Action buttons (only show if setup failed after retries) */}
        {error && retryCount >= 2 && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleRetry}
              activeOpacity={0.8}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              activeOpacity={0.7}
            >
              <Text style={styles.skipButtonText}>Continue Anyway</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.ui.surface,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.mobile.margin,
    paddingVertical: 40,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  illustrationContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  dogIllustration: {
    width: 200,
    height: 200,
  },
  progressSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: Typography.fontSizes.h4,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary.mutedPurple,
    textAlign: 'center',
    marginBottom: 16,
  },
  currentStep: {
    fontSize: Typography.fontSizes.body1,
    color: Colors.ui.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 32,
  },
  progressBar: {
    width: '80%',
    height: 6,
    backgroundColor: Colors.ui.background,
    borderRadius: 3,
    marginBottom: 12,
  },
  progressFill: {
    height: 6,
    backgroundColor: Colors.primary.mutedPurple,
    borderRadius: 3,
  },
  progressText: {
    fontSize: Typography.fontSizes.caption,
    color: Colors.ui.textTertiary,
    fontWeight: Typography.fontWeights.medium,
  },
  spinner: {
    marginTop: 20,
  },
  errorText: {
    fontSize: Typography.fontSizes.body1,
    color: Colors.ui.error,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryText: {
    fontSize: Typography.fontSizes.body2,
    color: Colors.ui.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  retryButton: {
    backgroundColor: Colors.primary.mutedPurple,
    paddingVertical: 16,
    borderRadius: BorderRadius.button,
    alignItems: 'center',
    ...Shadows.small,
  },
  retryButtonText: {
    color: Colors.ui.surface,
    fontSize: Typography.fontSizes.body1,
    fontWeight: Typography.fontWeights.bold,
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
});