import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, RefreshCw, Mail } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { acceptInvite } from '@/api/functions';
import { User } from '@/api/entities';

export default function InviteAcceptPage() {
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
    if (!token) {
      setStatus('error');
      setMessage('Token inválido.');
      return;
    }

    setStatus('processing');
    setMessage('');
    try {
      const { data } = await acceptInvite({ token });
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

  const goToApp = async () => {
    try {
      const me = await User.me();
      if (me?.role === 'client') {
        window.location.href = '/client-portal';
      } else {
        window.location.href = '/today';
      }
    } catch {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
      <Card className="max-w-md w-full border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="text-center mb-4">
            <h1 className="text-xl font-bold text-slate-900">Aceitar Convite</h1>
            <p className="text-slate-600 mt-1">Confirme sua participação na agência</p>
          </div>

          {status === 'idle' && (
            <div className="space-y-4">
              <p className="text-slate-700 text-sm">
                Clique no botão abaixo para aceitar o convite. Você deverá estar logado com o mesmo e-mail do convite.
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
                <Button variant="outline" className="w-full" onClick={handleAccept}>
                  Tentar novamente
                </Button>
                <a
                  href="mailto:suporte@evocto.com?subject=Reenvio%20de%20convite&body=Meu%20convite%20expirou.%20Poderiam%20reenviar%3F"
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