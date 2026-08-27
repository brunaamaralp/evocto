import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

/**
 * Sistema de Autenticação 2FA
 * Implementa autenticação de dois fatores com TOTP e backup codes
 */
export class TwoFactorAuth extends EventEmitter {
  constructor(options = {}) {
    super();
    this.secrets = new Map();
    this.backupCodes = new Map();
    this.attempts = new Map();
    this.maxAttempts = options.maxAttempts || 5;
    this.attemptWindow = options.attemptWindow || 300000; // 5 minutos
    this.totpWindow = options.totpWindow || 30000; // 30 segundos
    this.backupCodeCount = options.backupCodeCount || 10;
    this.isCleanupRunning = false;
    
    this.startCleanup();
  }

  /**
   * Inicia limpeza automática de dados expirados
   */
  startCleanup() {
    if (this.isCleanupRunning) return;
    
    this.isCleanupRunning = true;
    setInterval(() => {
      this.cleanup();
    }, 60000); // Limpeza a cada minuto
  }

  /**
   * Para limpeza automática
   */
  stopCleanup() {
    this.isCleanupRunning = false;
  }

  /**
   * Gera secret para TOTP
   */
  generateSecret(userId) {
    const secret = this.generateRandomSecret();
    const backupCodes = this.generateBackupCodes();
    
    this.secrets.set(userId, {
      secret,
      createdAt: Date.now(),
      lastUsed: null,
      isEnabled: false
    });
    
    this.backupCodes.set(userId, {
      codes: backupCodes,
      createdAt: Date.now(),
      usedCodes: new Set()
    });
    
    this.emit('secret_generated', { userId, secret, backupCodes });
    
    return {
      secret,
      backupCodes,
      qrCode: this.generateQRCode(userId, secret)
    };
  }

