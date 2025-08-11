// Centralized configuration management
export const config = {
  // Database configuration
  database: {
    url: process.env.DATABASE_URL!,
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
    timeout: parseInt(process.env.DB_TIMEOUT || '30000'), // 30 seconds
  },

  // Authentication configuration
  auth: {
    jwtSecret: process.env.JWT_SECRET!,
    tokenExpiry: process.env.TOKEN_EXPIRY || '7d',
    cookieName: process.env.COOKIE_NAME || 'woofadaar_session',
    partnerCookieName: process.env.PARTNER_COOKIE_NAME || 'partner-token',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
  },

  // File upload configuration
  upload: {
    maxSize: parseInt(process.env.MAX_UPLOAD_SIZE || '5242880'), // 5MB default
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxWidth: parseInt(process.env.MAX_IMAGE_WIDTH || '1200'),
    maxHeight: parseInt(process.env.MAX_IMAGE_HEIGHT || '1200'),
    quality: parseInt(process.env.IMAGE_QUALITY || '85'),
    uploadPath: process.env.UPLOAD_PATH || './uploads',
    tempPath: process.env.TEMP_PATH || './temp',
  },

  // Rate limiting configuration
  rateLimit: {
    // General API rate limits
    api: {
      windowMs: parseInt(process.env.API_RATE_WINDOW || '900000'), // 15 minutes
      maxRequests: parseInt(process.env.API_RATE_MAX || '100'),
    },
    // Dog creation specific limits
    dogCreation: {
      windowMs: parseInt(process.env.DOG_RATE_WINDOW || '900000'), // 15 minutes
      maxRequests: parseInt(process.env.DOG_RATE_MAX || '5'),
    },
    // Authentication limits
    auth: {
      windowMs: parseInt(process.env.AUTH_RATE_WINDOW || '900000'), // 15 minutes
      maxRequests: parseInt(process.env.AUTH_RATE_MAX || '10'),
    },
    // File upload limits
    upload: {
      windowMs: parseInt(process.env.UPLOAD_RATE_WINDOW || '600000'), // 10 minutes
      maxRequests: parseInt(process.env.UPLOAD_RATE_MAX || '10'),
    },
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    maxFileSize: parseInt(process.env.LOG_MAX_FILE_SIZE || '5242880'), // 5MB
    maxFiles: parseInt(process.env.LOG_MAX_FILES || '5'),
    logDirectory: process.env.LOG_DIRECTORY || './logs',
    enableConsole: process.env.NODE_ENV !== 'production',
  },

  // Health tracking configuration
  health: {
    maxHealthLogs: parseInt(process.env.MAX_HEALTH_LOGS || '1000'),
    maxReminders: parseInt(process.env.MAX_REMINDERS || '50'),
    dataRetentionDays: parseInt(process.env.HEALTH_DATA_RETENTION_DAYS || '1095'), // 3 years
    analyticsWindowDays: parseInt(process.env.ANALYTICS_WINDOW_DAYS || '365'),
  },

  // External services
  services: {
    kci: {
      apiUrl: process.env.KCI_API_URL || 'https://api.kci.org.in',
      apiKey: process.env.KCI_API_KEY,
      timeout: parseInt(process.env.KCI_API_TIMEOUT || '10000'),
    },
    email: {
      provider: process.env.EMAIL_PROVIDER || 'smtp',
      smtpHost: process.env.SMTP_HOST,
      smtpPort: parseInt(process.env.SMTP_PORT || '587'),
      smtpUser: process.env.SMTP_USER,
      smtpPassword: process.env.SMTP_PASSWORD,
      fromAddress: process.env.FROM_EMAIL || 'noreply@woofadaar.com',
    },
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      apiSecret: process.env.CLOUDINARY_API_SECRET,
    },
  },

  // Application settings
  app: {
    name: 'Woofadaar',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000'),
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
    cors: {
      origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
      credentials: true,
    },
  },

  // Security settings
  security: {
    enableCors: process.env.ENABLE_CORS === 'true',
    enableRateLimit: process.env.ENABLE_RATE_LIMIT !== 'false', // Enabled by default
    enableSecurityHeaders: process.env.ENABLE_SECURITY_HEADERS !== 'false',
    csrfSecret: process.env.CSRF_SECRET,
    sessionSecret: process.env.SESSION_SECRET || process.env.JWT_SECRET,
  },

  // Feature flags
  features: {
    healthTracking: process.env.FEATURE_HEALTH_TRACKING !== 'false',
    kciIntegration: process.env.FEATURE_KCI_INTEGRATION !== 'false',
    partnerPortal: process.env.FEATURE_PARTNER_PORTAL !== 'false',
    corporateEnrollment: process.env.FEATURE_CORPORATE_ENROLLMENT !== 'false',
    premiumFeatures: process.env.FEATURE_PREMIUM !== 'false',
    mobileApp: process.env.FEATURE_MOBILE_APP !== 'false',
  },

  // Performance settings
  performance: {
    enableCaching: process.env.ENABLE_CACHING !== 'false',
    cacheTimeout: parseInt(process.env.CACHE_TIMEOUT || '300'), // 5 minutes
    enableCompression: process.env.ENABLE_COMPRESSION !== 'false',
    maxRequestSize: process.env.MAX_REQUEST_SIZE || '10mb',
  },
};

// Validation function to ensure required environment variables are set
export const validateConfig = (): void => {
  const requiredVars = [
    'DATABASE_URL',
    'JWT_SECRET',
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate specific configurations
  if (config.auth.bcryptRounds < 10 || config.auth.bcryptRounds > 15) {
    throw new Error('BCRYPT_ROUNDS must be between 10 and 15');
  }

  if (config.upload.maxSize > 10 * 1024 * 1024) { // 10MB
    console.warn('MAX_UPLOAD_SIZE is set to more than 10MB, this may cause performance issues');
  }
};

// Get configuration for specific environment
export const getEnvironmentConfig = () => {
  const env = config.app.environment;
  
  return {
    ...config,
    // Environment-specific overrides
    logging: {
      ...config.logging,
      level: env === 'production' ? 'warn' : 'debug',
      enableConsole: env !== 'production',
    },
    security: {
      ...config.security,
      enableRateLimit: env === 'production' ? true : config.security.enableRateLimit,
    },
  };
};

// Export commonly used configuration subsets
export const authConfig = config.auth;
export const uploadConfig = config.upload;
export const rateLimitConfig = config.rateLimit;
export const healthConfig = config.health;
export const securityConfig = config.security;

export default config;