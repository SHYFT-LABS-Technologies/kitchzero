import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { config } from '@kitchzero/config';

const fastify = Fastify({ logger: true });

// Register plugins
await fastify.register(cors, {
  origin: ['http://localhost:3000'],
  credentials: true
});

await fastify.register(jwt, {
  secret: config.jwtSecret
});

// Health check
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: config.port, host: '0.0.0.0' });
    console.log(`🚀 API Server running on http://localhost:${config.port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();