import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Dog, HealthLog, Question, Answer } from '../types/auth';

const BASE_URL = 'http://192.168.1.7:3000'; // Your local development server

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
    console.log('=== UPLOAD DEBUG START ===');
    console.log('Image URI:', imageUri);
    console.log('Image URI type:', typeof imageUri);

    const formData = new FormData();
    console.log('FormData created:', typeof formData);

    // For React Native, we need to ensure proper file object format
    // Detect file type from URI extension or default to jpeg
    let fileType = 'image/jpeg';
    let fileName = 'profile.jpg';

    if (imageUri.toLowerCase().includes('.png')) {
      fileType = 'image/png';
      fileName = 'profile.png';
    } else if (imageUri.toLowerCase().includes('.jpg') || imageUri.toLowerCase().includes('.jpeg')) {
      fileType = 'image/jpeg';
      fileName = 'profile.jpg';
    }

    const fileObject = {
      uri: imageUri,
      type: fileType,
      name: fileName,
    };
    console.log('File object:', fileObject);

    formData.append('file', fileObject as any);
    console.log('File appended to FormData');

    const token = await this.getAuthToken();
    console.log('Upload token exists:', !!token);
    console.log('Upload token length:', token?.length || 0);

    const url = `${BASE_URL}/api/upload`;
    console.log('Upload URL:', url);

    try {
      console.log('Making fetch request...');

      // Add timeout to prevent upload hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // DO NOT set Content-Type for FormData in React Native - let fetch handle it
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log('Fetch request completed');

      console.log('Upload response status:', response.status);

      const responseText = await response.text();
      console.log('Upload response:', responseText);

      if (!response.ok) {
        let errorMessage = 'Upload failed';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Response isn't JSON, use status text
        }

        if (response.status === 401) {
          throw new Error('Authentication failed. Please try logging in again.');
        } else if (response.status === 413) {
          throw new Error('Image file is too large. Please select a smaller image (max 5MB).');
        } else if (response.status === 400) {
          throw new Error(errorMessage.includes('file') ? 'Invalid image format. Please select a JPEG or PNG image.' : errorMessage);
        } else if (response.status >= 500) {
          throw new Error('Server error occurred. Please try again in a few moments.');
        } else {
          throw new Error(`Upload failed: ${errorMessage}`);
        }
      }

      const result = JSON.parse(responseText);
      const imageUrl = result.secure_url || result.url || result.imageUrl;

      if (!imageUrl) {
        throw new Error('Upload completed but no image URL was returned. Please try again.');
      }

      console.log('=== UPLOAD DEBUG SUCCESS ===');
      return imageUrl;
    } catch (error: any) {
      console.log('=== UPLOAD DEBUG ERROR ===');
      console.error('Image upload error:', error);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      console.error('Error name:', error?.name);
      console.log('=== UPLOAD DEBUG END ===');

      // Provide user-friendly error messages for common issues
      if (error.name === 'AbortError') {
        throw new Error('Upload timed out. Please try again with a smaller image or check your internet connection.');
      } else if (error.message.includes('Network request failed')) {
        throw new Error('Network error. Please check your internet connection and try again.');
      } else if (error.message.includes('timeout')) {
        throw new Error('Upload timed out. Please try again with a smaller image.');
      } else if (error.message.includes('Authentication failed') ||
                 error.message.includes('Invalid image format') ||
                 error.message.includes('too large') ||
                 error.message.includes('Server error')) {
        // Re-throw our custom user-friendly errors
        throw error;
      } else {
        // Generic fallback for unexpected errors
        throw new Error('Photo upload failed. Please try again or select a different image.');
      }
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

  async deleteUserProfile(): Promise<void> {
    await this.request<void>('/user', { method: 'DELETE' });
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

  // Community methods - using backend API for user-specific vote data
  async getQuestions(): Promise<any[]> {
    try {
      // Try to get fresh data from API (now includes user-specific vote data)
      let apiQuestions = [];
      try {
        const response = await this.request<any>('/community/questions');
        apiQuestions = response.data?.questions || [];
      } catch (apiError) {
        console.log('API call failed, using stored data');
        // Fall back to stored questions if API fails
        const storedQuestions = await AsyncStorage.getItem('woofadaar_questions');
        if (storedQuestions) {
          return JSON.parse(storedQuestions);
        }
        return [];
      }

      // Process API response to maintain backward compatibility with frontend
      let questions = apiQuestions.map((apiQuestion: any) => {
        return {
          ...apiQuestion,
          hasUpvoted: apiQuestion.userVote === 'up',
          _count: apiQuestion._count || { answers: 0 },
          answer_count: 0 // Will be updated below
        };
      });

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
      }

      // Save updated questions back to storage for offline use
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
          is_verified: false,
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

  async getQuestionReplies(questionId: string, forceRefresh: boolean = false): Promise<any[]> {
    try {
      // If force refresh is requested, skip cache and go directly to API
      if (!forceRefresh) {
        // Try to get from AsyncStorage first
        const stored = await AsyncStorage.getItem(`woofadaar_replies_${questionId}`);
        if (stored) {
          return JSON.parse(stored);
        }
      }

      // Try API
      const response = await this.request<any>(`/community/questions/${questionId}/answers`);
      const answers = response.data?.answers || [];

      // Always update cache with fresh API data
      await AsyncStorage.setItem(`woofadaar_replies_${questionId}`, JSON.stringify(answers));

      return answers;
    } catch (error) {
      console.error('Failed to load replies:', error);
      // Only fall back to cache if forceRefresh was not requested and API failed
      if (!forceRefresh) {
        const stored = await AsyncStorage.getItem(`woofadaar_replies_${questionId}`);
        return stored ? JSON.parse(stored) : [];
      }
      return [];
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
          questions[questionIndex]._count = { answers: 0, comments: 0 };
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
          is_verified: false,
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
          questions[questionIndex]._count = { answers: 0, comments: 0 };
        }
        questions[questionIndex]._count.answers = existingReplies.length;
        questions[questionIndex].answer_count = existingReplies.length;
        await AsyncStorage.setItem('woofadaar_questions', JSON.stringify(questions));
      }

      return newReply;
    }
  }

  async deleteReply(questionId: string, replyId: string): Promise<void> {
    try {
      // Try API first
      await this.request(`/community/questions/${questionId}/answers/${replyId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      // Handle locally if API fails
    }

    // Remove from local storage
    const replies = await this.getQuestionReplies(questionId);
    const filteredReplies = replies.filter(r => r.id !== replyId);
    await AsyncStorage.setItem(`woofadaar_replies_${questionId}`, JSON.stringify(filteredReplies));

    // Update question answer count
    const questions = await this.getQuestions();
    const questionIndex = questions.findIndex(q => q.id === questionId);
    if (questionIndex >= 0) {
      if (!questions[questionIndex]._count) {
        questions[questionIndex]._count = { answers: 0, comments: 0 };
      }
      questions[questionIndex]._count.answers = filteredReplies.length;
      questions[questionIndex].answer_count = filteredReplies.length;
      await AsyncStorage.setItem('woofadaar_questions', JSON.stringify(questions));
    }
  }

  async editReply(questionId: string, replyId: string, content: string): Promise<any> {
    try {
      // Try API first
      const result = await this.request(`/community/questions/${questionId}/answers/${replyId}`, {
        method: 'PUT',
        body: JSON.stringify({ content }),
      });

      // Update local storage
      const replies = await this.getQuestionReplies(questionId);
      const replyIndex = replies.findIndex(r => r.id === replyId);
      if (replyIndex >= 0) {
        replies[replyIndex] = { ...replies[replyIndex], content, edited_at: new Date().toISOString() };
        await AsyncStorage.setItem(`woofadaar_replies_${questionId}`, JSON.stringify(replies));
      }

      return result;
    } catch (error) {
      // Handle locally if API fails
      const replies = await this.getQuestionReplies(questionId);
      const replyIndex = replies.findIndex(r => r.id === replyId);
      if (replyIndex >= 0) {
        replies[replyIndex] = { ...replies[replyIndex], content, edited_at: new Date().toISOString() };
        await AsyncStorage.setItem(`woofadaar_replies_${questionId}`, JSON.stringify(replies));
        return replies[replyIndex];
      }
      throw error;
    }
  }

  async reportReply(questionId: string, replyId: string, reason: string): Promise<void> {
    try {
      await this.request(`/community/questions/${questionId}/answers/${replyId}/report`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
    } catch (error) {
      // Store report locally if API fails
      const reports = await AsyncStorage.getItem('woofadaar_reports');
      const reportsList = reports ? JSON.parse(reports) : [];
      reportsList.push({
        questionId,
        replyId,
        reason,
        timestamp: new Date().toISOString(),
      });
      await AsyncStorage.setItem('woofadaar_reports', JSON.stringify(reportsList));
    }
  }

  async toggleReplyReaction(questionId: string, replyId: string, reaction: string): Promise<void> {
    try {
      await this.request(`/community/questions/${questionId}/answers/${replyId}/reactions`, {
        method: 'POST',
        body: JSON.stringify({ reaction }),
      });
    } catch (error) {
      // Handle locally
      const reactionsKey = `woofadaar_reactions_${questionId}_${replyId}`;
      const reactions = await AsyncStorage.getItem(reactionsKey);
      const reactionData = reactions ? JSON.parse(reactions) : {};

      // Toggle reaction
      if (reactionData[reaction]) {
        delete reactionData[reaction];
      } else {
        reactionData[reaction] = true;
      }

      await AsyncStorage.setItem(reactionsKey, JSON.stringify(reactionData));
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
      // Use the backend voting API instead of local storage
      // If isUpvoted is true, vote up; if false, it will toggle off the existing vote (if any)
      const response = await this.request(`/community/questions/${questionId}/vote`, {
        method: 'POST',
        body: JSON.stringify({ type: 'up' }),
      });

      // Update the local cache with the response data
      const storedQuestions = await AsyncStorage.getItem('woofadaar_questions');
      if (storedQuestions) {
        const questions = JSON.parse(storedQuestions);
        const questionIndex = questions.findIndex((q: any) => q.id === questionId);
        if (questionIndex >= 0) {
          // Update the question with the response data
          questions[questionIndex].upvotes = response.data.upvotes;
          questions[questionIndex].downvotes = response.data.downvotes;
          questions[questionIndex].hasUpvoted = response.data.userVote === 'up';

          await AsyncStorage.setItem('woofadaar_questions', JSON.stringify(questions));
        }
      }

      // Clean up the old local storage voting system
      await AsyncStorage.removeItem('woofadaar_upvotes');
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

const apiService = new ApiService();
export { apiService };
export default apiService;