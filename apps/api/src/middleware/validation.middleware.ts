import { FastifyRequest, FastifyReply } from 'fastify';
import { ZodError, ZodSchema } from 'zod';

// CRITICAL: Input sanitization function
function sanitizeInput(obj: any): any {
  if (typeof obj === 'string') {
    // Remove potential XSS payloads
    return obj
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeInput);
  }
  
  if (obj !== null && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return obj;
}

export function validateBody<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // CRITICAL: Sanitize input before validation
      const sanitizedBody = sanitizeInput(request.body);
      
      // CRITICAL: Check body size (prevent DoS)
      const bodyString = JSON.stringify(sanitizedBody);
      if (bodyString.length > 1024 * 1024) { // 1MB limit
        return reply.status(413).send({
          success: false,
          error: 'Request body too large'
        });
      }

      request.body = schema.parse(sanitizedBody);
    } catch (error) {
      // CRITICAL: Log validation failures for monitoring
      request.log.warn({
        error: error instanceof ZodError ? error.errors : error.message,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        bodySize: JSON.stringify(request.body || {}).length
      }, 'Request validation failed');

      if (error instanceof ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'Validation failed',
          details: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message
          }))
        });
      }
      
      return reply.status(400).send({
        success: false,
        error: 'Invalid request body'
      });
    }
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // CRITICAL: Sanitize query parameters
      const sanitizedQuery = sanitizeInput(request.query);
      request.query = schema.parse(sanitizedQuery);
    } catch (error) {
      request.log.warn({
        error: error instanceof ZodError ? error.errors : error.message,
        ip: request.ip,
        query: request.query
      }, 'Query validation failed');

      if (error instanceof ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'Query validation failed',
          details: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message
          }))
        });
      }
      
      return reply.status(400).send({
        success: false,
        error: 'Invalid query parameters'
      });
    }
  };
}