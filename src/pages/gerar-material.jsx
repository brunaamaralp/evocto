import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Presentation,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from '@/components/auth/SessionManager';
import { AgencyLead, Client } from '@/api/entities';
import { createPageUrl } from '@/utils';
import { friendlyError } from '@/lib/errorMessages';
import {
  createGenerateMaterialJob,
  pollGenerateMaterialJob,
} from '@/lib/generateMaterialApi';
import {
  EMPTY_GENERATE_MATERIAL_OVERRIDES,
  GENERATE_MATERIAL_SCHEMA_VERSION,
  assessGenerateMaterialQuality,
  buildGenerateMaterialContext,
  getGenerateMaterialUiFields,
  normalizeTipo,
  validateGenerateMaterialRequest,
} from '@/lib/generateMaterialSchema';
import { overridesFromLead } from '@/lib/agencyLeads/ensureClientFromLead';
import { normalizeLeadStage } from '@/lib/agencyLeads/constants';

const TIPO_OPTIONS = [
  {
    id: 'proposta',
    label: 'Proposta',
    description: 'Documento Word (DOCX) com escopo e investimento',
    icon: FileText,
  },
  {
    id: 'apresentacao',
    label: 'Apresentação',
    description: 'Slides PowerPoint (PPTX) para pitch',
    icon: Presentation,
  },
];

const UI_FIELDS = getGenerateMaterialUiFields();

function overrideKeyFromPath(path) {
  return String(path || '').replace(/^overrides\./, '');
}

function readPrefillFromUrl(params) {
  const keys = ['titulo', 'objetivo', 'tom', 'escopo', 'investimento', 'prazo'];
  const out = {};
  for (const key of keys) {
    const v = params.get(key);
    if (v) out[key] = v;
  }
  return out;
}

