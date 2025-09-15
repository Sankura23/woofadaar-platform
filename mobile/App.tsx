import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';

// Import screens
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import DogsScreen from './src/screens/dogs/DogsScreen';
import AddDogScreen from './src/screens/dogs/AddDogScreen';
import CommunityScreen from './src/screens/community/CommunityScreen';
import HealthScreen from './src/screens/health/HealthScreen';
import DailyLogScreen from './src/screens/health/DailyLogScreen';

export type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Register: undefined;
  Dashboard: undefined;
  Dogs: undefined;
  AddDog: undefined;
  Community: undefined;
  Health: { dogId?: string };
  DailyLog: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="auto" />
          <Stack.Navigator 
            initialRouteName="Home"
            screenOptions={{
              headerStyle: {
                backgroundColor: '#2563eb',
              },
              headerTintColor: '#fff',
              headerTitleStyle: {
                fontWeight: 'bold',
              },
            }}
          >
            <Stack.Screen 
              name="Home" 
              component={HomeScreen}
              options={{ title: 'Woofadaar' }}
            />
            <Stack.Screen 
              name="Login" 
              component={LoginScreen}
              options={{ title: 'Login' }}
            />
            <Stack.Screen 
              name="Register" 
              component={RegisterScreen}
              options={{ title: 'Register' }}
            />
            <Stack.Screen 
              name="Dashboard" 
              component={DashboardScreen}
              options={{ title: 'Dashboard' }}
            />
            <Stack.Screen 
              name="Dogs" 
              component={DogsScreen}
              options={{ title: 'My Dogs' }}
            />
            <Stack.Screen 
              name="AddDog" 
              component={AddDogScreen}
              options={{ title: 'Add Dog' }}
            />
            <Stack.Screen 
              name="Community" 
              component={CommunityScreen}
              options={{ title: 'Community' }}
            />
            <Stack.Screen 
              name="Health" 
              component={HealthScreen}
              options={{ title: 'Health Tracking' }}
            />
            <Stack.Screen 
              name="DailyLog" 
              component={DailyLogScreen}
              options={{ title: 'Daily Health Log' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
