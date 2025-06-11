// Re-export all schemas
export * from './auth.schema';

// Legacy exports for backward compatibility
import { loginSchema, changePasswordSchema } from './auth.schema';
export { loginSchema, changePasswordSchema };