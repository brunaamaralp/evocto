import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarRange,
  CheckCircle2,
  Loader2,
  Save,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from '@/components/auth/SessionManager';
import { Client } from '@/api/entities';
import { createPageUrl } from '@/utils';
import { getEmpresaByClientId } from '@/lib/empresaConfig';
import {
  DEFAULT_CICLOS_COMERCIAIS,
  buildBriefingsMesSeeds,
  normalizeCiclosComerciais,
  validateCiclosComerciais,
  validateProdutosLinhas,
} from '@/lib/campanhaAnualSchema';
import {
  CICLO_LABELS,
  MES_LABELS,
  getCampanhaAnualById,
  saveCampanhaAnualBriefing,
} from '@/lib/campanhaAnual';
import { gerarESalvarCampanhaAnual } from '@/lib/campanhaAnualIa';
import ConfigurarEmpresaModal from '@/components/empresa/ConfigurarEmpresaModal';
import CiclosComerciaisPicker from '@/components/briefing/anual/CiclosComerciaisPicker';
import BriefingsMesSeedsEditor from '@/components/briefing/anual/BriefingsMesSeedsEditor';
import CampanhasAnualReview from '@/components/briefing/anual/CampanhasAnualReview';

const STEPS = [
  { id: 'empresa', label: 'Empresa' },
  { id: 'ciclos', label: 'Ciclos' },
  { id: 'seeds', label: 'Seeds' },
  { id: 'revisao', label: 'Revisão' },
  { id: 'campanhas', label: 'Campanhas' },
];

/**
 * Wizard plano anual — P0 input + P1 geração IA (9 dimensões).
 */
