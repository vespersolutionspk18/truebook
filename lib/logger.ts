import winston from 'winston';
import { Logtail } from '@logtail/node';
import { LogtailTransport } from '@logtail/winston';

const { combine, timestamp, errors, json, printf } = winston.format;

// Development format for console
const devFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  return msg;
});

// Create transports array
const transports: winston.transport[] = [];

// Console transport for all environments
transports.push(
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'production' 
      ? json() 
      : combine(
          winston.format.colorize(),
          timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          devFormat
        ),
    level: process.env.LOG_LEVEL || 'info',
  })
);

// Add Logtail transport if configured
if (process.env.LOGTAIL_SOURCE_TOKEN) {
  const logtail = new Logtail(process.env.LOGTAIL_SOURCE_TOKEN);
  transports.push(new LogtailTransport(logtail));
}

// Create the logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp(),
    errors({ stack: true }),
    json()
  ),
  defaultMeta: { 
    service: 'tbai',
    environment: process.env.NODE_ENV || 'development'
  },
  transports,
});

// Helper functions for structured logging
export function logApiRequest(
  method: string,
  path: string,
  metadata?: Record<string, any>
) {
  logger.info('API Request', {
    type: 'api_request',
    method,
    path,
    ...metadata,
  });
}

export function logApiResponse(
  method: string,
  path: string,
  statusCode: number,
  duration: number,
  metadata?: Record<string, any>
) {
  const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
  
  logger.log(level, 'API Response', {
    type: 'api_response',
    method,
    path,
    statusCode,
    duration,
    ...metadata,
  });
}

export function logError(
  error: Error,
  context: string,
  metadata?: Record<string, any>
) {
  logger.error('Error occurred', {
    type: 'error',
    context,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    ...metadata,
  });
}

export function logAudit(
  userId: string,
  organizationId: string,
  action: string,
  resource?: string,
  metadata?: Record<string, any>
) {
  logger.info('Audit log', {
    type: 'audit',
    userId,
    organizationId,
    action,
    resource,
    ...metadata,
  });
}

export function logSecurity(
  event: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  metadata?: Record<string, any>
) {
  const level = severity === 'critical' ? 'error' : severity === 'high' ? 'warn' : 'info';
  
  logger.log(level, 'Security event', {
    type: 'security',
    event,
    severity,
    ...metadata,
  });
}

// Middleware for API route logging
export function withLogging<T extends Record<string, any>>(
  handler: (req: Request, params?: T) => Promise<Response>
) {
  return async (req: Request, params?: T) => {
    const start = Date.now();
    const url = new URL(req.url);
    
    logApiRequest(req.method, url.pathname, {
      headers: Object.fromEntries(req.headers.entries()),
      query: Object.fromEntries(url.searchParams.entries()),
    });

    try {
      const response = await handler(req, params);
      const duration = Date.now() - start;
      
      logApiResponse(req.method, url.pathname, response.status, duration);
      
      return response;
    } catch (error) {
      const duration = Date.now() - start;
      
      logApiResponse(req.method, url.pathname, 500, duration);
      logError(error as Error, 'API Handler', {
        method: req.method,
        path: url.pathname,
      });
      
      throw error;
    }
  };
}