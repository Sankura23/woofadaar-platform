import Constants from 'expo-constants';

const API_BASE = Constants.expoConfig?.hostUri 
  ? `http://${Constants.expoConfig.hostUri.split(':')[0]}:3000/api`
  : 'http://192.168.1.7:3000/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor() {
    this.baseURL = API_BASE;
  }

  setToken(token: string) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      if (this.token) {
        (headers as any)['Authorization'] = `Bearer ${this.token}`;
      }

      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();
      return {
        success: response.ok,
        data: response.ok ? data : undefined,
        error: response.ok ? undefined : data.error || 'Unknown error',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  auth = {
    login: async (email: string, password: string) => {
      return this.request<{ token: string; user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
    },
    
    register: async (email: string, password: string, name: string) => {
      return this.request<{ token: string; user: any }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
      });
    },
  };

  dogs = {
    getAll: async () => {
      return this.request<any[]>('/user');
    },
    
    create: async (dogData: any) => {
      return this.request<any>('/user', {
        method: 'POST',
        body: JSON.stringify(dogData),
      });
    },
    
    uploadPhoto: async (dogId: string, photo: FormData) => {
      return this.request<any>(`/dogs/${dogId}/photo`, {
        method: 'POST',
        headers: {
          'Authorization': this.token ? `Bearer ${this.token}` : '',
        },
        body: photo,
      });
    },
  };

  health = {
    createLog: async (logData: any) => {
      return this.request<any>('/health/logs', {
        method: 'POST',
        body: JSON.stringify(logData),
      });
    },
    
    getLogs: async (dogId: string) => {
      return this.request<any[]>(`/health/logs?dogId=${dogId}`);
    },
  };

  community = {
    getQuestions: async () => {
      return this.request<any[]>('/community/questions');
    },
    
    createQuestion: async (questionData: any) => {
      return this.request<any>('/community/questions', {
        method: 'POST',
        body: JSON.stringify(questionData),
      });
    },
  };
}

export const apiClient = new ApiClient();