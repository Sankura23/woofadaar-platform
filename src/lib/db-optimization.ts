// Week 29 Phase 1: Production Database Optimization & Performance Tuning
// Enhanced with Indian market patterns, caching integration, and advanced monitoring
// Target: API response time <150ms for 95% of requests with geographic optimization

import prisma from '@/lib/db';
import CacheService from './cache-service';
import { performanceMonitor } from './performance-monitor';

interface QueryMetrics {
  query: string;
  duration: number;
  rows: number;
  timestamp: Date;
}

class DatabaseOptimizer {
  private static instance: DatabaseOptimizer;
  private cache: CacheService;
  private queryMetrics: QueryMetrics[] = [];
  private slowQueryThreshold = 100; // ms
  private indiaTimeZone = 'Asia/Kolkata';

  static getInstance(): DatabaseOptimizer {
    if (!DatabaseOptimizer.instance) {
      DatabaseOptimizer.instance = new DatabaseOptimizer();
    }
    return DatabaseOptimizer.instance;
  }

  constructor() {
    this.cache = CacheService.getInstance();
  }

  // Execute optimized queries with caching and performance monitoring
  async executeWithMetrics<T>(
    queryName: string,
    queryFunction: () => Promise<T>,
    cacheKey?: string,
    cacheTTL = 300
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      // Check cache first if cacheKey provided
      if (cacheKey && this.cache) {
        const cached = await this.cache.get('performance_cache', cacheKey);
        if (cached) {
          performanceMonitor.recordMetric('db_cache_hit', 1, 'count', queryName);
          return cached as T;
        }
      }

      const result = await queryFunction();
      const duration = performance.now() - startTime;
      
      // Cache result if cacheKey provided
      if (cacheKey && this.cache) {
        await this.cache.set('performance_cache', cacheKey, result);
      }
      
      // Log metrics
      this.logQuery(queryName, duration, Array.isArray(result) ? result.length : 1);
      performanceMonitor.recordMetric('db_query_time', duration, 'ms', queryName);
      
      // Warn about slow queries
      if (duration > this.slowQueryThreshold) {
        console.warn(`Slow query detected: ${queryName} took ${duration.toFixed(2)}ms at ${new Date().toLocaleString("en-US", {timeZone: this.indiaTimeZone})}`);
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.logQuery(`${queryName}_ERROR`, duration, 0);
      performanceMonitor.recordMetric('db_error', 1, 'count', queryName);
      throw error;
    }
  }

