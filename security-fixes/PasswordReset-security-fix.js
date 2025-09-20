/**
 * 🔒 CORREÇÃO DE SEGURANÇA - PasswordReset.jsx
 * 
 * PROBLEMA: Hardcoded password hash na linha 162
 * SOLUÇÃO: Implementar hash seguro de senha
 */

// ❌ CÓDIGO ATUAL (INSEGURO)
// await User.update(user.id, {
//   password_hash: 'new_hashed_password', // HARDCODED!
//   reset_token: null,
//   reset_token_expires_at: null
// });

// ✅ CÓDIGO CORRIGIDO (SEGURO)
import { hashPassword, validatePasswordStrength } from '@/utils/security';

const resetPassword = async () => {
  // ... validações existentes ...

  try {
    // 1. Validar força da senha
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.message);
      return;
    }

    // 2. Hash seguro da senha
    const hashedPassword = await hashPassword(newPassword);

    // 3. Atualizar usuário com hash seguro
    await User.update(user.id, {
      password_hash: hashedPassword, // ✅ Hash seguro
      reset_token: null,
      reset_token_expires_at: null,
      password_changed_at: new Date().toISOString(),
      failed_login_attempts: 0 // Reset tentativas de login
    });

    // 4. Log de auditoria seguro
    await AuditLog.create({
      entity_type: 'User',
      entity_id: user.id,
      action: 'AUTH_PASSWORD_CHANGED',
      actor_id: user.email,
      meta_json: {
        change_method: 'password_reset',
        timestamp: new Date().toISOString(),
        ip: await getClientIP(), // Função segura para IP
        user_agent: navigator.userAgent,
        password_strength: passwordValidation.score
      }
    });

    // 5. Notificar usuário por email
    await sendPasswordChangeNotification(user.email);

    toast.success('Senha alterada com sucesso! Verifique seu email.');
    
    // 6. Redirecionamento seguro
    navigate('/login');

  } catch (error) {
    console.error('Erro ao redefinir senha:', error);
    setError('Erro interno. Tente novamente ou entre em contato com o suporte.');
  }
};

