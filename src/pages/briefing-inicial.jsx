import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, CheckCircle2, Loader2, PenLine } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from '@/components/auth/SessionManager';
import { Brief, Client } from '@/api/entities';
import { createPageUrl } from '@/utils';
import { getEmpresaByClientId, empresaToForm } from '@/lib/empresaConfig';
import {
  emptyBriefingInicialForm,
  isBriefingInicialFormComplete,
  normalizeBriefingInicialForm,
  saveBriefingInicialInterno,
  validateBriefingInicialForm,
} from '@/lib/briefingInicial';
import { BRIEF_KIND_ANUAL } from '@/lib/campanhaAnualSchema';
import BriefingInicialFormFields from '@/components/briefing/BriefingInicialFormFields';

/**
 * Preenchimento interno do briefing inicial (equipe).
 */
export default function BriefingInicialPage() {
  const { user, agencyId, isAuthenticated } = useSession();
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const clientId = urlParams.get('clientId');
  const briefingIdParam = urlParams.get('briefingId');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [client, setClient] = useState(null);
  const [briefingId, setBriefingId] = useState(briefingIdParam || null);
  const [form, setForm] = useState(() => emptyBriefingInicialForm());
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState(false);

  const backToHub = () => {
    navigate(`${createPageUrl('client-briefing')}?clientId=${clientId}`);
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
        existingBrief =
          (list || []).find(
            (b) => b.brief_kind === BRIEF_KIND_ANUAL && b.origem_briefing_inicial
          ) ||
          (list || []).find((b) => b.brief_kind === BRIEF_KIND_ANUAL) ||
          null;
      }
      if (existingBrief?.id) setBriefingId(existingBrief.id);

      const base = emptyBriefingInicialForm(clientData.name || '');
      if (empresa) {
        base.empresa = {
          ...base.empresa,
          ...empresaToForm(empresa, clientData.name || ''),
        };
      }
      if (existingBrief) {
        setForm(
          normalizeBriefingInicialForm(
            {
              empresa: base.empresa,
              ano: existingBrief.ano,
              mes_inicio: existingBrief.mes_inicio,
              ciclos_comerciais: existingBrief.ciclos_comerciais,
              briefings_mes: existingBrief.briefings_mes,
            },
            clientData.name || ''
          )
        );
      } else {
        setForm(normalizeBriefingInicialForm(base, clientData.name || ''));
      }
    } catch (err) {
      setError(err.message || 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, [clientId, agencyId, briefingIdParam]);

  useEffect(() => {
    if (isAuthenticated) load();
  }, [isAuthenticated, load]);

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
        <h1 className="text-xl font-semibold text-[#18162A]">Briefing inicial salvo</h1>
        <p className="text-sm text-[#7A7595]">
          Empresa e insumos do plano anual de {client?.name} estão prontos. Você pode
          seguir para temas e campanhas.
        </p>
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          <Button variant="outline" onClick={backToHub}>
            Voltar ao hub
          </Button>
          <Button
            className="bg-[#6C47D8] hover:bg-[#5A3BC0] text-white"
            onClick={() =>
              navigate(
                `${createPageUrl('briefing-campanha-anual')}?clientId=${clientId}${
                  briefingId ? `&briefingId=${briefingId}` : ''
                }`
              )
            }
          >
            Abrir plano anual
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 pb-28 space-y-6">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={backToHub} aria-label="Voltar">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <div className="flex items-center gap-2 text-[#7A7595] text-sm mb-1">
            <PenLine className="w-3.5 h-3.5" />
            Preenchimento interno · Briefing inicial
          </div>
          <h1 className="text-2xl font-semibold text-[#18162A]">
            {client?.name || 'Cliente'}
          </h1>
          <p className="text-[#7A7595] mt-1">
            Mesmo formulário do link público — preenchido pela equipe.
          </p>
        </div>
      </div>

      <BriefingInicialFormFields form={form} onChange={setForm} errors={errors} />

      <div className="fixed bottom-0 inset-x-0 z-20 border-t border-[#E8E4F4] bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
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
            className="bg-[#6C47D8] hover:bg-[#5A3BC0] text-white"
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
