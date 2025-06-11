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
    const payload = JWTService.verifyAccessToken(token);

    // Get fresh user data
    const user = await AuthService.getUserById(payload.userId);
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: 'Invalid token - user not found'
      });
    }

    request.user = user;
  } catch (error) {
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
    return reply.status(403).send({
      success: false,
      error: 'Tenant access required'
    });
  }
  done();
}