import { BaseEntity } from './common';

export enum UserRole {
  KITCHZERO_ADMIN = 'KITCHZERO_ADMIN',
  RESTAURANT_ADMIN = 'RESTAURANT_ADMIN',
  BRANCH_ADMIN = 'BRANCH_ADMIN'
}

export interface User extends BaseEntity {
  username: string;
  passwordHash: string;
  mustChangePassword: boolean;
  role: UserRole;
  tenantId: string | null;
  branchId: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
  mustChangePassword: boolean;
  tenantId: string | null;
  branchId: string | null;
  isActive: boolean;
}

export interface LoginResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface JWTPayload {
  userId: string;
  username: string;
  role: UserRole;
  tenantId: string | null;
  branchId: string | null;
  iat?: number;
  exp?: number;
}

// Request/Response types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface AuthenticatedRequest {
  user: AuthUser;
}