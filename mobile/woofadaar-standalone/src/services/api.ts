import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Dog, HealthLog, Question, Answer } from '../types/auth';

const BASE_URL = 'http://192.168.1.23:3001'; // Your local development server

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
      console.log('🔥 Fetching questions from API...');

      // ALWAYS fetch fresh data from API - no cache fallback to avoid stale data
      const response = await this.request<any>('/community/questions');
      const apiQuestions = response.data?.questions || [];

      console.log('🔥 API returned', apiQuestions.length, 'questions');

      // Process API response to maintain backward compatibility with frontend
      const questions = apiQuestions.map((apiQuestion: any) => {
        return {
          ...apiQuestion,
          hasUpvoted: apiQuestion.userVote === 'up',
          _count: apiQuestion._count || { answers: 0 },
          // Use answer_count from the backend - it's the source of truth
          answer_count: apiQuestion.answer_count || 0,
          // Map User field for compatibility
          User: apiQuestion.User,
          user: apiQuestion.User,
          // Map Dog field for compatibility
          Dog: apiQuestion.Dog,
          dog: apiQuestion.Dog
        };
      });

      console.log('🔥 Processed', questions.length, 'questions');

      // Update cache with fresh data
      await AsyncStorage.setItem('woofadaar_questions', JSON.stringify(questions));

      return questions;
    } catch (error: any) {
      console.error('🔥 Error fetching questions:', error);
      console.error('🔥 Error details:', error.message);

      // If API fails, try to use cached data as last resort
      try {
        const stored = await AsyncStorage.getItem('woofadaar_questions');
        if (stored) {
          console.log('🔥 Using cached questions as fallback');
          return JSON.parse(stored);
        }
      } catch (cacheError) {
        console.error('🔥 Cache also failed:', cacheError);
      }

      // Return empty array if everything fails
      return [];
    }
  }

  async createQuestion(questionData: Partial<Question>): Promise<Question> {
    try {
      console.log('🔥 Creating question with data:', questionData);

      // Map mobile categories to backend categories
      const categoryMapping: { [key: string]: string } = {
        'health': 'health',
        'behavior': 'behavior',
        'training': 'training',
        'food': 'feeding',  // Backend uses 'feeding' instead of 'food'
        'local': 'local',
        'grooming': 'general',
        'adoption': 'general',
        'travel': 'general',
        'lifestyle': 'general',
        'events': 'local',
        'all': 'general'
      };

      const mappedCategory = categoryMapping[questionData.category || 'health'] || 'general';

      // Validate required fields
      if (!questionData.title || questionData.title.trim().length < 5) {
        throw new Error('Title must be at least 5 characters long');
      }

      if (!questionData.content || questionData.content.trim().length < 10) {
        throw new Error('Content must be at least 10 characters long');
      }

      // Map mobile field names to backend field names
      const backendData = {
        title: questionData.title.trim(),
        content: questionData.content.trim(),
        category: mappedCategory,
        tags: questionData.tags || [],
        dogId: questionData.dogId || null,
        photoUrl: questionData.imageUri || null,
        location: null
      };

      console.log('🔥 Sending to backend:', backendData);
      console.log('🔥 Category mapped from', questionData.category, 'to', mappedCategory);

      // Check authentication token
      const token = await this.getAuthToken();
      console.log('🔥 Auth token exists:', !!token);
      console.log('🔥 Auth token length:', token?.length || 0);

      const response = await this.request<any>('/community/questions', {
        method: 'POST',
        body: JSON.stringify(backendData),
      });

      console.log('🔥 Backend response:', response);

      // Clear all cached questions to force complete refresh
      await AsyncStorage.removeItem('woofadaar_questions');
      console.log('🔥 Cache cleared, question should appear on refresh');

      return response.data.question;
    } catch (error: any) {
      console.error('🔥 Failed to create question via API:', error);
      console.error('🔥 Error details:', error.message);
      console.error('🔥 Full error object:', error);

      // Check for specific error types
      if (error?.message?.includes('status: 401') || error?.message?.includes('authentication')) {
        throw new Error('Please log in again to post questions. Your session has expired.');
      }

      if (error?.message?.includes('status: 400')) {
        throw new Error('Invalid question data. Please check your title and content.');
      }

      if (error?.message?.includes('status: 500')) {
        throw new Error('Server error occurred. Please try again in a moment.');
      }

      // For validation errors we threw above
      if (error?.message?.includes('Title must be') || error?.message?.includes('Content must be')) {
        throw error;
      }

      // For other API errors, provide more helpful message
      throw new Error(`Failed to post question: ${error?.message || 'Please check your internet connection and try again'}`);
    }
  }

  async getQuestion(questionId: string): Promise<Question> {
    return this.request<Question>(`/community/questions/${questionId}`);
  }

  async deleteQuestion(questionId: string): Promise<void> {
    try {
      await this.request(`/community/questions/${questionId}`, {
        method: 'DELETE',
      });

      // Clear cache to force refresh
      await AsyncStorage.removeItem('woofadaar_questions');
    } catch (error) {
      console.error('Failed to delete question:', error);
      throw error;
    }
  }

  async editQuestion(questionId: string, questionData: { title?: string; content?: string; category?: string; tags?: string[] }): Promise<Question> {
    try {
      // Map mobile categories to backend categories
      const categoryMapping: { [key: string]: string } = {
        'health': 'health',
        'behavior': 'behavior',
        'training': 'training',
        'food': 'feeding',
        'local': 'local',
        'grooming': 'general',
        'adoption': 'general',
        'travel': 'general',
        'lifestyle': 'general',
        'events': 'local',
        'all': 'general'
      };

      const mappedData = {
        ...questionData,
        category: questionData.category ? categoryMapping[questionData.category] || 'general' : undefined
      };

      const result = await this.request<any>(`/community/questions/${questionId}`, {
        method: 'PUT',
        body: JSON.stringify(mappedData),
      });

      // Clear cache to force refresh
      await AsyncStorage.removeItem('woofadaar_questions');

      return result.data.question;
    } catch (error) {
      console.error('Failed to edit question:', error);
      throw error;
    }
  }

  async saveQuestion(questionId: string): Promise<void> {
    try {
      // Store saved questions locally for now
      const savedQuestions = await AsyncStorage.getItem('woofadaar_saved_questions');
      const savedList = savedQuestions ? JSON.parse(savedQuestions) : [];

      if (!savedList.includes(questionId)) {
        savedList.push(questionId);
        await AsyncStorage.setItem('woofadaar_saved_questions', JSON.stringify(savedList));
      }
    } catch (error) {
      console.error('Failed to save question:', error);
      throw error;
    }
  }

  async unsaveQuestion(questionId: string): Promise<void> {
    try {
      const savedQuestions = await AsyncStorage.getItem('woofadaar_saved_questions');
      const savedList = savedQuestions ? JSON.parse(savedQuestions) : [];

      const updatedList = savedList.filter((id: string) => id !== questionId);
      await AsyncStorage.setItem('woofadaar_saved_questions', JSON.stringify(updatedList));
    } catch (error) {
      console.error('Failed to unsave question:', error);
      throw error;
    }
  }

  async getSavedQuestions(): Promise<string[]> {
    try {
      const savedQuestions = await AsyncStorage.getItem('woofadaar_saved_questions');
      return savedQuestions ? JSON.parse(savedQuestions) : [];
    } catch (error) {
      console.error('Failed to get saved questions:', error);
      return [];
    }
  }

  async isQuestionSaved(questionId: string): Promise<boolean> {
    try {
      const savedQuestions = await this.getSavedQuestions();
      return savedQuestions.includes(questionId);
    } catch (error) {
      return false;
    }
  }

  async getQuestionReplies(questionId: string, forceRefresh: boolean = true): Promise<any[]> {
    try {
      // ALWAYS force refresh to get latest data from backend - disabled cache to fix sync issues
      // Skip cache completely

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
    } catch (error: any) {
      console.error('Failed to create reply via API:', error);

      // Check if this is an authentication error (HTTP 401)
      if (error?.message?.includes('status: 401') || error?.message?.includes('authentication') || error?.message?.includes('unauthorized')) {
        // Clear the invalid token
        await AsyncStorage.removeItem('authToken');
        console.warn('Authentication failed when creating reply. Token cleared.');
        throw new Error('Please log in again to post comments. Your session has expired.');
      }

      // For other errors, still create locally but log the issue
      console.warn('Creating reply locally due to API error:', error.message);
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

  async analyzeQuestionWithAI(questionData: { title: string; content: string; category: string }): Promise<any> {
    try {
      // 🤖 Using Hugging Face AI Analysis - Real AI with dog expertise!
      console.log('🤖 Starting AI Analysis with Hugging Face...');

      const response = await this.request<any>('/ai/analyze-question', {
        method: 'POST',
        body: JSON.stringify(questionData)
      });

      if (response.success && response.data) {
        console.log('✅ AI Analysis completed successfully:', response.data);

        // Transform AI response to match mobile app format
        return {
          qualityScore: response.data.overallScore,
          suggestions: response.data.feedback || [],
          detectedCategory: response.data.category,
          confidence: response.data.confidenceLevel,
          clarity: response.data.clarity,
          urgency: response.data.urgency,
          completeness: response.data.completeness,
          suggestedTags: response.data.suggestedTags
        };
      }

      throw new Error('AI analysis failed');
    } catch (error) {
      console.warn('🔄 AI Analysis failed, using enhanced fallback:', error);

      // Enhanced fallback analysis (same reliable logic as before)
      const combinedText = `${questionData.title} ${questionData.content}`.toLowerCase();
      const words = combinedText.split(/\s+/).filter(word => word.length > 2);
      const wordCount = words.length;

      // Dog-specific analysis patterns
      const analysisPatterns = {
        healthSymptoms: {
          urgent: ['blood', 'vomiting', 'seizure', 'collapse', 'breathing', 'choking', 'poisoned', 'emergency'],
          concerning: ['lethargic', 'refusing food', 'fever', 'diarrhea', 'limping', 'swollen', 'discharge'],
          general: ['tired', 'slow', 'hot', 'warm', 'sick', 'ill', 'vet', 'doctor']
        },
        behaviorIssues: {
          aggression: ['aggressive', 'biting', 'snapping', 'growling', 'attacking', 'violent'],
          anxiety: ['anxious', 'scared', 'fearful', 'nervous', 'shaking', 'hiding', 'panic'],
          destructive: ['chewing', 'destroying', 'digging', 'scratching', 'tearing']
        },
        trainingNeeds: {
          basic: ['sit', 'stay', 'come', 'heel', 'down', 'training', 'obedience'],
          housetraining: ['potty', 'house', 'accidents', 'peeing', 'pooping', 'toilet'],
          advanced: ['tricks', 'agility', 'commands', 'recall']
        },
        contextDetails: {
          dogInfo: ['breed', 'age', 'months', 'years', 'old', 'puppy', 'senior'],
          timeline: ['started', 'began', 'since', 'recently', 'suddenly', 'gradually'],
          severity: ['always', 'sometimes', 'occasionally', 'constantly', 'never'],
          location: ['inside', 'outside', 'home', 'park', 'vet', 'car']
        }
      };

      // Calculate comprehensive quality score
      let qualityScore = 40; // Base score
      const suggestions = [];

      // Length and structure analysis
      if (wordCount >= 30) qualityScore += 25;
      else if (wordCount >= 20) qualityScore += 20;
      else if (wordCount >= 10) qualityScore += 15;
      else if (wordCount < 5) qualityScore -= 20;

      // Question format check
      if (questionData.title.includes('?')) qualityScore += 10;
      if (questionData.content.includes('?')) qualityScore += 5;

      // Context detail analysis
      let contextScore = 0;
      Object.values(analysisPatterns.contextDetails).flat().forEach(keyword => {
        if (combinedText.includes(keyword)) contextScore += 3;
      });
      qualityScore += Math.min(contextScore, 20);

      // Check for specific information gaps
      if (!analysisPatterns.contextDetails.dogInfo.some(keyword => combinedText.includes(keyword))) {
        suggestions.push("Include your dog's breed, age, or size for better advice");
      }

      if (!analysisPatterns.contextDetails.timeline.some(keyword => combinedText.includes(keyword))) {
        suggestions.push("Mention when this issue started or how long it's been happening");
      }

      // Category-specific analysis
      let detectedCategory = questionData.category;
      let categoryConfidence = 50;

      // Health detection
      const healthUrgent = analysisPatterns.healthSymptoms.urgent.filter(s => combinedText.includes(s)).length;
      const healthConcerning = analysisPatterns.healthSymptoms.concerning.filter(s => combinedText.includes(s)).length;
      const healthGeneral = analysisPatterns.healthSymptoms.general.filter(s => combinedText.includes(s)).length;

      if (healthUrgent > 0) {
        detectedCategory = 'health';
        categoryConfidence = 95;
        suggestions.unshift('⚠️ This sounds urgent - consider contacting a vet immediately');
        qualityScore += 15;
      } else if (healthConcerning > 0) {
        detectedCategory = 'health';
        categoryConfidence = 85;
        qualityScore += 10;
      } else if (healthGeneral > 0) {
        detectedCategory = 'health';
        categoryConfidence = 70;
        qualityScore += 5;
      }

      // Behavior detection
      const behaviorAggression = analysisPatterns.behaviorIssues.aggression.filter(s => combinedText.includes(s)).length;
      const behaviorAnxiety = analysisPatterns.behaviorIssues.anxiety.filter(s => combinedText.includes(s)).length;

      if (behaviorAggression > 0) {
        detectedCategory = 'behavior';
        categoryConfidence = 90;
        suggestions.unshift('🚨 Aggression issues may need professional trainer consultation');
      } else if (behaviorAnxiety > 0) {
        detectedCategory = 'behavior';
        categoryConfidence = 80;
      }

      // Training detection
      const trainingBasic = analysisPatterns.trainingNeeds.basic.filter(s => combinedText.includes(s)).length;
      const trainingHouse = analysisPatterns.trainingNeeds.housetraining.filter(s => combinedText.includes(s)).length;

      if (trainingHouse > 0) {
        detectedCategory = 'training';
        categoryConfidence = 85;
      } else if (trainingBasic > 0) {
        detectedCategory = 'training';
        categoryConfidence = 75;
      }

      // Add category-specific suggestions
      if (detectedCategory === 'health' && !combinedText.includes('vet')) {
        suggestions.push('Consider mentioning if you\'ve consulted a vet');
      }

      if (detectedCategory === 'behavior' && !combinedText.includes('when')) {
        suggestions.push('Describe what triggers this behavior');
      }

      // Generic quality improvements
      if (wordCount < 15) {
        suggestions.push('Add more specific details about the situation');
      }

      if (!combinedText.includes('help') && !combinedText.includes('advice') && !combinedText.includes('?')) {
        suggestions.push('Clearly state what kind of help or advice you need');
      }

      // Cap quality score
      qualityScore = Math.max(10, Math.min(qualityScore, 100));

      // Simulate AI processing delay for better UX
      await new Promise(resolve => setTimeout(resolve, 800));

      return {
        qualityScore,
        suggestions: suggestions.slice(0, 3),
        detectedCategory,
        confidence: categoryConfidence > 70 ? 'high' : categoryConfidence > 50 ? 'medium' : 'low'
      };
    }
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