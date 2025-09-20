/**
 * 🧪 Teste para funções de segurança
 */

import { 
  hashPassword, 
  validatePasswordStrength, 
  generateSecureToken,
  sanitizeForLog 
} from '@/utils/security';

describe('Security Utils', () => {
  describe('validatePasswordStrength', () => {
    it('should validate strong passwords', () => {
      const result = validatePasswordStrength('StrongPass123!');
      
      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(3);
      expect(result.checks.length).toBe(6);
    });

    it('should reject weak passwords', () => {
      const result = validatePasswordStrength('123');
      
      expect(result.isValid).toBe(false);
      expect(result.score).toBeLessThan(3);
    });

    it('should detect common passwords', () => {
      const result = validatePasswordStrength('password');
      
      expect(result.checks.noCommon).toBe(false);
    });

    it('should require minimum length', () => {
      const result = validatePasswordStrength('Abc1!');
      
      expect(result.checks.length).toBe(false);
      expect(result.isValid).toBe(false);
    });

    it('should check for uppercase letters', () => {
      const result = validatePasswordStrength('strongpass123!');
      
      expect(result.checks.uppercase).toBe(false);
    });

    it('should check for lowercase letters', () => {
      const result = validatePasswordStrength('STRONGPASS123!');
      
      expect(result.checks.lowercase).toBe(false);
    });

    it('should check for numbers', () => {
      const result = validatePasswordStrength('StrongPass!');
      
      expect(result.checks.numbers).toBe(false);
    });

    it('should check for symbols', () => {
      const result = validatePasswordStrength('StrongPass123');
      
      expect(result.checks.symbols).toBe(false);
    });
  });

  describe('generateSecureToken', () => {
    it('should generate tokens of correct length', () => {
      const token = generateSecureToken();
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(10);
    });

    it('should generate unique tokens', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      
      expect(token1).not.toBe(token2);
    });

    it('should generate tokens with valid characters', () => {
      const token = generateSecureToken();
      
      // Should contain only hex characters
      expect(token).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe('sanitizeForLog', () => {
    it('should mask sensitive fields', () => {
      const data = {
        username: 'testuser',
        password: 'secret123',
        token: 'abc123',
        email: 'test@example.com',
        apiKey: 'key123'
      };
      
      const sanitized = sanitizeForLog(data);
      
      expect(sanitized.password).toBe('[MASKED]');
      expect(sanitized.token).toBe('[MASKED]');
      expect(sanitized.apiKey).toBe('[MASKED]');
      expect(sanitized.username).toBe('testuser');
      expect(sanitized.email).toBe('test@example.com');
    });

    it('should handle nested objects', () => {
      const data = {
        user: {
          name: 'John',
          password: 'secret',
          profile: {
            token: 'abc123'
          }
        }
      };
      
      const sanitized = sanitizeForLog(data);
      
      expect(sanitized.user.password).toBe('[MASKED]');
      expect(sanitized.user.profile.token).toBe('[MASKED]');
      expect(sanitized.user.name).toBe('John');
    });

    it('should handle non-objects', () => {
      expect(sanitizeForLog('string')).toBe('string');
      expect(sanitizeForLog(null)).toBe(null);
      expect(sanitizeForLog(undefined)).toBe(undefined);
      expect(sanitizeForLog(123)).toBe(123);
    });

    it('should handle arrays', () => {
      const data = [
        { name: 'user1', password: 'secret1' },
        { name: 'user2', token: 'token2' }
      ];
      
      const sanitized = sanitizeForLog(data);
      
      expect(sanitized[0].password).toBe('[MASKED]');
      expect(sanitized[1].token).toBe('[MASKED]');
      expect(sanitized[0].name).toBe('user1');
      expect(sanitized[1].name).toBe('user2');
    });
  });

  describe('hashPassword', () => {
    it('should generate hash for password', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash).toContain(':');
    });

    it('should generate different hashes for same password', async () => {
      const password = 'testPassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty password', async () => {
      const hash = await hashPassword('');
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });
  });
});

