import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { config } from '@kitchzero/config';
import { authRoutes } from './routes/auth.routes';

const fastify = Fastify({ 
  logger: true
});

const start = async () => {
  try {
    // Register plugins
    await fastify.register(cors, {
      origin: ['http://localhost:3000'],
      credentials: true
    });

    await fastify.register(jwt, {
      secret: config.jwtSecret
    });

    // Health check route
    fastify.get('/health', async () => {
      return { status: 'ok', timestamp: new Date().toISOString() };
    });

    // Register auth routes
    await fastify.register(authRoutes, { prefix: '/auth' });

    // Global error handler
    fastify.setErrorHandler((error, request, reply) => {
      fastify.log.error(error);
      
      if (error.statusCode === 400) {
        return reply.status(400).send({
          success: false,
          error: error.message
        });
      }

      if (error.message?.includes('jwt') || error.message?.includes('token')) {
        return reply.status(401).send({
          success: false,
          error: 'Invalid or expired token'
        });
      }

      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      });
    });

    // Start the server
    await fastify.listen({ port: config.port, host: '0.0.0.0' });
    console.log('🚀 API Server running on http://localhost:' + config.port);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();