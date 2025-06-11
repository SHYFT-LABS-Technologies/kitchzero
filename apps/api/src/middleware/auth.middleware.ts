import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole, AuthUser } from '@kitchzero/types';
import { JWTService } from '../services/jwt.service';
import { AuthService } from '../services/auth.service';
import { AuditLogService } from '../services/audit-log.service';
import { SecurityService } from '../services/security.service';

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
    auditContext?: {
      sessionId: string;
      requestId: string;
      userAgent: string;
      ipAddress: string;
      geolocation?: string;
    };
  }
}

// CRITICAL: Enhanced authentication with comprehensive security checks
export async function authenticateToken(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const sessionId = crypto.randomUUID();
  const requestId = request.id;
  const userAgent = request.headers['user-agent'] || 'unknown';
  const ipAddress = SecurityService.extractClientIP(request);

  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      await AuditLogService.logAuthenticationAttempt({
        event: 'AUTHENTICATION_FAILED',
        reason: 'MISSING_TOKEN',
        ipAddress,
        userAgent,
        sessionId,
        timestamp: new Date()
      });

      return reply.status(401).send({
        success: false,
        error: 'Access token required',
        requestId
      });
    }

    const token = authHeader.substring(7);

    // CRITICAL: Token format validation
    if (!token || token.length < 10) {
      await AuditLogService.logAuthenticationAttempt({
        event: 'AUTHENTICATION_FAILED',
        reason: 'INVALID_TOKEN_FORMAT',
        ipAddress,
        userAgent,
        sessionId,
        timestamp: new Date()
      });

      return reply.status(401).send({
        success: false,
        error: 'Invalid token format',
        requestId
      });
    }

    // CRITICAL: Rate limiting check per IP for failed attempts
    const rateLimitCheck = await SecurityService.checkRateLimit(ipAddress, 'auth');
    if (!rateLimitCheck.allowed) {
      await AuditLogService.logSecurityEvent({
        event: 'RATE_LIMIT_EXCEEDED',
        severity: 'HIGH',
        ipAddress,
        userAgent,
        details: {
          attempts: rateLimitCheck.attempts,
          windowMs: rateLimitCheck.windowMs
        },
        timestamp: new Date()
      });

      return reply.status(429).send({
        success: false,
        error: 'Too many authentication attempts. Please try again later.',
        retryAfter: Math.ceil(rateLimitCheck.resetTime / 1000),
        requestId
      });
    }

    const payload = JWTService.verifyAccessToken(token);

    // CRITICAL: Additional payload security validation
    if (!payload.userId || !payload.username || !payload.role) {
      await AuditLogService.logAuthenticationAttempt({
        event: 'AUTHENTICATION_FAILED',
        reason: 'INVALID_TOKEN_PAYLOAD',
        ipAddress,
        userAgent,
        sessionId,
        tokenInfo: {
          hasUserId: !!payload.userId,
          hasUsername: !!payload.username,
          hasRole: !!payload.role
        },
        timestamp: new Date()
      });

      return reply.status(401).send({
        success: false,
        error: 'Invalid token payload',
        requestId
      });
    }

    // Get fresh user data with enhanced security checks
    const user = await AuthService.getUserById(payload.userId);
    if (!user) {
      await AuditLogService.logAuthenticationAttempt({
        event: 'AUTHENTICATION_FAILED',
        reason: 'USER_NOT_FOUND',
        userId: payload.userId,
        ipAddress,
        userAgent,
        sessionId,
        timestamp: new Date()
      });

      return reply.status(401).send({
        success: false,
        error: 'User not found',
        requestId
      });
    }

    // CRITICAL: Account status validation
    if (!user.isActive) {
      await AuditLogService.logAuthenticationAttempt({
        event: 'AUTHENTICATION_FAILED',
        reason: 'ACCOUNT_DISABLED',
        userId: user.id,
        username: user.username,
        ipAddress,
        userAgent,
        sessionId,
        timestamp: new Date()
      });

      return reply.status(401).send({
        success: false,
        error: 'Account is disabled',
        requestId
      });
    }

    // CRITICAL: Suspicious activity detection
    const suspiciousActivity = await SecurityService.detectSuspiciousActivity({
      userId: user.id,
      ipAddress,
      userAgent,
      lastLoginIP: user.lastLoginIP,
      lastLoginLocation: user.lastLoginLocation
    });

    if (suspiciousActivity.isHighRisk) {
      await AuditLogService.logSecurityEvent({
        event: 'SUSPICIOUS_LOGIN_DETECTED',
        severity: 'HIGH',
        userId: user.id,
        username: user.username,
        ipAddress,
        userAgent,
        details: suspiciousActivity.details,
        timestamp: new Date()
      });

      // Require additional verification for high-risk logins
      return reply.status(403).send({
        success: false,
        error: 'Additional verification required',
        requiresVerification: true,
        verificationMethods: ['email', 'sms'],
        requestId
      });
    }

    // CRITICAL: Set audit context for request
    request.auditContext = {
      sessionId,
      requestId,
      userAgent,
      ipAddress,
      geolocation: await SecurityService.getGeolocation(ipAddress)
    };

    // CRITICAL: Successful authentication logging
    await AuditLogService.logAuthenticationAttempt({
      event: 'AUTHENTICATION_SUCCESS',
      userId: user.id,
      username: user.username,
      role: user.role,
      tenantId: user.tenantId,
      branchId: user.branchId,
      ipAddress,
      userAgent,
      sessionId,
      timestamp: new Date()
    });

    request.user = user;
  } catch (error) {
    // CRITICAL: Log failed authentication with error details
    await AuditLogService.logAuthenticationAttempt({
      event: 'AUTHENTICATION_ERROR',
      reason: error.message,
      ipAddress,
      userAgent,
      sessionId,
      error: {
        name: error.constructor.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      timestamp: new Date()
    });

    return reply.status(401).send({
      success: false,
      error: 'Invalid or expired token',
      requestId
    });
  }
}

