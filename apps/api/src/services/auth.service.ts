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

    // Validate new password
    const validation = PasswordService.validate(newPassword);
    if (!validation.isValid) {
      throw new Error(`Invalid password: ${validation.errors.join(', ')}`);
    }

    // Hash new password
    const newPasswordHash = await PasswordService.hash(newPassword);

    // Update password and clear mustChangePassword flag
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        mustChangePassword: false
      }
    });

    // Invalidate all refresh tokens for security
    await prisma.refreshToken.deleteMany({
      where: { userId }
    });
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