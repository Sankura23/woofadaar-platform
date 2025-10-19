import React, { useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  Dimensions,
  Switch,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { Colors, BorderRadius, Shadows, Spacing, Typography } from '../../theme/colors';

const { width, height } = Dimensions.get('window');

type PreferencesScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Preferences'>;
};

export default function PreferencesScreen({ navigation }: PreferencesScreenProps) {
  const { onboardingData, updatePreferences } = useOnboarding();
  const preferences = onboardingData.preferences;

  const updatePreference = useCallback((section: string, key: string, value: boolean) => {
    const sectionData = preferences[section as keyof typeof preferences];
    if (sectionData[key] === value) return; // Prevent unnecessary updates

    updatePreferences({
      ...preferences,
      [section]: {
        ...sectionData,
        [key]: value,
      },
    });
  }, [preferences, updatePreferences]);

  const handleComplete = () => {
    navigation.navigate('AccountSetup');
  };

  const handleBack = () => {
    navigation.navigate('ProfileCompletion');
  };

  const handleSkip = () => {
    navigation.navigate('AccountSetup');
  };

  const PreferenceItem = memo(({
    title,
    description,
    value,
    onValueChange
  }: {
    title: string;
    description: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
  }) => (
    <View style={styles.preferenceItem}>
      <View style={styles.preferenceText}>
        <Text style={styles.preferenceTitle}>{title}</Text>
        <Text style={styles.preferenceDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: Colors.ui.background, true: Colors.primary.mutedPurple }}
        thumbColor={value ? Colors.ui.surface : Colors.ui.textTertiary}
        ios_backgroundColor={Colors.ui.background}
      />
    </View>
  ));

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

        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.illustrationContainer}>
            <Image
              source={require('../../../assets/Yellow Woofadaar Dog 1.png')}
              style={styles.dogIllustration}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>Customize your experience</Text>
          <Text style={styles.subtitle}>
            Set your preferences to get the most relevant content and notifications.
          </Text>
        </View>

        {/* Preferences Sections */}
        <View style={styles.sectionsContainer}>
          {/* Notifications */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notifications</Text>
            <PreferenceItem
              key="notifications-community"
              title="Community Updates"
              description="New posts, replies, and community activities"
              value={preferences.notifications.community}
              onValueChange={(value) => updatePreference('notifications', 'community', value)}
            />
            <PreferenceItem
              key="notifications-health"
              title="Health & Wellness"
              description="Health tips, vaccination reminders, vet advice"
              value={preferences.notifications.health}
              onValueChange={(value) => updatePreference('notifications', 'health', value)}
            />
            <PreferenceItem
              key="notifications-training"
              title="Training Tips"
              description="Weekly training guides and behavioral tips"
              value={preferences.notifications.training}
              onValueChange={(value) => updatePreference('notifications', 'training', value)}
            />
            <PreferenceItem
              key="notifications-social"
              title="Social Activities"
              description="Local meetups, events, and playdates"
              value={preferences.notifications.social}
              onValueChange={(value) => updatePreference('notifications', 'social', value)}
            />
            <PreferenceItem
              key="notifications-emergency"
              title="Emergency Alerts"
              description="Lost pet alerts and urgent community help"
              value={preferences.notifications.emergency}
              onValueChange={(value) => updatePreference('notifications', 'emergency', value)}
            />
          </View>

          {/* Privacy */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Privacy</Text>
            <PreferenceItem
              key="privacy-visibility"
              title="Profile Visibility"
              description="Make your profile visible to other dog parents"
              value={preferences.privacy.profileVisibility}
              onValueChange={(value) => updatePreference('privacy', 'profileVisibility', value)}
            />
            <PreferenceItem
              key="privacy-contact"
              title="Contact Information"
              description="Allow others to see your contact details"
              value={preferences.privacy.contactSharing}
              onValueChange={(value) => updatePreference('privacy', 'contactSharing', value)}
            />
            <PreferenceItem
              key="privacy-location"
              title="Location Sharing"
              description="Show your city to connect with local dog parents"
              value={preferences.privacy.locationSharing}
              onValueChange={(value) => updatePreference('privacy', 'locationSharing', value)}
            />
          </View>

          {/* Content */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Content Preferences</Text>
            <PreferenceItem
              key="content-expert"
              title="Expert Advice"
              description="Articles and tips from veterinarians and trainers"
              value={preferences.content.expertAdvice}
              onValueChange={(value) => updatePreference('content', 'expertAdvice', value)}
            />
            <PreferenceItem
              key="content-community"
              title="Community Posts"
              description="Stories, photos, and experiences from other parents"
              value={preferences.content.communityPosts}
              onValueChange={(value) => updatePreference('content', 'communityPosts', value)}
            />
            <PreferenceItem
              key="content-events"
              title="Local Events"
              description="Dog-friendly events and activities in your area"
              value={preferences.content.localEvents}
              onValueChange={(value) => updatePreference('content', 'localEvents', value)}
            />
            <PreferenceItem
              key="content-products"
              title="Product Recommendations"
              description="Suggested products and services for your dog"
              value={preferences.content.productRecommendations}
              onValueChange={(value) => updatePreference('content', 'productRecommendations', value)}
            />
          </View>
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '100%' }]} />
          </View>
          <Text style={styles.progressText}>Step 3 of 3</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleComplete}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Complete Setup</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            activeOpacity={0.7}
          >
            <Text style={styles.skipButtonText}>Use default settings</Text>
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
    paddingTop: 20,
    paddingBottom: 40,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  illustrationContainer: {
    marginBottom: 20,
  },
  dogIllustration: {
    width: width * 0.35,
    height: width * 0.35,
  },
  title: {
    fontSize: Typography.fontSizes.h4,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary.mutedPurple,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: Typography.fontSizes.body1,
    color: Colors.ui.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  sectionsContainer: {
    marginBottom: 24,
  },
  section: {
    backgroundColor: Colors.ui.surface,
    borderRadius: BorderRadius.card,
    padding: 20,
    ...Shadows.card,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.h6,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary.mutedPurple,
    marginBottom: 16,
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.ui.divider,
  },
  preferenceText: {
    flex: 1,
    marginRight: 16,
  },
  preferenceTitle: {
    fontSize: Typography.fontSizes.body1,
    fontWeight: Typography.fontWeights.semiBold,
    color: Colors.ui.textPrimary,
    marginBottom: 4,
  },
  preferenceDescription: {
    fontSize: Typography.fontSizes.caption,
    color: Colors.ui.textSecondary,
    lineHeight: 16,
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: 32,
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
    backgroundColor: Colors.primary.mintTeal,
    borderRadius: 2,
  },
  progressText: {
    fontSize: Typography.fontSizes.caption,
    color: Colors.ui.textTertiary,
    fontWeight: Typography.fontWeights.medium,
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
});