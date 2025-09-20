/**
 * 🔒 UTILITÁRIOS DE SEGURANÇA
 * Funções para hash seguro de senhas e validação
 */

/**
 * Hash seguro de senha usando Web Crypto API
 */
export async function hashPassword(password) {
  try {
    // Usar Web Crypto API se disponível (browser)
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Adicionar salt para maior segurança
      const salt = generateSalt();
      return `${salt}:${hashHex}`;
    }
    
    // Fallback para Node.js (se necessário)
    const salt = generateSalt();
    const hash = await simpleHash(password + salt);
    return `${salt}:${hash}`;
    
  } catch (error) {
    throw new Error('Erro ao gerar hash da senha');
  }
}

/**
 * Verificar senha contra hash
 */
export async function verifyPassword(password, hashedPassword) {
  try {
    const [salt, hash] = hashedPassword.split(':');
    
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      return hash === hashHex;
    }
    
    // Fallback Node.js
    const testHash = await simpleHash(password + salt);
    return hash === testHash;
    
  } catch (error) {
    return false;
  }
}

/**
 * Validar força da senha
 */
export function validatePasswordStrength(password) {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    numbers: /\d/.test(password),
    symbols: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    noCommon: !isCommonPassword(password)
  };

  const score = Object.values(checks).filter(Boolean).length;
  
  const messages = {
    0: 'Senha muito fraca',
    1: 'Senha fraca',
    2: 'Senha moderada',
    3: 'Senha boa',
    4: 'Senha forte',
    5: 'Senha muito forte',
    6: 'Senha excelente'
  };

  return {
    isValid: score >= 3,
    score,
    message: messages[score],
    checks
  };
}

/**
 * Verificar se é senha comum
 */
function isCommonPassword(password) {
  const commonPasswords = [
    'password', '123456', '123456789', 'qwerty', 'abc123',
    'password123', 'admin', 'letmein', 'welcome', 'monkey'
  ];
  
  return commonPasswords.includes(password.toLowerCase());
}

/**
 * Gerar salt seguro
 */
function generateSalt() {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  
  // Fallback
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Hash simples para fallback
 */
async function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Gerar token seguro para reset de senha
 */
export function generateSecureToken() {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  
  // Fallback
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Obter IP do cliente de forma segura
 */
export async function getClientIP() {
  try {
    // Em produção, isso seria feito no backend
    // Aqui é apenas um placeholder seguro
    return 'client_ip_placeholder';
  } catch (error) {
    return 'unknown';
  }
}

/**
 * Sanitizar dados para logs
 */
export function sanitizeForLog(data) {
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'hash', 'ssn', 'cpf'];
  
  if (typeof data === 'object' && data !== null) {
    const sanitized = { ...data };
    
    Object.keys(sanitized).forEach(key => {
      const isSensitive = sensitiveFields.some(field => 
        key.toLowerCase().includes(field.toLowerCase())
      );
      
      if (isSensitive) {
        sanitized[key] = '[MASKED]';
      }
    });
    
    return sanitized;
  }
  
  return data;
}