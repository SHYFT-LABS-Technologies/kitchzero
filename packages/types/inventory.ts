import { BaseEntity } from './common';

export interface InventoryItem extends BaseEntity {
  name: string;
  category: InventoryCategory;
  unit: Unit;
  currentStock: number;
  minStockLevel: number;
  maxStockLevel: number;
  averageCost: number;
  branchId: string;
  supplierId?: string;
  batches: InventoryBatch[];
}

export interface InventoryBatch extends BaseEntity {
  inventoryItemId: string;
  quantity: number;
  unitCost: number;
  expiryDate: Date | null;
  receivedDate: Date;
  supplierBatchNumber?: string;
}

export enum InventoryCategory {
  RAW_INGREDIENTS = 'RAW_INGREDIENTS',
  FINISHED_PRODUCTS = 'FINISHED_PRODUCTS',
  PACKAGING = 'PACKAGING',
  SUPPLIES = 'SUPPLIES'
}

export enum Unit {
  KG = 'KG',
  GRAMS = 'GRAMS',
  LITERS = 'LITERS',
  ML = 'ML',
  PIECES = 'PIECES',
  BOXES = 'BOXES'
}