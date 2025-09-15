import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../services/api';
import { offlineManager } from '../services/offline';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isLoading: true,
  
  login: async (email: string, password: string) => {
    try {
      const response = await apiClient.auth.login(email, password);
      
      if (response.success && response.data) {
        const { token, user } = response.data;
        await AsyncStorage.setItem('auth_token', token);
        await AsyncStorage.setItem('user_data', JSON.stringify(user));
        
        set({ token, user });
        offlineManager.setUserId(user.id);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  },
  
  logout: async () => {
    try {
      await AsyncStorage.multiRemove(['auth_token', 'user_data']);
      set({ token: null, user: null });
      offlineManager.clearUserData();
    } catch (error) {
      console.error('Logout error:', error);
    }
  },
  
  initialize: async () => {
    try {
      const [token, userData] = await AsyncStorage.multiGet(['auth_token', 'user_data']);
      
      if (token[1] && userData[1]) {
        const user = JSON.parse(userData[1]);
        set({ token: token[1], user });
        offlineManager.setUserId(user.id);
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
    } finally {
      set({ isLoading: false });
    }
  }
}));