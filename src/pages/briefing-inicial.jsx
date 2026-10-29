import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, CheckCircle2, Loader2, PenLine } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from '@/components/auth/SessionManager';
import { Brief, Client } from '@/api/entities';
import { createPageUrl } from '@/utils';
import { buildAnnualPlanHref } from '@/lib/planoAnualHub';
import { getEmpresaByClientId, empresaToForm } from '@/lib/empresaConfig';
import {
  emptyBriefingInicialForm,
  findBriefingInicialBrief,
  isBriefingInicialFormComplete,
  normalizeBriefingInicialForm,
  saveBriefingInicialInterno,
  validateBriefingInicialForm,
} from '@/lib/briefingInicial';
import BriefingInicialFormFields from '@/components/briefing/BriefingInicialFormFields';
import BriefingInicialFileImport from '@/components/briefing/BriefingInicialFileImport';

/**
 * Preenchimento interno do briefing inicial (equipe).
 * Planejamento fica no Panorama, após análise.
 */
export default function BriefingInicialPage() {
  const { user, agencyId, isAuthenticated } = useSession();
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const clientId = urlParams.get('clientId');
  const briefingIdParam = urlParams.get('briefingId');
  const wantImport = urlParams.get('import') === '1' || urlParams.get('import') === 'true';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [client, setClient] = useState(null);
  const [briefingId, setBriefingId] = useState(briefingIdParam || null);
  const [form, setForm] = useState(() => emptyBriefingInicialForm());
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState(false);
  const [imported, setImported] = useState(false);
  const [importMeta, setImportMeta] = useState(null);

  const backToHub = () => {
    navigate(`${createPageUrl('client-detail')}?clientId=${clientId}`);
  };

  const load = useCallback(async () => {
    if (!clientId || !agencyId) return;
    try {
      setLoading(true);
      setError(null);
      const clientData = await Client.get(clientId);
      if (!clientData || clientData.agencyId !== agencyId) {
        throw new Error('Cliente não encontrado');
      }
      setClient(clientData);

      const empresa = await getEmpresaByClientId(clientId, agencyId).catch(() => null);
      let existingBrief = null;
      if (briefingIdParam) {
        existingBrief = await Brief.get(briefingIdParam).catch(() => null);
      }
      if (!existingBrief) {
        const list = await Brief.filter({ agencyId, clientId }).catch(() => []);
        existingBrief = findBriefingInicialBrief(list || []);
      }
      if (existingBrief?.id) setBriefingId(existingBrief.id);

      const base = emptyBriefingInicialForm(clientData.name || '');
      if (empresa) {
        base.empresa = {
          ...base.empresa,
          ...empresaToForm(empresa, clientData.name || ''),
        };
      } else if (existingBrief?.empresa_snapshot) {
        base.empresa = {
          ...base.empresa,
          ...empresaToForm(existingBrief.empresa_snapshot, clientData.name || ''),
        };
      }
      setForm(normalizeBriefingInicialForm(base, clientData.name || ''));
    } catch (err) {
      setError(err.message || 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, [clientId, agencyId, briefingIdParam]);

  useEffect(() => {
    if (isAuthenticated) load();
  }, [isAuthenticated, load]);

  // PWA: puxa SW novo para não ficar preso em JS antigo sem banners
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return undefined;
    }
    let reloaded = false;
    const onControllerChange = () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      onControllerChange
    );
    navigator.serviceWorker.getRegistration().then(async (reg) => {
      if (!reg) return;
      try {
        await reg.update();
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      } catch {
        /* ignore */
      }
    });
    return () => {
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        onControllerChange
      );
    };
  }, []);

  const canSubmit = isBriefingInicialFormComplete(form) && !saving && !done;

  const handleSave = async (draft) => {
    if (!draft) {
      const { valid, errors: nextErrors } = validateBriefingInicialForm(form);
      setErrors(nextErrors);
      if (!valid) {
        toast.error('Preencha os campos obrigatórios');
        document.querySelector('[data-section="empresa"]')?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
        return;
      }
    }
    try {
      setSaving(true);
      const result = await saveBriefingInicialInterno({
        agencyId,
        clientId,
        form,
        userId: user?.id || user?.$id || null,
        briefingId,
        draft,
      });
      setBriefingId(result.brief.id);
      setForm(result.form);
      if (draft) {
        toast.success('Rascunho salvo');
      } else {
        setDone(true);
        toast.success('Briefing inicial salvo');
      }
    } catch (err) {
      if (err.errors) setErrors(err.errors);
      toast.error(err.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated || loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    );
  }

  if (!clientId) {
    return <p className="text-red-600 p-6">clientId obrigatório na URL.</p>;
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert className="max-w-md border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
        <Button variant="outline" className="mt-4" onClick={load}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="max-w-lg mx-auto py-16 px-4 text-center space-y-4">
        <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
        <h1 className="text-xl font-semibold text-[#1A1210]">Briefing inicial salvo</h1>
        <p className="text-sm text-[#6B635C]">
          DNA de {client?.name} registrado. Analise o briefing e, depois, planeje
          mês a mês no Panorama.
        </p>
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          <Button variant="outline" onClick={backToHub}>
            Voltar à visão geral
          </Button>
          <Button
            className="bg-[#B80015] hover:bg-[#8A0010] text-white"
            onClick={() => navigate(buildAnnualPlanHref(clientId))}
          >
            Abrir panorama
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 pb-28 space-y-6">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" className="page-back-btn" onClick={backToHub} aria-label="Voltar">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <div className="flex items-center gap-2 text-[#6B635C] text-sm mb-1">
            <PenLine className="w-3.5 h-3.5" />
            Briefing inicial
          </div>
          <h1 className="text-2xl font-semibold text-[#1A1210]">
            {client?.name || 'Cliente'}
          </h1>
          <p className="text-[#6B635C] mt-1 text-sm leading-relaxed">
            Monte o DNA da marca: importe um arquivo ou preencha manualmente.
            Depois revise e salve — o planejamento fica no Panorama.
          </p>
        </div>
      </div>

      <BriefingInicialFileImport
        form={form}
        clientName={client?.name || ''}
        disabled={saving || done}
        autoFocus={wantImport}
        onApply={(next, meta) => {
          setForm(next);
          setErrors({});
          setDone(false);
          setImported(true);
          setImportMeta(meta || null);
        }}
      />

      {imported && importMeta ? (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-950">
          <CheckCircle2 className="h-4 w-4 text-emerald-700" />
          <AlertDescription>
            {importMeta.filled
              ? `Importação aplicada: ${importMeta.filled} campo(s) preenchidos${
                  importMeta.filename ? ` a partir de “${importMeta.filename}”` : ''
                }. Revise o DNA abaixo e salve.`
              : 'Arquivo lido. Revise a análise e complete o DNA abaixo antes de salvar.'}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="relative flex items-center gap-3 py-1" aria-hidden>
        <div className="h-px flex-1 bg-[#E8E4F4]" />
        <span className="text-[11px] font-medium uppercase tracking-wide text-[#9A94B0]">
          {imported ? '2 · Revisar DNA' : 'ou preencha manualmente'}
        </span>
        <div className="h-px flex-1 bg-[#E8E4F4]" />
      </div>

      <BriefingInicialFormFields
        form={form}
        onChange={setForm}
        errors={errors}
        imported={imported}
      />

      <div className="fixed inset-x-0 z-20 fixed-footer-above-nav border-t border-[#E8E4F4] bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="max-w-3xl mx-auto px-4 py-3 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSave(true)}
            disabled={saving}
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Salvar rascunho
          </Button>
          <Button
            type="button"
            className="bg-[#B80015] hover:bg-[#8A0010] text-white"
            onClick={() => handleSave(false)}
            disabled={!canSubmit}
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Concluir briefing inicial
          </Button>
        </div>
      </div>
    </div>
  );
}
