import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { User, AuditLog } from '@/api/entities';
import { SendEmail } from '@/api/integrations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { hashPassword, validatePasswordStrength, generateSecureToken, getClientIP } from '@/utils/security';

export default function PasswordReset() {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState('request'); // 'request' | 'reset' | 'success'
  const [error, setError] = useState('');

  const resetToken = new URLSearchParams(location.search).get('token');

  useEffect(() => {
    // Check if user is already logged in
    checkAuthStatus();
    
    if (resetToken) {
      setStep('reset');
    }
  }, [resetToken]);

  const checkAuthStatus = async () => {
    try {
      const user = await User.me();
      if (user) {
        // User is logged in, redirect to account page
        navigate('/dashboard'); // Use built-in navigation
      }
    } catch (error) {
      // User not authenticated, continue with reset flow
    }
  };

  const sendResetEmail = async () => {
    if (!email) {
      setError('Digite seu email.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Check if user exists
      const users = await User.filter({ email: email.toLowerCase() });
      
      if (users.length === 0) {
        setError('Email não encontrado.');
        return;
      }

      const user = users[0];

      // Generate secure reset token
      const resetToken = generateSecureToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Update user with reset token
      await User.update(user.id, {
        reset_token: resetToken,
        reset_token_expires_at: expiresAt.toISOString()
      });

      // Send reset email
      const resetUrl = `${window.location.origin}${window.location.pathname}?token=${resetToken}`;
      
      await SendEmail({
        to: email,
        subject: 'Redefinir senha - InsightFlow',
        body: `
          Olá ${user.full_name || 'usuário'},
          
          Você solicitou a redefinição da sua senha. Clique no link abaixo para criar uma nova senha:
          
          ${resetUrl}
          
          Este link expira em 1 hora.
          
          Se você não solicitou esta redefinição, pode ignorar este email.
          
          Equipe InsightFlow
        `
      });

      // Log password reset request
      await AuditLog.create({
        entity_type: 'User',
        entity_id: user.id,
        action: 'AUTH_PASSWORD_RESET_REQUESTED',
        actor_id: user.email,
        meta_json: {
          expires_at: expiresAt.toISOString(),
          ip: 'client_ip',
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      });

      toast.success('Email de redefinição enviado! Verifique sua caixa de entrada.');
      setStep('success');

    } catch (error) {
      setError('Erro ao enviar email. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      setError('Digite e confirme sua nova senha.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Senhas não coincidem.');
      return;
    }

    // Validar força da senha
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.message);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Find user by reset token
      const users = await User.filter({ reset_token: resetToken });
      
      if (users.length === 0) {
        setError('Token inválido ou expirado.');
        return;
      }

      const user = users[0];

      // Check token expiration
      if (user.reset_token_expires_at && new Date() > new Date(user.reset_token_expires_at)) {
        setError('Token expirado. Solicite um novo link.');
        return;
      }

      // Hash seguro da senha
      const hashedPassword = await hashPassword(newPassword);

      // Update password and clear reset token
      await User.update(user.id, {
        password_hash: hashedPassword, // ✅ Hash seguro implementado
        reset_token: null,
        reset_token_expires_at: null,
        password_changed_at: new Date().toISOString(),
        failed_login_attempts: 0 // Reset tentativas de login
      });

      // Log password change com dados seguros
      const clientIP = await getClientIP();
      await AuditLog.create({
        entity_type: 'User',
        entity_id: user.id,
        action: 'AUTH_PASSWORD_CHANGED',
        actor_id: user.email,
        meta_json: {
          change_method: 'password_reset',
          timestamp: new Date().toISOString(),
          ip: clientIP,
          user_agent: navigator.userAgent,
          password_strength: passwordValidation.score
        }
      });

      toast.success('Senha alterada com sucesso! Você pode fazer login agora.');
      
      // Redirect to built-in login
      navigate('/login');

    } catch (error) {
      setError('Erro interno. Tente novamente ou entre em contato com o suporte.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mx-auto mb-4">
              <Mail className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900">Email Enviado!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-slate-600">
              Enviamos instruções para redefinir sua senha para <strong>{email}</strong>. 
              Verifique sua caixa de entrada e siga as instruções.
            </p>
            <p className="text-center text-sm text-slate-500">
              O link expira em 1 hora.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('request')} className="flex-1">
                Tentar Novamente
              </Button>
              <Button onClick={handleBackToLogin} className="flex-1 bg-blue-600 hover:bg-blue-700">
                Voltar ao Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleBackToLogin}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              {step === 'request' ? (
                <Mail className="w-5 h-5 text-blue-600" />
              ) : (
                <Shield className="w-5 h-5 text-blue-600" />
              )}
              <CardTitle className="text-xl font-bold text-slate-900">
                {step === 'request' ? 'Esqueci minha senha' : 'Criar nova senha'}
              </CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === 'request' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  disabled={isLoading}
                  className="focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              <Button
                onClick={sendResetEmail}
                disabled={isLoading || !email}
                className="w-full bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4 mr-2" />
                )}
                {isLoading ? 'Enviando...' : 'Enviar Link de Redefinição'}
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="new_password">Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="new_password"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nova senha (mín. 8 caracteres)"
                    disabled={isLoading}
                    className="focus:ring-2 focus:ring-blue-500 pr-10"
                    autoFocus
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-8 w-8 p-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirmar Senha</Label>
                <div className="relative">
                  <Input
                    id="confirm_password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirme sua nova senha"
                    disabled={isLoading}
                    className="focus:ring-2 focus:ring-blue-500 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-8 w-8 p-0"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button
                onClick={resetPassword}
                disabled={isLoading || !newPassword || !confirmPassword}
                className="w-full bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4 mr-2" />
                )}
                {isLoading ? 'Alterando...' : 'Alterar Senha'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}