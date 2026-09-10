import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Loader2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import {
  processCampaignShareDecision,
  resolveCampaignShare,
} from '@/lib/campaignShare';

export default function CampaignSharePage() {
  const params = useParams();
  const token = useMemo(() => {
    if (params.shareToken) return params.shareToken;
    if (params.token) return params.token;
    return new URLSearchParams(window.location.search).get('token') || '';
  }, [params.shareToken, params.token]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expired, setExpired] = useState(false);
  const [data, setData] = useState(null);
  const [reviewerName, setReviewerName] = useState('');
  const [note, setNote] = useState('');
  const [mode, setMode] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  const load = useCallback(async () => {
    if (!token) {
      setError('Link inválido');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setExpired(false);
    try {
      const res = await resolveCampaignShare(token);
      setData(res);
      if (res.alreadyApproved) setDone('approved');
    } catch (err) {
      if (err?.code === 'expired') setExpired(true);
      else setError(err.message || 'Não foi possível abrir este link');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (decision) => {
    if (!reviewerName.trim()) {
      toast.error('Informe seu nome');
      return;
    }
    if (decision === 'changes' && !note.trim()) {
      toast.error('Descreva o que precisa alterar');
      return;
    }
    setBusy(true);
    try {
      await processCampaignShareDecision({
        token,
        decision,
        reviewerName: reviewerName.trim(),
        note: note.trim(),
      });
      setDone(decision === 'approve' ? 'approved' : 'changes');
      toast.success(decision === 'approve' ? 'Calendário aprovado' : 'Alterações enviadas');
    } catch (err) {
      toast.error(err.message || 'Falha ao enviar');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    );
  }

  if (expired) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-10 text-center">
            <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-amber-500" />
            <h1 className="mb-2 text-lg font-semibold">Link expirado</h1>
            <p className="text-sm text-slate-600">
              Peça um novo link à agência (válido por 7 dias).
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-10 text-center">
            <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-amber-500" />
            <h1 className="mb-2 text-lg font-semibold">Link indisponível</h1>
            <p className="text-sm text-slate-600">{error || 'Não encontrado'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="space-y-2 py-10 text-center">
            <CheckCircle className="mx-auto h-10 w-10 text-emerald-600" />
            <h1 className="text-lg font-semibold">
              {done === 'approved' ? 'Aprovação registrada' : 'Pedido de alterações enviado'}
            </h1>
            <p className="text-sm text-slate-600">
              A agência foi notificada. Você já pode fechar esta página.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { service, client, phase, share } = data;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-lg space-y-4">
        <div className="text-center">
          <Badge variant="outline" className="mb-2">
            {share.gatekeeper === 'influencer' ? 'Aprovação influencer' : 'Calendário do cliente'}
          </Badge>
          <h1 className="text-xl font-semibold text-slate-900">
            {client?.name || 'Campanha'} · {service.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Revise e aprove até a data combinada. Sem login.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" />
              {phase?.name || 'Calendário'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            {phase?.description ? <p>{phase.description}</p> : null}
            <div className="flex flex-wrap gap-2 text-xs text-slate-500">
              {phase?.planned_end ? <span>Prazo: {phase.planned_end}</span> : null}
              {phase?.sla_dias ? <span>SLA: {phase.sla_dias} dias</span> : null}
              {service.ciclo_comercial ? (
                <Badge variant="secondary">{service.ciclo_comercial}</Badge>
              ) : null}
              {service.linha_focal ? (
                <Badge variant="outline">{service.linha_focal}</Badge>
              ) : null}
              {service.tipo_campanha ? (
                <Badge variant="outline">{service.tipo_campanha}</Badge>
              ) : null}
            </div>
            {share.expires_at ? (
              <p className="text-xs text-slate-500">
                Este link vale até {String(share.expires_at).slice(0, 10)}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 pt-4">
            <div className="space-y-1">
              <Label>Seu nome *</Label>
              <Input
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                placeholder="Nome de quem aprova"
              />
            </div>

            {mode === 'changes' ? (
              <div className="space-y-1">
                <Label>O que precisa alterar *</Label>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="min-h-[88px]"
                  placeholder="Descreva os ajustes"
                />
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button
                className="flex-1"
                disabled={busy}
                onClick={() => {
                  setMode('approve');
                  submit('approve');
                }}
              >
                {busy && mode === 'approve' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Aprovar
              </Button>
              <Button
                className="flex-1"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  if (mode !== 'changes') {
                    setMode('changes');
                    return;
                  }
                  submit('changes');
                }}
              >
                {busy && mode === 'changes' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {mode === 'changes' ? 'Enviar alterações' : 'Pedir alterações'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