  /**
   * Gera secret aleatório
   */
  generateRandomSecret() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  }

  /**
   * Gera códigos de backup
   */
  generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < this.backupCodeCount; i++) {
      codes.push(this.generateRandomCode());
    }
    return codes;
  }

  /**
   * Gera código aleatório
   */
  generateRandomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  /**
   * Gera QR Code para configuração
   */
  generateQRCode(userId, secret) {
    const issuer = 'Evocto';
    const accountName = userId;
    const otpauth = `otpauth://totp/${issuer}:${accountName}?secret=${secret}&issuer=${issuer}`;
    
    return {
      url: otpauth,
      data: `data:image/png;base64,${this.generateQRCodeImage(otpauth)}`
    };
  }

  /**
   * Gera imagem QR Code (simulado)
   */
  generateQRCodeImage(data) {
    // Em produção, usar biblioteca como qrcode
    return btoa(data); // Simulado
  }

  /**
   * Habilita 2FA para usuário
   */
  enable2FA(userId, totpCode) {
    const secretData = this.secrets.get(userId);
    if (!secretData) {
      throw new Error('Secret não encontrado. Gere um novo secret primeiro.');
    }

    // Verificar código TOTP
    if (!this.verifyTOTP(secretData.secret, totpCode)) {
      throw new Error('Código TOTP inválido');
    }

    secretData.isEnabled = true;
    secretData.lastUsed = Date.now();
    
    this.emit('2fa_enabled', { userId });
    
    return {
      success: true,
      message: '2FA habilitado com sucesso',
      backupCodes: this.backupCodes.get(userId)?.codes
    };
  }

  /**
   * Desabilita 2FA para usuário
   */
  disable2FA(userId, password) {
    // Em produção, verificar senha aqui
    if (!password) {
      throw new Error('Senha é obrigatória para desabilitar 2FA');
    }

    this.secrets.delete(userId);
    this.backupCodes.delete(userId);
    this.attempts.delete(userId);
    
    this.emit('2fa_disabled', { userId });
    
    return {
      success: true,
      message: '2FA desabilitado com sucesso'
    };
  }

  /**
   * Verifica código TOTP
   */
  verifyTOTP(secret, code) {
    const now = Math.floor(Date.now() / 1000);
    const window = Math.floor(this.totpWindow / 1000);
    
    // Verificar código atual e códigos adjacentes (tolerância)
    for (let i = -1; i <= 1; i++) {
      const timeStep = now + (i * window);
      const expectedCode = this.generateTOTPCode(secret, timeStep);
      if (expectedCode === code) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Gera código TOTP
   */
  generateTOTPCode(secret, timeStep) {
    // Implementação simplificada do TOTP
    // Em produção, usar biblioteca como speakeasy
    const key = this.base32Decode(secret);
    const timeBuffer = this.intToBytes(timeStep);
    const hmac = this.hmacSha1(key, timeBuffer);
    const offset = hmac[hmac.length - 1] & 0xf;
    const code = ((hmac[offset] & 0x7f) << 24) |
                 ((hmac[offset + 1] & 0xff) << 16) |
                 ((hmac[offset + 2] & 0xff) << 8) |
                 (hmac[offset + 3] & 0xff);
    
    return (code % 1000000).toString().padStart(6, '0');
  }

  /**
   * Decodifica base32
   */
  base32Decode(str) {
    // Implementação simplificada
    // Em produção, usar biblioteca adequada
    return new Uint8Array(Array.from(str).map(c => c.charCodeAt(0)));
  }

  /**
   * Converte int para bytes
   */
  intToBytes(num) {
    const bytes = new Uint8Array(8);
    for (let i = 7; i >= 0; i--) {
      bytes[i] = num & 0xff;
      num >>= 8;
    }
    return bytes;
  }

  /**
   * HMAC SHA1 (simulado)
   */
  hmacSha1(key, data) {
    // Implementação simplificada
    // Em produção, usar biblioteca crypto adequada
    return new Uint8Array(20).fill(0);
  }

  /**
   * Verifica código de backup
   */
  verifyBackupCode(userId, code) {
    const backupData = this.backupCodes.get(userId);
    if (!backupData) {
      return false;
    }

    const normalizedCode = code.toUpperCase();
    const codeIndex = backupData.codes.indexOf(normalizedCode);
    
    if (codeIndex === -1) {
      return false;
    }

    // Verificar se código já foi usado
    if (backupData.usedCodes.has(normalizedCode)) {
      return false;
    }

    // Marcar código como usado
    backupData.usedCodes.add(normalizedCode);
    
    this.emit('backup_code_used', { userId, code: normalizedCode });
    
    return true;
  }

  /**
   * Verifica tentativa de autenticação
   */
  verifyAuth(userId, code) {
    // Verificar tentativas recentes
    if (!this.checkAttempts(userId)) {
      throw new Error('Muitas tentativas. Tente novamente em alguns minutos.');
    }

    const secretData = this.secrets.get(userId);
    if (!secretData || !secretData.isEnabled) {
      throw new Error('2FA não habilitado para este usuário');
    }

    // Verificar código TOTP
    if (this.verifyTOTP(secretData.secret, code)) {
      this.recordSuccessfulAttempt(userId);
      secretData.lastUsed = Date.now();
      
      this.emit('auth_success', { userId });
      
      return {
        success: true,
        method: 'totp',
        message: 'Autenticação bem-sucedida'
      };
    }

    // Verificar código de backup
    if (this.verifyBackupCode(userId, code)) {
      this.recordSuccessfulAttempt(userId);
      
      this.emit('auth_success', { userId, method: 'backup' });
      
      return {
        success: true,
        method: 'backup',
        message: 'Autenticação bem-sucedida com código de backup'
      };
    }

    // Registrar tentativa falhada
    this.recordFailedAttempt(userId);
    
    this.emit('auth_failed', { userId, code });
    
    throw new Error('Código inválido');
  }

  /**
   * Verifica tentativas recentes
   */
  checkAttempts(userId) {
    const attemptData = this.attempts.get(userId);
    if (!attemptData) {
      return true;
    }

    const now = Date.now();
    const recentAttempts = attemptData.failedAttempts.filter(
      timestamp => now - timestamp < this.attemptWindow
    );

    return recentAttempts.length < this.maxAttempts;
  }

  /**
   * Registra tentativa falhada
   */
  recordFailedAttempt(userId) {
    if (!this.attempts.has(userId)) {
      this.attempts.set(userId, {
        failedAttempts: [],
        successfulAttempts: []
      });
    }

    const attemptData = this.attempts.get(userId);
    attemptData.failedAttempts.push(Date.now());
  }

  /**
   * Registra tentativa bem-sucedida
   */
  recordSuccessfulAttempt(userId) {
    if (!this.attempts.has(userId)) {
      this.attempts.set(userId, {
        failedAttempts: [],
        successfulAttempts: []
      });
    }

    const attemptData = this.attempts.get(userId);
    attemptData.successfulAttempts.push(Date.now());
    
    // Limpar tentativas falhadas recentes
    const now = Date.now();
    attemptData.failedAttempts = attemptData.failedAttempts.filter(
      timestamp => now - timestamp < this.attemptWindow
    );
  }

  /**
   * Gera novos códigos de backup
   */
  generateNewBackupCodes(userId) {
    const secretData = this.secrets.get(userId);
    if (!secretData || !secretData.isEnabled) {
      throw new Error('2FA não habilitado para este usuário');
    }

    const newBackupCodes = this.generateBackupCodes();
    this.backupCodes.set(userId, {
      codes: newBackupCodes,
      createdAt: Date.now(),
      usedCodes: new Set()
    });
    
    this.emit('backup_codes_regenerated', { userId, codes: newBackupCodes });
    
    return newBackupCodes;
  }

  /**
   * Obtém status do 2FA para usuário
   */
  get2FAStatus(userId) {
    const secretData = this.secrets.get(userId);
    const backupData = this.backupCodes.get(userId);
    
    if (!secretData) {
      return {
        isEnabled: false,
        hasSecret: false,
        backupCodesCount: 0,
        usedBackupCodes: 0
      };
    }

    return {
      isEnabled: secretData.isEnabled,
      hasSecret: true,
      backupCodesCount: backupData?.codes.length || 0,
      usedBackupCodes: backupData?.usedCodes.size || 0,
      lastUsed: secretData.lastUsed,
      createdAt: secretData.createdAt
    };
  }

  /**
   * Limpa dados expirados
   */
  cleanup() {
    const now = Date.now();
    const expiredKeys = [];

    // Limpar tentativas antigas
    for (const [userId, attemptData] of this.attempts) {
      const cutoffTime = now - this.attemptWindow;
      attemptData.failedAttempts = attemptData.failedAttempts.filter(
        timestamp => timestamp > cutoffTime
      );
      attemptData.successfulAttempts = attemptData.successfulAttempts.filter(
        timestamp => timestamp > cutoffTime
      );
      
      if (attemptData.failedAttempts.length === 0 && attemptData.successfulAttempts.length === 0) {
        expiredKeys.push(userId);
      }
    }

    expiredKeys.forEach(key => {
      this.attempts.delete(key);
    });

    if (expiredKeys.length > 0) {
      this.emit('cleanup', { expiredCount: expiredKeys.length });
    }
  }

  /**
   * Obtém estatísticas do 2FA
   */
  getStats() {
    const stats = {
      totalUsers: this.secrets.size,
      enabledUsers: 0,
      totalBackupCodes: 0,
      usedBackupCodes: 0,
      totalAttempts: 0,
      failedAttempts: 0
    };

    for (const [userId, secretData] of this.secrets) {
      if (secretData.isEnabled) {
        stats.enabledUsers++;
      }
    }

    for (const [userId, backupData] of this.backupCodes) {
      stats.totalBackupCodes += backupData.codes.length;
      stats.usedBackupCodes += backupData.usedCodes.size;
    }

    for (const [userId, attemptData] of this.attempts) {
      stats.totalAttempts += attemptData.failedAttempts.length + attemptData.successfulAttempts.length;
      stats.failedAttempts += attemptData.failedAttempts.length;
    }

    return stats;
  }
}

// Instância singleton
export const twoFactorAuth = new TwoFactorAuth({
  maxAttempts: 5,
  attemptWindow: 300000, // 5 minutos
  totpWindow: 30000, // 30 segundos
  backupCodeCount: 10
});

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.twoFactorAuth = twoFactorAuth;
}

