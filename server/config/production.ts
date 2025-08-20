import { z } from 'zod';

// Environment variables schema for production
const productionConfigSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  
  // JWT Configuration
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  
  // Server Configuration
  PORT: z.string().transform(val => parseInt(val, 10)).default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  
  // Security
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
  CORS_ENABLED: z.string().transform(val => val === 'true').default('true'),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(val => parseInt(val, 10)).default('900000'), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(val => parseInt(val, 10)).default('100'),
  
  // Email Configuration
  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_FROM_EMAIL: z.string().email().optional(),
  
  // SMS Configuration
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  
    // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FILE_ENABLED: z.string().transform(val => val === 'true').default('true'),
  
  // Monitoring
  SENTRY_DSN: z.string().optional(),
  DATADOG_API_KEY: z.string().optional(),
  
  // Cache Configuration
  REDIS_URL: z.string().optional(),
  CACHE_TTL: z.string().transform(val => parseInt(val, 10)).default('300000'), // 5 minutes
  
  // File Upload
  MAX_FILE_SIZE: z.string().transform(val => parseInt(val, 10)).default('10485760'), // 10MB
  UPLOAD_PATH: z.string().default('./uploads'),
  
  // SSL/TLS
  SSL_ENABLED: z.string().transform(val => val === 'true').default('false'),
  SSL_CERT_PATH: z.string().optional(),
  SSL_KEY_PATH: z.string().optional(),
  
  // Backup Configuration
  BACKUP_ENABLED: z.string().transform(val => val === 'true').default('false'),
  BACKUP_SCHEDULE: z.string().default('0 2 * * *'), // Daily at 2 AM
  BACKUP_RETENTION_DAYS: z.string().transform(val => parseInt(val, 10)).default('30'),
  
  // Health Check
  HEALTH_CHECK_INTERVAL: z.string().transform(val => parseInt(val, 10)).default('60000'), // 1 minute
  
  // Performance
  MAX_CONCURRENT_REQUESTS: z.string().transform(val => parseInt(val, 10)).default('100'),
  REQUEST_TIMEOUT: z.string().transform(val => parseInt(val, 10)).default('30000'), // 30 seconds
  
  // Security Headers
  SECURITY_HEADERS_ENABLED: z.string().transform(val => val === 'true').default('true'),
  CSP_ENABLED: z.string().transform(val => val === 'true').default('true'),
  
  // API Documentation
  API_DOCS_ENABLED: z.string().transform(val => val === 'true').default('false'),
  API_DOCS_PATH: z.string().default('/api-docs'),
});

// Production configuration class
export class ProductionConfig {
  private config: z.infer<typeof productionConfigSchema>;

  constructor() {
    this.validateEnvironment();
    this.config = productionConfigSchema.parse(process.env);
  }

