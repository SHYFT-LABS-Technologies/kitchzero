// apps/api/src/services/auth.service.ts (Updated)
import { PrismaClient } from '@prisma/client';
import { 
  User, 
  AuthUser, 
  AuthTokens, 
  LoginResponse,
  LoginRequest,
  ChangePasswordRequest,
  UserRole 
} from '@kitchzero/types';
import { JWTService } from './jwt.service';
import { PasswordService } from './password.service';

const prisma = new PrismaClient();

export class AuthService {
  static async login(credentials: LoginRequest): Promise<LoginResponse> {
    const { username, password } = credentials;

    // Find user by username
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        tenant: true,
        branch: true
      }
    });

    if (!user) {
      throw new Error('Invalid username or password');
    }

    if (!user.isActive) {
      throw new Error('Account is disabled');
    }

    // Verify password
    const isPasswordValid = await PasswordService.verify(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Invalid username or password');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // Convert to AuthUser
    const authUser: AuthUser = {
      id: user.id,
      username: user.username,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      tenantId: user.tenantId,
      branchId: user.branchId,
      isActive: user.isActive
    };

    // Generate tokens
    const accessToken = JWTService.generateAccessToken(authUser);
    const refreshToken = JWTService.generateRefreshToken(authUser);

    // Store refresh token
    await this.storeRefreshToken(user.id, refreshToken);

    return {
      user: authUser,
      tokens: {
        accessToken,
        refreshToken
      }
    };
  }

  static async changePassword(
    userId: string, 
    passwordData: ChangePasswordRequest
  ): Promise<void> {
    const { currentPassword, newPassword } = passwordData;

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await PasswordService.verify(
      currentPassword, 
      user.passwordHash
    );
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Validate new password with built-in validation
    const validation = this.validatePasswordStrength(newPassword, user.username);
    if (!validation.isValid) {
      throw new Error(`Invalid password: ${validation.errors.join(', ')}`);
    }

    // Check password history (simplified)
    const passwordHistoryCheck = await this.checkPasswordHistory(userId, newPassword);
    if (!passwordHistoryCheck.passed) {
      throw new Error(passwordHistoryCheck.message || 'Cannot reuse recent passwords');
    }

    // Hash new password
    const newPasswordHash = await PasswordService.hash(newPassword);

    // Database transaction for consistency
    await prisma.$transaction(async (tx) => {
      // Store current password in history (if table exists)
      try {
        await tx.passwordHistory.create({
          data: {
            userId,
            passwordHash: user.passwordHash,
            createdAt: new Date()
          }
        });
      } catch (error) {
        // Table might not exist yet, continue
        console.warn('Password history table not available:', error.message);
      }

      // Update user password
      await tx.user.update({
        where: { id: userId },
        data: {
          passwordHash: newPasswordHash,
          mustChangePassword: false,
          passwordChangedAt: new Date(),
          loginAttempts: 0,
          lockedUntil: null
        }
      });

      // Clean up old password history (keep only last 10)
      try {
        const oldPasswords = await tx.passwordHistory.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          skip: 10
        });

        if (oldPasswords.length > 0) {
          await tx.passwordHistory.deleteMany({
            where: {
              id: { in: oldPasswords.map(p => p.id) }
            }
          });
        }
      } catch (error) {
        // Table might not exist yet, continue
      }
    });

    // Invalidate all refresh tokens for security
    await prisma.refreshToken.deleteMany({
      where: { userId }
    });
  }

  // Built-in password validation (no external dependency)
  static validatePasswordStrength(password: string, username?: string): {
    isValid: boolean;
    errors: string[];
    score: number;
  } {
    const errors: string[] = [];
    let score = 0;

    // Length check
    if (password.length >= 12) {
      score += 25;
    } else {
      errors.push('Password must be at least 12 characters long');
    }

    if (password.length > 128) {
      errors.push('Password must be less than 128 characters');
    }

    // Character variety
    if (/[a-z]/.test(password)) {
      score += 15;
    } else {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (/[A-Z]/.test(password)) {
      score += 15;
    } else {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (/\d/.test(password)) {
      score += 15;
    } else {
      errors.push('Password must contain at least one number');
    }

    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 15;
    } else {
      errors.push('Password must contain at least one special character');
    }

    // Pattern checks
    if (!/(.)\1{2,}/.test(password)) {
      score += 10;
    } else {
      errors.push('Password cannot contain repeated characters');
    }

    // Common passwords check
    const commonPasswords = [
      'password', 'password123', '123456', 'admin', 'letmein',
      'welcome', 'monkey', 'dragon', 'pass', 'master'
    ];
    
    if (!commonPasswords.includes(password.toLowerCase())) {
      score += 5;
    } else {
      errors.push('Password is too common');
    }

    // Username check
    if (username && password.toLowerCase().includes(username.toLowerCase())) {
      errors.push('Password cannot contain your username');
      score = Math.max(0, score - 20);
    }

    return {
      isValid: errors.length === 0 && score >= 70,
      errors,
      score: Math.min(100, score)
    };
  }

  // Check password history to prevent reuse
  static async checkPasswordHistory(
    userId: string, 
    newPassword: string, 
    historyCount: number = 5
  ): Promise<{ passed: boolean; message?: string }> {
    try {
      // Get recent password hashes
      const passwordHistory = await prisma.passwordHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: historyCount
      });

      // Check if new password matches any in history
      for (const historyEntry of passwordHistory) {
        const matches = await PasswordService.verify(newPassword, historyEntry.passwordHash);
        if (matches) {
          return {
            passed: false,
            message: `Cannot reuse any of your last ${historyCount} passwords`
          };
        }
      }

      return { passed: true };
    } catch (error) {
      console.error('Password history check failed:', error);
      // Fail safe - allow if check fails
      return { passed: true };
    }
  }

  static async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    try {
      // Verify refresh token
      const payload = JWTService.verifyRefreshToken(refreshToken);

      // Check if refresh token exists in database
      const storedToken = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true }
      });

      if (!storedToken) {
        throw new Error('Invalid refresh token');
      }

      if (storedToken.expiresAt < new Date()) {
        // Clean up expired token
        await prisma.refreshToken.delete({
          where: { id: storedToken.id }
        });
        throw new Error('Refresh token expired');
      }

      // Convert user to AuthUser
      const authUser: AuthUser = {
        id: storedToken.user.id,
        username: storedToken.user.username,
        role: storedToken.user.role,
        mustChangePassword: storedToken.user.mustChangePassword,
        tenantId: storedToken.user.tenantId,
        branchId: storedToken.user.branchId,
        isActive: storedToken.user.isActive
      };

      // Generate new tokens
      const newAccessToken = JWTService.generateAccessToken(authUser);
      const newRefreshToken = JWTService.generateRefreshToken(authUser);

      // Replace old refresh token with new one
      await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: {
          token: newRefreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        }
      });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      };
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  static async logout(refreshToken: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { token: refreshToken }
    });
  }

  static async getUserById(userId: string): Promise<AuthUser | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || !user.isActive) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      tenantId: user.tenantId,
      branchId: user.branchId,
      isActive: user.isActive
    };
  }

  private static async storeRefreshToken(userId: string, token: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt
      }
    });
  }
}