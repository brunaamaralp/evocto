import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

/**
 * Sistema de Autenticação Avançado
 * Implementa autenticação robusta com 2FA, sessões seguras e auditoria
 */
export class AdvancedAuthSystem extends EventEmitter {
  constructor(options = {}) {
    super();
    this.users = new Map();
    this.sessions = new Map();
    this.tokens = new Map();
    this.auditLog = [];
    this.failedAttempts = new Map();
    this.lockedAccounts = new Set();
    this.twoFactorSecrets = new Map();
    this.backupCodes = new Map();
    
    this.config = {
      sessionTimeout: options.sessionTimeout || 3600000, // 1 hora
      maxFailedAttempts: options.maxFailedAttempts || 5,
      lockoutDuration: options.lockoutDuration || 900000, // 15 minutos
      tokenExpiry: options.tokenExpiry || 86400000, // 24 horas
      passwordMinLength: options.passwordMinLength || 8,
      require2FA: options.require2FA || false,
      auditRetention: options.auditRetention || 2592000000, // 30 dias
      ...options
    };
    
    this.initializeSecurity();
  }

  /**
   * Inicializa sistema de segurança
   */
  initializeSecurity() {
    // Limpar sessões expiradas periodicamente
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 300000); // 5 minutos

    // Limpar tentativas falhadas periodicamente
    setInterval(() => {
      this.cleanupFailedAttempts();
    }, 600000); // 10 minutos

    // Limpar logs de auditoria antigos
    setInterval(() => {
      this.cleanupAuditLog();
    }, 86400000); // 24 horas