  private validateEnvironment(): void {
    const requiredVars = ['DATABASE_URL', 'JWT_SECRET'];
    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  // Database configuration
  get database() {
    return {
      url: this.config.DATABASE_URL,
      ssl: this.config.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      pool: {
        min: 2,
        max: 10,
        acquireTimeoutMillis: 30000,
        createTimeoutMillis: 30000,
        destroyTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 100,
      },
    };
  }

  // JWT configuration
  get jwt() {
    return {
      secret: this.config.JWT_SECRET,
      expiresIn: this.config.JWT_EXPIRES_IN,
      issuer: 'salon-spa-app',
      audience: 'salon-spa-users',
    };
  }

  // Server configuration
  get server() {
    return {
      port: this.config.PORT,
      nodeEnv: this.config.NODE_ENV,
      requestTimeout: this.config.REQUEST_TIMEOUT,
      maxConcurrentRequests: this.config.MAX_CONCURRENT_REQUESTS,
    };
  }

  // Security configuration
  get security() {
    return {
      allowedOrigins: this.config.ALLOWED_ORIGINS.split(','),
      corsEnabled: this.config.CORS_ENABLED,
      rateLimit: {
        windowMs: this.config.RATE_LIMIT_WINDOW_MS,
        max: this.config.RATE_LIMIT_MAX_REQUESTS,
      },
      headers: {
        enabled: this.config.SECURITY_HEADERS_ENABLED,
        csp: this.config.CSP_ENABLED,
      },
      ssl: {
        enabled: this.config.SSL_ENABLED,
        cert: this.config.SSL_CERT_PATH,
        key: this.config.SSL_KEY_PATH,
      },
    };
  }

  // Email configuration
  get email() {
    return {
      sendgrid: {
        apiKey: this.config.SENDGRID_API_KEY,
        fromEmail: this.config.SENDGRID_FROM_EMAIL,
      },
    };
  }

  // SMS configuration
  get sms() {
    return {
      twilio: {
        accountSid: this.config.TWILIO_ACCOUNT_SID,
        authToken: this.config.TWILIO_AUTH_TOKEN,
        phoneNumber: this.config.TWILIO_PHONE_NUMBER,
      },
    };
  }

  // Logging configuration
  get logging() {
    return {
      level: this.config.LOG_LEVEL,
      fileEnabled: this.config.LOG_FILE_ENABLED,
      sentry: {
        dsn: this.config.SENTRY_DSN,
      },
      datadog: {
        apiKey: this.config.DATADOG_API_KEY,
      },
    };
  }

  // Cache configuration
  get cache() {
    return {
      redis: {
        url: this.config.REDIS_URL,
      },
      ttl: this.config.CACHE_TTL,
    };
  }

  // File upload configuration
  get upload() {
    return {
      maxFileSize: this.config.MAX_FILE_SIZE,
      path: this.config.UPLOAD_PATH,
    };
  }

  // Backup configuration
  get backup() {
    return {
      enabled: this.config.BACKUP_ENABLED,
      schedule: this.config.BACKUP_SCHEDULE,
      retentionDays: this.config.BACKUP_RETENTION_DAYS,
    };
  }

  // Health check configuration
  get healthCheck() {
    return {
      interval: this.config.HEALTH_CHECK_INTERVAL,
    };
  }

  // API documentation configuration
  get apiDocs() {
    return {
      enabled: this.config.API_DOCS_ENABLED,
      path: this.config.API_DOCS_PATH,
    };
  }

  // Get all configuration
  get all() {
    return this.config;
  }

  // Validate configuration
  validate(): void {
    try {
      productionConfigSchema.parse(process.env);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues.map(issue => 
          `${issue.path.join('.')}: ${issue.message}`
        ).join(', ');
        throw new Error(`Configuration validation failed: ${issues}`);
      }
      throw error;
    }
  }

  // Get configuration for specific environment
  getForEnvironment(env: 'development' | 'production' | 'test') {
    const config = { ...this.config };
    config.NODE_ENV = env;
    return config;
  }
}

// Export singleton instance
export const productionConfig = new ProductionConfig();

// Environment-specific configurations
export const configs = {
  development: {
    ...productionConfig.all,
    NODE_ENV: 'development',
    LOG_LEVEL: 'debug',
    LOG_FILE_ENABLED: 'false',
    API_DOCS_ENABLED: 'true',
  },
  production: {
    ...productionConfig.all,
    NODE_ENV: 'production',
    LOG_LEVEL: 'info',
    LOG_FILE_ENABLED: 'true',
    API_DOCS_ENABLED: 'false',
    SSL_ENABLED: 'true',
  },
  test: {
    ...productionConfig.all,
    NODE_ENV: 'test',
    LOG_LEVEL: 'error',
    LOG_FILE_ENABLED: 'false',
    API_DOCS_ENABLED: 'false',
  },
};

// Security checklist
export const securityChecklist = {
  authentication: [
    'JWT tokens implemented',
    'Password hashing with bcrypt',
    'Rate limiting on auth endpoints',
    'Input validation and sanitization',
  ],
  authorization: [
    'Role-based access control (RBAC)',
    'Resource-level permissions',
    'API endpoint protection',
  ],
  dataProtection: [
    'HTTPS/TLS encryption',
    'Database connection encryption',
    'Sensitive data encryption',
    'Secure headers implementation',
  ],
  monitoring: [
    'Request logging',
    'Error tracking',
    'Performance monitoring',
    'Security event logging',
  ],
  infrastructure: [
    'Environment variable management',
    'Database backup strategy',
    'SSL certificate management',
    'Rate limiting configuration',
  ],
};

// Performance optimization checklist
export const performanceChecklist = {
  database: [
    'Database indexes created',
    'Query optimization implemented',
    'Connection pooling configured',
    'Caching strategy implemented',
  ],
  application: [
    'Memory usage monitoring',
    'Request timeout configuration',
    'Concurrent request limiting',
    'File upload size limits',
  ],
  monitoring: [
    'Performance metrics collection',
    'Slow query detection',
    'Memory leak detection',
    'Response time monitoring',
  ],
};

export default productionConfig; 