export default function GerarMaterialPage() {
  const { user, agency, agencyId, isAuthenticated } = useSession();
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const clientId = urlParams.get('clientId');
  const leadId = urlParams.get('leadId');
  const tipoParam = urlParams.get('tipo');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [client, setClient] = useState(null);
  const [lead, setLead] = useState(null);
  const [tipo, setTipo] = useState(normalizeTipo(tipoParam));
  const [form, setForm] = useState(() => ({ ...EMPTY_GENERATE_MATERIAL_OVERRIDES }));
  const [phase, setPhase] = useState('idle'); // idle | generating | ready | failed
  const [job, setJob] = useState(null);
  const [statusHint, setStatusHint] = useState('');
  const [formErrors, setFormErrors] = useState({});

  const backToHub = () => {
    if (leadId) {
      navigate(createPageUrl('comercial'));
      return;
    }
    navigate(`${createPageUrl('client-detail')}?clientId=${clientId}`);
  };

  const backToComercial = () => {
    navigate(createPageUrl('comercial'));
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

      let leadData = null;
      if (leadId) {
        leadData = await AgencyLead.get(leadId).catch(() => null);
        if (leadData && leadData.agencyId !== agencyId) leadData = null;
        setLead(leadData);
      } else {
        setLead(null);
      }

      const fromLead = leadData ? overridesFromLead(leadData) : {};
      const fromUrl = readPrefillFromUrl(urlParams);
      setForm({
        ...EMPTY_GENERATE_MATERIAL_OVERRIDES,
        titulo: fromUrl.titulo || fromLead.titulo || '',
        objetivo: fromUrl.objetivo || fromLead.objetivo || '',
        tom: fromUrl.tom || '',
        escopo: fromUrl.escopo || fromLead.escopo || '',
        investimento: fromUrl.investimento || fromLead.investimento || '',
        prazo: fromUrl.prazo || '',
      });
      if (tipoParam) setTipo(normalizeTipo(tipoParam));
    } catch (err) {
      setError(friendlyError(err, 'load'));
    } finally {
      setLoading(false);
    }
    // urlParams is derived from location.search once per mount; intentional
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, agencyId, leadId, tipoParam]);

  useEffect(() => {
    load();
  }, [load]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const previewQuality = (() => {
    const canonical = buildGenerateMaterialContext(tipo, {
      client,
      lead,
      leadId,
      overrides: form,
      agencyName: agency?.agencyName || agency?.name || null,
      clientId,
    });
    return assessGenerateMaterialQuality(canonical);
  })();

  const syncLeadAfterReady = async (finalJob) => {
    if (!leadId || !finalJob?.documentId) return;
    try {
      const stage = normalizeLeadStage(lead?.status);
      const patch = {
        lastProposalDocumentId: finalJob.documentId,
        lastProposalJobId: finalJob.jobId || finalJob.id,
        lastProposalAt: new Date().toISOString(),
      };
      if (stage !== 'fechado' && stage !== 'perdido') {
        patch.status = 'proposta';
      }
      const updated = await AgencyLead.update(leadId, patch);
      setLead(updated);
    } catch (err) {
      console.warn('[gerar-material] sync lead failed:', err?.message || err);
    }
  };

  const handleGenerate = async () => {
    if (!clientId || !agencyId) return;
    const checked = validateGenerateMaterialRequest({
      agencyId,
      clientId,
      leadId: leadId || undefined,
      tipo,
      agencyName: agency?.agencyName || agency?.name || null,
      ...form,
    });
    if (!checked.valid) {
      setFormErrors(checked.errors);
      toast.error(Object.values(checked.errors)[0] || 'Revise os campos');
      return;
    }

    try {
      setPhase('generating');
      setJob(null);
      setFormErrors({});
      setStatusHint('Enfileirando geração…');

      const created = await createGenerateMaterialJob({
        agencyId,
        clientId,
        leadId: checked.value.leadId || undefined,
        tipo: checked.value.tipo,
        agencyName: checked.value.agencyName,
        ...checked.value.overrides,
      });

      const jobId = created.jobId;
      setJob(created.job);
      setStatusHint('A IA está montando o arquivo (pode levar 1–2 minutos)…');

      const finalJob = await pollGenerateMaterialJob(jobId, {
        onTick: (j) => {
          setJob(j);
          if (j?.status === 'running') {
            setStatusHint('Gerando com Claude Skills…');
          } else if (j?.status === 'queued') {
            setStatusHint('Na fila…');
          }
        },
      });

      setJob(finalJob);
      if (finalJob.status === 'ready') {
        await syncLeadAfterReady(finalJob);
        setPhase('ready');
        toast.success(
          leadId
            ? 'Proposta gerada — lead marcado em Proposta'
            : 'Material gerado e salvo nos documentos do cliente'
        );
      } else {
        setPhase('failed');
        toast.error(finalJob.errorMessage || finalJob.error || 'Falha na geração');
      }
    } catch (err) {
      setPhase('failed');
      const msg = friendlyError(err, 'action');
      setStatusHint(msg);
      toast.error(msg);
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

  if (phase === 'ready' && job) {
    return (
      <div className="max-w-lg mx-auto py-16 px-4 text-center space-y-4">
        <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
        <h1 className="text-xl font-semibold text-[#18162A]">Material pronto</h1>
        <p className="text-sm text-[#7A7595]">
          {job.fileName || 'Arquivo'} gerado para {client?.name}. Também está em
          Documentos do cliente.
          {leadId ? ' O lead do Comercial foi atualizado para Proposta.' : ''}
        </p>
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          {job.fileUrl ? (
            <Button asChild className="bg-[#C02807] hover:bg-[#8A1C05] text-white">
              <a href={job.fileUrl} target="_blank" rel="noopener noreferrer">
                <Download className="w-4 h-4 mr-2" />
                Baixar
              </a>
            </Button>
          ) : null}
          {leadId ? (
            <Button variant="outline" onClick={backToComercial}>
              Voltar ao Comercial
            </Button>
          ) : null}
          <Button
            variant="outline"
            onClick={() =>
              navigate(`${createPageUrl('client-documents')}?clientId=${clientId}`)
            }
          >
            Ver documentos
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setPhase('idle');
              setJob(null);
              setStatusHint('');
            }}
          >
            Gerar outro
          </Button>
          <Button variant="ghost" onClick={backToHub}>
            Voltar à visão geral
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
            <Sparkles className="w-3.5 h-3.5" />
            {leadId
              ? 'CRM Comercial · Geração de proposta'
              : 'Claude Skills · Proposta ou apresentação'}
          </div>
          <h1 className="text-2xl font-semibold text-[#18162A]">
            Gerar material — {client?.name || 'Cliente'}
          </h1>
          <p className="text-[#7A7595] mt-1">
            {leadId
              ? 'Contexto do lead preenchido automaticamente. Gerar não fecha o deal — só marca Proposta.'
              : 'Usa o briefing inicial e os campos abaixo. O arquivo é salvo nos documentos do cliente.'}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tipo</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {TIPO_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const selected = tipo === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                disabled={phase === 'generating'}
                onClick={() => setTipo(opt.id)}
                className={`text-left rounded-lg border-2 p-4 transition-all ${
                  selected
                    ? 'border-[#C02807] bg-[#F5F1FF]'
                    : 'border-[#E8E4F4] hover:border-[#C4B5FD]'
                }`}
              >
                <Icon className="w-5 h-5 mb-2 text-[#C02807]" />
                <div className="font-medium text-[#18162A]">{opt.label}</div>
                <p className="text-sm text-[#7A7595] mt-1">{opt.description}</p>
              </button>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">Contexto (schema v{GENERATE_MATERIAL_SCHEMA_VERSION})</CardTitle>
            <p className="text-sm text-[#7A7595] mt-1">
              Campos do contrato; DNA do briefing entra automaticamente no servidor.
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs uppercase tracking-wide text-[#7A7595]">Completude</div>
            <div className="text-lg font-semibold text-[#18162A]">{previewQuality.score}%</div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {UI_FIELDS.map((field) => {
            const key = overrideKeyFromPath(field.path);
            const recommended =
              field.required === 'quality' ||
              field.requiredWhenTipo?.[tipo] === 'quality';
            const err = formErrors[key];
            return (
              <div key={field.path} className="space-y-2">
                <Label htmlFor={key}>
                  {field.label}
                  {recommended ? (
                    <span className="ml-1 text-xs font-normal text-[#7A7595]">
                      (recomendado)
                    </span>
                  ) : null}
                </Label>
                {field.input === 'textarea' ? (
                  <Textarea
                    id={key}
                    value={form[key] || ''}
                    onChange={(e) => updateField(key, e.target.value)}
                    placeholder={field.placeholder || ''}
                    rows={field.rows || 3}
                    disabled={phase === 'generating'}
                  />
                ) : (
                  <Input
                    id={key}
                    value={form[key] || ''}
                    onChange={(e) => updateField(key, e.target.value)}
                    placeholder={field.placeholder || ''}
                    disabled={phase === 'generating'}
                  />
                )}
                {err ? (
                  <p className="text-xs text-red-600">{err}</p>
                ) : (
                  <p className="text-xs text-[#7A7595]">{field.description}</p>
                )}
              </div>
            );
          })}
          {previewQuality.warnings.length > 0 ? (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertDescription className="text-amber-900 text-sm space-y-1">
                <p className="font-medium">Para uma geração mais precisa, complete:</p>
                <ul className="list-disc pl-4">
                  {previewQuality.warnings.slice(0, 5).map((w) => (
                    <li key={w.path}>{w.label}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      {phase === 'generating' || phase === 'failed' ? (
        <Alert
          className={
            phase === 'failed'
              ? 'border-red-200 bg-red-50'
              : 'border-[#E8E4F4] bg-[#F8F7FC]'
          }
        >
          <AlertDescription
            className={
              phase === 'failed'
                ? 'text-red-800 flex items-center gap-2'
                : 'text-[#4A4660] flex items-center gap-2'
            }
          >
            {phase === 'generating' ? (
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            ) : null}
            {statusHint ||
              (phase === 'failed'
                ? 'Não foi possível gerar. Ajuste o contexto e tente de novo.'
                : 'Gerando…')}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="fixed bottom-0 inset-x-0 z-20 border-t border-[#E8E4F4] bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="max-w-3xl mx-auto px-4 py-3 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={backToHub}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="bg-[#C02807] hover:bg-[#8A1C05] text-white"
            onClick={handleGenerate}
            disabled={phase === 'generating' || !user}
          >
            {phase === 'generating' ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            {phase === 'generating' ? 'Gerando…' : 'Gerar com IA'}
          </Button>
        </div>
      </div>
    </div>
  );
}
