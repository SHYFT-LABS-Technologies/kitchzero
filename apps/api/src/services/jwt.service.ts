import jwt from 'jsonwebtoken';
import { config } from '@kitchzero/config';
import { JWTPayload, AuthUser } from '@kitchzero/types';

export class JWTService {
  static generateAccessToken(user: AuthUser): string {
    const payload: JWTPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      tenantId: user.tenantId,
      branchId: user.branchId
    };

    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn
    });
  }

  static generateRefreshToken(user: AuthUser): string {
    const payload: JWTPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      tenantId: user.tenantId,
      branchId: user.branchId
    };

    return jwt.sign(payload, config.jwtRefreshSecret, {
      expiresIn: config.jwtRefreshExpiresIn
    });
  }

  static verifyAccessToken(token: string): JWTPayload {
    return jwt.verify(token, config.jwtSecret) as JWTPayload;
  }

  static verifyRefreshToken(token: string): JWTPayload {
    return jwt.verify(token, config.jwtRefreshSecret) as JWTPayload;
  }
}