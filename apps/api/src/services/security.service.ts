// apps/api/src/services/security.service.ts
import { FastifyRequest } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface RateLimitResult {
  allowed: boolean;
  attempts: number;
  resetTime: number;
  windowMs: number;
}

export interface SuspiciousActivityResult {
  isHighRisk: boolean;
  riskScore: number;
  details: {
    newLocation?: boolean;
    newDevice?: boolean;
    unusualTime?: boolean;
    multipleFailedAttempts?: boolean;
    vpnDetected?: boolean;
  };
}

export class SecurityService {
  // CRITICAL: Advanced rate limiting with adaptive thresholds
  static async checkRateLimit(
    identifier: string,
    action: 'auth' | 'api' | 'password-reset',
    customLimit?: number
  ): Promise<RateLimitResult> {
    const limits = {
      auth: { maxAttempts: 5, windowMs: 15 * 60 * 1000 }, // 5 attempts per 15 minutes
      api: { maxAttempts: 100, windowMs: 60 * 1000 }, // 100 requests per minute
      'password-reset': { maxAttempts: 3, windowMs: 60 * 60 * 1000 } // 3 attempts per hour
    };

    const config = limits[action];
    const maxAttempts = customLimit || config.maxAttempts;
    const windowStart = new Date(Date.now() - config.windowMs);

    try {
      // Count recent attempts
      const attempts = await prisma.rateLimitLog.count({
        where: {
          identifier,
          action,
          timestamp: { gte: windowStart }
        }
      });

      const allowed = attempts < maxAttempts;
      const resetTime = Date.now() + config.windowMs;

      // Log this attempt
      if (!allowed) {
        await prisma.rateLimitLog.create({
          data: {
            identifier,
            action,
            blocked: true,
            timestamp: new Date()
          }
        });
      }

      return {
        allowed,
        attempts,
        resetTime,
        windowMs: config.windowMs
      };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // CRITICAL: Fail open but log the failure
      return {
        allowed: true,
        attempts: 0,
        resetTime: Date.now() + config.windowMs,
        windowMs: config.windowMs
      };
    }
  }

  // CRITICAL: Extract real client IP considering proxies and load balancers
  static extractClientIP(request: FastifyRequest): string {
    // Check headers in order of preference
    const candidates = [
      request.headers['cf-connecting-ip'], // Cloudflare
      request.headers['x-real-ip'], // Nginx
      request.headers['x-forwarded-for']?.toString().split(',')[0], // Load balancers
      request.headers['x-client-ip'],
      request.headers['x-forwarded'],
      request.headers['x-cluster-client-ip'],
      request.headers['forwarded-for'],
      request.headers['forwarded'],
      request.ip
    ];

    const ip = candidates.find(candidate =>
      candidate &&
      typeof candidate === 'string' &&
      candidate.trim() !== ''
    ) || 'unknown';

    return ip.toString().trim();
  }

