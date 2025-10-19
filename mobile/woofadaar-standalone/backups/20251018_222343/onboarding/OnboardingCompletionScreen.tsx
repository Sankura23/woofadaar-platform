import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { useAuth } from '../../contexts/AuthContext';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { Colors, BorderRadius, Shadows, Spacing, Typography } from '../../theme/colors';

const { width, height } = Dimensions.get('window');

type OnboardingCompletionScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'OnboardingCompletion'>;
};

export default function OnboardingCompletionScreen({ navigation }: OnboardingCompletionScreenProps) {
  const { completeOnboarding } = useAuth();
  const { saveOnboardingData, clearOnboardingData } = useOnboarding();

  const handleStartExploring = async () => {
    try {
      // Save all onboarding data to backend
      await saveOnboardingData();
      await completeOnboarding();
      clearOnboardingData(); // Clear local data after successful save
      navigation.navigate('Main');
    } catch (error) {
      console.error('Failed to save onboarding data:', error);
      // Still complete onboarding even if save fails
      await completeOnboarding();
      navigation.navigate('Main');
    }
  };

  const handleBack = () => {
    navigation.navigate('Preferences');
  };

  const handleJoinCommunity = async () => {
    try {
      // Save all onboarding data to backend
      await saveOnboardingData();
      await completeOnboarding();
      clearOnboardingData(); // Clear local data after successful save
      navigation.navigate('Main');
    } catch (error) {
      console.error('Failed to save onboarding data:', error);
      // Still complete onboarding even if save fails
      await completeOnboarding();
      navigation.navigate('Main');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
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

        {/* Success Illustration */}
        <View style={styles.illustrationContainer}>
          <View style={styles.multiDogContainer}>
            <Image
              source={require('../../../assets/Orange Woofadaar Dog 2.png')}
              style={[styles.dogIllustration, styles.leftDog]}
              resizeMode="contain"
            />
            <Image
              source={require('../../../assets/Teal Woofadaar Dog 2.png')}
              style={[styles.dogIllustration, styles.centerDog]}
              resizeMode="contain"
            />
            <Image
              source={require('../../../assets/Purple Woofadaar Dog 2.png')}
              style={[styles.dogIllustration, styles.rightDog]}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Success Content */}
        <View style={styles.textContainer}>
          <Text style={styles.successTitle}>Welcome to the Pack!</Text>
          <Text style={styles.successSubtitle}>
            Your Woofadaar profile is all set up! You're now part of a loving community of dog parents who share your passion.
          </Text>
        </View>

        {/* Features Preview */}
        <View style={styles.featuresContainer}>
          <View style={styles.feature}>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Connect with Dog Parents</Text>
              <Text style={styles.featureDescription}>Share experiences and get advice</Text>
            </View>
          </View>

          <View style={styles.feature}>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Expert Guidance</Text>
              <Text style={styles.featureDescription}>Access to vets and trainers</Text>
            </View>
          </View>

          <View style={styles.feature}>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Local Events</Text>
              <Text style={styles.featureDescription}>Find playdates and meetups nearby</Text>
            </View>
          </View>

          <View style={styles.feature}>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Community Support</Text>
              <Text style={styles.featureDescription}>24/7 help from fellow dog lovers</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleStartExploring}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Start Exploring</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleJoinCommunity}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>Join Community Discussions</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.ui.surface,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: Spacing.mobile.margin,
    paddingTop: 10,
    paddingBottom: 30,
  },
  illustrationContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  multiDogContainer: {
    position: 'relative',
    width: width * 0.7,
    height: height * 0.18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dogIllustration: {
    width: width * 0.2,
    height: width * 0.2,
    position: 'absolute',
  },
  leftDog: {
    left: 0,
    top: 20,
  },
  centerDog: {
    top: 0,
    zIndex: 2,
  },
  rightDog: {
    right: 0,
    top: 20,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  successTitle: {
    fontSize: Typography.fontSizes.h3,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary.mintTeal,
    textAlign: 'center',
    marginBottom: 16,
  },
  successSubtitle: {
    fontSize: Typography.fontSizes.body1,
    color: Colors.ui.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  featuresContainer: {
    backgroundColor: Colors.ui.surface,
    borderRadius: BorderRadius.card,
    padding: 16,
    ...Shadows.card,
    marginBottom: 24,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 16,
    width: 32,
    textAlign: 'center',
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: Typography.fontSizes.body1,
    fontWeight: Typography.fontWeights.semiBold,
    color: Colors.ui.textPrimary,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: Typography.fontSizes.caption,
    color: Colors.ui.textSecondary,
  },
  buttonContainer: {
    gap: 16,
  },
  primaryButton: {
    backgroundColor: Colors.primary.mintTeal,
    paddingVertical: 16,
    borderRadius: BorderRadius.button,
    alignItems: 'center',
    ...Shadows.small,
  },
  primaryButtonText: {
    color: Colors.ui.surface,
    fontSize: Typography.fontSizes.body1,
    fontWeight: Typography.fontWeights.bold,
  },
  secondaryButton: {
    backgroundColor: Colors.ui.background,
    paddingVertical: 16,
    borderRadius: BorderRadius.button,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primary.mintTeal,
  },
  secondaryButtonText: {
    color: Colors.primary.mintTeal,
    fontSize: Typography.fontSizes.body1,
    fontWeight: Typography.fontWeights.semiBold,
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
});