export default function BriefingCampanhaAnualPage() {
  const { user, agencyId, isAuthenticated } = useSession();
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const clientId = urlParams.get('clientId');
  const briefingIdParam = urlParams.get('briefingId');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [client, setClient] = useState(null);
  const [empresa, setEmpresa] = useState(null);
  const [empresaModalOpen, setEmpresaModalOpen] = useState(false);
  const [step, setStep] = useState('empresa');
  const [briefingId, setBriefingId] = useState(briefingIdParam || null);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [ciclos, setCiclos] = useState(() =>
    normalizeCiclosComerciais(DEFAULT_CICLOS_COMERCIAIS)
  );
  const [seeds, setSeeds] = useState(() =>
    buildBriefingsMesSeeds(DEFAULT_CICLOS_COMERCIAIS)
  );
  const [existingPayload, setExistingPayload] = useState(null);
  const [saved, setSaved] = useState(null);

  const produtosOk = useMemo(
    () => validateProdutosLinhas(empresa?.produtos_linhas, { required: true }).valid,
    [empresa]
  );
  const ciclosOk = useMemo(
    () => validateCiclosComerciais(ciclos, { requireFullYear: true }).valid,
    [ciclos]
  );
  const hasCampanhas = (existingPayload?.campanhas || []).some(
    (c) => c?.nome_campanha || c?.resumo_executivo
  );

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

      const emp = await getEmpresaByClientId(clientId, agencyId);
      setEmpresa(emp);
      if (!emp) setEmpresaModalOpen(true);

      if (briefingIdParam) {
        const anual = await getCampanhaAnualById(briefingIdParam);
        setBriefingId(anual.id);
        setAno(anual.ano || new Date().getFullYear());
        setCiclos(normalizeCiclosComerciais(anual.ciclos_comerciais));
        setSeeds(
          buildBriefingsMesSeeds(anual.ciclos_comerciais, anual.briefings_mes)
        );
        setExistingPayload(anual);
        const filled = (anual.campanhas || []).some(
          (c) => c?.nome_campanha || c?.resumo_executivo
        );
        setStep(filled ? 'campanhas' : 'revisao');
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

  useEffect(() => {
    setSeeds((prev) => buildBriefingsMesSeeds(ciclos, prev));
  }, [ciclos]);

  const backToList = () => {
    navigate(`${createPageUrl('client-briefing')}?clientId=${clientId}`);
  };

  const goNext = () => {
    const idx = STEPS.findIndex((s) => s.id === step);
    if (step === 'empresa' && (!empresa || !produtosOk)) {
      toast.error('Configure a empresa com ao menos uma linha/produto');
      setEmpresaModalOpen(true);
      return;
    }
    if (step === 'ciclos' && !ciclosOk) {
      toast.error('Atribua um ciclo a cada mês do ano');
      return;
    }
    if (step === 'revisao') {
      toast.message('Salve o plano ou gere as campanhas com IA');
      return;
    }
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1].id);
  };

  const goPrev = () => {
    const idx = STEPS.findIndex((s) => s.id === step);
    if (idx > 0) setStep(STEPS[idx - 1].id);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const result = await saveCampanhaAnualBriefing({
        briefingId,
        agencyId,
        clientId,
        empresa,
        ano,
        ciclos_comerciais: ciclos,
        briefings_mes: seeds,
        userId: user?.id || user?.$id || null,
        existing: existingPayload,
      });
      setBriefingId(result.id);
      setExistingPayload(result);
      setSaved(result);
      toast.success('Plano anual salvo (input_pronto)');
      return result;
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Erro ao salvar plano anual');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      let id = briefingId;
      let payload = existingPayload;
      if (!id) {
        const savedBrief = await handleSave();
        if (!savedBrief?.id) return;
        id = savedBrief.id;
        payload = savedBrief;
      } else {
        // Garante input atualizado antes da IA
        const savedBrief = await handleSave();
        if (savedBrief) {
          id = savedBrief.id;
          payload = savedBrief;
        }
      }

      toast.message('Gerando 12 campanhas (3 lotes)…');
      const { brief, payload: next, geracao_valid } = await gerarESalvarCampanhaAnual({
        briefingId: id,
        empresa,
        ano,
        ciclos_comerciais: ciclos,
        briefings_mes: seeds,
        existingPayload: payload,
        onBatchProgress: ({ batch, total, meses }) => {
          toast.message(`Gerando lote ${batch}/${total} (meses ${meses.join(', ')})…`);
        },
      });

      setBriefingId(brief.id);
      setExistingPayload(next);
      setSaved(brief);
      setStep('campanhas');
      if (geracao_valid === false) {
        toast.warning('Campanhas geradas com avisos de validação — revise os ciclos');
      } else {
        toast.success('Campanhas geradas e salvas');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Falha ao gerar com IA');
    } finally {
      setGenerating(false);
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
    return (
      <div className="p-6">
        <p className="text-red-600">clientId obrigatório na URL.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-600 mb-3">{error}</p>
        <Button variant="outline" onClick={load}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" className="mb-2 -ml-2" onClick={backToList}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Briefings
          </Button>
          <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
            <CalendarRange className="w-6 h-6" />
            Plano anual de campanhas
          </h1>
          <p className="text-slate-600 mt-1">
            {client?.name}
            {empresa?.nome ? ` · ${empresa.nome}` : ''}
          </p>
        </div>
        <Badge variant="outline">
          {hasCampanhas ? existingPayload?.status_anual || 'ia_gerou' : 'P0+P1'}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {STEPS.map((s, i) => {
          const currentIdx = STEPS.findIndex((x) => x.id === step);
          const done = i < currentIdx;
          const active = s.id === step;
          const locked = s.id === 'campanhas' && !hasCampanhas && step !== 'campanhas';
          return (
            <button
              key={s.id}
              type="button"
              disabled={locked}
              onClick={() => {
                if (done || active || (s.id === 'campanhas' && hasCampanhas)) {
                  setStep(s.id);
                }
              }}
              className={`rounded-full px-3 py-1 text-sm border ${
                active
                  ? 'bg-slate-900 text-white border-slate-900'
                  : done || (s.id === 'campanhas' && hasCampanhas)
                    ? 'bg-slate-100 text-slate-800 border-slate-200'
                    : 'bg-white text-slate-400 border-slate-200'
              }`}
            >
              {i + 1}. {s.label}
            </button>
          );
        })}
      </div>

      {step === 'empresa' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Empresa e produtos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5 max-w-[160px]">
              <Label htmlFor="ano-plano">Ano</Label>
              <Input
                id="ano-plano"
                type="number"
                min={2020}
                max={2100}
                value={ano}
                onChange={(e) => setAno(Number(e.target.value) || ano)}
              />
            </div>

            {!empresa ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Configure a empresa antes de montar o plano anual.
              </div>
            ) : (
              <div className="rounded-lg border bg-slate-50 p-4 text-sm space-y-2">
                <div>
                  <span className="text-slate-500">Nome:</span> {empresa.nome}
                </div>
                <div>
                  <span className="text-slate-500">Tom:</span> {empresa.tom_brand || '—'}
                </div>
                <div>
                  <span className="text-slate-500">Linhas:</span>{' '}
                  {(empresa.produtos_linhas || []).length > 0
                    ? (empresa.produtos_linhas || []).map((p) => p.nome).join(', ')
                    : 'Nenhuma (obrigatório)'}
                </div>
                {!produtosOk && (
                  <p className="text-amber-800 text-xs">
                    Cadastre ao menos uma linha/produto na empresa.
                  </p>
                )}
              </div>
            )}

            <Button type="button" variant="outline" onClick={() => setEmpresaModalOpen(true)}>
              <Building2 className="w-4 h-4 mr-2" />
              {empresa ? 'Editar empresa / produtos' : 'Configurar empresa'}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 'ciclos' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ciclos comerciais {ano}</CardTitle>
          </CardHeader>
          <CardContent>
            <CiclosComerciaisPicker value={ciclos} onChange={setCiclos} />
          </CardContent>
        </Card>
      )}

      {step === 'seeds' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Seeds por mês (opcional)</CardTitle>
          </CardHeader>
          <CardContent>
            <BriefingsMesSeedsEditor
              value={seeds}
              onChange={setSeeds}
              produtosLinhas={empresa?.produtos_linhas || []}
            />
          </CardContent>
        </Card>
      )}

      {step === 'revisao' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Revisão do input</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-lg border bg-slate-50 p-4 space-y-1">
              <div>
                <strong>Ano:</strong> {ano}
              </div>
              <div>
                <strong>Empresa:</strong> {empresa?.nome}
              </div>
              <div>
                <strong>Produtos:</strong>{' '}
                {(empresa?.produtos_linhas || []).map((p) => p.nome).join(', ')}
              </div>
              {briefingId && (
                <div>
                  <strong>Brief:</strong> {briefingId}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(ciclos).map(([ciclo, meses]) => (
                <div key={ciclo} className="rounded-md border p-2">
                  <div className="font-medium">{CICLO_LABELS[ciclo]}</div>
                  <div className="text-xs text-slate-600 mt-1">
                    {(meses || []).map((m) => MES_LABELS[m]).join(', ') || '—'}
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-md border border-slate-200 bg-white p-3 text-slate-600 flex gap-2 items-start">
              <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                Salve o input e gere as 12 campanhas (9 dimensões) com IA. Em DEV sem API,
                usa mock local automaticamente.
              </span>
            </div>

            {saved && !hasCampanhas && (
              <div className="flex items-center gap-2 text-emerald-700 text-sm">
                <CheckCircle2 className="w-4 h-4" />
                Input salvo. Pronto para gerar.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === 'campanhas' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Campanhas geradas</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={generating || !produtosOk || !ciclosOk}
              onClick={handleGenerate}
            >
              {generating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Regenerar com IA
            </Button>
          </div>
          <CampanhasAnualReview
            campanhas={existingPayload?.campanhas || []}
            avisos={existingPayload?.avisos || []}
            sugestoes={existingPayload?.sugestoes || []}
            validacoes={existingPayload?.validacoes}
          />
        </div>
      )}

      <div className="flex flex-wrap justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={goPrev}
          disabled={step === 'empresa' || generating}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Voltar
        </Button>

        <div className="flex flex-wrap gap-2">
          {step === 'revisao' && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleSave}
                disabled={saving || generating || !produtosOk || !ciclosOk}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar input
              </Button>
              <Button
                type="button"
                onClick={handleGenerate}
                disabled={saving || generating || !produtosOk || !ciclosOk}
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Gerar campanhas com IA
              </Button>
            </>
          )}
          {step !== 'revisao' && step !== 'campanhas' && (
            <Button type="button" onClick={goNext}>
              Continuar
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          )}
          {step === 'campanhas' && (
            <Button type="button" onClick={backToList}>
              Concluir
            </Button>
          )}
        </div>
      </div>

      <ConfigurarEmpresaModal
        open={empresaModalOpen}
        onOpenChange={setEmpresaModalOpen}
        clientId={clientId}
        clientName={client?.name}
        empresa={empresa}
        onSaved={(savedEmp) => setEmpresa(savedEmp)}
      />
    </div>
  );
}
