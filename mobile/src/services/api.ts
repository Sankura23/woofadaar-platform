import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Dog, HealthLog, Question, Answer } from '../types/auth';

const BASE_URL = 'http://192.168.1.7:3000'; // Your local development server

class ApiService {
  private async getAuthToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('authToken');
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getAuthToken();
    const url = `${BASE_URL}/api${endpoint}`;

    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      defaultHeaders.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Auth methods
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const result = await this.request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    await AsyncStorage.setItem('authToken', result.token);
    return result;
  }

  async register(email: string, password: string, name: string): Promise<{ user: User; token: string }> {
    const result = await this.request<{ user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    
    await AsyncStorage.setItem('authToken', result.token);
    return result;
  }

  async logout(): Promise<void> {
    await AsyncStorage.removeItem('authToken');
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>('/user');
  }

  // Dogs methods
  async getDogs(): Promise<Dog[]> {
    return this.request<Dog[]>('/dogs');
  }

  async createDog(dogData: Partial<Dog>): Promise<Dog> {
    return this.request<Dog>('/dogs', {
      method: 'POST',
      body: JSON.stringify(dogData),
    });
  }

  async updateDog(dogId: string, dogData: Partial<Dog>): Promise<Dog> {
    return this.request<Dog>(`/dogs/${dogId}`, {
      method: 'PUT',
      body: JSON.stringify(dogData),
    });
  }

  // Health logs methods
  async getHealthLogs(dogId: string): Promise<HealthLog[]> {
    return this.request<HealthLog[]>(`/health/${dogId}`);
  }

  async createHealthLog(logData: Partial<HealthLog>): Promise<HealthLog> {
    return this.request<HealthLog>('/health/log', {
      method: 'POST',
      body: JSON.stringify(logData),
    });
  }

  // Community methods
  async getQuestions(): Promise<Question[]> {
    return this.request<Question[]>('/community/questions');
  }

  async createQuestion(questionData: Partial<Question>): Promise<Question> {
    return this.request<Question>('/community/questions', {
      method: 'POST',
      body: JSON.stringify(questionData),
    });
  }

  async getQuestion(questionId: string): Promise<Question> {
    return this.request<Question>(`/community/questions/${questionId}`);
  }

  // Points and leaderboard
  async getUserPoints(): Promise<{ points: number }> {
    return this.request<{ points: number }>('/points');
  }

  async getLeaderboard(): Promise<User[]> {
    return this.request<User[]>('/leaderboard');
  }

  // Appointments
  async bookAppointment(appointmentData: any): Promise<any> {
    return this.request('/appointments/book', {
      method: 'POST',
      body: JSON.stringify(appointmentData),
    });
  }
}

export const apiService = new ApiService();