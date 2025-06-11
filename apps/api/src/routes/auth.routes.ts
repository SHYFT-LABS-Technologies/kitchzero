import { FastifyInstance } from 'fastify';
import { 
  loginSchema, 
  changePasswordSchema, 
  refreshTokenSchema 
} from '@kitchzero/schemas';
import { AuthService } from '../services/auth.service';
import { authenticateToken, requirePasswordChange } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';

export async function authRoutes(fastify: FastifyInstance) {
  // Login endpoint
  fastify.post('/login', {
    preHandler: [validateBody(loginSchema)],
  }, async (request, reply) => {
    try {
      const credentials = request.body as any;
      const loginResponse = await AuthService.login(credentials);

      return {
        success: true,
        data: loginResponse
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Login failed'
      });
    }
  });

  // Change password endpoint
  fastify.post('/change-password', {
    preHandler: [authenticateToken, validateBody(changePasswordSchema)],
  }, async (request, reply) => {
    try {
      const passwordData = request.body as any;
      const userId = request.user!.id;

      await AuthService.changePassword(userId, passwordData);

      return {
        success: true,
        message: 'Password changed successfully'
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Password change failed'
      });
    }
  });

  // Refresh token endpoint
  fastify.post('/refresh', {
    preHandler: [validateBody(refreshTokenSchema)],
  }, async (request, reply) => {
    try {
      const { refreshToken } = request.body as any;
      const tokens = await AuthService.refreshTokens(refreshToken);

      return {
        success: true,
        data: tokens
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Token refresh failed'
      });
    }
  });

  // Logout endpoint
  fastify.post('/logout', {
    preHandler: [authenticateToken],
  }, async (request, reply) => {
    try {
      const { refreshToken } = request.body as { refreshToken: string };
      await AuthService.logout(refreshToken);

      return {
        success: true,
        message: 'Logged out successfully'
      };
    } catch (error) {
      fastify.log.error(error);
      return {
        success: true,
        message: 'Logged out successfully'
      };
    }
  });

  // Get current user endpoint
  fastify.get('/me', {
    preHandler: [authenticateToken],
  }, async (request) => {
    return {
      success: true,
      data: {
        user: request.user!
      }
    };
  });

  // Protected endpoint example
  fastify.get('/protected', {
    preHandler: [authenticateToken, requirePasswordChange],
  }, async (request) => {
    return {
      success: true,
      message: 'Access granted to protected resource',
      user: request.user!.username
    };
  });
}