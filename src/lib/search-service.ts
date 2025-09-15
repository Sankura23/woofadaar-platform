// Week 10: Advanced Search Service
// Elasticsearch-like features with multi-language support and intelligent ranking

import prisma from '@/lib/db';
import CacheService from './cache-service';

interface SearchQuery {
  query: string;
  type?: 'all' | 'questions' | 'partners' | 'health' | 'content';
  language?: string;
  filters?: Record<string, any>;
  sort?: 'relevance' | 'date' | 'popularity' | 'rating';
  page?: number;
  limit?: number;
  userId?: string;
}

interface SearchResult {
  id: string;
  type: 'question' | 'partner' | 'health_info' | 'content';
  title: string;
  content?: string;
  excerpt: string;
  relevanceScore: number;
  metadata: Record<string, any>;
  highlight?: Record<string, string[]>;
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  limit: number;
  took: number; // Search time in ms
  aggregations?: Record<string, any>;
  suggestions?: string[];
}

class SearchService {
  private static instance: SearchService;
  private cache: CacheService;
  private readonly maxResults = 1000;

  // Hindi transliteration mapping for basic search
  private readonly hindiTransliteration: Record<string, string[]> = {
    'कुत्ता': ['dog', 'kuttha', 'kutta'],
    'बीमारी': ['illness', 'disease', 'bimari'],
    'स्वास्थ्य': ['health', 'swasthya'],
    'प्रशिक्षण': ['training', 'prashikshan'],
    'खाना': ['food', 'khana', 'diet'],
    'व्यवहार': ['behavior', 'vyavahar'],
    'डॉक्टर': ['doctor', 'vet', 'veterinarian'],
    'दवा': ['medicine', 'dawa', 'medication'],
    'टीका': ['vaccination', 'tika', 'vaccine']
  };

  static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  constructor() {
    this.cache = CacheService.getInstance();
  }

  // Main search function
  async search(query: SearchQuery): Promise<SearchResponse> {
    const startTime = performance.now();
    
    // Generate cache key
    const cacheKey = this.cache.generateCacheKey(query);
    
    // Check cache first
    const cached = await this.cache.getSearchResults(query.query + JSON.stringify(query));
    if (cached) {
      return {
        ...cached,
        took: performance.now() - startTime
      };
    }

    // Normalize and prepare query
    const normalizedQuery = this.normalizeQuery(query.query, query.language);
    const searchTerms = this.extractSearchTerms(normalizedQuery, query.language);
    
    // Execute parallel searches based on type
    let results: SearchResult[] = [];
    
    if (!query.type || query.type === 'all') {
      const [questions, partners, healthInfo] = await Promise.all([
        this.searchQuestions(searchTerms, query),
        this.searchPartners(searchTerms, query),
        this.searchHealthInfo(searchTerms, query)
      ]);
      
      results = [...questions, ...partners, ...healthInfo];
    } else {
      switch (query.type) {
        case 'questions':
          results = await this.searchQuestions(searchTerms, query);
          break;
        case 'partners':
          results = await this.searchPartners(searchTerms, query);
          break;
        case 'health':
          results = await this.searchHealthInfo(searchTerms, query);
          break;
      }
    }

    // Sort by relevance and apply pagination
    results = this.rankResults(results, searchTerms, query);
    const total = results.length;
    
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const start = (page - 1) * limit;
    const paginatedResults = results.slice(start, start + limit);

    // Generate suggestions
    const suggestions = await this.generateSuggestions(query.query, query.language);

    // Build aggregations
    const aggregations = this.buildAggregations(results);

    const response: SearchResponse = {
      results: paginatedResults,
      total,
      page,
      limit,
      took: performance.now() - startTime,
      aggregations,
      suggestions
    };

    // Cache the response
    await this.cache.cacheSearchResults(query.query + JSON.stringify(query), response);

    // Log search analytics
    await this.logSearchAnalytics(query, response);

    return response;
  }

  // Search community questions
  private async searchQuestions(searchTerms: string[], query: SearchQuery): Promise<SearchResult[]> {
    const where: any = {
      status: 'active',
      language: query.language || 'en'
    };

    // Add filters
    if (query.filters?.category) {
      where.category = query.filters.category;
    }
    if (query.filters?.urgent) {
      where.is_urgent = query.filters.urgent;
    }

    // Text search using multiple terms
    if (searchTerms.length > 0) {
      where.OR = searchTerms.flatMap(term => [
        { title: { contains: term, mode: 'insensitive' } },
        { content: { contains: term, mode: 'insensitive' } },
        { tags: { some: { name: { contains: term, mode: 'insensitive' } } } }
      ]);
    }

    const questions = await prisma.communityQuestion.findMany({
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
        created_at: true,
        user: {
          select: {
            name: true,
            reputation: true
          }
        },
        tags: {
          select: {
            name: true
          },
          take: 5
        }
      },
      orderBy: [
        { is_urgent: 'desc' },
        { upvotes: 'desc' },
        { created_at: 'desc' }
      ],
      take: this.maxResults
    });

