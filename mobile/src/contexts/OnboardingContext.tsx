import React, { createContext, useContext, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../services/api';

interface OnboardingData {
  dogData: {
    name: string;
    breed: string;
    age: string;
    gender: string;
    weight: string;
    personality: string;
  };
  profileData: {
    bio: string;
    experience: string;
    location: string;
    interests: string;
    phoneNumber: string;
  };
  preferences: {
    notifications: {
      community: boolean;
      health: boolean;
      training: boolean;
      social: boolean;
      emergency: boolean;
    };
    privacy: {
      profileVisibility: boolean;
      contactSharing: boolean;
      locationSharing: boolean;
    };
    content: {
      expertAdvice: boolean;
      communityPosts: boolean;
      localEvents: boolean;
      productRecommendations: boolean;
    };
  };
}

interface OnboardingContextType {
  onboardingData: OnboardingData;
  updateDogData: (data: Partial<OnboardingData['dogData']>) => void;
  updateProfileData: (data: Partial<OnboardingData['profileData']>) => void;
  updatePreferences: (data: Partial<OnboardingData['preferences']>) => void;
  saveOnboardingData: () => Promise<void>;
  clearOnboardingData: () => void;
}

const defaultOnboardingData: OnboardingData = {
  dogData: {
    name: '',
    breed: '',
    age: '',
    gender: '',
    weight: '',
    personality: '',
  },
  profileData: {
    bio: '',
    experience: '',
    location: '',
    interests: '',
    phoneNumber: '',
  },
  preferences: {
    notifications: {
      community: true,
      health: true,
      training: false,
      social: true,
      emergency: true,
    },
    privacy: {
      profileVisibility: true,
      contactSharing: false,
      locationSharing: true,
    },
    content: {
      expertAdvice: true,
      communityPosts: true,
      localEvents: true,
      productRecommendations: false,
    },
  },
};

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};

interface OnboardingProviderProps {
  children: ReactNode;
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children }) => {
  const [onboardingData, setOnboardingData] = useState<OnboardingData>(defaultOnboardingData);

  const updateDogData = (data: Partial<OnboardingData['dogData']>) => {
    setOnboardingData(prev => ({
      ...prev,
      dogData: { ...prev.dogData, ...data }
    }));
  };

  const updateProfileData = (data: Partial<OnboardingData['profileData']>) => {
    setOnboardingData(prev => ({
      ...prev,
      profileData: { ...prev.profileData, ...data }
    }));
  };

  const updatePreferences = (data: Partial<OnboardingData['preferences']>) => {
    setOnboardingData(prev => ({
      ...prev,
      preferences: { ...prev.preferences, ...data }
    }));
  };

  const saveOnboardingData = async () => {
    console.log('saveOnboardingData called with data:', onboardingData);
    try {
      // Save dog data to backend if dog has a name
      if (onboardingData.dogData.name.trim()) {
        console.log('Creating dog with data:', onboardingData.dogData);
        try {
          const dogDataForAPI = {
            name: onboardingData.dogData.name,
            breed: onboardingData.dogData.breed || 'Unknown',
            age_months: onboardingData.dogData.age ? parseInt(onboardingData.dogData.age) * 12 : 12, // Convert years to months
            gender: onboardingData.dogData.gender || 'unknown',
            weight_kg: onboardingData.dogData.weight ? parseFloat(onboardingData.dogData.weight.replace(/[^\d.]/g, '')) : 10,
            personality_traits: onboardingData.dogData.personality ? [onboardingData.dogData.personality] : [],
          };

          console.log('Calling apiService.createDog with:', dogDataForAPI);
          const createdDog = await apiService.createDog(dogDataForAPI);
          console.log('Dog created successfully:', createdDog);
        } catch (dogError) {
          console.log('Dog creation failed, will save locally:', dogError);
          // Save dog data locally if API fails
          await AsyncStorage.setItem('onboarding_dog_data', JSON.stringify(onboardingData.dogData));
        }
      } else {
        console.log('No dog name provided, skipping dog creation');
      }

      // Save profile data to backend
      try {
        const profileDataForAPI = {
          experience_level: onboardingData.profileData.experience,
          location: onboardingData.profileData.location,
          preferred_language: 'en', // Default to English
        };

        // Only include fields that have values
        const filteredProfileData = Object.fromEntries(
          Object.entries(profileDataForAPI).filter(([_, value]) => value && value.trim() !== '')
        );

        if (Object.keys(filteredProfileData).length > 0) {
          await apiService.updateUserProfile(filteredProfileData);
        }
      } catch (profileError) {
        console.log('Profile update failed, will save locally:', profileError);
        // Save profile data locally if API fails
        await AsyncStorage.setItem('onboarding_profile_data', JSON.stringify(onboardingData.profileData));
      }

      // Save preferences locally (could be sent to backend later if needed)
      await AsyncStorage.setItem('onboarding_preferences', JSON.stringify(onboardingData.preferences));

      // Save the complete onboarding data for future reference
      await AsyncStorage.setItem('complete_onboarding_data', JSON.stringify(onboardingData));

      console.log('Onboarding data saved successfully');
    } catch (error) {
      console.error('Failed to save onboarding data:', error);
      throw error;
    }
  };

  const clearOnboardingData = () => {
    setOnboardingData(defaultOnboardingData);
  };

  const value: OnboardingContextType = {
    onboardingData,
    updateDogData,
    updateProfileData,
    updatePreferences,
    saveOnboardingData,
    clearOnboardingData,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};