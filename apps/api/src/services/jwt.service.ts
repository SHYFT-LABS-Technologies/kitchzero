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
      branchId: user.branchId,
      // CRITICAL: Add timestamp for token freshness validation
      iat: Math.floor(Date.now() / 1000),
      // CRITICAL: Add issuer and audience for additional validation
      iss: 'kitchzero-api',
      aud: 'kitchzero-app'
    };

    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
      algorithm: 'HS256'
    });
  }

  static generateRefreshToken(user: AuthUser): string {
    const payload: JWTPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      tenantId: user.tenantId,
      branchId: user.branchId,
      iat: Math.floor(Date.now() / 1000),
      iss: 'kitchzero-api',
      aud: 'kitchzero-app'
    };

    return jwt.sign(payload, config.jwtRefreshSecret, {
      expiresIn: config.jwtRefreshExpiresIn,
      algorithm: 'HS256'
    });
  }

  static verifyAccessToken(token: string): JWTPayload {
    try {
      // CRITICAL: Verify with strict options
      const payload = jwt.verify(token, config.jwtSecret, {
        algorithms: ['HS256'],
        issuer: 'kitchzero-api',
        audience: 'kitchzero-app',
        clockTolerance: 30 // 30 seconds clock tolerance
      }) as JWTPayload;

      // CRITICAL: Additional payload validation
      if (!payload.userId || !payload.username || !payload.role) {
        throw new Error('Invalid token payload structure');
      }

      return payload;
    } catch (error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }

  static verifyRefreshToken(token: string): JWTPayload {
    try {
      const payload = jwt.verify(token, config.jwtRefreshSecret, {
        algorithms: ['HS256'],
        issuer: 'kitchzero-api',
        audience: 'kitchzero-app',
        clockTolerance: 30
      }) as JWTPayload;

      if (!payload.userId || !payload.username || !payload.role) {
        throw new Error('Invalid refresh token payload structure');
      }

      return payload;
    } catch (error) {
      throw new Error(`Refresh token verification failed: ${error.message}`);
    }
  }
}