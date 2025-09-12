// Custom error types for better error handling
export class AppError extends Error {
  public readonly statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400);
    this.name = 'ValidationError';
    if (details) {
      (this as any).details = details;
    }
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed') {
    super(message, 500);
    this.name = 'DatabaseError';
    this.isOperational = false;
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string = 'External service error') {
    super(`${service}: ${message}`, 502);
    this.name = 'ExternalServiceError';
    this.isOperational = false;
  }
}

// Error response interface
export interface ErrorResponse {
  error: string;
  message?: string;
  details?: any;
  timestamp: string;
  path?: string;
  method?: string;
}

// Centralized error handler
export function handleError(error: any, req?: any): ErrorResponse {
  const timestamp = new Date().toISOString();
  const path = req?.path;
  const method = req?.method;

  // Handle null or undefined errors
  if (!error) {
    return {
      error: 'InternalServerError',
      message: 'An unexpected error occurred',
      timestamp,
      path,
      method,
    };
  }

  // Handle known application errors
  if (error instanceof AppError) {
    return {
      error: error.name,
      message: error.message,
      details: (error as any).details,
      timestamp,
      path,
      method,
    };
  }

  // Handle Zod validation errors
  if (error?.name === 'ZodError') {
    const details = error.errors.map((err: any) => ({
      field: err.path.join('.'),
      message: err.message,
    }));
    
    return {
      error: 'ValidationError',
      message: 'Request validation failed',
      details,
      timestamp,
      path,
      method,
    };
  }

  // Handle database errors
  if (error.code === '23505') { // PostgreSQL unique constraint violation
    return {
      error: 'ConflictError',
      message: 'Resource already exists',
      timestamp,
      path,
      method,
    };
  }

  if (error.code === '23503') { // PostgreSQL foreign key constraint violation
    return {
      error: 'ValidationError',
      message: 'Referenced resource does not exist',
      timestamp,
      path,
      method,
    };
  }

  // Handle JWT errors
  if (error?.name === 'JsonWebTokenError') {
    return {
      error: 'AuthenticationError',
      message: 'Invalid token',
      timestamp,
      path,
      method,
    };
  }

  if (error?.name === 'TokenExpiredError') {
    return {
      error: 'AuthenticationError',
      message: 'Token expired',
      timestamp,
      path,
      method,
    };
  }

  // Handle unknown errors
  console.error('Unhandled error:', error);
  
  return {
    error: 'InternalServerError',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : error?.message || 'Unknown error',
    details: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
    timestamp,
    path,
    method,
  };
}

// Async error wrapper for route handlers
export function asyncHandler(fn: Function) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Error logging utility
export function logError(error: any, context?: any) {
  const errorInfo = {
    name: error?.name || 'UnknownError',
    message: error?.message || 'Unknown error',
    stack: error?.stack,
    timestamp: new Date().toISOString(),
    context,
  };

  // In production, you might want to send this to a logging service
  if (process.env.NODE_ENV === 'production') {
    console.error('Production Error:', JSON.stringify(errorInfo, null, 2));
  } else {
    console.error('Development Error:', errorInfo);
  }
} 