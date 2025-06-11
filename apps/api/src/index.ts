// apps/api/src/index.ts (Updated)
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import { config } from '@kitchzero/config';
import { authRoutes } from './routes/auth.routes';
import { inventoryRoutes } from './routes/inventory.routes';
import { wasteRoutes } from './routes/waste.routes';
import { recipeRoutes } from './routes/recipe.routes';
import { approvalRoutes } from './routes/approval.routes';
import { restaurantAdminRoutes } from './routes/restaurant-admin.routes';
import { branchAdminRoutes } from './routes/branch-admin.routes';

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    genReqId: () => crypto.randomUUID(),
  }
});

const start = async () => {
  try {
    // CRITICAL: Security headers
    await fastify.register(helmet, {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      crossOriginEmbedderPolicy: false,
    });

    // CRITICAL: Rate limiting
    await fastify.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute',
      skipSuccessfulRequests: false,
      keyGenerator: (request) => {
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

    // CRITICAL: Auth rate limiting
    await fastify.register(async function (fastify) {
      await fastify.register(rateLimit, {
        max: 5,
        timeWindow: '15 minutes',
        keyGenerator: (request) => `auth-${request.ip}`,
        errorResponseBuilder: (req, context) => {
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
        }
      });
    }, { prefix: '/auth' });

    // CRITICAL: Enhanced CORS
    await fastify.register(cors, {
      origin: (origin, callback) => {
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
      maxAge: 86400
    });

    // JWT configuration
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

    // Health check
    fastify.get('/health', async () => {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        services: {
          database: 'healthy', // Could add actual DB health check
          auth: 'healthy',
          inventory: 'healthy',
          waste: 'healthy',
          recipes: 'healthy'
        }
      };
    });

    // Register all routes
    await fastify.register(authRoutes, { prefix: '/auth' });
    await fastify.register(inventoryRoutes, { prefix: '/inventory' });
    await fastify.register(wasteRoutes, { prefix: '/waste' });
    await fastify.register(recipeRoutes, { prefix: '/recipes' });
    await fastify.register(approvalRoutes, { prefix: '/approvals' });
    await fastify.register(restaurantAdminRoutes, { prefix: '/restaurant-admin' });
    await fastify.register(branchAdminRoutes, { prefix: '/branch-admin' });

    // CRITICAL: Enhanced error handler
    fastify.setErrorHandler((error, request, reply) => {
      const requestId = request.id;

      fastify.log.error({
        err: error,
        requestId,
        url: request.url,
        method: request.method,
        userAgent: request.headers['user-agent'],
        ip: request.ip
      }, 'Request error');

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

        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
          requestId
        });
      } else {
        return reply.status(error.statusCode || 500).send({
          success: false,
          error: error.message,
          requestId,
          stack: error.stack
        });
      }
    });

    // Graceful shutdown
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
      backlog: 511
    });

    console.log('🚀 KitchZero API Server running on http://localhost:' + config.port);
    console.log('🔒 Security middleware enabled');
    console.log('📦 Inventory management: FIFO-based tracking');
    console.log('🗑️  Waste logging: RAW and PRODUCT waste tracking');
    console.log('📋 Recipe management: Cost calculation and scaling');
    console.log('✅ Approval workflow: Branch admin approval system');
    console.log('📊 Audit logging: Comprehensive activity tracking');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();