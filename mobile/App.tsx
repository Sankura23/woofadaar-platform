import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { OnboardingProvider } from './src/contexts/OnboardingContext';
import SplashScreen from './src/components/SplashScreen';
import { Colors } from './src/theme/colors';

// Import screens
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';

// Import onboarding screens
import WelcomeScreen from './src/screens/onboarding/WelcomeScreen';
import DogSetupScreen from './src/screens/onboarding/DogSetupScreen';
import ProfileCompletionScreen from './src/screens/onboarding/ProfileCompletionScreen';
import PreferencesScreen from './src/screens/onboarding/PreferencesScreen';
import OnboardingCompletionScreen from './src/screens/onboarding/OnboardingCompletionScreen';
import AccountSetupScreen from './src/screens/onboarding/AccountSetupScreen';

// Import Bottom Navigation
import BottomTabs from './src/navigation/BottomTabs';

export type RootStackParamList = {
  Main: undefined;
  Login: undefined;
  Register: undefined;
  Welcome: undefined;
  DogSetup: undefined;
  ProfileCompletion: undefined;
  Preferences: undefined;
  AccountSetup: undefined;
  OnboardingCompletion: undefined;
  Dashboard: undefined;
  Community: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppNavigator() {
  const { isAuthenticated, needsOnboarding, isLoading: authLoading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [splashComplete, setSplashComplete] = useState(false);

  const handleSplashComplete = () => {
    setSplashComplete(true);
  };

  // Handle splash screen completion
  useEffect(() => {
    if (splashComplete && !authLoading) {
      // Hide splash immediately once animation is complete and auth is loaded
      setShowSplash(false);
    }
  }, [splashComplete, authLoading]);

  // Always show splash screen first
  if (showSplash) {
    return <SplashScreen onAnimationComplete={handleSplashComplete} />;
  }

  return (
    <NavigationContainer>
      <StatusBar style="auto" backgroundColor={Colors.primary.mintTeal} />
      <Stack.Navigator
        initialRouteName={
          !isAuthenticated
            ? "Login"
            : needsOnboarding
              ? "Welcome"
              : "Main"
        }
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        {isAuthenticated && !needsOnboarding ? (
          <Stack.Screen
            name="Main"
            component={BottomTabs}
            options={{ headerShown: false }}
          />
        ) : isAuthenticated && needsOnboarding ? (
          <>
            <Stack.Screen
              name="Welcome"
              component={WelcomeScreen}
              options={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="DogSetup"
              component={DogSetupScreen}
              options={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="ProfileCompletion"
              component={ProfileCompletionScreen}
              options={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="Preferences"
              component={PreferencesScreen}
              options={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="AccountSetup"
              component={AccountSetupScreen}
              options={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="OnboardingCompletion"
              component={OnboardingCompletionScreen}
              options={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="Main"
              component={BottomTabs}
              options={{ headerShown: false }}
            />
          </>
        ) : (
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{
                headerShown: false,
                animation: 'fade',
              }}
            />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{
                headerShown: false,
                animation: 'slide_from_bottom',
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <OnboardingProvider>
          <AppNavigator />
        </OnboardingProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
