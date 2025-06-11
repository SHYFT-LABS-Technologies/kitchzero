import path from 'path';

// Load environment variables from root .env
const envPath = path.resolve(process.cwd(), '../../.env');

// Try to load dotenv, but don't fail if it doesn't exist
try {
  require('dotenv').config({ path: envPath });
} catch (error) {
  // dotenv might not be available in all contexts
  console.warn('Could not load dotenv, using environment variables as-is');
}

export const config = {
  port: parseInt(process.env.PORT || '3001'),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL!,
  jwtSecret: process.env.JWT_SECRET!,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET!,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
};