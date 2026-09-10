import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Loader2, MessageSquare, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  publicReviewApprove,
  publicReviewFileUrl,
  publicReviewGet,
  publicReviewRequestChanges,
} from '@/lib/materialDeliveriesApi';

export default function MaterialReviewPage() {
  const params = useParams();
  const token = useMemo(() => {
    if (params.token) return params.token;
    return new URLSearchParams(window.location.search).get('token') || '';
  }, [params.token]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [reviewerName, setReviewerName] = useState('');
  const [reviewerEmail, setReviewerEmail] = useState('');
  const [feedback, setFeedback] = useState('');
  const [mode, setMode] = useState(null); // approve | changes
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
    try {
      const res = await publicReviewGet(token);
      setData(res);
    } catch (err) {
      setError(err.message || 'Não foi possível abrir esta revisão');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const fileUrl = token ? publicReviewFileUrl(token) : '';

  const submitApprove = async () => {
    if (!reviewerName.trim()) {
      toast.error('Informe seu nome');
      return;
    }
    setBusy(true);
    try {
      await publicReviewApprove({
        token,
        reviewerName: reviewerName.trim(),
        reviewerEmail: reviewerEmail.trim(),
      });
      setDone('approved');
      toast.success('Material aprovado');
    } catch (err) {
      toast.error(err.message || 'Falha ao aprovar');
    } finally {
      setBusy(false);
    }
  };

  const submitChanges = async () => {
    if (!reviewerName.trim() || !feedback.trim()) {
      toast.error('Nome e comentário são obrigatórios');
      return;
    }
    setBusy(true);
    try {
      await publicReviewRequestChanges({
        token,
        reviewerName: reviewerName.trim(),
        reviewerEmail: reviewerEmail.trim(),
        feedback: feedback.trim(),
      });
      setDone('changes_requested');
      toast.success('Alterações enviadas');
    } catch (err) {
      toast.error(err.message || 'Falha ao enviar');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-10 text-center">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h1 className="text-lg font-semibold mb-2">Link indisponível</h1>
            <p className="text-sm text-slate-600">{error || 'Não encontrado'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { delivery, version, canDecide, previewable } = data;
  const finished = done || delivery.status === 'approved' || delivery.status === 'changes_requested';

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl">{delivery.title}</CardTitle>
              {delivery.description && (
                <p className="text-sm text-slate-600 mt-1">{delivery.description}</p>
              )}
            </div>
            <Badge variant="outline">
              {version ? `V${version.versionNumber}` : 'Sem versão'}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {version ? (
              <div className="text-sm text-slate-600">
                {version.fileName} · {version.mimeType}
              </div>
            ) : (
              <p className="text-sm text-slate-500">A agência ainda não enviou um arquivo.</p>
            )}

            {previewable && version && (
              <div className="rounded-lg border bg-white overflow-hidden min-h-[240px]">
                {version.mimeType?.startsWith('image/') && (
                  <img src={fileUrl} alt={delivery.title} className="max-w-full mx-auto" />
                )}
                {version.mimeType === 'application/pdf' && (
                  <iframe title="PDF" src={fileUrl} className="w-full h-[70vh]" />
                )}
                {version.mimeType?.startsWith('video/') && (
                  <video src={fileUrl} controls className="w-full max-h-[70vh]" />
                )}
              </div>
            )}

            {version && !previewable && (
              <Button asChild variant="outline">
                <a href={fileUrl} target="_blank" rel="noreferrer">
                  Baixar arquivo
                </a>
              </Button>
            )}

            {done === 'approved' || delivery.status === 'approved' ? (
              <div className="flex items-center gap-2 text-emerald-700 text-sm">
                <CheckCircle className="w-4 h-4" /> Material aprovado. Obrigado!
              </div>
            ) : null}

            {done === 'changes_requested' ||
            (delivery.status === 'changes_requested' && !canDecide) ? (
              <div className="flex items-center gap-2 text-amber-700 text-sm">
                <MessageSquare className="w-4 h-4" /> Alterações solicitadas. A agência foi notificada.
              </div>
            ) : null}

            {canDecide && !done && (
              <div className="space-y-4 border-t pt-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="rev-name">Seu nome *</Label>
                    <Input
                      id="rev-name"
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="rev-email">E-mail (opcional)</Label>
                    <Input
                      id="rev-email"
                      type="email"
                      value={reviewerEmail}
                      onChange={(e) => setReviewerEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => setMode('approve')} variant={mode === 'approve' ? 'default' : 'outline'}>
                    Aprovar
                  </Button>
                  <Button
                    onClick={() => setMode('changes')}
                    variant={mode === 'changes' ? 'default' : 'outline'}
                  >
                    Solicitar alteração
                  </Button>
                </div>

                {mode === 'approve' && (
                  <Button onClick={submitApprove} disabled={busy}>
                    {busy && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Confirmar aprovação
                  </Button>
                )}

                {mode === 'changes' && (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="feedback">O que precisa mudar? *</Label>
                      <Textarea
                        id="feedback"
                        rows={4}
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                      />
                    </div>
                    <Button onClick={submitChanges} disabled={busy}>
                      {busy && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      Enviar feedback
                    </Button>
                  </div>
                )}
              </div>
            )}

            {!canDecide && !finished && (
              <p className="text-sm text-slate-500">Esta entrega não está aguardando decisão no momento.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
