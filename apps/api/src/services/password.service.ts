import bcrypt from 'bcrypt';

export class PasswordService {
  private static readonly SALT_ROUNDS = 12;
  private static readonly MAX_PASSWORD_LENGTH = 128;
  private static readonly MIN_PASSWORD_LENGTH = 8;

  static async hash(password: string): Promise<string> {
    // CRITICAL: Validate password before hashing
    if (password.length > this.MAX_PASSWORD_LENGTH) {
      throw new Error('Password too long');
    }
    
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  static async verify(password: string, hash: string): Promise<boolean> {
    // CRITICAL: Prevent timing attacks with consistent execution time
    try {
      if (password.length > this.MAX_PASSWORD_LENGTH) {
        // Still compare against a dummy hash to maintain consistent timing
        await bcrypt.compare('dummy', hash);
        return false;
      }
      
      return await bcrypt.compare(password, hash);
    } catch (error) {
      // Always return false on error, but log for monitoring
      console.error('Password verification error:', error);
      return false;
    }
  }

  static validate(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < this.MIN_PASSWORD_LENGTH) {
      errors.push('Password must be at least 8 characters long');
    }

    if (password.length > this.MAX_PASSWORD_LENGTH) {
      errors.push('Password must be less than 128 characters');
    }

    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/(?=.*\d)/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    // CRITICAL: Check for common passwords
    const commonPasswords = [
      'password', 'password123', '123456', 'admin', 'letmein',
      'welcome', 'monkey', 'dragon', 'pass', 'master'
    ];
    
    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common');
    }

    // CRITICAL: Check for repeated characters
    if (/(.)\1{2,}/.test(password)) {
      errors.push('Password cannot contain repeated characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}