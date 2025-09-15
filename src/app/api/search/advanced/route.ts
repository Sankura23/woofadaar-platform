import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import SearchService from '@/lib/search-service';

interface DecodedToken {
  userId: string;
  email: string;
}

async function verifyToken(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    return decoded.userId;
  } catch (error) {
    return null;
  }
}

// GET /api/search/advanced - Advanced search with intelligent ranking
export async function GET(request: NextRequest) {
  const startTime = performance.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const userId = await verifyToken(request);
    
    // Extract search parameters
    const query = searchParams.get('q') || searchParams.get('query') || '';
    const type = searchParams.get('type') as 'all' | 'questions' | 'partners' | 'health' | 'content' || 'all';
    const language = searchParams.get('lang') || searchParams.get('language') || 'en';
    const sort = searchParams.get('sort') as 'relevance' | 'date' | 'popularity' | 'rating' || 'relevance';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

    // Parse filters
    const filters: Record<string, any> = {};
    
    // Question filters
    if (searchParams.get('category')) filters.category = searchParams.get('category');
    if (searchParams.get('urgent')) filters.urgent = searchParams.get('urgent') === 'true';
    
    // Partner filters  
    if (searchParams.get('partner_type')) filters.type = searchParams.get('partner_type');
    if (searchParams.get('location')) filters.location = searchParams.get('location');
    if (searchParams.get('emergency')) filters.emergency = searchParams.get('emergency') === 'true';
    if (searchParams.get('online')) filters.online = searchParams.get('online') === 'true';
    if (searchParams.get('verified')) filters.verified = searchParams.get('verified') === 'true';
    if (searchParams.get('min_rating')) filters.min_rating = parseFloat(searchParams.get('min_rating')!);

    // Validation
    if (!query || query.trim().length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Search query is required',
        error: 'MISSING_QUERY'
      }, { status: 400 });
    }

    if (query.length > 500) {
      return NextResponse.json({
        success: false,
        message: 'Search query too long (max 500 characters)',
        error: 'QUERY_TOO_LONG'
      }, { status: 400 });
    }

    // Execute search
    const searchService = SearchService.getInstance();
    const searchQuery = {
      query: query.trim(),
      type,
      language,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      sort,
      page,
      limit,
      userId
    };

    const results = await searchService.search(searchQuery);

    const processingTime = performance.now() - startTime;

    return NextResponse.json({
      success: true,
      data: {
        query: {
          original: query,
          type,
          language,
          filters,
          sort,
          page,
          limit
        },
        results: results.results,
        pagination: {
          page: results.page,
          limit: results.limit,
          total: results.total,
          pages: Math.ceil(results.total / results.limit),
          hasNext: results.page < Math.ceil(results.total / results.limit),
          hasPrev: results.page > 1
        },
        aggregations: results.aggregations,
        suggestions: results.suggestions,
        performance: {
          search_time_ms: Math.round(results.took),
          total_time_ms: Math.round(processingTime),
          cached: results.took < 10 // Likely cached if very fast
        }
      }
    });

  } catch (error) {
    console.error('Advanced search error:', error);
    
    const processingTime = performance.now() - startTime;
    
    return NextResponse.json({
      success: false,
      message: 'Search failed',
      error: process.env.NODE_ENV === 'development' ? error : 'SEARCH_ERROR',
      performance: {
        total_time_ms: Math.round(processingTime)
      }
    }, { status: 500 });
  }
}

// POST /api/search/advanced - Advanced search with complex filters
export async function POST(request: NextRequest) {
  const startTime = performance.now();
  
  try {
    const userId = await verifyToken(request);
    const body = await request.json();
    
    const {
      query,
      type = 'all',
      language = 'en',
      filters = {},
      sort = 'relevance',
      page = 1,
      limit = 20,
      facets = false,
      highlighting = true
    } = body;

    // Validation
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Search query is required',
        error: 'MISSING_QUERY'
      }, { status: 400 });
    }

    if (query.length > 500) {
      return NextResponse.json({
        success: false,
        message: 'Search query too long (max 500 characters)',
        error: 'QUERY_TOO_LONG'
      }, { status: 400 });
    }

    // Validate type
    const validTypes = ['all', 'questions', 'partners', 'health', 'content'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid search type',
        error: 'INVALID_TYPE'
      }, { status: 400 });
    }

    // Validate sort
    const validSorts = ['relevance', 'date', 'popularity', 'rating'];
    if (!validSorts.includes(sort)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid sort option',
        error: 'INVALID_SORT'
      }, { status: 400 });
    }

    // Execute search
    const searchService = SearchService.getInstance();
    const searchQuery = {
      query: query.trim(),
      type,
      language,
      filters,
      sort,
      page: Math.max(1, page),
      limit: Math.min(Math.max(1, limit), 100),
      userId
    };

    const results = await searchService.search(searchQuery);

    const processingTime = performance.now() - startTime;

    // Enhanced response for POST requests
    const response = {
      success: true,
      data: {
        query: {
          original: query,
          normalized: query.trim().toLowerCase(), // This would come from SearchService
          type,
          language,
          filters,
          sort,
          page: searchQuery.page,
          limit: searchQuery.limit
        },
        results: results.results.map(result => ({
          ...result,
          highlight: highlighting ? result.highlight : undefined
        })),
        pagination: {
          page: results.page,
          limit: results.limit,
          total: results.total,
          pages: Math.ceil(results.total / results.limit),
          hasNext: results.page < Math.ceil(results.total / results.limit),
          hasPrev: results.page > 1
        },
        aggregations: facets ? results.aggregations : undefined,
        suggestions: results.suggestions,
        performance: {
          search_time_ms: Math.round(results.took),
          total_time_ms: Math.round(processingTime),
          cached: results.took < 10,
          results_per_second: Math.round(results.total / (results.took / 1000))
        },
        metadata: {
          search_id: `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          user_id: userId || null
        }
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Advanced search POST error:', error);
    
    const processingTime = performance.now() - startTime;
    
    return NextResponse.json({
      success: false,
      message: 'Search failed',
      error: process.env.NODE_ENV === 'development' ? 
        { message: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : undefined } : 
        'SEARCH_ERROR',
      performance: {
        total_time_ms: Math.round(processingTime)
      },
      metadata: {
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}