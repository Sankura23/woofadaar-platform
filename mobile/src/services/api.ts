import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Dog, HealthLog, Question, Answer } from '../types/auth';

const BASE_URL = 'http://192.168.1.7:3001'; // Your local development server

class ApiService {
  public BASE_URL = BASE_URL;

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

    console.log('Making request to:', url);
    console.log('Request body:', options.body);
    console.log('Request headers:', { ...defaultHeaders, ...options.headers });

    if (token) {
      defaultHeaders.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
      });

      const responseText = await response.text();
      console.log('Response status:', response.status);
      console.log('Response body:', responseText);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}, body: ${responseText}`);
      }

      return JSON.parse(responseText);
    } catch (error) {
      // Don't log 401 errors as they are expected during auth checks
      if (error instanceof Error && !error.message.includes('status: 401')) {
        console.log('Request failed:', error);
      }
      throw error;
    }
  }

  // Auth methods
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const result = await this.request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, userType: 'pet-parent' }),
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
    const response = await this.request<any>('/user');
    return response.user;
  }

  async uploadProfileImage(imageUri: string): Promise<string> {
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'profile.jpg',
    } as any);

    const token = await this.getAuthToken();
    console.log('Upload token:', token ? 'exists' : 'missing');

    const url = `${BASE_URL}/api/upload`;
    console.log('Upload URL:', url);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      console.log('Upload response status:', response.status);

      const responseText = await response.text();
      console.log('Upload response:', responseText);

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} - ${responseText}`);
      }

      const result = JSON.parse(responseText);
      const imageUrl = result.secure_url || result.url || result.imageUrl;

      if (!imageUrl) {
        throw new Error('No image URL returned from server');
      }

      return imageUrl;
    } catch (error) {
      console.error('Image upload error:', error);
      throw error;
    }
  }

  async updateUserProfile(profileData: { name?: string; email?: string; location?: string; experience_level?: string; preferred_language?: string; profile_image_url?: string }): Promise<User> {
    try {
      // Try the most common endpoint first
      const response = await this.request<any>('/user', {
        method: 'PUT',
        body: JSON.stringify(profileData),
      });
      return response.user || response;
    } catch (error) {
      console.log('Trying alternative endpoint...');
      // Try alternative endpoint
      try {
        const response = await this.request<any>('/auth/profile', {
          method: 'PUT',
          body: JSON.stringify(profileData),
        });
        return response.user || response;
      } catch (error2) {
        console.log('Trying another alternative...');
        // Try another alternative
        const response = await this.request<any>('/profile', {
          method: 'PUT',
          body: JSON.stringify(profileData),
        });
        return response.user || response;
      }
    }
  }

  // Dogs methods
  async getDogs(): Promise<Dog[]> {
    const response = await this.request<any>('/dogs');
    return response.data?.dogs || [];
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

  async deleteDog(dogId: string): Promise<void> {
    return this.request<void>(`/dogs/${dogId}`, {
      method: 'DELETE',
    });
  }

  // Health logs methods
  async getHealthLogs(dogId: string): Promise<HealthLog[]> {
    const response = await this.request<any>(`/health/${dogId}`);
    const logs = response.data?.recentLogs || [];

    // Map backend field names to mobile field names
    return logs.map((log: any) => ({
      id: log.id,
      dogId: log.dog_id,
      date: log.log_date,
      mood_score: log.mood_score,
      appetite_score: log.appetite_level, // Map appetite_level to appetite_score
      energy_level: log.energy_level,
      exercise_minutes: log.exercise_duration, // Map exercise_duration to exercise_minutes
      exercise_type: log.exercise_type,
      food_amount: log.food_amount,
      food_type: log.food_type,
      water_intake: log.water_intake,
      weight_kg: log.weight_kg,
      symptoms: log.symptoms || [],
      notes: log.notes,
      weather: log.weather,
      temperature: log.temperature_celsius,
      created_at: log.created_at,
    }));
  }

  async createHealthLog(logData: Partial<HealthLog>): Promise<HealthLog> {
    // Map mobile app field names to backend field names
    const mappedData = {
      dog_id: logData.dogId,
      log_date: logData.date,
      food_amount: logData.food_amount,
      food_type: logData.food_type,
      water_intake: logData.water_intake,
      exercise_duration: logData.exercise_minutes,
      exercise_type: logData.exercise_type,
      mood_score: logData.mood_score,
      energy_level: logData.energy_level,
      appetite_level: logData.appetite_score,
      weight_kg: logData.weight_kg,
      temperature_celsius: logData.temperature,
      notes: logData.notes,
      symptoms: logData.symptoms,
      weather: logData.weather,
    };

    return this.request<HealthLog>('/health/log', {
      method: 'POST',
      body: JSON.stringify(mappedData),
    });
  }

  // Community methods - using AsyncStorage to persist questions and replies
  async getQuestions(): Promise<any[]> {
    try {
      // First, check if we have stored questions with user modifications (upvotes, etc.)
      const storedQuestions = await AsyncStorage.getItem('woofadaar_questions');
      const storedUpvotes = await AsyncStorage.getItem('woofadaar_upvotes'); // Track upvotes separately
      const upvotes = storedUpvotes ? JSON.parse(storedUpvotes) : {};

      // Try to get fresh data from API
      let apiQuestions = [];
      try {
        const response = await this.request<any>('/community/questions');
        apiQuestions = response.data?.questions || [];
      } catch (apiError) {
        console.log('API call failed, using stored data');
      }

      // If we have API data, merge it with stored data to preserve user interactions
      let questions = [];
      if (apiQuestions.length > 0) {
        // Use API data as base, but preserve user interactions from storage
        const storedQuestionsMap = storedQuestions ?
          JSON.parse(storedQuestions).reduce((map: any, q: any) => {
            map[q.id] = q;
            return map;
          }, {}) : {};

        questions = apiQuestions.map((apiQuestion: any) => {
          const storedQuestion = storedQuestionsMap[apiQuestion.id];

          // Preserve user interactions from stored data
          return {
            ...apiQuestion,
            upvotes: storedQuestion?.upvotes !== undefined ? storedQuestion.upvotes : apiQuestion.upvotes || 0,
            view_count: storedQuestion?.view_count !== undefined ? storedQuestion.view_count : apiQuestion.view_count || 0,
            hasUpvoted: upvotes[apiQuestion.id] || false,
            _count: apiQuestion._count || { answers: 0 },
            answer_count: 0 // Will be updated below
          };
        });
      } else if (storedQuestions) {
        // No API data, use stored questions
        questions = JSON.parse(storedQuestions);
      } else {
        // No data at all
        return [];
      }

      // Update answer counts from actual reply storage
      for (const question of questions) {
        try {
          const replies = await this.getQuestionReplies(question.id);
          const replyCount = replies.length;

          // Ensure _count object exists
          if (!question._count) {
            question._count = { answers: 0 };
          }
          question._count.answers = replyCount;
          question.answer_count = replyCount;
        } catch (error) {
          console.log(`Error getting replies for question ${question.id}:`, error);
          // Keep existing count if we can't get replies
          question.answer_count = question._count?.answers || 0;
        }

        // Apply stored upvote state
        question.hasUpvoted = upvotes[question.id] || false;
      }

      // Save updated questions back to storage
      await AsyncStorage.setItem('woofadaar_questions', JSON.stringify(questions));

      return questions;
    } catch (error) {
      console.error('Error in getQuestions:', error);
      // Last resort - return stored data if available
      const stored = await AsyncStorage.getItem('woofadaar_questions');
      return stored ? JSON.parse(stored) : [];
    }
  }

  async createQuestion(questionData: Partial<Question>): Promise<Question> {
    try {
      // Try API first
      const result = await this.request<Question>('/community/questions', {
        method: 'POST',
        body: JSON.stringify(questionData),
      });

      // Update local storage
      const questions = await this.getQuestions();
      questions.unshift(result);
      await AsyncStorage.setItem('woofadaar_questions', JSON.stringify(questions));

      return result;
    } catch (error) {
      // If API fails, create locally
      const newQuestion = {
        id: Date.now().toString(),
        title: questionData.title || '',
        content: questionData.content || '',
        category: questionData.category || 'health',
        tags: questionData.tags || [],
        is_resolved: false,
        view_count: 0,
        upvotes: 0,
        created_at: new Date().toISOString(),
        user: {
          id: '1',
          name: 'Sakshi Gaikwad',
          profile_image_url: undefined,
        },
        _count: { answers: 0 },
        answer_count: 0,
        dog: {
          id: '1',
          name: 'Poppy',
          breed: 'Toy Poodle',
          photo_url: undefined,
        },
      };

      // Save to local storage
      const questions = await this.getQuestions();
      questions.unshift(newQuestion);
      await AsyncStorage.setItem('woofadaar_questions', JSON.stringify(questions));

      return newQuestion as Question;
    }
  }

  async getQuestion(questionId: string): Promise<Question> {
    return this.request<Question>(`/community/questions/${questionId}`);
  }

  async getQuestionReplies(questionId: string): Promise<any[]> {
    try {
      // Try to get from AsyncStorage first
      const stored = await AsyncStorage.getItem(`woofadaar_replies_${questionId}`);
      if (stored) {
        return JSON.parse(stored);
      }

      // Try API
      const response = await this.request<any>(`/community/questions/${questionId}/answers`);
      const answers = response.data?.answers || [];

      if (answers.length > 0) {
        await AsyncStorage.setItem(`woofadaar_replies_${questionId}`, JSON.stringify(answers));
      }

      return answers;
    } catch (error) {
      console.error('Failed to load replies:', error);
      // Try AsyncStorage again
      const stored = await AsyncStorage.getItem(`woofadaar_replies_${questionId}`);
      return stored ? JSON.parse(stored) : [];
    }
  }

  async createReply(questionId: string, content: string): Promise<any> {
    try {
      // Try API first
      const result = await this.request(`/community/questions/${questionId}/answers`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      });

      // Get existing replies to get accurate count
      const existingReplies = await this.getQuestionReplies(questionId);

      // Add new reply if not already in the list
      const replyExists = existingReplies.some(r => r.id === result.id);
      if (!replyExists) {
        existingReplies.push(result);
      }

      await AsyncStorage.setItem(`woofadaar_replies_${questionId}`, JSON.stringify(existingReplies));

      // Update question answer count with the actual count
      const questions = await this.getQuestions();
      const questionIndex = questions.findIndex(q => q.id === questionId);
      if (questionIndex >= 0) {
        // Ensure _count object exists
        if (!questions[questionIndex]._count) {
          questions[questionIndex]._count = { answers: 0 };
        }
        questions[questionIndex]._count.answers = existingReplies.length;
        questions[questionIndex].answer_count = existingReplies.length;
        await AsyncStorage.setItem('woofadaar_questions', JSON.stringify(questions));
      }

      return result;
    } catch (error) {
      // If API fails, create locally
      const newReply = {
        id: Date.now().toString(),
        content,
        created_at: new Date().toISOString(),
        upvotes: 0,
        is_best_answer: false,
        user: {
          id: '1',
          name: 'Sakshi Gaikwad',
          profile_image_url: undefined,
        },
      };

      // Get existing replies
      const existingReplies = await this.getQuestionReplies(questionId);
      existingReplies.push(newReply);
      await AsyncStorage.setItem(`woofadaar_replies_${questionId}`, JSON.stringify(existingReplies));

      // Update question answer count with the actual count
      const questions = await this.getQuestions();
      const questionIndex = questions.findIndex(q => q.id === questionId);
      if (questionIndex >= 0) {
        // Ensure _count object exists
        if (!questions[questionIndex]._count) {
          questions[questionIndex]._count = { answers: 0 };
        }
        questions[questionIndex]._count.answers = existingReplies.length;
        questions[questionIndex].answer_count = existingReplies.length;
        await AsyncStorage.setItem('woofadaar_questions', JSON.stringify(questions));
      }

      return newReply;
    }
  }

  // AI Analysis methods
  async analyzeQuestion(title: string, content: string): Promise<any> {
    return this.request('/ai/categorize-question', {
      method: 'POST',
      body: JSON.stringify({ title, content }),
    });
  }

  async getQuestionRecommendations(): Promise<any> {
    return this.request('/ai/recommendations', {
      method: 'GET',
    });
  }

  // Points and leaderboard
  async getUserPoints(): Promise<{ points: number }> {
    return this.request<{ points: number }>('/points');
  }

  async getLeaderboard(): Promise<User[]> {
    return this.request<User[]>('/leaderboard');
  }

  // Question upvote methods
  async updateQuestionUpvote(questionId: string, isUpvoted: boolean): Promise<void> {
    try {
      // Get current upvote state to calculate the difference
      const storedUpvotes = await AsyncStorage.getItem('woofadaar_upvotes');
      const upvotes = storedUpvotes ? JSON.parse(storedUpvotes) : {};
      const previouslyUpvoted = upvotes[questionId] || false;

      // Update stored upvotes
      upvotes[questionId] = isUpvoted;
      await AsyncStorage.setItem('woofadaar_upvotes', JSON.stringify(upvotes));

      // Update question in stored questions directly
      const storedQuestions = await AsyncStorage.getItem('woofadaar_questions');
      if (storedQuestions) {
        const questions = JSON.parse(storedQuestions);
        const questionIndex = questions.findIndex((q: any) => q.id === questionId);
        if (questionIndex >= 0) {
          questions[questionIndex].hasUpvoted = isUpvoted;

          // Update upvote count based on the change
          const currentUpvotes = questions[questionIndex].upvotes || 0;
          if (isUpvoted && !previouslyUpvoted) {
            // User is upvoting
            questions[questionIndex].upvotes = currentUpvotes + 1;
          } else if (!isUpvoted && previouslyUpvoted) {
            // User is removing upvote
            questions[questionIndex].upvotes = Math.max(0, currentUpvotes - 1);
          }

          await AsyncStorage.setItem('woofadaar_questions', JSON.stringify(questions));
        }
      }

      // Try API call (but don't fail if it doesn't work)
      try {
        await this.request(`/community/questions/${questionId}/upvote`, {
          method: 'POST',
          body: JSON.stringify({ upvote: isUpvoted }),
        });
      } catch (apiError) {
        console.log('API upvote failed, but local storage updated');
      }
    } catch (error) {
      console.error('Error updating upvote:', error);
      throw error;
    }
  }

  // Appointments
  async bookAppointment(appointmentData: any): Promise<any> {
    return this.request('/auth/working-appointments', {
      method: 'POST',
      body: JSON.stringify(appointmentData),
    });
  }

  async getAppointments(): Promise<any> {
    return this.request('/auth/working-appointments', {
      method: 'GET',
    });
  }

  async getPartners(): Promise<any> {
    return this.request('/partners?limit=50', {
      method: 'GET',
    });
  }
}

export const apiService = new ApiService();