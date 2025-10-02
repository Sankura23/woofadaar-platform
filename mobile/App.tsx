import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import SplashScreen from './src/components/SplashScreen';
import { Colors } from './src/theme/colors';

// Import screens
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';

// Import Bottom Navigation
import BottomTabs from './src/navigation/BottomTabs';

export type RootStackParamList = {
  Main: undefined;
  Login: undefined;
  Register: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppNavigator() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
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
        initialRouteName={isAuthenticated ? "Main" : "Login"}
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        {isAuthenticated ? (
          <Stack.Screen
            name="Main"
            component={BottomTabs}
            options={{ headerShown: false }}
          />
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
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
