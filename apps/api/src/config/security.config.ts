// apps/api/src/config/security.config.ts
export const securityConfig = {
  // CRITICAL: JWT Configuration
  jwt: {
    accessTokenExpiresIn: '15m', // Short-lived access tokens
    refreshTokenExpiresIn: '7d', // Longer refresh tokens
    algorithm: 'HS256' as const,
    issuer: 'kitchzero-api',
    audience: 'kitchzero-app'
  },

  // CRITICAL: Password Policy
  password: {
    minLength: 12,
    maxLength: 128,
    requireLowercase: true,
    requireUppercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    preventCommonPasswords: true,
    preventUserInfoInPassword: true,
    maxRetryAttempts: 5,
    lockoutDurationMinutes: 15
  },

  // CRITICAL: Rate Limiting
  rateLimit: {
    authentication: {
      maxAttempts: 5,
      windowMs: 15 * 60 * 1000, // 15 minutes
      blockDurationMs: 15 * 60 * 1000
    },
    api: {
      maxRequests: 100,
      windowMs: 60 * 1000 // 1 minute
    },
    passwordReset: {
      maxAttempts: 3,
      windowMs: 60 * 60 * 1000 // 1 hour
    }
  },

  // CRITICAL: Session Management
  session: {
    maxConcurrentSessions: 3,
    idleTimeoutMinutes: 30,
    absoluteTimeoutHours: 8
  },

  // CRITICAL: Audit and Monitoring
  audit: {
    retentionDays: 2555, // 7 years for compliance
    realTimeAlerts: {
      enabled: true,
      highRiskThreshold: 70,
      criticalEventTypes: [
        'BRUTE_FORCE_DETECTED',
        'DISTRIBUTED_ATTACK_DETECTED',
        'CROSS_TENANT_ACCESS_DENIED',
        'PRIVILEGE_ESCALATION_ATTEMPT'
      ]
    }
  },

  // CRITICAL: Multi-tenant Security
  multiTenant: {
    strictIsolation: true,
    crossTenantValidation: true,
    tenantDataEncryption: true
  }
};