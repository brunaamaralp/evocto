import { useCallback, useEffect, useRef, useState } from 'react';
import { UploadFile } from '@/api/integrations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Plus, Upload, Copy, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
  materialCreateDelivery,
  materialGetDelivery,
  materialListDeliveries,
  materialRegenerateToken,
  materialReopen,
  materialUploadFromStorage,
} from '@/lib/materialDeliveriesApi';
import { useSession } from '@/components/auth/SessionManager';

const STATUS_LABEL = {
  draft: 'Rascunho',
  awaiting_approval: 'Aguardando aprovação',
  changes_requested: 'Alterações solicitadas',
  approved: 'Aprovado',
  cancelled: 'Cancelado',
};

function statusBadge(status) {
  const map = {
    draft: 'bg-slate-100 text-slate-700',
    awaiting_approval: 'bg-violet-100 text-violet-800',
    changes_requested: 'bg-amber-100 text-amber-800',
    approved: 'bg-emerald-100 text-emerald-800',
    cancelled: 'bg-red-100 text-red-700',
  };
  return (
    <Badge className={map[status] || 'bg-slate-100 text-slate-700'}>
      {STATUS_LABEL[status] || status}
    </Badge>
  );
}

export default function DeliveryWorkspaceDeliveries({ service }) {
  const { isOwner, isAdmin } = useSession();
  const [loading, setLoading] = useState(true);
  const [deliveries, setDeliveries] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [lastReviewUrl, setLastReviewUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const load = useCallback(async () => {
    if (!service?.id) return;
    setLoading(true);
    try {
      const data = await materialListDeliveries(service.id);
      setDeliveries(data.deliveries || []);
    } catch (err) {
      toast.error(err.message || 'Falha ao listar entregas');
    } finally {
      setLoading(false);
    }
  }, [service?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = async (id) => {
    setSelectedId(id);
    try {
      const data = await materialGetDelivery(id);
      setDetail(data);
    } catch (err) {
      toast.error(err.message || 'Falha ao carregar entrega');
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error('Informe o título');
      return;
    }
    setBusy(true);
    try {
      const data = await materialCreateDelivery({
        title: title.trim(),
        description: description.trim(),
        serviceId: service.id,
      });
      setLastReviewUrl(data.reviewUrl || '');
      toast.success('Entrega criada');
      setCreateOpen(false);
      setTitle('');
      setDescription('');
      await load();
      if (data.delivery?.id) await openDetail(data.delivery.id);
    } catch (err) {
      toast.error(err.message || 'Falha ao criar');
    } finally {
      setBusy(false);
    }
  };

  const handleUpload = async (file) => {
    if (!selectedId || !file) return;
    setUploading(true);
    try {
      const uploaded = await UploadFile({ file });
      const storageFileId = uploaded.fileId || uploaded.$id;
      if (!storageFileId) throw new Error('Upload Storage sem fileId');
      await materialUploadFromStorage({
        deliveryId: selectedId,
        storageFileId,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        idempotencyKey:
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `up_${Date.now()}`,
        submit: true,
      });
      toast.success('Versão enviada para aprovação');
      await openDetail(selectedId);
      await load();
    } catch (err) {
      toast.error(err.message || 'Falha no upload');
    } finally {
      setUploading(false);
    }
  };

  const copyLink = async (url) => {
    if (!url) {
      toast.message('Gere ou regenere o link para copiar o token');
      return;
    }
    await navigator.clipboard.writeText(url);
    toast.success('Link copiado');
  };

  const handleRegenerate = async () => {
    if (!selectedId) return;
    if (!confirm('O link anterior deixará de funcionar. Continuar?')) return;
    try {
      const data = await materialRegenerateToken(selectedId);
      setLastReviewUrl(data.reviewUrl || '');
      await navigator.clipboard.writeText(data.reviewUrl || '');
      toast.success('Novo link gerado e copiado');
    } catch (err) {
      toast.error(err.message || 'Falha ao regenerar');
    }
  };

  const handleReopen = async () => {
    if (!selectedId) return;
    try {
      await materialReopen(selectedId);
      toast.success('Aprovação reaberta — envie uma nova versão');
      await openDetail(selectedId);
      await load();
    } catch (err) {
      toast.error(err.message || 'Falha ao reabrir');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Entregas</h2>
          <p className="text-sm text-slate-600">
            Materiais versionados para aprovação do cliente (Google Drive + link público).
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova entrega
        </Button>
      </div>

      {lastReviewUrl && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm flex flex-wrap items-center gap-2">
          <span className="text-emerald-900 truncate flex-1">{lastReviewUrl}</span>
          <Button size="sm" variant="outline" onClick={() => copyLink(lastReviewUrl)}>
            <Copy className="w-3 h-3 mr-1" /> Copiar
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500 py-8">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando entregas…
        </div>
      ) : deliveries.length === 0 ? (
        <p className="text-sm text-slate-500 py-8">Nenhuma entrega neste serviço ainda.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            {deliveries.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => openDetail(d.id)}
                className={`w-full text-left rounded-lg border p-3 hover:bg-slate-50 ${
                  selectedId === d.id ? 'border-slate-900' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-slate-900">{d.title}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      V{d.latestVersionNumber || 0}
                    </div>
                  </div>
                  {statusBadge(d.status)}
                </div>
              </button>
            ))}
          </div>

          <div className="rounded-lg border border-slate-200 p-4 min-h-[240px]">
            {!detail ? (
              <p className="text-sm text-slate-500">Selecione uma entrega</p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{detail.delivery.title}</h3>
                    {detail.delivery.description && (
                      <p className="text-sm text-slate-600 mt-1">{detail.delivery.description}</p>
                    )}
                  </div>
                  {statusBadge(detail.delivery.status)}
                </div>

                <div>
                  <Label className="text-xs text-slate-500">Versões</Label>
                  <ul className="mt-2 space-y-2">
                    {(detail.versions || []).length === 0 && (
                      <li className="text-sm text-slate-500">Nenhuma versão enviada</li>
                    )}
                    {(detail.versions || []).map((v) => (
                      <li
                        key={v.id}
                        className="text-sm flex items-center justify-between gap-2 border rounded px-2 py-1.5"
                      >
                        <span>
                          V{v.versionNumber} · {v.fileName || '—'} · {v.reviewStatus}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-wrap gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".jpg,.jpeg,.png,.webp,.mp4,.mov,.pdf,image/*,video/mp4,video/quicktime,application/pdf"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUpload(f);
                      e.target.value = '';
                    }}
                  />
                  <Button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    Enviar nova versão
                  </Button>

                  {(isOwner || isAdmin) && (
                    <>
                      <Button variant="outline" onClick={handleRegenerate}>
                        <RefreshCw className="w-4 h-4 mr-2" /> Regenerar link
                      </Button>
                      {detail.delivery.status === 'approved' && (
                        <Button variant="outline" onClick={handleReopen}>
                          Reabrir aprovação
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova entrega</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="md-title">Título</Label>
              <Input
                id="md-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Reel Campanha de Natal"
              />
            </div>
            <div>
              <Label htmlFor="md-desc">Descrição (opcional)</Label>
              <Textarea
                id="md-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={busy}>
              {busy && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
