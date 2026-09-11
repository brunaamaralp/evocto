import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  validatePublicBriefingToken,
  savePublicBriefingResponse,
} from '@/api/functions';
import {
  emptyBriefingInicialForm,
  isBriefingInicialFormComplete,
  normalizeBriefingInicialForm,
  validateBriefingInicialForm,
} from '@/lib/briefingInicial';
import BriefingInicialFormFields from '@/components/briefing/BriefingInicialFormFields';

/**
 * Formulário público do briefing inicial (Empresa + insumos do plano anual).
 */
export default function PublicBriefingPage() {
  const token = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('token');
  }, []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [ctx, setCtx] = useState(null);
  const [form, setForm] = useState(() => emptyBriefingInicialForm());
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!token) {
        setError('Link inválido: token ausente');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const result = await validatePublicBriefingToken({ token });
        if (cancelled) return;
        setCtx(result.data);
        setForm(
          normalizeBriefingInicialForm(
            result.data.draftForm || {},
            result.data.clientName || ''
          )
        );
        if (result.data.alreadySubmitted) {
          setDone(true);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err.message || 'Não foi possível validar o link');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const canSubmit = isBriefingInicialFormComplete(form) && !saving && !done;

  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      await savePublicBriefingResponse({ token, inicialForm: form, draft: true });
      toast.success('Rascunho salvo');
    } catch (err) {
      toast.error(err.message || 'Erro ao salvar rascunho');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    const { valid, errors: nextErrors } = validateBriefingInicialForm(form);
    setErrors(nextErrors);
    if (!valid) {
      toast.error('Preencha os campos obrigatórios');
      const firstKey = Object.keys(nextErrors)[0];
      const el =
        document.getElementById(firstKey) ||
        document.querySelector('[data-section="empresa"]');
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    try {
      setSaving(true);
      await savePublicBriefingResponse({ token, inicialForm: form, draft: false });
      setDone(true);
      toast.success('Briefing inicial enviado');
    } catch (err) {
      if (err.errors) setErrors(err.errors);
      toast.error(err.message || 'Erro ao enviar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <Alert className="max-w-md border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h1 className="text-xl font-semibold text-slate-900">Enviado com sucesso</h1>
            <p className="text-slate-600 text-sm">
              Recebemos o briefing inicial de {ctx?.clientName}. A equipe montará o plano
              anual a partir dessas informações.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F6FC] py-8 px-4 pb-28">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <div className="flex items-center gap-2 text-[#7A7595] text-sm mb-1">
            <Lock className="w-3.5 h-3.5" />
            Link seguro · Briefing inicial
          </div>
          <h1 className="text-2xl font-semibold text-[#18162A]">
            {ctx?.clientName || 'Cliente'}
          </h1>
          <p className="text-[#7A7595] mt-1">
            Duas partes: dados da empresa e calendário comercial do ano. Leva poucos minutos.
          </p>
          <div className="mt-4 flex gap-2 text-sm">
            <span className="rounded-full bg-white border border-[#D4CBF5] px-3 py-1 text-[#18162A]">
              1. Empresa
            </span>
            <span className="rounded-full bg-white border border-[#E8E4F4] px-3 py-1 text-[#7A7595]">
              2. Plano do ano
            </span>
          </div>
        </div>

        <BriefingInicialFormFields form={form} onChange={setForm} errors={errors} />

        <div className="fixed bottom-0 inset-x-0 z-20 border-t border-[#E8E4F4] bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
          <div className="max-w-3xl mx-auto px-4 py-3 flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveDraft}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Salvar rascunho
            </Button>
            <Button
              type="button"
              className="bg-[#6C47D8] hover:bg-[#5A3BC0] text-white"
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Enviar briefing inicial
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
