
import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, SendHorizontal, Ban, Users } from 'lucide-react';
import { manageInvites } from '@/api/functions';

export default function InvitesPanel() {
  const [loading, setLoading] = useState(true);
  const [invites, setInvites] = useState([]);
  const [stats, setStats] = useState({ total: 0, sent: 0, accepted: 0, expired: 0 });
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await manageInvites({ action: 'list' });
      if (data?.success) {
        setInvites(data.invites || []);
        setStats(prev => data.stats || prev);
      } else {
        setError(data?.error || 'Falha ao carregar convites');
      }
    } catch (e) {
      setError(e?.message || 'Erro ao carregar convites');
    } finally {
      setLoading(false);
    }
  }, []);

  const resend = async (inviteId) => {
    try {
      await manageInvites({ action: 'resend', inviteId });
      await load();
    } catch (e) {
      setError(e?.message || 'Falha ao reenviar convite');
    }
  };

  const revoke = async (inviteId) => {
    try {
      await manageInvites({ action: 'revoke', inviteId });
      await load();
    } catch (e) {
      setError(e?.message || 'Falha ao revogar convite');
    }
  };

  useEffect(() => { load(); }, [load]);

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-700" />
            <h2 className="text-lg font-semibold text-slate-900">Convites da Equipe</h2>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Total: {stats.total}</Badge>
            <Badge className="bg-blue-100 text-blue-800">Enviados: {stats.sent}</Badge>
            <Badge className="bg-emerald-100 text-emerald-800">Aceitos: {stats.accepted}</Badge>
            <Badge className="bg-slate-100 text-slate-800">Expirados: {stats.expired}</Badge>
            <Button variant="outline" size="sm" onClick={load}>
              <RefreshCw className="w-4 h-4 mr-1" /> Atualizar
            </Button>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <div className="space-y-2">
          {loading ? (
            <p className="text-slate-600">Carregando convites...</p>
          ) : invites.length === 0 ? (
            <p className="text-slate-600">Nenhum convite encontrado.</p>
          ) : (
            invites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-900">{inv.email}</p>
                  <div className="text-xs text-slate-600">
                    <span className="mr-2">Role: {inv.role}</span>
                    <span className="mr-2">Status: {inv.status}</span>
                    <span>Enviado há {inv.daysSinceSent} dia(s)</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => resend(inv.id)} 
                    disabled={!inv.canResend}
                    className="gap-1"
                  >
                    <SendHorizontal className="w-4 h-4" /> Reenviar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => revoke(inv.id)} 
                    disabled={!inv.canRevoke}
                    className="gap-1"
                  >
                    <Ban className="w-4 h-4" /> Revogar
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
