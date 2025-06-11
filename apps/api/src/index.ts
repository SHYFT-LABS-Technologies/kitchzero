import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import { config } from '@kitchzero/config';
import { authRoutes } from './routes/auth.routes';

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    // Add request IDs for better tracing
    genReqId: () => crypto.randomUUID(),
  }
});

const start = async () => {
  try {
    // CRITICAL: Security headers - protects against XSS, clickjacking, etc.
    await fastify.register(helmet, {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      crossOriginEmbedderPolicy: false, // Needed for some APIs
    });

    // CRITICAL: Rate limiting - prevents brute force attacks
    await fastify.register(rateLimit, {
      max: 100, // 100 requests
      timeWindow: '1 minute',
      skipSuccessfulRequests: false,
      keyGenerator: (request) => {
        // Rate limit by IP + User ID (if authenticated)
        const ip = request.ip;
        const userId = request.user?.id;
        return userId ? `${ip}-${userId}` : ip;
      },
      errorResponseBuilder: () => ({
        success: false,
        error: 'Too many requests. Please try again later.',
        retryAfter: 60
      })
    });

    // CRITICAL: Stricter auth rate limiting
    await fastify.register(async function (fastify) {
      await fastify.register(rateLimit, {
        max: 5, // Only 5 login attempts
        timeWindow: '15 minutes',
        keyGenerator: (request) => `auth-${request.ip}`,
        errorResponseBuilder: (req, context) => {
          // Log the rate limit event
          req.log.warn({
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            url: req.url
          }, 'Auth rate limit exceeded');

          return {
            success: false,
            error: 'Too many login attempts. Please try again in 15 minutes.',
            retryAfter: 900
          };
        },
        onExceeding: (req, key) => {
          req.log.warn({
            ip: req.ip,
            key,
            userAgent: req.headers['user-agent']
          }, 'Auth rate limit warning - approaching limit');
        }
      });
    }, { prefix: '/auth' });

    // CRITICAL: Enhanced CORS configuration
    await fastify.register(cors, {
      origin: (origin, callback) => {
        // In development, allow localhost
        if (process.env.NODE_ENV === 'development') {
          const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:3001',
            'http://127.0.0.1:3000'
          ];
          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'), false);
          }
        } else {
          // In production, use environment variable
          const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
          if (allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'), false);
          }
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin'
      ],
      maxAge: 86400 // 24 hours
    });

    // JWT configuration with security enhancements
    await fastify.register(jwt, {
      secret: config.jwtSecret,
      sign: {
        algorithm: 'HS256',
        issuer: 'kitchzero-api',
        audience: 'kitchzero-app',
        expiresIn: config.jwtExpiresIn
      },
      verify: {
        algorithms: ['HS256'],
        issuer: 'kitchzero-api',
        audience: 'kitchzero-app'
      }
    });

    // Health check with basic system info
    fastify.get('/health', async () => {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      };
    });

    // Register auth routes
    await fastify.register(authRoutes, { prefix: '/auth' });

    // CRITICAL: Enhanced error handler with security considerations
    fastify.setErrorHandler((error, request, reply) => {
      const requestId = request.id;

      // Log error with request context
      fastify.log.error({
        err: error,
        requestId,
        url: request.url,
        method: request.method,
        userAgent: request.headers['user-agent'],
        ip: request.ip
      }, 'Request error');

      // Don't expose internal errors in production
      if (process.env.NODE_ENV === 'production') {
        if (error.statusCode === 400) {
          return reply.status(400).send({
            success: false,
            error: 'Bad request',
            requestId
          });
        }

        if (error.statusCode === 401) {
          return reply.status(401).send({
            success: false,
            error: 'Unauthorized',
            requestId
          });
        }

        if (error.statusCode === 403) {
          return reply.status(403).send({
            success: false,
            error: 'Forbidden',
            requestId
          });
        }

        if (error.statusCode === 429) {
          return reply.status(429).send({
            success: false,
            error: 'Too many requests',
            requestId,
            retryAfter: error.retryAfter
          });
        }

        // Generic server error - don't expose details
        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
          requestId
        });
      } else {
        // Development - show detailed errors
        return reply.status(error.statusCode || 500).send({
          success: false,
          error: error.message,
          requestId,
          stack: error.stack
        });
      }
    });

    // CRITICAL: Graceful shutdown handling
    const gracefulShutdown = () => {
      fastify.log.info('Received shutdown signal, closing server gracefully...');
      fastify.close(() => {
        fastify.log.info('Server closed successfully');
        process.exit(0);
      });
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

    // Start the server
    await fastify.listen({
      port: config.port,
      host: '0.0.0.0',
      backlog: 511 // Increase backlog for better performance
    });

    console.log('🚀 API Server running on http://localhost:' + config.port);
    console.log('🔒 Security middleware enabled');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();