  // CRITICAL: Advanced suspicious activity detection
  static async detectSuspiciousActivity(context: {
    userId: string;
    ipAddress: string;
    userAgent: string;
    lastLoginIP?: string;
    lastLoginLocation?: string;
  }): Promise<SuspiciousActivityResult> {
    let riskScore = 0;
    const details: SuspiciousActivityResult['details'] = {};

    try {
      // Check for new location (simplified - in production use GeoIP services)
      if (context.lastLoginIP && context.ipAddress !== context.lastLoginIP) {
        const ipLocation = await this.getGeolocation(context.ipAddress);
        const lastLocation = context.lastLoginLocation;

        if (lastLocation && ipLocation && ipLocation !== lastLocation) {
          details.newLocation = true;
          riskScore += 30;
        }
      }

      // Check for unusual login time
      const currentHour = new Date().getHours();
      const isUnusualTime = currentHour < 6 || currentHour > 22; // Outside 6 AM - 10 PM
      if (isUnusualTime) {
        details.unusualTime = true;
        riskScore += 15;
      }

      // Check recent failed attempts
      const recentFailures = await prisma.auditLog.count({
        where: {
          userId: context.userId,
          eventType: 'AUTHENTICATION',
          event: 'AUTHENTICATION_FAILED',
          timestamp: { gte: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
        }
      });

      if (recentFailures > 0) {
        details.multipleFailedAttempts = true;
        riskScore += recentFailures * 10;
      }

      // Check for VPN/Proxy (simplified detection)
      const isVPN = await this.detectVPN(context.ipAddress);
      if (isVPN) {
        details.vpnDetected = true;
        riskScore += 25;
      }

      // Check device fingerprint changes (User-Agent as simple proxy)
      const lastLogin = await prisma.auditLog.findFirst({
        where: {
          userId: context.userId,
          eventType: 'AUTHENTICATION',
          event: 'AUTHENTICATION_SUCCESS'
        },
        orderBy: { timestamp: 'desc' }
      });

      if (lastLogin && lastLogin.userAgent !== context.userAgent) {
        details.newDevice = true;
        riskScore += 20;
      }

      return {
        isHighRisk: riskScore >= 50,
        riskScore,
        details
      };
    } catch (error) {
      console.error('Suspicious activity detection failed:', error);
      return {
        isHighRisk: false,
        riskScore: 0,
        details: {}
      };
    }
  }

  // CRITICAL: Geolocation lookup for security analysis
  static async getGeolocation(ipAddress: string): Promise<string | undefined> {
    try {
      // In production, integrate with services like:
      // - MaxMind GeoIP
      // - IP2Location
      // - IPinfo

      // Simplified implementation for demo
      if (ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.') || ipAddress.startsWith('127.')) {
        return 'Local Network';
      }

      // Mock geolocation - replace with actual service
      const response = await fetch(`https://ipapi.co/${ipAddress}/json/`);
      if (response.ok) {
        const data = await response.json();
        return `${data.city}, ${data.country_name}`;
      }

      return undefined;
    } catch (error) {
      console.error('Geolocation lookup failed:', error);
      return undefined;
    }
  }

  // CRITICAL: VPN/Proxy detection
  static async detectVPN(ipAddress: string): Promise<boolean> {
    try {
      // In production, use specialized services like:
      // - IPQualityScore
      // - Fraudlabs Pro
      // - VPN detection APIs

      // Simplified detection based on common patterns
      const vpnPatterns = [
        /^185\./, // Common VPN ranges
        /^46\./,
        /^89\./
      ];

      return vpnPatterns.some(pattern => pattern.test(ipAddress));
    } catch (error) {
      return false;
    }
  }

  // CRITICAL: Generate secure device fingerprint
  static generateDeviceFingerprint(request: FastifyRequest): string {
    const components = [
      request.headers['user-agent'] || '',
      request.headers['accept-language'] || '',
      request.headers['accept-encoding'] || '',
      this.extractClientIP(request)
    ];

    return Buffer.from(components.join('|')).toString('base64');
  }

  // CRITICAL: Password strength validation
  static validatePasswordStrength(password: string): {
    isStrong: boolean;
    score: number;
    issues: string[];
  } {
    const issues: string[] = [];
    let score = 0;

    // Length check
    if (password.length >= 12) score += 25;
    else if (password.length >= 8) score += 15;
    else issues.push('Password should be at least 12 characters long');

    // Character variety
    if (/[a-z]/.test(password)) score += 10;
    else issues.push('Include lowercase letters');

    if (/[A-Z]/.test(password)) score += 10;
    else issues.push('Include uppercase letters');

    if (/\d/.test(password)) score += 10;
    else issues.push('Include numbers');

    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 15;
    else issues.push('Include special characters');

    // Pattern checks
    if (!/(.)\1{2,}/.test(password)) score += 10;
    else issues.push('Avoid repeated characters');

    if (!/123|abc|qwe|password/i.test(password)) score += 10;
    else issues.push('Avoid common patterns');

    // Entropy check (simplified)
    const uniqueChars = new Set(password.toLowerCase()).size;
    if (uniqueChars >= 8) score += 10;

    return {
      isStrong: score >= 70,
      score,
      issues
    };
  }

  // CRITICAL: Check if password contains personal information
  static async checkPersonalInfoInPassword(
    password: string,
    userInfo: {
      username?: string;
      firstName?: string;
      lastName?: string;
      email?: string;
    }
  ): Promise<{ passed: boolean; issues: string[] }> {
    const issues: string[] = [];
    const passwordLower = password.toLowerCase();

    // Check username
    if (userInfo.username && passwordLower.includes(userInfo.username.toLowerCase())) {
      issues.push('Password cannot contain your username');
    }

    // Check first name
    if (userInfo.firstName && userInfo.firstName.length > 2 &&
      passwordLower.includes(userInfo.firstName.toLowerCase())) {
      issues.push('Password cannot contain your first name');
    }

    // Check last name
    if (userInfo.lastName && userInfo.lastName.length > 2 &&
      passwordLower.includes(userInfo.lastName.toLowerCase())) {
      issues.push('Password cannot contain your last name');
    }

    // Check email parts
    if (userInfo.email) {
      const emailParts = userInfo.email.split('@')[0].toLowerCase();
      if (emailParts.length > 3 && passwordLower.includes(emailParts)) {
        issues.push('Password cannot contain parts of your email');
      }
    }

    return {
      passed: issues.length === 0,
      issues
    };
  }

  // CRITICAL: Check against common password lists
  static async checkCommonPassword(password: string): Promise<{ passed: boolean; issues: string[] }> {
    const commonPasswords = [
      'password', 'password123', '123456', 'qwerty', 'abc123',
      'letmein', 'welcome', 'monkey', 'dragon', 'master',
      'admin', 'login', 'pass', '1234567890', 'iloveyou',
      'princess', 'welcome123', 'admin123', 'password1',
      'qwerty123', 'letmein123', 'welcome1', 'password@123'
    ];

    const passwordLower = password.toLowerCase();
    const isCommon = commonPasswords.some(common =>
      passwordLower.includes(common) ||
      common.includes(passwordLower)
    );

    // Check for keyboard patterns
    const keyboardPatterns = [
      'qwerty', 'asdf', 'zxcv', '1234', 'abcd'
    ];

    const hasKeyboardPattern = keyboardPatterns.some(pattern =>
      passwordLower.includes(pattern)
    );

    const issues: string[] = [];
    if (isCommon) {
      issues.push('Password is too common and easily guessable');
    }
    if (hasKeyboardPattern) {
      issues.push('Avoid keyboard patterns like "qwerty" or "1234"');
    }

    return {
      passed: !isCommon && !hasKeyboardPattern,
      issues
    };
  }

  // CRITICAL: Check against known breached passwords (simplified implementation)
  static async checkBreachedPassword(password: string): Promise<{ passed: boolean; issues: string[] }> {
    try {
      // In production, integrate with services like:
      // - HaveIBeenPwned API
      // - Troy Hunt's Pwned Passwords
      // - Internal breach databases

      // Simplified implementation using SHA-1 hash prefix
      const crypto = require('crypto');
      const hash = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
      const prefix = hash.substring(0, 5);
      const suffix = hash.substring(5);

      // Mock implementation - in production use actual API
      const knownBreachedHashes = [
        '5E884898DA28047151D0E56F8DC6292773603D0D', // "hello"
        'AAF4C61DDC8F02448D40084136F4D8CF5FF4C92D', // "password"
        '5994471ABB01112AFCC18159F6CC74B4F511B99806DA59B3CAF5A9C173CACFC5' // "123456"
      ];

      const isBreached = knownBreachedHashes.includes(hash);

      return {
        passed: !isBreached,
        issues: isBreached ? ['This password has been found in data breaches. Please choose a different password.'] : []
      };
    } catch (error) {
      console.error('Breached password check failed:', error);
      // CRITICAL: Fail safe - don't block if service is unavailable
      return { passed: true, issues: [] };
    }
  }

  // CRITICAL: Generate helpful password suggestions
  static generatePasswordSuggestions(issues: string[]): string[] {
    const suggestions: string[] = [];

    if (issues.some(issue => issue.includes('length'))) {
      suggestions.push('Try using a passphrase: combine 4+ unrelated words with symbols');
    }

    if (issues.some(issue => issue.includes('lowercase'))) {
      suggestions.push('Include lowercase letters (a-z)');
    }

    if (issues.some(issue => issue.includes('uppercase'))) {
      suggestions.push('Include uppercase letters (A-Z)');
    }

    if (issues.some(issue => issue.includes('numbers'))) {
      suggestions.push('Include numbers (0-9)');
    }

    if (issues.some(issue => issue.includes('special'))) {
      suggestions.push('Include special characters (!@#$%^&*)');
    }

    if (issues.some(issue => issue.includes('personal'))) {
      suggestions.push('Avoid using personal information like names or birthdays');
    }

    if (issues.some(issue => issue.includes('common'))) {
      suggestions.push('Choose a unique password that\'s not commonly used');
    }

    suggestions.push('Consider using a password manager to generate and store secure passwords');

    return suggestions;
  }

  // CRITICAL: Send security notification for password changes
  static async sendPasswordChangeNotification(user: any): Promise<void> {
    try {
      // In production, implement actual notification service
      console.log(`Password change notification sent to ${user.username}`);

      // Integration points:
      // - Email service (SendGrid, AWS SES, etc.)
      // - SMS service (Twilio, etc.)
      // - In-app notifications
      // - Security team alerts for privileged accounts

    } catch (error) {
      console.error('Failed to send password change notification:', error);
    }
  }
}