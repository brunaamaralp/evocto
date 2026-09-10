import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { User } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Loader2, AlertCircle, Mail, Lock } from 'lucide-react';
import NaviBrandLockup from '@/components/NaviBrandLockup';
import EvoctoMascot from '@/components/brand/EvoctoMascot';
import { useSession, SESSION_STATUS } from '@/components/auth/SessionManager';

function homeForUser(user) {
  return user?.role === 'client' ? '/client-portal' : '/dashboard';
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, sessionStatus, bootstrapAuth } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const checkingSession =
    sessionStatus === SESSION_STATUS.BOOTSTRAPPING ||
    sessionStatus === SESSION_STATUS.LOADING;

  useEffect(() => {
    if (isAuthenticated && user) {
      const redirect = new URLSearchParams(location.search).get('redirect');
      navigate(redirect || homeForUser(user), { replace: true });
    }
  }, [isAuthenticated, user, navigate, location.search]);

  useEffect(() => {
    if (isAuthenticated || checkingSession) return;
    void bootstrapAuth();
  }, [isAuthenticated, checkingSession, bootstrapAuth]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!email || !password) {
      setError('Preencha email e senha.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const loggedUser = await User.login({ email: email.trim(), password });
      await bootstrapAuth({ force: true });
      const redirect = new URLSearchParams(location.search).get('redirect');
      if (redirect) {
        navigate(redirect, { replace: true });
        return;
      }
      navigate(homeForUser(loggedUser), { replace: true });
    } catch (err) {
      const message = err?.message || '';
      if (message.toLowerCase().includes('invalid') || message.toLowerCase().includes('credentials')) {
        setError('Email ou senha incorretos.');
      } else {
        setError(message || 'Não foi possível entrar. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession || isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F5F2FC] via-white to-[#EDE9FB] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-[#7A7595]">
          <Loader2 className="h-8 w-8 animate-spin text-[#6C47D8]" />
          <p className="text-sm">
            {isAuthenticated ? 'Abrindo seu painel...' : 'Verificando sessão...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F2FC] via-white to-[#EDE9FB] flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-[var(--shadow-elevated)] border-transparent">
        <CardHeader className="text-center space-y-4">
          <div className="flex flex-col items-center gap-3">
            <EvoctoMascot mark size={56} />
            <NaviBrandLockup height={36} variant="auth" />
          </div>
          <div>
            <CardTitle className="text-2xl text-[#18162A]">Entrar</CardTitle>
            <p className="text-sm text-[#7A7595] mt-1">Acesse sua agência no Evocto</p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7A7595]" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className="pl-9 rounded-xl bg-[#F5F2FC] border-transparent focus-visible:ring-[#6C47D8]"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7A7595]" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="pl-9 pr-10 rounded-xl bg-[#F5F2FC] border-transparent focus-visible:ring-[#6C47D8]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A7595]"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Entrar'}
            </Button>

            <div className="flex justify-between text-sm">
              <Link to="/create-account" className="text-[#6C47D8] hover:underline font-medium">
                Criar conta
              </Link>
              <Link to="/password-reset" className="text-[#7A7595] hover:underline">
                Esqueci a senha
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
