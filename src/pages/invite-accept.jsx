import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, RefreshCw, Mail, LogIn } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { acceptInvite } from '@/api/functions';
import { useSession } from '@/components/auth/SessionManager';

function currentInvitePath() {
  if (typeof window === 'undefined') return '/invite-accept';
  return `${window.location.pathname}${window.location.search}`;
}

export default function InviteAcceptPage() {
  const { isAuthenticated, loading: sessionLoading } = useSession();
  const [status, setStatus] = useState('idle'); // idle | processing | success | error
  const [message, setMessage] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [token, setToken] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token') || '';
    setToken(t);
  }, []);

  const handleAccept = async () => {
    const params = new URLSearchParams(window.location.search);
    const inviteToken = token || params.get('token') || '';
    const membershipId = params.get('membershipId') || '';
    const userId = params.get('userId') || '';
    const secret = params.get('secret') || '';
    const teamId = params.get('teamId') || '';

    if (!inviteToken && !(membershipId && secret && teamId)) {
      setStatus('error');
      setMessage('Link de convite inválido.');
      return;
    }

    if (!isAuthenticated) {
      setStatus('error');
      setMessage('Faça login com o mesmo e-mail do convite antes de aceitar.');
      return;
    }

    setStatus('processing');
    setMessage('');
    try {
      const { data } = await acceptInvite({
        token: inviteToken,
        membershipId,
        userId,
        secret,
        teamId,
      });
      if (data?.success) {
        setAgencyName(data.agencyName || '');
        setStatus('success');
        setMessage('Convite aceito com sucesso! Você já tem acesso à agência.');
      } else {
        setStatus('error');
        setMessage(data?.message || 'Não foi possível aceitar o convite.');
      }
    } catch (err) {
      const msg = err?.message || 'Erro ao processar convite.';
      setStatus('error');
      setMessage(msg);
    }
  };

  const goToApp = () => {
    window.location.href = '/dashboard';
  };

  const loginHref = `/login?redirect=${encodeURIComponent(currentInvitePath())}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
      <Card className="max-w-md w-full border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="text-center mb-4">
            <h1 className="text-xl font-bold text-slate-900">Aceitar Convite</h1>
            <p className="text-slate-600 mt-1">Confirme sua participação na agência</p>
          </div>

          {sessionLoading && (
            <div className="text-center py-6">
              <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto mb-3" />
              <p className="text-slate-700">Verificando sessão...</p>
            </div>
          )}

          {!sessionLoading && status === 'idle' && !isAuthenticated && (
            <div className="space-y-4">
              <p className="text-slate-700 text-sm">
                Para aceitar o convite, entre com o mesmo e-mail que recebeu o convite.
                Depois você volta automaticamente para esta página.
              </p>
              <Button className="w-full bg-blue-600 hover:bg-blue-700" asChild>
                <Link to={loginHref}>
                  <LogIn className="w-4 h-4 mr-2" />
                  Entrar para aceitar
                </Link>
              </Button>
              <p className="text-xs text-slate-500">
                Ainda não tem conta? Peça ao administrador para confirmar o e-mail do convite.
              </p>
            </div>
          )}

          {!sessionLoading && status === 'idle' && isAuthenticated && (
            <div className="space-y-4">
              <p className="text-slate-700 text-sm">
                Clique no botão abaixo para aceitar o convite. Use a conta com o mesmo e-mail
                do convite.
              </p>
              <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleAccept}>
                Aceitar Convite
              </Button>
              <p className="text-xs text-slate-500">
                Se o link estiver expirado ou inválido, peça para o administrador reenviar o convite.
              </p>
            </div>
          )}

          {status === 'processing' && (
            <div className="text-center py-6">
              <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto mb-3" />
              <p className="text-slate-700">Processando seu convite...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center py-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <p className="text-slate-800 font-medium mb-1">Convite aceito!</p>
              {agencyName && <p className="text-slate-600 text-sm">Agência: {agencyName}</p>}
              {message && <p className="text-slate-600 text-sm mt-1">{message}</p>}
              <Button className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700" onClick={goToApp}>
                Entrar no App
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="text-center">
                <AlertTriangle className="w-7 h-7 text-amber-600 mx-auto mb-2" />
                <p className="text-slate-800 font-medium">{message || 'Não foi possível aceitar o convite.'}</p>
              </div>
              <div className="space-y-2">
                {!isAuthenticated ? (
                  <Button className="w-full bg-blue-600 hover:bg-blue-700" asChild>
                    <Link to={loginHref}>
                      <LogIn className="w-4 h-4 mr-2" />
                      Entrar para aceitar
                    </Link>
                  </Button>
                ) : (
                  <Button variant="outline" className="w-full" onClick={handleAccept}>
                    Tentar novamente
                  </Button>
                )}
                <a
                  href="mailto:contato@estudionarrativa.com?subject=Reenvio%20de%20convite&body=Meu%20convite%20expirou.%20Poderiam%20reenviar%3F"
                  className="w-full inline-flex items-center justify-center gap-2 text-blue-700 hover:text-blue-800"
                >
                  <Mail className="w-4 h-4" /> Pedir reenvio por e-mail
                </a>
              </div>
              <p className="text-xs text-slate-500 text-center">
                Motivos comuns: convite expirado, já utilizado, pertence a outra agência, ou e-mail diferente do convidado.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
