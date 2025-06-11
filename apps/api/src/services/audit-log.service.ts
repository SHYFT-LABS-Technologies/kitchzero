// apps/api/src/services/audit-log.service.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuditLogEntry {
  id?: string;
  event: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  userId?: string;
  username?: string;
  role?: string;
  tenantId?: string;
  branchId?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestPath?: string;
  requestMethod?: string;
  reason?: string;
  details?: any;
  timestamp: Date;
  geolocation?: string;
  deviceFingerprint?: string;
}

export interface AuthenticationAttempt extends AuditLogEntry {
  event: 'AUTHENTICATION_SUCCESS' | 'AUTHENTICATION_FAILED' | 'AUTHENTICATION_ERROR';
  tokenInfo?: {
    hasUserId: boolean;
    hasUsername: boolean;
    hasRole: boolean;
  };
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export interface AuthorizationEvent extends AuditLogEntry {
  event: 'AUTHORIZATION_SUCCESS' | 'AUTHORIZATION_FAILED';
  userRole?: string;
  requiredRoles?: string[];
}

export interface SecurityEvent extends AuditLogEntry {
  event: 'RATE_LIMIT_EXCEEDED' | 'SUSPICIOUS_LOGIN_DETECTED' | 'CROSS_TENANT_ACCESS_DENIED' | 'DATA_ACCESS_VIOLATION';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  requestedTenantId?: string;
  userTenantId?: string;
}

export class AuditLogService {
  // CRITICAL: Log authentication attempts with full context
  static async logAuthenticationAttempt(entry: AuthenticationAttempt): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          id: crypto.randomUUID(),
          eventType: 'AUTHENTICATION',
          event: entry.event,
          severity: entry.event === 'AUTHENTICATION_SUCCESS' ? 'LOW' : 'MEDIUM',
          userId: entry.userId,
          username: entry.username,
          role: entry.role,
          tenantId: entry.tenantId,
          branchId: entry.branchId,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          sessionId: entry.sessionId,
          reason: entry.reason,
          details: entry.tokenInfo || entry.error ? JSON.stringify({
            tokenInfo: entry.tokenInfo,
            error: entry.error
          }) : null,
          timestamp: entry.timestamp,
          geolocation: entry.geolocation
        }
      });

      // CRITICAL: Real-time alerting for failed authentication patterns
      if (entry.event === 'AUTHENTICATION_FAILED') {
        await this.checkForAuthenticationThreats(entry);
      }
    } catch (error) {
      console.error('Failed to log authentication attempt:', error);
      // CRITICAL: Never let audit logging failures affect application flow
    }
  }

  // CRITICAL: Log authorization events with role context
  static async logAuthorizationEvent(entry: AuthorizationEvent): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          id: crypto.randomUUID(),
          eventType: 'AUTHORIZATION',
          event: entry.event,
          severity: entry.event === 'AUTHORIZATION_SUCCESS' ? 'LOW' : 'MEDIUM',
          userId: entry.userId,
          username: entry.username,
          role: entry.role,
          tenantId: entry.tenantId,
          branchId: entry.branchId,
          ipAddress: entry.ipAddress,
          requestPath: entry.requestPath,
          requestMethod: entry.requestMethod,
          reason: entry.reason,
          details: entry.requiredRoles ? JSON.stringify({
            userRole: entry.userRole,
            requiredRoles: entry.requiredRoles
          }) : null,
          timestamp: entry.timestamp
        }
      });
    } catch (error) {
      console.error('Failed to log authorization event:', error);
    }
  }

  // CRITICAL: Log security events with high visibility
  static async logSecurityEvent(entry: SecurityEvent): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          id: crypto.randomUUID(),
          eventType: 'SECURITY',
          event: entry.event,
          severity: entry.severity,
          userId: entry.userId,
          username: entry.username,
          role: entry.role,
          tenantId: entry.tenantId,
          branchId: entry.branchId,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          requestPath: entry.requestPath,
          requestMethod: entry.requestMethod,
          details: JSON.stringify({
            ...entry.details,
            userTenantId: entry.userTenantId,
            requestedTenantId: entry.requestedTenantId
          }),
          timestamp: entry.timestamp
        }
      });

      // CRITICAL: Immediate alerting for high/critical security events
      if (entry.severity === 'HIGH' || entry.severity === 'CRITICAL') {
        await this.triggerSecurityAlert(entry);
      }
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  // CRITICAL: Business activity logging for compliance
  static async logBusinessActivity(entry: {
    event: string;
    action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';
    resourceType: string;
    resourceId: string;
    userId: string;
    username: string;
    tenantId?: string;
    branchId?: string;
    oldValues?: any;
    newValues?: any;
    ipAddress?: string;
    reason?: string;
  }): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          id: crypto.randomUUID(),
          eventType: 'BUSINESS_ACTIVITY',
          event: entry.event,
          severity: 'LOW',
          userId: entry.userId,
          username: entry.username,
          tenantId: entry.tenantId,
          branchId: entry.branchId,
          ipAddress: entry.ipAddress,
          details: JSON.stringify({
            action: entry.action,
            resourceType: entry.resourceType,
            resourceId: entry.resourceId,
            oldValues: entry.oldValues,
            newValues: entry.newValues,
            reason: entry.reason
          }),
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to log business activity:', error);
    }
  }

  // CRITICAL: Detect authentication threat patterns
  private static async checkForAuthenticationThreats(entry: AuthenticationAttempt): Promise<void> {
    const timeWindow = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes

    // Check for brute force attempts from same IP
    const ipFailures = await prisma.auditLog.count({
      where: {
        eventType: 'AUTHENTICATION',
        event: 'AUTHENTICATION_FAILED',
        ipAddress: entry.ipAddress,
        timestamp: { gte: timeWindow }
      }
    });

    if (ipFailures >= 5) {
      await this.logSecurityEvent({
        event: 'BRUTE_FORCE_DETECTED',
        severity: 'HIGH',
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        details: { 
          failureCount: ipFailures,
          windowMinutes: 15,
          lastFailureReason: entry.reason
        },
        timestamp: new Date()
      });
    }

    // Check for distributed attacks (multiple IPs targeting same user)
    if (entry.username) {
      const userFailures = await prisma.auditLog.groupBy({
        by: ['ipAddress'],
        where: {
          eventType: 'AUTHENTICATION',
          event: 'AUTHENTICATION_FAILED',
          username: entry.username,
          timestamp: { gte: timeWindow }
        },
        _count: { ipAddress: true }
      });

      if (userFailures.length >= 3) {
        await this.logSecurityEvent({
          event: 'DISTRIBUTED_ATTACK_DETECTED',
          severity: 'CRITICAL',
          username: entry.username,
          details: {
            uniqueIPs: userFailures.length,
            ipAddresses: userFailures.map(f => f.ipAddress),
            windowMinutes: 15
          },
          timestamp: new Date()
        });
      }
    }
  }

  // CRITICAL: Trigger security alerts for high-priority events
  private static async triggerSecurityAlert(entry: SecurityEvent): Promise<void> {
    // Integration points for real-time alerting:
    // - Email notifications to security team
    // - Slack/Teams integration
    // - SIEM system integration
    // - SMS alerts for critical events
    
    console.warn('🚨 SECURITY ALERT:', {
      event: entry.event,
      severity: entry.severity,
      userId: entry.userId,
      ipAddress: entry.ipAddress,
      timestamp: entry.timestamp
    });

    // TODO: Implement actual alerting mechanisms based on your infrastructure
    // Examples:
    // - await EmailService.sendSecurityAlert(entry);
    // - await SlackService.postSecurityAlert(entry);
    // - await SIEMService.forwardAlert(entry);
  }

  // CRITICAL: Get audit logs with advanced filtering for compliance reporting
  static async getAuditLogs(filters: {
    eventType?: string;
    userId?: string;
    tenantId?: string;
    branchId?: string;
    severity?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ logs: any[]; total: number }> {
    const where: any = {};
    
    if (filters.eventType) where.eventType = filters.eventType;
    if (filters.userId) where.userId = filters.userId;
    if (filters.tenantId) where.tenantId = filters.tenantId;
    if (filters.branchId) where.branchId = filters.branchId;
    if (filters.severity) where.severity = filters.severity;
    
    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) where.timestamp.gte = filters.startDate;
      if (filters.endDate) where.timestamp.lte = filters.endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: filters.limit || 100,
        skip: filters.offset || 0
      }),
      prisma.auditLog.count({ where })
    ]);

    return { logs, total };
  }
}