import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole, AuthUser } from '@kitchzero/types';
import { JWTService } from '../services/jwt.service';
import { AuthService } from '../services/auth.service';

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

export async function authenticateToken(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        success: false,
        error: 'Access token required'
      });
    }

    const token = authHeader.substring(7);
    
    // CRITICAL: Validate token format
    if (!token || token.length < 10) {
      return reply.status(401).send({
        success: false,
        error: 'Invalid token format'
      });
    }

    const payload = JWTService.verifyAccessToken(token);

    // CRITICAL: Additional token validation
    if (!payload.userId || !payload.username || !payload.role) {
      return reply.status(401).send({
        success: false,
        error: 'Invalid token payload'
      });
    }

    // Get fresh user data and validate account status
    const user = await AuthService.getUserById(payload.userId);
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: 'User not found'
      });
    }

    // CRITICAL: Check if user account is still active
    if (!user.isActive) {
      return reply.status(401).send({
        success: false,
        error: 'Account is disabled'
      });
    }

    // CRITICAL: Log authentication for audit trail
    request.log.info({
      userId: user.id,
      username: user.username,
      role: user.role,
      ip: request.ip,
      userAgent: request.headers['user-agent']
    }, 'User authenticated');

    request.user = user;
  } catch (error) {
    // CRITICAL: Log failed authentication attempts
    request.log.warn({
      error: error.message,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      authHeader: request.headers.authorization ? 'present' : 'missing'
    }, 'Authentication failed');

    return reply.status(401).send({
      success: false,
      error: 'Invalid or expired token'
    });
  }
}

export function requirePasswordChange(
  request: FastifyRequest,
  reply: FastifyReply,
  done: () => void
) {
  if (request.user?.mustChangePassword) {
    return reply.status(403).send({
      success: false,
      error: 'Password change required',
      mustChangePassword: true
    });
  }
  done();
}

export function requireRole(roles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!roles.includes(request.user.role)) {
      // CRITICAL: Log authorization failures for audit
      request.log.warn({
        userId: request.user.id,
        username: request.user.username,
        userRole: request.user.role,
        requiredRoles: roles,
        ip: request.ip
      }, 'Authorization failed - insufficient permissions');

      return reply.status(403).send({
        success: false,
        error: 'Insufficient permissions'
      });
    }
  };
}

export function requireTenant(
  request: FastifyRequest,
  reply: FastifyReply,
  done: () => void
) {
  if (!request.user?.tenantId) {
    request.log.warn({
      userId: request.user?.id,
      username: request.user?.username,
      ip: request.ip
    }, 'Tenant access denied - no tenant association');

    return reply.status(403).send({
      success: false,
      error: 'Tenant access required'
    });
  }
  done();
}