import { BaseEntity } from './common';

export interface Tenant extends BaseEntity {
  name: string;
  slug: string; // URL-friendly identifier
  isActive: boolean;
  subscriptionTier: SubscriptionTier;
  maxBranches: number;
  maxUsers: number;
  settings: TenantSettings;
}

export interface Branch extends BaseEntity {
  name: string;
  slug: string;
  tenantId: string;
  isActive: boolean;
  address?: BranchAddress;
  settings: BranchSettings;
}

export interface TenantSettings {
  timezone: string;
  currency: string;
  wasteCostCalculation: 'fifo' | 'average' | 'manual';
  lowStockThreshold: number;
  expiryAlertDays: number;
}

export interface BranchSettings {
  operatingHours: OperatingHours;
  wasteReportingFrequency: 'daily' | 'weekly';
  autoApproveThreshold: number; // Amount under which approvals aren't needed
}

export interface BranchAddress {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

export interface OperatingHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

export interface DayHours {
  open: string; // HH:MM format
  close: string; // HH:MM format
  isClosed: boolean;
}

export enum SubscriptionTier {
  STARTER = 'STARTER',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE'
}