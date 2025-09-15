import winston from 'winston';

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.colorize({ all: true })
  ),
  defaultMeta: { 
    service: 'woofadaar-api',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Write all logs with level `error` and below to `error.log`
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write all logs with level `info` and below to `combined.log`
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  ]
});

// If we're not in production, log to the console as well
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Enhanced logging functions with context
export const logError = (message: string, error: Error, context?: Record<string, any>) => {
  logger.error(message, {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    ...context
  });
};

export const logInfo = (message: string, context?: Record<string, any>) => {
  logger.info(message, context);
};

export const logWarn = (message: string, context?: Record<string, any>) => {
  logger.warn(message, context);
};

export const logDebug = (message: string, context?: Record<string, any>) => {
  logger.debug(message, context);
};

// API request logging middleware helper
export const createRequestLog = (method: string, url: string, userId?: string) => ({
  method,
  url,
  userId,
  timestamp: new Date().toISOString(),
  requestId: Math.random().toString(36).substring(2, 15)
});

// Database operation logging
export const logDatabaseOperation = (operation: string, table: string, duration: number, success: boolean, error?: Error) => {
  const logData = {
    operation,
    table,
    duration: `${duration}ms`,
    success
  };

  if (success) {
    logger.info(`Database ${operation} completed`, logData);
  } else {
    logger.error(`Database ${operation} failed`, {
      ...logData,
      error: error?.message
    });
  }
};

// Security event logging
export const logSecurityEvent = (event: string, userId?: string, details?: Record<string, any>) => {
  logger.warn(`Security event: ${event}`, {
    userId,
    timestamp: new Date().toISOString(),
    ...details
  });
};

// Performance monitoring
export const logPerformance = (operation: string, duration: number, context?: Record<string, any>) => {
  const level = duration > 1000 ? 'warn' : 'info';
  logger.log(level, `Performance: ${operation}`, {
    duration: `${duration}ms`,
    slow: duration > 1000,
    ...context
  });
};

export { logger };
export default logger;