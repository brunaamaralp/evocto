import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { getAccount } from '@/api/appwriteClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { validatePasswordStrength } from '@/utils/security';
import { useSession } from '@/components/auth/SessionManager';

function recoveryRedirectUrl() {
  if (typeof window === 'undefined') return '/password-reset';
  return `${window.location.origin}/password-reset`;
}

export default function PasswordReset() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useSession();

  const params = new URLSearchParams(location.search);
  const userId = params.get('userId') || '';
  const secret = params.get('secret') || '';
  const hasRecoveryParams = Boolean(userId && secret);

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(hasRecoveryParams ? 'reset' : 'request');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    setStep(hasRecoveryParams ? 'reset' : 'request');
  }, [hasRecoveryParams]);

  const sendResetEmail = useCallback(async () => {
    if (!email.trim()) {
      setError('Digite seu email.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const account = getAccount();
      await account.createRecovery({
        email: email.trim().toLowerCase(),
        url: recoveryRedirectUrl(),
      });
      setStep('success');
      toast.success('Se o email existir, enviamos o link de redefinição.');
    } catch (err) {
      // Não revelar se o email existe; Appwrite pode falhar por rate limit / config.
      const message = String(err?.message || '');
      if (message.toLowerCase().includes('rate')) {
        setError('Muitas tentativas. Aguarde um momento e tente de novo.');
      } else {
        // Mesmo em falha genérica, UX neutra (evita enumeração de emails)
        setStep('success');
        toast.success('Se o email existir, enviamos o link de redefinição.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [email]);

  const resetPassword = useCallback(async () => {
    if (!newPassword || !confirmPassword) {
      setError('Digite e confirme sua nova senha.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Senhas não coincidem.');
      return;
    }

    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.message);
      return;
    }

    if (!userId || !secret) {
      setError('Link inválido ou incompleto. Solicite um novo.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const account = getAccount();
      await account.updateRecovery({
        userId,
        secret,
        password: newPassword,
      });
      toast.success('Senha alterada com sucesso! Você pode fazer login agora.');
      navigate('/login', { replace: true });
    } catch (err) {
      const message = String(err?.message || '');
      if (message.toLowerCase().includes('invalid') || message.toLowerCase().includes('expired')) {
        setError('Link inválido ou expirado. Solicite um novo.');
      } else {
        setError(message || 'Erro ao alterar senha. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [newPassword, confirmPassword, userId, secret, navigate]);

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mx-auto mb-4">
              <Mail className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900">Email enviado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-slate-600">
              Se <strong>{email}</strong> estiver cadastrado no Evocto, você receberá um link
              para criar uma nova senha.
            </p>
            <p className="text-center text-sm text-slate-500">O link expira em 1 hora.</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('request')} className="flex-1">
                Tentar novamente
              </Button>
              <Button asChild className="flex-1 bg-blue-600 hover:bg-blue-700">
                <Link to="/login">Voltar ao Login</Link>
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
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <Link to="/login">
                <ArrowLeft className="w-4 h-4" />
              </Link>
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
                className="w-full bg-blue-600 hover:bg-blue-700"
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
                    className="pr-10"
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
                    className="pr-10"
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
                className="w-full bg-blue-600 hover:bg-blue-700"
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
