import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types/auth';
import { apiService } from '../services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  needsOnboarding: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, location?: string, experienceLevel?: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        try {
          const currentUser = await apiService.getCurrentUser();
          setUser(currentUser);

          // Check if user has completed onboarding
          const onboardingCompleted = await AsyncStorage.getItem('onboardingCompleted');

          // Also check if user has dogs (more reliable indicator of completed onboarding)
          let hasDogs = false;
          try {
            const dogs = await apiService.getDogs();
            hasDogs = dogs.length > 0;
          } catch (dogsError) {
            console.log('Could not fetch dogs for onboarding check:', dogsError);
          }

          // User needs onboarding if they haven't completed it AND don't have dogs
          const needsOnboardingCheck = !onboardingCompleted && !hasDogs;
          setNeedsOnboarding(needsOnboardingCheck);
        } catch (userError) {
          // Token is likely invalid or expired, remove it silently
          await AsyncStorage.removeItem('authToken');
          await AsyncStorage.removeItem('onboardingCompleted');
          setUser(null);
          setNeedsOnboarding(false);
        }
      }
    } catch (error) {
      // Only log if it's not a typical auth failure
      console.log('Auth check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const result = await apiService.login(email, password);
      setUser(result.user);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    email: string,
    password: string,
    name: string,
    location: string = '',
    experienceLevel: string = 'beginner'
  ) => {
    setIsLoading(true);
    try {
      const result = await apiService.register(email, password, name);
      setUser(result.user);
      // New users need onboarding
      setNeedsOnboarding(true);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await apiService.logout();
      setUser(null);
      await AsyncStorage.removeItem('onboardingCompleted');
      setNeedsOnboarding(false);
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem('onboardingCompleted', 'true');
      setNeedsOnboarding(false);
    } catch (error) {
      console.error('Failed to save onboarding completion:', error);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    needsOnboarding,
    login,
    register,
    logout,
    checkAuthStatus,
    completeOnboarding,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};