  // Optimized user queries
  async findUserWithProfile(userId: string) {
    return this.executeWithMetrics('findUserWithProfile', async () => {
      return prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          location: true,
          experience_level: true,
          barks_points: true,
          is_premium: true,
          profile_image_url: true,
          preferred_language: true,
          reputation: true,
          created_at: true
        }
      });
    });
  }

  // Optimized dog queries with health data
  async findDogsWithHealthSummary(userId: string) {
    return this.executeWithMetrics('findDogsWithHealthSummary', async () => {
      return prisma.dog.findMany({
        where: { user_id: userId },
        select: {
          id: true,
          name: true,
          breed: true,
          age_months: true,
          weight_kg: true,
          gender: true,
          photo_url: true,
          health_id: true,
          created_at: true,
          // Optimized counts instead of full relations
          _count: {
            select: {
              HealthLogs: {
                where: {
                  log_date: {
                    gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
                  }
                }
              },
              HealthPredictions: {
                where: {
                  status: 'active',
                  created_at: {
                    gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
                  }
                }
              }
            }
          }
        },
        orderBy: { created_at: 'desc' }
      });
    });
  }

  // Optimized partner search with intelligent filtering
  async searchPartners(params: {
    search?: string;
    location?: string;
    type?: string;
    specialization?: string;
    verified?: boolean;
    emergency?: boolean;
    online?: boolean;
    minRating?: number;
    maxDistance?: number;
    sortBy?: string;
    sortOrder?: string;
    page?: number;
    limit?: number;
  }) {
    return this.executeWithMetrics('searchPartners', async () => {
      const {
        search = '',
        location = '',
        type,
        specialization,
        verified,
        emergency,
        online,
        minRating = 0,
        sortBy = 'rating_average',
        sortOrder = 'desc',
        page = 1,
        limit = 20
      } = params;

      // Build optimized where clause
      const where: any = {
        status: 'approved', // Always filter for approved partners
        verified: verified !== undefined ? verified : undefined
      };

      // Text search optimization - use simple contains instead of complex OR
      if (search) {
        const searchTerms = search.toLowerCase().split(' ').filter(term => term.length > 2);
        if (searchTerms.length > 0) {
          where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { business_name: { contains: search, mode: 'insensitive' } },
            { location: { contains: search, mode: 'insensitive' } }
          ];
        }
      }

      // Indexed filters
      if (type) where.partner_type = type;
      if (location) where.location = { contains: location, mode: 'insensitive' };
      if (emergency) where.emergency_available = true;
      if (online) where.online_consultation = true;
      if (minRating > 0) where.rating_average = { gte: minRating };

      // Array field search optimization
      if (specialization) {
        where.specialization = { has: specialization };
      }

      // Optimized sorting
      let orderBy: any;
      switch (sortBy) {
        case 'rating_average':
          orderBy = [
            { rating_average: sortOrder },
            { total_reviews: 'desc' }
          ];
          break;
        case 'created_at':
          orderBy = [{ created_at: sortOrder }];
          break;
        case 'last_active':
          orderBy = [{ last_active_at: sortOrder }];
          break;
        case 'name':
          orderBy = [{ name: sortOrder }];
          break;
        default:
          orderBy = [{ rating_average: 'desc' }];
      }

      const skip = (page - 1) * limit;

      // Execute optimized parallel queries
      const [partners, totalCount] = await Promise.all([
        prisma.partner.findMany({
          where,
          select: {
            id: true,
            name: true,
            business_name: true,
            partner_type: true,
            location: true,
            bio: true,
            phone: true,
            website: true,
            profile_image_url: true,
            rating_average: true,
            rating_count: true,
            total_reviews: true,
            verified: true,
            verification_date: true,
            partnership_tier: true,
            emergency_available: true,
            home_visit_available: true,
            online_consultation: true,
            response_time_hours: true,
            service_radius_km: true,
            languages_spoken: true,
            languages_primary: true,
            consultation_fee_range: true,
            specialization: true,
            experience_years: true,
            last_active_at: true,
            created_at: true
          },
          orderBy,
          skip,
          take: limit
        }),
        prisma.partner.count({ where })
      ]);

      return {
        partners,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPrevPage: page > 1
        }
      };
    });
  }

  // Optimized community questions with engagement metrics
  async getCommunityQuestions(params: {
    category?: string;
    language?: string;
    sortBy?: string;
    page?: number;
    limit?: number;
    userId?: string;
  }) {
    return this.executeWithMetrics('getCommunityQuestions', async () => {
      const {
        category,
        language = 'en',
        sortBy = 'recent',
        page = 1,
        limit = 20,
        userId
      } = params;

      const where: any = {
        language,
        status: 'active'
      };

      if (category) where.category = category;

      let orderBy: any = { created_at: 'desc' };
      
      switch (sortBy) {
        case 'popular':
          orderBy = [
            { upvotes: 'desc' },
            { views: 'desc' },
            { created_at: 'desc' }
          ];
          break;
        case 'unanswered':
          where.answer_count = 0;
          orderBy = { created_at: 'desc' };
          break;
        case 'recent':
          orderBy = { created_at: 'desc' };
          break;
        case 'trending':
          // Questions with recent activity
          orderBy = [
            { updated_at: 'desc' },
            { upvotes: 'desc' }
          ];
          break;
      }

      const skip = (page - 1) * limit;

      const [questions, totalCount] = await Promise.all([
        prisma.communityQuestion.findMany({
          where,
          select: {
            id: true,
            title: true,
            content: true,
            category: true,
            is_urgent: true,
            upvotes: true,
            views: true,
            answer_count: true,
            status: true,
            created_at: true,
            updated_at: true,
            user: {
              select: {
                id: true,
                name: true,
                experience_level: true,
                reputation: true
              }
            },
            tags: {
              select: {
                name: true,
                color: true
              },
              take: 5
            }
          },
          orderBy,
          skip,
          take: limit
        }),
        prisma.communityQuestion.count({ where })
      ]);

      return {
        questions,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPrevPage: page > 1
        }
      };
    });
  }

  // Optimized health analytics query
  async getHealthAnalytics(dogId: string, days = 30) {
    return this.executeWithMetrics('getHealthAnalytics', async () => {
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const [healthLogs, predictions, recommendations] = await Promise.all([
        // Recent health logs with aggregation
        prisma.healthLog.findMany({
          where: {
            dog_id: dogId,
            log_date: { gte: cutoffDate }
          },
          select: {
            id: true,
            log_date: true,
            activity_level: true,
            appetite: true,
            mood: true,
            physical_condition: true,
            notes: true
          },
          orderBy: { log_date: 'desc' },
          take: 100
        }),

        // Active predictions
        prisma.healthPrediction.findMany({
          where: {
            dog_id: dogId,
            status: 'active',
            created_at: { gte: cutoffDate }
          },
          select: {
            id: true,
            prediction_type: true,
            predicted_condition: true,
            risk_level: true,
            confidence_score: true,
            recommendations: true,
            created_at: true
          },
          orderBy: { created_at: 'desc' },
          take: 10
        }),

        // Active AI recommendations
        prisma.aIRecommendation.findMany({
          where: {
            dog_id: dogId,
            status: 'active',
            expires_at: { gt: new Date() }
          },
          select: {
            id: true,
            recommendation_type: true,
            title: true,
            description: true,
            priority: true,
            confidence_score: true,
            action_url: true,
            created_at: true,
            expires_at: true
          },
          orderBy: [
            { priority: 'desc' },
            { confidence_score: 'desc' }
          ],
          take: 10
        })
      ]);

      return {
        health_logs: healthLogs,
        predictions,
        recommendations,
        summary: {
          total_logs: healthLogs.length,
          active_predictions: predictions.length,
          high_risk_predictions: predictions.filter(p => 
            p.risk_level === 'high' || p.risk_level === 'critical'
          ).length,
          urgent_recommendations: recommendations.filter(r => 
            r.priority === 'urgent' || r.priority === 'high'
          ).length
        }
      };
    });
  }

  // Performance monitoring utilities
  private logQuery(queryName: string, duration: number, rows: number) {
    this.queryMetrics.push({
      query: queryName,
      duration,
      rows,
      timestamp: new Date()
    });

    // Keep only last 1000 metrics
    if (this.queryMetrics.length > 1000) {
      this.queryMetrics = this.queryMetrics.slice(-1000);
    }

    // Log to analytics if enabled
    if (process.env.NODE_ENV === 'production') {
      this.logPerformanceMetric(queryName, duration, rows);
    }
  }

  private async logPerformanceMetric(queryName: string, duration: number, rows: number) {
    try {
      await prisma.performanceMetric.create({
        data: {
          metric_name: `db_query_${queryName}`,
          metric_value: duration,
          measurement_unit: 'ms',
          metadata: {
            rows_returned: rows,
            query_name: queryName
          }
        }
      });
    } catch (error) {
      // Don't let metrics logging fail the main query
      console.error('Failed to log performance metric:', error);
    }
  }

  // Get performance statistics
  getPerformanceStats() {
    if (this.queryMetrics.length === 0) return null;

    const recentMetrics = this.queryMetrics.filter(m => 
      Date.now() - m.timestamp.getTime() < 60 * 60 * 1000 // Last hour
    );

    const durations = recentMetrics.map(m => m.duration);
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const maxDuration = Math.max(...durations);
    const slowQueries = recentMetrics.filter(m => m.duration > this.slowQueryThreshold);

    return {
      total_queries: recentMetrics.length,
      average_duration: avgDuration.toFixed(2),
      max_duration: maxDuration.toFixed(2),
      slow_queries: slowQueries.length,
      slow_query_rate: ((slowQueries.length / recentMetrics.length) * 100).toFixed(1)
    };
  }

  // Database health check
  async healthCheck() {
    const startTime = performance.now();
    
    try {
      await prisma.$queryRaw`SELECT 1`;
      const duration = performance.now() - startTime;
      
      return {
        status: 'healthy',
        connection_time: duration.toFixed(2),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }
}

export default DatabaseOptimizer;