    console.log('[AdvancedAuthSystem] Sistema de autenticação inicializado');
  }

  /**
   * Registra novo usuário
   */
  async registerUser(userData) {
    const { email, password, name, role = 'user' } = userData;
    
    // Validar dados
    this.validateUserData(userData);
    
    // Verificar se usuário já existe
    if (this.users.has(email)) {
      throw new Error('Usuário já existe');
    }
    
    // Verificar força da senha
    this.validatePasswordStrength(password);
    
    // Hash da senha
    const hashedPassword = await this.hashPassword(password);
    
    // Gerar ID único
    const userId = uuidv4();
    
    // Criar usuário
    const user = {
      id: userId,
      email,
      password: hashedPassword,
      name,
      role,
      status: 'active',
      createdAt: Date.now(),
      lastLogin: null,
      loginCount: 0,
      twoFactorEnabled: false,
      backupCodesGenerated: false
    };
    
    this.users.set(email, user);
    
    // Log de auditoria
    this.auditLog.push({
      id: uuidv4(),
      userId,
      action: 'user_registered',
      timestamp: Date.now(),
      details: { email, role },
      ip: userData.ip || 'unknown',
      userAgent: userData.userAgent || 'unknown'
    });
    
    this.emit('user_registered', { userId, email });
    
    return { userId, email, message: 'Usuário registrado com sucesso' };
  }

  /**
   * Autentica usuário
   */
  async authenticateUser(credentials, context = {}) {
    const { email, password, twoFactorCode } = credentials;
    const { ip, userAgent } = context;
    
    // Verificar se conta está bloqueada
    if (this.lockedAccounts.has(email)) {
      const lockoutTime = this.failedAttempts.get(email)?.lockoutTime;
      if (lockoutTime && Date.now() < lockoutTime + this.config.lockoutDuration) {
        throw new Error('Conta temporariamente bloqueada. Tente novamente mais tarde.');
      } else {
        this.lockedAccounts.delete(email);
        this.failedAttempts.delete(email);
      }
    }
    
    // Verificar se usuário existe
    const user = this.users.get(email);
    if (!user) {
      this.recordFailedAttempt(email, ip, userAgent);
      throw new Error('Credenciais inválidas');
    }
    
    // Verificar status da conta
    if (user.status !== 'active') {
      throw new Error('Conta inativa ou suspensa');
    }
    
    // Verificar senha
    const passwordValid = await this.verifyPassword(password, user.password);
    if (!passwordValid) {
      this.recordFailedAttempt(email, ip, userAgent);
      throw new Error('Credenciais inválidas');
    }
    
    // Verificar 2FA se habilitado
    if (user.twoFactorEnabled) {
      if (!twoFactorCode) {
        throw new Error('Código 2FA necessário');
      }
      
      const twoFactorValid = this.verifyTwoFactorCode(user.id, twoFactorCode);
      if (!twoFactorValid) {
        this.recordFailedAttempt(email, ip, userAgent);
        throw new Error('Código 2FA inválido');
      }
    }
    
    // Limpar tentativas falhadas
    this.failedAttempts.delete(email);
    this.lockedAccounts.delete(email);
    
    // Atualizar estatísticas do usuário
    user.lastLogin = Date.now();
    user.loginCount++;
    
    // Criar sessão
    const session = await this.createSession(user.id, context);
    
    // Log de auditoria
    this.auditLog.push({
      id: uuidv4(),
      userId: user.id,
      action: 'user_authenticated',
      timestamp: Date.now(),
      details: { email, twoFactorUsed: !!twoFactorCode },
      ip,
      userAgent
    });
    
    this.emit('user_authenticated', { userId: user.id, email, sessionId: session.id });
    
    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      sessionId: session.id,
      token: session.token,
      expiresAt: session.expiresAt
    };
  }

  /**
   * Cria sessão
   */
  async createSession(userId, context = {}) {
    const sessionId = uuidv4();
    const token = this.generateSecureToken();
    const expiresAt = Date.now() + this.config.sessionTimeout;
    
    const session = {
      id: sessionId,
      userId,
      token,
      createdAt: Date.now(),
      expiresAt,
      lastActivity: Date.now(),
      ip: context.ip || 'unknown',
      userAgent: context.userAgent || 'unknown',
      isActive: true
    };
    
    this.sessions.set(sessionId, session);
    this.tokens.set(token, sessionId);
    
    this.emit('session_created', { sessionId, userId });
    
    return session;
  }

  /**
   * Valida sessão
   */
  validateSession(token) {
    const sessionId = this.tokens.get(token);
    if (!sessionId) {
      return null;
    }
    
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) {
      return null;
    }
    
    // Verificar se expirou
    if (Date.now() > session.expiresAt) {
      this.invalidateSession(sessionId);
      return null;
    }
    
    // Atualizar última atividade
    session.lastActivity = Date.now();
    
    return session;
  }

  /**
   * Invalida sessão
   */
  invalidateSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isActive = false;
      this.tokens.delete(session.token);
      
      this.emit('session_invalidated', { sessionId, userId: session.userId });
    }
  }

  /**
   * Configura 2FA
   */
  async setupTwoFactor(userId) {
    const user = this.findUserById(userId);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }
    
    // Gerar secret para 2FA
    const secret = this.generateTwoFactorSecret();
    this.twoFactorSecrets.set(userId, secret);
    
    // Gerar códigos de backup
    const backupCodes = this.generateBackupCodes();
    this.backupCodes.set(userId, backupCodes);
    
    user.backupCodesGenerated = true;
    
    // Log de auditoria
    this.auditLog.push({
      id: uuidv4(),
      userId,
      action: 'two_factor_setup',
      timestamp: Date.now(),
      details: { secretGenerated: true, backupCodesGenerated: true }
    });
    
    this.emit('two_factor_setup', { userId, secret, backupCodes });
    
    return { secret, backupCodes };
  }

  /**
   * Ativa 2FA
   */
  async enableTwoFactor(userId, verificationCode) {
    const user = this.findUserById(userId);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }
    
    const secret = this.twoFactorSecrets.get(userId);
    if (!secret) {
      throw new Error('2FA não foi configurado');
    }
    
    // Verificar código de verificação
    const isValid = this.verifyTwoFactorCode(userId, verificationCode);
    if (!isValid) {
      throw new Error('Código de verificação inválido');
    }
    
    user.twoFactorEnabled = true;
    
    // Log de auditoria
    this.auditLog.push({
      id: uuidv4(),
      userId,
      action: 'two_factor_enabled',
      timestamp: Date.now(),
      details: { enabled: true }
    });
    
    this.emit('two_factor_enabled', { userId });
    
    return { message: '2FA ativado com sucesso' };
  }

  /**
   * Desativa 2FA
   */
  async disableTwoFactor(userId, password, backupCode) {
    const user = this.findUserById(userId);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }
    
    // Verificar senha
    const passwordValid = await this.verifyPassword(password, user.password);
    if (!passwordValid) {
      throw new Error('Senha inválida');
    }
    
    // Verificar código de backup
    const backupCodes = this.backupCodes.get(userId);
    if (!backupCodes || !backupCodes.includes(backupCode)) {
      throw new Error('Código de backup inválido');
    }
    
    user.twoFactorEnabled = false;
    this.twoFactorSecrets.delete(userId);
    this.backupCodes.delete(userId);
    
    // Log de auditoria
    this.auditLog.push({
      id: uuidv4(),
      userId,
      action: 'two_factor_disabled',
      timestamp: Date.now(),
      details: { disabled: true }
    });
    
    this.emit('two_factor_disabled', { userId });
    
    return { message: '2FA desativado com sucesso' };
  }

  /**
   * Altera senha
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = this.findUserById(userId);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }
    
    // Verificar senha atual
    const currentPasswordValid = await this.verifyPassword(currentPassword, user.password);
    if (!currentPasswordValid) {
      throw new Error('Senha atual inválida');
    }
    
    // Validar nova senha
    this.validatePasswordStrength(newPassword);
    
    // Hash da nova senha
    const hashedNewPassword = await this.hashPassword(newPassword);
    
    // Atualizar senha
    user.password = hashedNewPassword;
    
    // Invalidar todas as sessões ativas
    this.invalidateAllUserSessions(userId);
    
    // Log de auditoria
    this.auditLog.push({
      id: uuidv4(),
      userId,
      action: 'password_changed',
      timestamp: Date.now(),
      details: { passwordChanged: true }
    });
    
    this.emit('password_changed', { userId });
    
    return { message: 'Senha alterada com sucesso' };
  }

  /**
   * Reseta senha
   */
  async resetPassword(email, resetCode, newPassword) {
    const user = this.users.get(email);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }
    
    // Verificar código de reset (simulação)
    if (!this.verifyResetCode(email, resetCode)) {
      throw new Error('Código de reset inválido');
    }
    
    // Validar nova senha
    this.validatePasswordStrength(newPassword);
    
    // Hash da nova senha
    const hashedNewPassword = await this.hashPassword(newPassword);
    
    // Atualizar senha
    user.password = hashedNewPassword;
    
    // Invalidar todas as sessões ativas
    this.invalidateAllUserSessions(user.id);
    
    // Log de auditoria
    this.auditLog.push({
      id: uuidv4(),
      userId: user.id,
      action: 'password_reset',
      timestamp: Date.now(),
      details: { email, passwordReset: true }
    });
    
    this.emit('password_reset', { userId: user.id, email });
    
    return { message: 'Senha resetada com sucesso' };
  }

  /**
   * Registra tentativa falhada
   */
  recordFailedAttempt(email, ip, userAgent) {
    const attempts = this.failedAttempts.get(email) || { count: 0, lastAttempt: 0 };
    attempts.count++;
    attempts.lastAttempt = Date.now();
    attempts.ip = ip;
    attempts.userAgent = userAgent;
    
    this.failedAttempts.set(email, attempts);
    
    // Bloquear conta se exceder limite
    if (attempts.count >= this.config.maxFailedAttempts) {
      this.lockedAccounts.add(email);
      attempts.lockoutTime = Date.now();
      
      this.emit('account_locked', { email, attempts: attempts.count });
    }
    
    // Log de auditoria
    this.auditLog.push({
      id: uuidv4(),
      userId: null,
      action: 'failed_login_attempt',
      timestamp: Date.now(),
      details: { email, attempts: attempts.count },
      ip,
      userAgent
    });
  }

  /**
   * Limpa sessões expiradas
   */
  cleanupExpiredSessions() {
    const now = Date.now();
    const expiredSessions = [];
    
    for (const [sessionId, session] of this.sessions) {
      if (now > session.expiresAt) {
        expiredSessions.push(sessionId);
      }
    }
    
    expiredSessions.forEach(sessionId => {
      this.invalidateSession(sessionId);
    });
    
    if (expiredSessions.length > 0) {
      this.emit('sessions_cleaned', { count: expiredSessions.length });
    }
  }

  /**
   * Limpa tentativas falhadas antigas
   */
  cleanupFailedAttempts() {
    const now = Date.now();
    const expiredAttempts = [];
    
    for (const [email, attempts] of this.failedAttempts) {
      if (now - attempts.lastAttempt > this.config.lockoutDuration) {
        expiredAttempts.push(email);
      }
    }
    
    expiredAttempts.forEach(email => {
      this.failedAttempts.delete(email);
      this.lockedAccounts.delete(email);
    });
  }

  /**
   * Limpa logs de auditoria antigos
   */
  cleanupAuditLog() {
    const cutoffTime = Date.now() - this.config.auditRetention;
    this.auditLog = this.auditLog.filter(log => log.timestamp > cutoffTime);
  }

  /**
   * Invalida todas as sessões do usuário
   */
  invalidateAllUserSessions(userId) {
    for (const [sessionId, session] of this.sessions) {
      if (session.userId === userId && session.isActive) {
        this.invalidateSession(sessionId);
      }
    }
  }

  /**
   * Valida dados do usuário
   */
  validateUserData(userData) {
    const { email, password, name } = userData;
    
    if (!email || !password || !name) {
      throw new Error('Email, senha e nome são obrigatórios');
    }
    
    if (!this.isValidEmail(email)) {
      throw new Error('Email inválido');
    }
    
    if (name.length < 2) {
      throw new Error('Nome deve ter pelo menos 2 caracteres');
    }
  }

  /**
   * Valida força da senha
   */
  validatePasswordStrength(password) {
    if (password.length < this.config.passwordMinLength) {
      throw new Error(`Senha deve ter pelo menos ${this.config.passwordMinLength} caracteres`);
    }
    
    if (!/(?=.*[a-z])/.test(password)) {
      throw new Error('Senha deve conter pelo menos uma letra minúscula');
    }
    
    if (!/(?=.*[A-Z])/.test(password)) {
      throw new Error('Senha deve conter pelo menos uma letra maiúscula');
    }
    
    if (!/(?=.*\d)/.test(password)) {
      throw new Error('Senha deve conter pelo menos um número');
    }
    
    if (!/(?=.*[@$!%*?&])/.test(password)) {
      throw new Error('Senha deve conter pelo menos um caractere especial');
    }
  }

  /**
   * Verifica se email é válido
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Hash da senha
   */
  async hashPassword(password) {
    // Simulação de hash (em produção, usar bcrypt ou similar)
    const salt = Math.random().toString(36).substring(2);
    return `hashed_${password}_${salt}`;
  }

  /**
   * Verifica senha
   */
  async verifyPassword(password, hashedPassword) {
    // Simulação de verificação (em produção, usar bcrypt ou similar)
    return hashedPassword.startsWith(`hashed_${password}_`);
  }

  /**
   * Gera token seguro
   */
  generateSecureToken() {
    return uuidv4() + '_' + Math.random().toString(36).substring(2);
  }

  /**
   * Gera secret para 2FA
   */
  generateTwoFactorSecret() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  /**
   * Gera códigos de backup
   */
  generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
    }
    return codes;
  }

  /**
   * Verifica código 2FA
   */
  verifyTwoFactorCode(userId, code) {
    // Simulação de verificação 2FA (em produção, usar biblioteca TOTP)
    const secret = this.twoFactorSecrets.get(userId);
    if (!secret) return false;
    
    // Simular verificação baseada em tempo
    const expectedCode = Math.floor(Date.now() / 30000) % 1000000;
    return code === expectedCode.toString().padStart(6, '0');
  }

  /**
   * Verifica código de reset
   */
  verifyResetCode(email, code) {
    // Simulação de verificação de código de reset
    return code === '123456'; // Em produção, usar código real
  }

  /**
   * Encontra usuário por ID
   */
  findUserById(userId) {
    for (const user of this.users.values()) {
      if (user.id === userId) {
        return user;
      }
    }
    return null;
  }

  /**
   * Obtém logs de auditoria
   */
  getAuditLog(userId = null, limit = 100) {
    let logs = this.auditLog;
    
    if (userId) {
      logs = logs.filter(log => log.userId === userId);
    }
    
    return logs
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Obtém estatísticas de segurança
   */
  getSecurityStats() {
    const totalUsers = this.users.size;
    const activeSessions = Array.from(this.sessions.values()).filter(s => s.isActive).length;
    const lockedAccounts = this.lockedAccounts.size;
    const twoFactorEnabled = Array.from(this.users.values()).filter(u => u.twoFactorEnabled).length;
    
    return {
      totalUsers,
      activeSessions,
      lockedAccounts,
      twoFactorEnabled,
      twoFactorRate: totalUsers > 0 ? twoFactorEnabled / totalUsers : 0,
      auditLogEntries: this.auditLog.length,
      failedAttempts: this.failedAttempts.size
    };
  }
}

// Instância singleton
export const advancedAuthSystem = new AdvancedAuthSystem({
  sessionTimeout: 3600000, // 1 hora
  maxFailedAttempts: 5,
  lockoutDuration: 900000, // 15 minutos
  tokenExpiry: 86400000, // 24 horas
  passwordMinLength: 8,
  require2FA: false,
  auditRetention: 2592000000 // 30 dias
});

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.advancedAuthSystem = advancedAuthSystem;
}

