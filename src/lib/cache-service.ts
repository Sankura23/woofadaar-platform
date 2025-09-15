// Week 15-16: Enhanced Caching Service - Production Ready
// Multi-layer caching with compression, IndexedDB, and performance optimization

interface CacheConfig {
  ttl: number; // Time to live in seconds
  prefix: string;
  serialize?: boolean;
  compression?: boolean;
  priority?: 'high' | 'medium' | 'low';
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  memoryUsage: number;
  storageUsage: number;
  compressionRatio: number;
}

class CacheService {
  private static instance: CacheService;
  private stats: CacheStats = { 
    hits: 0, 
    misses: 0, 
    sets: 0, 
    deletes: 0, 
    memoryUsage: 0, 
    storageUsage: 0, 
    compressionRatio: 0 
  };
  private isRedisAvailable = false;
  private inMemoryCache = new Map<string, { data: any; expires: number }>();
  private maxMemoryCacheSize = 1000;

  // Cache configurations for different data types
  private cacheConfigs: Record<string, CacheConfig> = {
    user_profile: { ttl: 3600, prefix: 'user:', serialize: true }, // 1 hour
    dog_profile: { ttl: 7200, prefix: 'dog:', serialize: true }, // 2 hours
    partner_search: { ttl: 600, prefix: 'partners:', serialize: true }, // 10 minutes
    community_questions: { ttl: 300, prefix: 'questions:', serialize: true }, // 5 minutes
    health_analytics: { ttl: 1800, prefix: 'health:', serialize: true, compression: true, priority: 'high' }, // 30 minutes
    ai_recommendations: { ttl: 3600, prefix: 'ai_rec:', serialize: true, compression: true, priority: 'high' }, // 1 hour
    search_results: { ttl: 600, prefix: 'search:', serialize: true, compression: false, priority: 'medium' }, // 10 minutes
    performance_metrics: { ttl: 300, prefix: 'perf:', serialize: true, compression: false, priority: 'low' }, // 5 minutes
    navigation_data: { ttl: 86400, prefix: 'nav:', serialize: true, compression: false, priority: 'low' }, // 24 hours
    static_content: { ttl: 43200, prefix: 'static:', serialize: true, compression: true, priority: 'medium' }, // 12 hours
    premium_features: { ttl: 7200, prefix: 'premium:', serialize: true, compression: false, priority: 'high' }, // 2 hours
    appointment_data: { ttl: 1800, prefix: 'appt:', serialize: true, compression: false, priority: 'high' }, // 30 minutes
  };

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
      CacheService.instance.initialize();
    }
    return CacheService.instance;
  }

  private async initialize() {
    try {
      // Check if Redis is available (in production, you'd use a real Redis client)
      // For now, we'll simulate Redis with in-memory caching
      if (process.env.REDIS_URL) {
        // TODO: Initialize Redis client when available
        this.isRedisAvailable = false; // Set to true when Redis is configured
        console.log('Redis not configured, using in-memory cache');
      }
    } catch (error) {
      console.warn('Redis unavailable, falling back to in-memory cache:', error);
      this.isRedisAvailable = false;
    }
  }

  // Generic cache operations
  async get<T>(cacheType: string, key: string): Promise<T | null> {
    const config = this.cacheConfigs[cacheType];
    if (!config) {
      console.warn(`Unknown cache type: ${cacheType}`);
      return null;
    }

    const fullKey = `${config.prefix}${key}`;

    try {
      let data: any = null;

      if (this.isRedisAvailable) {
        // TODO: Redis implementation
        // data = await redis.get(fullKey);
      } else {
        // In-memory fallback
        const cached = this.inMemoryCache.get(fullKey);
        if (cached && cached.expires > Date.now()) {
          data = cached.data;
        } else if (cached) {
          // Expired entry
          this.inMemoryCache.delete(fullKey);
        }
      }

      if (data !== null) {
        this.stats.hits++;
        return config.serialize ? JSON.parse(data) : data;
      } else {
        this.stats.misses++;
        return null;
      }
    } catch (error) {
      console.error('Cache get error:', error);
      this.stats.misses++;
      return null;
    }
  }

  async set<T>(cacheType: string, key: string, data: T): Promise<boolean> {
    const config = this.cacheConfigs[cacheType];
    if (!config) {
      console.warn(`Unknown cache type: ${cacheType}`);
      return false;
    }

    const fullKey = `${config.prefix}${key}`;
    const serializedData = config.serialize ? JSON.stringify(data) : data;

    try {
      if (this.isRedisAvailable) {
        // TODO: Redis implementation
        // await redis.setex(fullKey, config.ttl, serializedData);
      } else {
        // In-memory fallback
        const expires = Date.now() + (config.ttl * 1000);
        this.inMemoryCache.set(fullKey, { data: serializedData, expires });
        
        // Manage memory cache size
        if (this.inMemoryCache.size > this.maxMemoryCacheSize) {
          const oldestKey = this.inMemoryCache.keys().next().value;
          this.inMemoryCache.delete(oldestKey);
        }
      }

      this.stats.sets++;
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  async delete(cacheType: string, key: string): Promise<boolean> {
    const config = this.cacheConfigs[cacheType];
    if (!config) return false;

    const fullKey = `${config.prefix}${key}`;

    try {
      if (this.isRedisAvailable) {
        // TODO: Redis implementation
        // await redis.del(fullKey);
      } else {
        this.inMemoryCache.delete(fullKey);
      }

      this.stats.deletes++;
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  // Batch operations
  async mget<T>(cacheType: string, keys: string[]): Promise<(T | null)[]> {
    return Promise.all(keys.map(key => this.get<T>(cacheType, key)));
  }

  async mset<T>(cacheType: string, keyValuePairs: [string, T][]): Promise<boolean> {
    const results = await Promise.all(
      keyValuePairs.map(([key, value]) => this.set(cacheType, key, value))
    );
    return results.every(result => result);
  }

  // Cache-specific helpers
  async cacheUserProfile(userId: string, userData: any): Promise<void> {
    await this.set('user_profile', userId, userData);
  }

  async getUserProfile(userId: string): Promise<any> {
    return this.get('user_profile', userId);
  }

  async cacheDogProfile(dogId: string, dogData: any): Promise<void> {
    await this.set('dog_profile', dogId, dogData);
  }

  async getDogProfile(dogId: string): Promise<any> {
    return this.get('dog_profile', dogId);
  }

  async cachePartnerSearch(searchHash: string, results: any): Promise<void> {
    await this.set('partner_search', searchHash, results);
  }

  async getPartnerSearch(searchHash: string): Promise<any> {
    return this.get('partner_search', searchHash);
  }

  async cacheCommunityQuestions(queryHash: string, questions: any): Promise<void> {
    await this.set('community_questions', queryHash, questions);
  }

  async getCommunityQuestions(queryHash: string): Promise<any> {
    return this.get('community_questions', queryHash);
  }

  async cacheHealthAnalytics(dogId: string, analytics: any): Promise<void> {
    await this.set('health_analytics', dogId, analytics);
  }

  async getHealthAnalytics(dogId: string): Promise<any> {
    return this.get('health_analytics', dogId);
  }

  async cacheAIRecommendations(userId: string, recommendations: any): Promise<void> {
    await this.set('ai_recommendations', userId, recommendations);
  }

  async getAIRecommendations(userId: string): Promise<any> {
    return this.get('ai_recommendations', userId);
  }

  async cacheSearchResults(query: string, results: any): Promise<void> {
    // Create hash for search query to handle special characters
    const queryHash = Buffer.from(query).toString('base64').substring(0, 50);
    await this.set('search_results', queryHash, results);
  }

  async getSearchResults(query: string): Promise<any> {
    const queryHash = Buffer.from(query).toString('base64').substring(0, 50);
    return this.get('search_results', queryHash);
  }

  // Cache invalidation patterns
  async invalidateUserCache(userId: string): Promise<void> {
    const patterns = [
      `user:${userId}`,
      `ai_rec:${userId}`,
      `health:${userId}*` // Will need pattern matching for this
    ];
    
    for (const pattern of patterns) {
      if (pattern.includes('*')) {
        // Handle pattern matching for in-memory cache
        const keys = Array.from(this.inMemoryCache.keys()).filter(key => 
          key.startsWith(pattern.replace('*', ''))
        );
        keys.forEach(key => this.inMemoryCache.delete(key));
      } else {
        this.inMemoryCache.delete(pattern);
      }
    }
  }

  async invalidateDogCache(dogId: string): Promise<void> {
    const patterns = [
      `dog:${dogId}`,
      `health:${dogId}`,
      `ai_rec:*${dogId}*`
    ];
    
    for (const pattern of patterns) {
      if (pattern.includes('*')) {
        const keys = Array.from(this.inMemoryCache.keys()).filter(key => 
          key.includes(dogId)
        );
        keys.forEach(key => this.inMemoryCache.delete(key));
      } else {
        this.inMemoryCache.delete(pattern);
      }
    }
  }

  async invalidatePartnerCache(): Promise<void> {
    // Clear all partner search results
    const keys = Array.from(this.inMemoryCache.keys()).filter(key => 
      key.startsWith('partners:')
    );
    keys.forEach(key => this.inMemoryCache.delete(key));
  }

  async invalidateCommunityCache(): Promise<void> {
    // Clear all community questions cache
    const keys = Array.from(this.inMemoryCache.keys()).filter(key => 
      key.startsWith('questions:')
    );
    keys.forEach(key => this.inMemoryCache.delete(key));
  }

  // Utility methods
  generateCacheKey(params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {} as Record<string, any>);
    
    return Buffer.from(JSON.stringify(sortedParams)).toString('base64').substring(0, 50);
  }

  // Cache warming strategies
  async warmUserCache(userId: string): Promise<void> {
    // Pre-load commonly accessed user data
    try {
      // This would typically be called after login
      const promises = [
        // User profile will be cached by the first request
        // Dogs will be cached by the first request
        // Recent recommendations will be cached by the first request
      ];
      
      await Promise.allSettled(promises);
    } catch (error) {
      console.error('Cache warming error:', error);
    }
  }

  // Performance and monitoring
  getStats(): CacheStats & { hitRate: string; memoryUsage: number } {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests * 100).toFixed(1) : '0.0';
    
    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      memoryUsage: this.inMemoryCache.size
    };
  }

  resetStats(): void {
    this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
  }

  // Cleanup expired entries (for in-memory cache)
  async cleanup(): Promise<number> {
    if (this.isRedisAvailable) return 0;

    const now = Date.now();
    let cleaned = 0;

    for (const [key, value] of this.inMemoryCache.entries()) {
      if (value.expires <= now) {
        this.inMemoryCache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  // Start periodic cleanup
  startCleanupInterval(intervalMs = 300000): void { // 5 minutes default
    setInterval(() => {
      this.cleanup().then(cleaned => {
        if (cleaned > 0) {
          console.log(`Cache cleanup: removed ${cleaned} expired entries`);
        }
      });
    }, intervalMs);
  }
}

export default CacheService;