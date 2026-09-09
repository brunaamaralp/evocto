import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import CiclosComerciaisPicker from '@/components/briefing/anual/CiclosComerciaisPicker';
import BriefingsMesSeedsEditor from '@/components/briefing/anual/BriefingsMesSeedsEditor';
import ProdutosLinhasEditor from '@/components/briefing/anual/ProdutosLinhasEditor';
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
import { buildBriefingsMesSeeds } from '@/lib/campanhaAnualSchema';

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

  const setEmpresaField = (key, value) => {
    setForm((prev) => ({
      ...prev,
      empresa: { ...prev.empresa, [key]: value },
    }));
  };

  const setFormato = (key, value) => {
    setForm((prev) => ({
      ...prev,
      empresa: {
        ...prev.empresa,
        formato_padrao: { ...prev.empresa.formato_padrao, [key]: value },
      },
    }));
  };

  const setCiclos = (ciclos) => {
    setForm((prev) => ({
      ...prev,
      ciclos_comerciais: ciclos,
      briefings_mes: buildBriefingsMesSeeds(ciclos, prev.briefings_mes),
    }));
  };

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

  const emp = form.empresa || {};

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

        <Card className="rounded-2xl border-[#E8E4F4] shadow-sm" data-section="empresa">
          <CardHeader>
            <CardTitle className="text-lg text-[#18162A]">1. Empresa</CardTitle>
            <p className="text-sm text-[#7A7595] font-normal">
              Público, tom, formato e produtos — o DNA que se repete nas campanhas.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome da empresa</Label>
              <Input
                id="nome"
                value={emp.nome || ''}
                onChange={(e) => setEmpresaField('nome', e.target.value)}
              />
              {errors.nome && <p className="text-xs text-red-600">{errors.nome}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="publico">Público-alvo</Label>
              <Textarea
                id="publico"
                rows={3}
                value={emp.publico_alvo || ''}
                onChange={(e) => setEmpresaField('publico_alvo', e.target.value)}
              />
              {errors.publico_alvo && (
                <p className="text-xs text-red-600">{errors.publico_alvo}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tom">Tom de marca</Label>
              <Input
                id="tom"
                value={emp.tom_brand || ''}
                onChange={(e) => setEmpresaField('tom_brand', e.target.value)}
              />
              {errors.tom_brand && (
                <p className="text-xs text-red-600">{errors.tom_brand}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="orcamento">Orçamento mensal padrão (R$)</Label>
              <Input
                id="orcamento"
                type="number"
                min={0}
                value={emp.orcamento_padrao_mensal ?? ''}
                onChange={(e) =>
                  setEmpresaField('orcamento_padrao_mensal', e.target.value)
                }
              />
              {errors.orcamento_padrao_mensal && (
                <p className="text-xs text-red-600">{errors.orcamento_padrao_mensal}</p>
              )}
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Vídeos / mês</Label>
                <Input
                  type="number"
                  min={0}
                  value={emp.formato_padrao?.num_videos ?? 0}
                  onChange={(e) => setFormato('num_videos', Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Designs / mês</Label>
                <Input
                  type="number"
                  min={0}
                  value={emp.formato_padrao?.num_designs ?? 0}
                  onChange={(e) => setFormato('num_designs', Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Duração vídeos</Label>
                <Input
                  value={emp.formato_padrao?.duracao_videos || ''}
                  onChange={(e) => setFormato('duracao_videos', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="restricoes">Restrições criativas</Label>
              <Textarea
                id="restricoes"
                rows={2}
                value={emp.restricoes_criativas || ''}
                onChange={(e) => setEmpresaField('restricoes_criativas', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Produtos / linhas</Label>
              <ProdutosLinhasEditor
                value={emp.produtos_linhas || []}
                onChange={(produtos_linhas) =>
                  setEmpresaField('produtos_linhas', produtos_linhas)
                }
              />
              {errors.produtos_linhas && (
                <p className="text-xs text-red-600">{errors.produtos_linhas}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-[#E8E4F4] shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-[#18162A]">2. Plano do ano</CardTitle>
            <p className="text-sm text-[#7A7595] font-normal">
              Marque o ciclo de cada mês. Ideias por mês são opcionais.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5 max-w-[160px]">
              <Label htmlFor="ano">Ano</Label>
              <Input
                id="ano"
                type="number"
                min={2020}
                max={2100}
                value={form.ano}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    ano: Number(e.target.value) || prev.ano,
                  }))
                }
              />
              {errors.ano && <p className="text-xs text-red-600">{errors.ano}</p>}
            </div>
            <div>
              <Label className="mb-2 block">Ciclos comerciais</Label>
              <CiclosComerciaisPicker
                value={form.ciclos_comerciais}
                onChange={setCiclos}
              />
              {(errors.ciclos_incompletos || errors.meses_faltando) && (
                <p className="text-xs text-red-600 mt-2">
                  {errors.ciclos_incompletos || errors.meses_faltando || 'Complete os ciclos'}
                </p>
              )}
            </div>
            <div>
              <Label className="mb-2 block">Ideias por mês (opcional)</Label>
              <BriefingsMesSeedsEditor
                value={form.briefings_mes}
                onChange={(briefings_mes) =>
                  setForm((prev) => ({ ...prev, briefings_mes }))
                }
                produtosLinhas={emp.produtos_linhas || []}
              />
            </div>
          </CardContent>
        </Card>

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
