// apps/api/src/config/password-policy.config.ts
export const passwordPolicyConfig = {
  // CRITICAL: NIST 2025 compliant password requirements
  global: {
    minLength: 12,
    maxLength: 128,
    requireLowercase: true,
    requireUppercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    preventCommonPasswords: true,
    preventPersonalInfo: true,
    preventPasswordReuse: 5,
    strengthThreshold: 70, // Minimum strength score out of 100
  },

  // CRITICAL: Account lockout policy
  lockout: {
    maxFailedAttempts: 5,
    lockoutDurationMinutes: 15,
    progressiveLockout: true, // Increase lockout time with repeated failures
    notifyOnLockout: true
  },

  // CRITICAL: Temporary password policy
  temporaryPasswords: {
    autoGenerate: true,
    length: 16,
    includeSymbols: true,
    excludeAmbiguous: true, // Exclude 0, O, l, I, etc.
    expiryHours: 24,
    mustChangeOnFirstLogin: true
  },

  // CRITICAL: Password change enforcement
  changeRequirements: {
    enforceOnFirstLogin: true,
    notifyBeforeExpiry: false, // NIST recommendation: don't force periodic changes
    allowSelfService: true,
    requireCurrentPassword: true,
    preventRapidChanges: true, // Prevent changing password too frequently
    minTimeBetweenChangesHours: 24
  },

  // CRITICAL: Security monitoring
  monitoring: {
    logAllAttempts: true,
    alertOnSuspiciousActivity: true,
    trackPasswordHistory: true,
    monitorBreachedPasswords: true,
    realTimeStrengthChecking: true
  }
};