    return questions.map(q => ({
      id: q.id,
      type: 'question' as const,
      title: q.title,
      content: q.content,
      excerpt: this.generateExcerpt(q.content, searchTerms),
      relevanceScore: this.calculateQuestionRelevance(q, searchTerms),
      metadata: {
        category: q.category,
        is_urgent: q.is_urgent,
        upvotes: q.upvotes,
        views: q.views,
        answer_count: q.answer_count,
        created_at: q.created_at,
        author: q.user?.name,
        tags: q.tags.map(t => t.name)
      },
      highlight: this.generateHighlight(q.title + ' ' + q.content, searchTerms)
    }));
  }

  // Search partners
  private async searchPartners(searchTerms: string[], query: SearchQuery): Promise<SearchResult[]> {
    const where: any = {
      status: 'approved',
      verified: true
    };

    // Add filters
    if (query.filters?.type) {
      where.partner_type = query.filters.type;
    }
    if (query.filters?.location) {
      where.location = { contains: query.filters.location, mode: 'insensitive' };
    }
    if (query.filters?.emergency) {
      where.emergency_available = true;
    }
    if (query.filters?.online) {
      where.online_consultation = true;
    }

    // Text search
    if (searchTerms.length > 0) {
      where.OR = searchTerms.flatMap(term => [
        { name: { contains: term, mode: 'insensitive' } },
        { business_name: { contains: term, mode: 'insensitive' } },
        { bio: { contains: term, mode: 'insensitive' } },
        { location: { contains: term, mode: 'insensitive' } },
        { specialization: { has: term } }
      ]);
    }

    const partners = await prisma.partner.findMany({
      where,
      select: {
        id: true,
        name: true,
        business_name: true,
        partner_type: true,
        bio: true,
        location: true,
        rating_average: true,
        total_reviews: true,
        verified: true,
        emergency_available: true,
        online_consultation: true,
        specialization: true,
        experience_years: true,
        consultation_fee_range: true,
        created_at: true
      },
      orderBy: [
        { rating_average: 'desc' },
        { total_reviews: 'desc' },
        { verified: 'desc' }
      ],
      take: this.maxResults
    });

    return partners.map(p => ({
      id: p.id,
      type: 'partner' as const,
      title: p.business_name || `${p.name}'s ${p.partner_type} Practice`,
      content: p.bio || '',
      excerpt: this.generateExcerpt(p.bio || '', searchTerms),
      relevanceScore: this.calculatePartnerRelevance(p, searchTerms),
      metadata: {
        partner_type: p.partner_type,
        location: p.location,
        rating: p.rating_average,
        reviews: p.total_reviews,
        verified: p.verified,
        emergency: p.emergency_available,
        online: p.online_consultation,
        specialization: p.specialization,
        experience: p.experience_years,
        fee_range: p.consultation_fee_range
      },
      highlight: this.generateHighlight((p.business_name || p.name) + ' ' + (p.bio || ''), searchTerms)
    }));
  }

  // Search health information (could be expanded with a knowledge base)
  private async searchHealthInfo(searchTerms: string[], query: SearchQuery): Promise<SearchResult[]> {
    // This would typically search a health knowledge base
    // For now, search in health logs and medical records for relevant information
    
    const userId = query.userId;
    if (!userId) return [];

    const healthLogs = await prisma.healthLog.findMany({
      where: {
        dog: {
          user_id: userId
        },
        OR: searchTerms.map(term => ({
          notes: { contains: term, mode: 'insensitive' }
        }))
      },
      select: {
        id: true,
        log_date: true,
        notes: true,
        activity_level: true,
        appetite: true,
        mood: true,
        dog: {
          select: {
            name: true,
            breed: true
          }
        }
      },
      orderBy: { log_date: 'desc' },
      take: 50
    });

    return healthLogs
      .filter(log => log.notes) // Only logs with notes
      .map(log => ({
        id: log.id,
        type: 'health_info' as const,
        title: `Health log for ${log.dog.name} - ${log.log_date.toDateString()}`,
        content: log.notes!,
        excerpt: this.generateExcerpt(log.notes!, searchTerms),
        relevanceScore: this.calculateHealthRelevance(log, searchTerms),
        metadata: {
          date: log.log_date,
          dog_name: log.dog.name,
          breed: log.dog.breed,
          activity_level: log.activity_level,
          appetite: log.appetite,
          mood: log.mood
        },
        highlight: this.generateHighlight(log.notes!, searchTerms)
      }));
  }

  // Query processing utilities
  private normalizeQuery(query: string, language?: string): string {
    // Basic normalization
    let normalized = query.toLowerCase().trim();
    
    // Remove special characters except spaces and hyphens
    normalized = normalized.replace(/[^\w\s\-]/g, ' ');
    
    // Collapse multiple spaces
    normalized = normalized.replace(/\s+/g, ' ');
    
    // Handle Hindi transliteration
    if (language === 'hi') {
      for (const [hindi, english] of Object.entries(this.hindiTransliteration)) {
        if (normalized.includes(hindi)) {
          normalized += ' ' + english.join(' ');
        }
      }
    }
    
    return normalized;
  }

  private extractSearchTerms(query: string, language?: string): string[] {
    const terms = query.split(' ').filter(term => term.length > 2);
    
    // Add stemming or synonyms here if needed
    const expandedTerms = [...terms];
    
    // Add common synonyms
    const synonyms: Record<string, string[]> = {
      'dog': ['canine', 'puppy', 'pet'],
      'sick': ['ill', 'unwell', 'disease'],
      'vet': ['veterinarian', 'doctor'],
      'food': ['diet', 'nutrition', 'feeding'],
      'training': ['behavior', 'obedience']
    };
    
    terms.forEach(term => {
      if (synonyms[term]) {
        expandedTerms.push(...synonyms[term]);
      }
    });
    
    return [...new Set(expandedTerms)]; // Remove duplicates
  }

  // Relevance scoring
  private calculateQuestionRelevance(question: any, searchTerms: string[]): number {
    let score = 0;
    
    const titleText = question.title.toLowerCase();
    const contentText = question.content.toLowerCase();
    
    searchTerms.forEach(term => {
      // Title matches are worth more
      if (titleText.includes(term)) score += 3;
      if (contentText.includes(term)) score += 1;
      
      // Tag matches
      const tagMatch = question.tags?.some((tag: any) => 
        tag.name.toLowerCase().includes(term)
      );
      if (tagMatch) score += 2;
    });
    
    // Boost popular questions
    score += Math.log(question.upvotes + 1) * 0.5;
    score += Math.log(question.views + 1) * 0.2;
    
    // Boost urgent questions
    if (question.is_urgent) score += 1;
    
    return score;
  }

  private calculatePartnerRelevance(partner: any, searchTerms: string[]): number {
    let score = 0;
    
    const nameText = (partner.name + ' ' + (partner.business_name || '')).toLowerCase();
    const bioText = (partner.bio || '').toLowerCase();
    
    searchTerms.forEach(term => {
      if (nameText.includes(term)) score += 3;
      if (bioText.includes(term)) score += 1;
      if (partner.location.toLowerCase().includes(term)) score += 2;
      
      const specializationMatch = partner.specialization?.some((spec: string) => 
        spec.toLowerCase().includes(term)
      );
      if (specializationMatch) score += 2;
    });
    
    // Boost verified and rated partners
    if (partner.verified) score += 1;
    score += partner.rating_average * 0.5;
    score += Math.log(partner.total_reviews + 1) * 0.3;
    
    return score;
  }

  private calculateHealthRelevance(healthLog: any, searchTerms: string[]): number {
    let score = 0;
    
    const notesText = healthLog.notes.toLowerCase();
    
    searchTerms.forEach(term => {
      if (notesText.includes(term)) score += 2;
    });
    
    // Boost recent logs
    const daysSinceLog = (Date.now() - healthLog.log_date.getTime()) / (1000 * 60 * 60 * 24);
    score += Math.max(0, 30 - daysSinceLog) * 0.1; // Higher score for recent logs
    
    return score;
  }

  // Result processing
  private rankResults(results: SearchResult[], searchTerms: string[], query: SearchQuery): SearchResult[] {
    // Sort by relevance score first
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    // Apply secondary sorting based on query.sort
    if (query.sort && query.sort !== 'relevance') {
      results.sort((a, b) => {
        switch (query.sort) {
          case 'date':
            const dateA = new Date(a.metadata.created_at || a.metadata.date || 0);
            const dateB = new Date(b.metadata.created_at || b.metadata.date || 0);
            return dateB.getTime() - dateA.getTime();
          case 'popularity':
            return (b.metadata.upvotes || b.metadata.views || 0) - (a.metadata.upvotes || a.metadata.views || 0);
          case 'rating':
            return (b.metadata.rating || 0) - (a.metadata.rating || 0);
          default:
            return 0;
        }
      });
    }
    
    return results;
  }

  private generateExcerpt(content: string, searchTerms: string[], maxLength = 200): string {
    if (!content) return '';
    
    // Find the first occurrence of any search term
    let startIndex = 0;
    const lowerContent = content.toLowerCase();
    
    for (const term of searchTerms) {
      const index = lowerContent.indexOf(term.toLowerCase());
      if (index !== -1) {
        startIndex = Math.max(0, index - 50);
        break;
      }
    }
    
    let excerpt = content.substring(startIndex, startIndex + maxLength);
    
    // Clean up the excerpt
    if (startIndex > 0) excerpt = '...' + excerpt;
    if (startIndex + maxLength < content.length) excerpt += '...';
    
    return excerpt;
  }

  private generateHighlight(text: string, searchTerms: string[]): Record<string, string[]> {
    const highlights: Record<string, string[]> = {};
    
    searchTerms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        highlights[term] = matches;
      }
    });
    
    return highlights;
  }

  // Suggestions and autocomplete
  private async generateSuggestions(query: string, language?: string): Promise<string[]> {
    if (query.length < 2) return [];
    
    // Get popular search terms from analytics
    const recentSearches = await prisma.searchAnalytics.findMany({
      where: {
        language: language || 'en',
        search_query: {
          contains: query,
          mode: 'insensitive'
        },
        created_at: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      select: {
        search_query: true,
        results_count: true
      },
      distinct: ['search_query'],
      orderBy: {
        results_count: 'desc'
      },
      take: 5
    });
    
    const suggestions = recentSearches
      .filter(search => search.results_count && search.results_count > 0)
      .map(search => search.search_query);
    
    // Add predefined suggestions based on language
    const predefined = language === 'hi' ? 
      ['कुत्ते का स्वास्थ्य', 'डॉग ट्रेनिंग', 'पशु चिकित्सक'] :
      ['dog health', 'dog training', 'veterinarian', 'dog behavior', 'dog nutrition'];
    
    const filtered = predefined.filter(term => 
      term.toLowerCase().includes(query.toLowerCase())
    );
    
    return [...new Set([...suggestions, ...filtered])].slice(0, 8);
  }

  private buildAggregations(results: SearchResult[]): Record<string, any> {
    const aggregations: Record<string, any> = {};
    
    // Type aggregation
    const typeCount = results.reduce((acc, result) => {
      acc[result.type] = (acc[result.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    aggregations.types = Object.entries(typeCount).map(([type, count]) => ({ type, count }));
    
    // Category aggregation (for questions)
    const categories = results
      .filter(r => r.type === 'question' && r.metadata.category)
      .reduce((acc, result) => {
        const category = result.metadata.category;
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    
    aggregations.categories = Object.entries(categories).map(([category, count]) => ({ category, count }));
    
    return aggregations;
  }

  // Analytics
  private async logSearchAnalytics(query: SearchQuery, response: SearchResponse): Promise<void> {
    try {
      await prisma.searchAnalytics.create({
        data: {
          user_id: query.userId || null,
          search_query: query.query,
          search_type: query.type || 'all',
          language: query.language || 'en',
          results_count: response.total,
          search_duration_ms: Math.round(response.took),
          no_results: response.total === 0,
          filters_applied: query.filters || {}
        }
      });
    } catch (error) {
      console.error('Failed to log search analytics:', error);
    }
  }

  // Voice search placeholder (would integrate with speech recognition)
  async processVoiceSearch(audioBlob: Blob, language: string = 'en'): Promise<SearchResponse> {
    // This would integrate with a speech-to-text service
    // For now, return a placeholder
    throw new Error('Voice search not implemented yet');
  }

  // Visual search placeholder (would integrate with image recognition)
  async processVisualSearch(imageBlob: Blob): Promise<SearchResponse> {
    // This would integrate with an image recognition service for health conditions
    // For now, return a placeholder
    throw new Error('Visual search not implemented yet');
  }
}

export default SearchService;
export type { SearchQuery, SearchResult, SearchResponse };