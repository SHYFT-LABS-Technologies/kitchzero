// apps/api/src/routes/auth.routes.ts (Updated to use AuthService validation)
import { FastifyInstance } from 'fastify';
import { 
  loginSchema, 
  changePasswordSchema, 
  refreshTokenSchema 
} from '@kitchzero/schemas';
import { AuthService } from '../services/auth.service';
import { authenticateToken, requirePasswordChange } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { z } from 'zod';

const passwordStrengthSchema = z.object({
  password: z.string().min(1, 'Password is required'),
  username: z.string().optional()
});

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

  // Password requirements endpoint
  fastify.get('/password-requirements', {
    preHandler: [authenticateToken],
  }, async (request, reply) => {
    return {
      success: true,
      data: {
        requirements: {
          minLength: 12,
          maxLength: 128,
          requireLowercase: true,
          requireUppercase: true,
          requireNumbers: true,
          requireSpecialChars: true,
          preventCommonPasswords: true,
          preventPersonalInfo: true,
          preventPasswordReuse: 5
        },
        tips: [
          'Use a passphrase with 4+ unrelated words',
          'Include a mix of letters, numbers, and symbols',
          'Avoid personal information like names or dates',
          'Consider using a password manager',
          'Make it at least 12 characters long'
        ],
        examples: [
          'Coffee$Mountain#Running2025',
          'Blue^Ocean*Sunset!Dreams',
          'Pizza&Code#Weekend@Fun'
        ]
      }
    };
  });

  // Password strength checker
  fastify.post('/check-password-strength', {
    preHandler: [authenticateToken, validateBody(passwordStrengthSchema)],
  }, async (request, reply) => {
    const { password, username } = request.body as any;
    const user = request.user!;
    
    try {
      const strengthResult = AuthService.validatePasswordStrength(password, username || user.username);
      
      // Convert to expected format
      const response = {
        score: strengthResult.score,
        strength: strengthResult.score >= 80 ? 'strong' : 
                  strengthResult.score >= 60 ? 'good' : 
                  strengthResult.score >= 40 ? 'fair' : 'weak',
        isAcceptable: strengthResult.isValid,
        issues: strengthResult.errors,
        suggestions: strengthResult.errors.map(error => {
          if (error.includes('length')) return 'Use a longer password (12+ characters)';
          if (error.includes('lowercase')) return 'Add lowercase letters (a-z)';
          if (error.includes('uppercase')) return 'Add uppercase letters (A-Z)';
          if (error.includes('number')) return 'Add numbers (0-9)';
          if (error.includes('special')) return 'Add special characters (!@#$%^&*)';
          if (error.includes('repeated')) return 'Avoid repeating characters';
          if (error.includes('common')) return 'Choose a more unique password';
          if (error.includes('username')) return 'Remove your username from the password';
          return 'Improve password strength';
        }).slice(0, 3)
      };
      
      return {
        success: true,
        data: response
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to check password strength'
      });
    }
  });

  // Change password endpoint
  fastify.post('/change-password', {
    preHandler: [authenticateToken, validateBody(changePasswordSchema)],
  }, async (request, reply) => {
    const passwordData = request.body as any;
    const userId = request.user!.id;
    const user = request.user!;
    const isFirstTimeChange = user.mustChangePassword;

    try {
      await AuthService.changePassword(userId, passwordData);

      return {
        success: true,
        message: isFirstTimeChange 
          ? 'Password successfully changed. You can now access all features.'
          : 'Password successfully changed.',
        data: {
          mustChangePassword: false,
          nextStep: isFirstTimeChange ? 'redirect_to_dashboard' : null
        }
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