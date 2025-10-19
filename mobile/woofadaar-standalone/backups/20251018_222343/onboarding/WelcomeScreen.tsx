import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  Dimensions,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { useAuth } from '../../contexts/AuthContext';
import { Colors, BorderRadius, Shadows, Spacing, Typography } from '../../theme/colors';

const { width, height } = Dimensions.get('window');

type WelcomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Welcome'>;
};

export default function WelcomeScreen({ navigation }: WelcomeScreenProps) {
  const { completeOnboarding, isAuthenticated, logout, user } = useAuth();

  const handleSkip = async () => {
    await completeOnboarding();
    navigation.navigate('Main');
  };

  const handleBack = async () => {
    // If user is already authenticated but didn't complete onboarding,
    // logout and send them back to the auth flow
    if (isAuthenticated) {
      await logout();
      navigation.navigate('Login');
    } else {
      // For new users in onboarding flow, go back to Register screen
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('Register');
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
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

        {/* Welcome Header with Logo */}
        <View style={styles.headerContainer}>
          <Text style={styles.welcomeHeader}>Welcome to</Text>
          <View style={styles.logoRow}>
            <Image
              source={require('../../../assets/woofadaar-logo-final.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            {user?.name && (
              <Text style={styles.commaAfterLogo}>,</Text>
            )}
          </View>
          {user?.name && (
            <Text style={styles.userName}>{user.name}</Text>
          )}
        </View>

        {/* Dog Illustration */}
        <View style={styles.illustrationContainer}>
          <Image
            source={require('../../../assets/Orange Woofadaar Dog 1.png')}
            style={styles.dogIllustration}
            resizeMode="contain"
          />
        </View>

        {/* Welcome Text */}
        <View style={styles.textContainer}>
          <Text style={styles.welcomeSubtitle}>
            The ultimate community for dog lovers. Connect, share experiences, and get expert advice for your furry friend.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('DogSetup')}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            activeOpacity={0.7}
          >
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
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
    paddingTop: 20,
    paddingBottom: 30,
    justifyContent: 'space-between',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeHeader: {
    fontSize: Typography.fontSizes.h5,
    fontWeight: Typography.fontWeights.semiBold,
    color: Colors.primary.mintTeal,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 1.2,
    fontFamily: 'Dreammate',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: width * 0.6,
    height: 60,
  },
  commaAfterLogo: {
    fontSize: Typography.fontSizes.h3,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary.mintTeal,
    marginLeft: -5,
    marginTop: -5,
  },
  userName: {
    fontSize: Typography.fontSizes.h4,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary.mintTeal,
    textAlign: 'center',
    marginTop: 12,
    letterSpacing: 0.5,
  },
  illustrationContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    marginVertical: 16,
  },
  dogIllustration: {
    width: width * 0.7,
    height: height * 0.3,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  welcomeSubtitle: {
    fontSize: Typography.fontSizes.body1,
    color: Colors.ui.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
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