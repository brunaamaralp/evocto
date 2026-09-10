import { useCallback, useEffect, useState } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HardDrive, Link2, Loader2, Unplug } from 'lucide-react';
import { toast } from 'sonner';
import {
  materialDriveConnect,
  materialDriveDisconnect,
  materialDriveStatus,
} from '@/lib/materialDeliveriesApi';

export default function GoogleDriveConnectionCard() {
  const { isOwner, isAdmin } = useSession();
  const canManage = isOwner || isAdmin;
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await materialDriveStatus();
      setStatus(data);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Falha ao carregar status do Drive');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('drive') === 'connected') {
      toast.success('Google Drive conectado');
      load();
    } else if (params.get('drive') === 'error') {
      toast.error('Não foi possível conectar o Google Drive');
    }
  }, [load]);

  const handleConnect = async () => {
    setBusy(true);
    try {
      const data = await materialDriveConnect();
      if (data.url) window.location.href = data.url;
      else throw new Error('URL OAuth ausente');
    } catch (err) {
      toast.error(err.message || 'Falha ao iniciar OAuth');
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Desconectar o Google Drive desta agência?')) return;
    setBusy(true);
    try {
      await materialDriveDisconnect();
      toast.success('Drive desconectado');
      await load();
    } catch (err) {
      toast.error(err.message || 'Falha ao desconectar');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <HardDrive className="w-4 h-4" />
          Google Drive (entregas)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-600">
          Arquivos de aprovação ficam no Drive da agência. O cliente acessa só pelo link do Evocto.
        </p>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando…
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            {status?.connected ? (
              <>
                <Badge className="bg-emerald-100 text-emerald-800">Conectado</Badge>
                <span className="text-sm text-slate-700">{status.googleEmail}</span>
              </>
            ) : status?.status === 'needs_reauth' ? (
              <>
                <Badge className="bg-amber-100 text-amber-800">Reconectar</Badge>
                <span className="text-sm text-slate-600">{status.lastError || 'Sessão expirada'}</span>
              </>
            ) : (
              <Badge variant="outline">Não conectado</Badge>
            )}
          </div>
        )}

        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleConnect} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Link2 className="w-4 h-4 mr-2" />}
              {status?.connected ? 'Reconectar' : 'Conectar Google Drive'}
            </Button>
            {status?.connected && (
              <Button variant="outline" onClick={handleDisconnect} disabled={busy}>
                <Unplug className="w-4 h-4 mr-2" />
                Desconectar
              </Button>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-500">Somente owner/admin pode conectar ou desconectar.</p>
        )}
      </CardContent>
    </Card>
  );
}