// CRITICAL: Enhanced role-based authorization with context awareness
export function requireRole(allowedRoles: UserRole[], options: {
  requireTenant?: boolean;
  requireBranch?: boolean;
  allowSelfAccess?: boolean;
} = {}) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      await AuditLogService.logAuthorizationEvent({
        event: 'AUTHORIZATION_FAILED',
        reason: 'NO_USER_CONTEXT',
        requestPath: request.url,
        requestMethod: request.method,
        ipAddress: request.auditContext?.ipAddress,
        timestamp: new Date()
      });

      return reply.status(401).send({
        success: false,
        error: 'Authentication required',
        requestId: request.id
      });
    }

    const user = request.user;

    // CRITICAL: Role validation
    if (!allowedRoles.includes(user.role)) {
      await AuditLogService.logAuthorizationEvent({
        event: 'AUTHORIZATION_FAILED',
        reason: 'INSUFFICIENT_ROLE',
        userId: user.id,
        username: user.username,
        userRole: user.role,
        requiredRoles: allowedRoles,
        requestPath: request.url,
        requestMethod: request.method,
        ipAddress: request.auditContext?.ipAddress,
        timestamp: new Date()
      });

      return reply.status(403).send({
        success: false,
        error: 'Insufficient permissions',
        requestId: request.id
      });
    }

    // CRITICAL: Tenant context validation for restaurant operations
    if (options.requireTenant && !user.tenantId) {
      await AuditLogService.logAuthorizationEvent({
        event: 'AUTHORIZATION_FAILED',
        reason: 'NO_TENANT_CONTEXT',
        userId: user.id,
        username: user.username,
        requestPath: request.url,
        requestMethod: request.method,
        timestamp: new Date()
      });

      return reply.status(403).send({
        success: false,
        error: 'Tenant context required',
        requestId: request.id
      });
    }

    // CRITICAL: Branch context validation for branch-specific operations
    if (options.requireBranch && !user.branchId) {
      await AuditLogService.logAuthorizationEvent({
        event: 'AUTHORIZATION_FAILED',
        reason: 'NO_BRANCH_CONTEXT',
        userId: user.id,
        username: user.username,
        requestPath: request.url,
        requestMethod: request.method,
        timestamp: new Date()
      });

      return reply.status(403).send({
        success: false,
        error: 'Branch context required',
        requestId: request.id
      });
    }

    // CRITICAL: Log successful authorization
    await AuditLogService.logAuthorizationEvent({
      event: 'AUTHORIZATION_SUCCESS',
      userId: user.id,
      username: user.username,
      userRole: user.role,
      tenantId: user.tenantId,
      branchId: user.branchId,
      requestPath: request.url,
      requestMethod: request.method,
      ipAddress: request.auditContext?.ipAddress,
      timestamp: new Date()
    });
  };
}

// CRITICAL: Multi-tenant data isolation middleware
export function requireTenantDataAccess(options: {
  tenantIdParam?: string;
  allowCrossTenantForRoles?: UserRole[];
} = {}) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user!;
    const tenantIdParam = options.tenantIdParam || 'tenantId';
    const requestedTenantId = request.params?.[tenantIdParam] || request.body?.[tenantIdParam];

    // CRITICAL: Cross-tenant access validation
    if (requestedTenantId && requestedTenantId !== user.tenantId) {
      const allowCrossTenant = options.allowCrossTenantForRoles?.includes(user.role) || false;

      if (!allowCrossTenant) {
        await AuditLogService.logSecurityEvent({
          event: 'CROSS_TENANT_ACCESS_DENIED',
          severity: 'HIGH',
          userId: user.id,
          username: user.username,
          userTenantId: user.tenantId,
          requestedTenantId,
          requestPath: request.url,
          requestMethod: request.method,
          ipAddress: request.auditContext?.ipAddress,
          timestamp: new Date()
        });

        return reply.status(403).send({
          success: false,
          error: 'Cross-tenant access denied',
          requestId: request.id
        });
      }
    }
  };
}

// CRITICAL: Password change requirement enforcement
export function requirePasswordChange(
  request: FastifyRequest,
  reply: FastifyReply,
  done: () => void
) {
  if (request.user?.mustChangePassword) {
    return reply.status(403).send({
      success: false,
      error: 'Password change required',
      mustChangePassword: true,
      changePasswordUrl: '/api/auth/change-password',
      requestId: request.id
    });
  }
  done();
}