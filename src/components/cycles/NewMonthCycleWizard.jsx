import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Client, Service } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';
import { createMonthCycle } from '@/api/functions/createMonthCycle';
import { ensureCicloMensalTemplate } from '@/api/functions/ensureCicloMensalTemplate';
import { ensureCicloNarrativaTemplate } from '@/api/functions/ensureCicloNarrativaTemplate';
import { ensureItemCycleTemplates } from '@/api/functions/ensureItemCycleTemplates';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, CalendarPlus } from 'lucide-react';
import { toast } from 'sonner';
import {
  CICLOS_COMERCIAIS_OPS,
  TIPOS_CAMPANHA,
  previewPhasesForTipo,
} from '@/lib/tipoCampanhaPipeline';
import {
  ITEM_CYCLE_OPTIONS,
  getItemCycleOption,
  isItemCyclePipelineKey,
  isItemCycleService,
  resolveItemCyclePipeline,
} from '@/templates/itemCycleTemplateHelpers';

function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Wizard: cria o ciclo operacional do mês.
 * Default: Pipeline Narrativa (7 fases). Legado 4 semanas permanece disponível.
 */
export default function NewMonthCycleWizard({
  open,
  onOpenChange,
  defaultClientId = '',
  defaultServiceId = '',
  onSuccess,
}) {
  const { agencyId, user } = useSession();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [templateId, setTemplateId] = useState('');
  const [legadoTemplateId, setLegadoTemplateId] = useState('');
  /** mapa offering_key → template Service id */
  const [itemCycleTemplateIds, setItemCycleTemplateIds] = useState({});

  const [clientId, setClientId] = useState(defaultClientId || '');
  const [mode, setMode] = useState(defaultServiceId ? 'existing' : 'new');
  const [serviceId, setServiceId] = useState(defaultServiceId || '');
  const [startDate, setStartDate] = useState(todayYmd());
  const [serviceName, setServiceName] = useState('');
  const [generateTasks, setGenerateTasks] = useState(true);
  const [pipeline, setPipeline] = useState('narrativa');
  const [tipoCampanha, setTipoCampanha] = useState('5_videos');
  const [cicloComercial, setCicloComercial] = useState('');
  const [linhaFocal, setLinhaFocal] = useState('');

  useEffect(() => {
    if (!open || !agencyId) return;

    let cancelled = false;
    (async () => {
      setBootstrapping(true);
      try {
        const [clientsData, narrativaTpl, legadoTpl, itemMap] = await Promise.all([
          Client.filter({ agencyId }).catch(() => []),
          ensureCicloNarrativaTemplate(agencyId),
          ensureCicloMensalTemplate(agencyId),
          ensureItemCycleTemplates(agencyId),
        ]);
        if (cancelled) return;
        setClients(Array.isArray(clientsData) ? clientsData : []);
        setTemplateId(narrativaTpl?.id || '');
        setLegadoTemplateId(legadoTpl?.id || '');
        const ids = {};
        for (const [key, tpl] of Object.entries(itemMap || {})) {
          if (tpl?.id) ids[key] = tpl.id;
        }
        setItemCycleTemplateIds(ids);
        if (defaultClientId) setClientId(defaultClientId);
        if (defaultServiceId) {
          setServiceId(defaultServiceId);
          setMode('existing');
        }
      } catch (err) {
        console.error(err);
        toast.error(err?.message || 'Erro ao preparar wizard');
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, agencyId, defaultClientId, defaultServiceId]);

  useEffect(() => {
    if (!open || !agencyId || !clientId) {
      setServices([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const list = await Service.filter({
        agencyId,
        clientId,
        is_template: false,
      }).catch(() => []);
      if (!cancelled) setServices(Array.isArray(list) ? list : []);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, agencyId, clientId]);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setLoading(false);
    }
  }, [open]);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === clientId),
    [clients, clientId]
  );

  const phasePreview = useMemo(
    () => previewPhasesForTipo(tipoCampanha),
    [tipoCampanha]
  );

  const selectedExistingService = useMemo(
    () => services.find((s) => s.id === serviceId),
    [services, serviceId]
  );

  const effectivePipeline = useMemo(() => {
    if (mode === 'existing' && isItemCycleService(selectedExistingService)) {
      return resolveItemCyclePipeline(selectedExistingService, pipeline);
    }
    return pipeline;
  }, [mode, selectedExistingService, pipeline]);

  const itemCycleOpt = getItemCycleOption(effectivePipeline);
  const isItemCycle = isItemCyclePipelineKey(effectivePipeline);

  const activeTemplateId = isItemCycle
    ? itemCycleTemplateIds[itemCycleOpt?.key] || ''
    : effectivePipeline === 'narrativa'
      ? templateId
      : legadoTemplateId;
  const canNextFrom1 = Boolean(clientId);
  const canNextFrom2 =
    mode === 'new' ? Boolean(activeTemplateId) : Boolean(serviceId);
  const canSubmit = Boolean(
    clientId && startDate && (mode === 'new' ? activeTemplateId : serviceId)
  );

  useEffect(() => {
    setGenerateTasks(!isItemCyclePipelineKey(pipeline));
  }, [pipeline]);

  const pipelineLabel = itemCycleOpt?.label
    ? itemCycleOpt.label
    : effectivePipeline === 'narrativa'
      ? 'Pipeline Narrativa'
      : 'Ciclo Mensal de Campanhas';

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const result = await createMonthCycle({
        agencyId,
        clientId,
        startDate,
        templateId: mode === 'new' ? activeTemplateId : undefined,
        serviceId: mode === 'existing' ? serviceId : undefined,
        serviceName:
          serviceName ||
          (selectedClient
            ? `${selectedClient.name || selectedClient.company_name} — ${pipelineLabel}`
            : undefined),
        generateTasks: isItemCycle ? false : generateTasks,
        ownerId: user?.id || user?.data?.id,
        pipeline: effectivePipeline,
        tipo_campanha: tipoCampanha,
        ciclo_comercial: cicloComercial,
        linha_focal: linhaFocal,
      });

      toast.success(
        isItemCycle
          ? itemCycleOpt?.emptyCycleMessage ||
              'Mês iniciado — adicione os trabalhos do serviço'
          : generateTasks
            ? `Mês iniciado com ${result.tasksCreated} tarefas`
            : 'Mês operacional iniciado'
      );
      onOpenChange?.(false);
      onSuccess?.(result);

      const dest = createPageUrl(
        `delivery-workspace?serviceId=${result.service.id}&section=tasks`
      );
      navigate(dest);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || 'Falha ao iniciar o mês');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="w-5 h-5" />
            Novo mês operacional
          </DialogTitle>
          <DialogDescription>
            {isItemCycle
              ? `${itemCycleOpt?.label || 'Serviço operacional'}: mês → unidades → etapas do template.`
              : effectivePipeline === 'narrativa'
                ? `Pipeline Narrativa (${TIPOS_CAMPANHA.find((t) => t.value === tipoCampanha)?.label || tipoCampanha}): fases, subtarefas, gates e SLA.`
                : 'Legado: 4 fases — PLANEJAMENTO, PRODUÇÃO, REVISÃO e PUBLICAÇÃO.'}
          </DialogDescription>
        </DialogHeader>

        {bootstrapping ? (
          <div className="flex items-center justify-center py-10 text-sm text-slate-500">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Preparando template…
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {step === 1 && (
              <div className="space-y-3">
                <div>
                  <Label>Cliente *</Label>
                  <Select value={clientId} onValueChange={setClientId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name || c.company_name || c.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Pipeline</Label>
                  <Select value={pipeline} onValueChange={setPipeline}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="narrativa">
                        Narrativa — 7 fases + subtarefas (recomendado)
                      </SelectItem>
                      {ITEM_CYCLE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.key} value={opt.key}>
                          {opt.selectLabel}
                        </SelectItem>
                      ))}
                      <SelectItem value="legado">Legado — 4 semanas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Modo</Label>
                  <Select value={mode} onValueChange={setMode}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Novo serviço a partir do template</SelectItem>
                      <SelectItem value="existing">Usar serviço existente do cliente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                {mode === 'new' ? (
                  <>
                    <div>
                      <Label>Nome do serviço (opcional)</Label>
                      <Input
                        value={serviceName}
                        onChange={(e) => setServiceName(e.target.value)}
                        placeholder={
                          selectedClient
                            ? `${selectedClient.name || selectedClient.company_name} — ${pipelineLabel}`
                            : pipelineLabel
                        }
                      />
                    </div>
                    {pipeline === 'narrativa' ? (
                      <div className="space-y-3">
                        <div>
                          <Label>Tipo de campanha</Label>
                          <Select value={tipoCampanha} onValueChange={setTipoCampanha}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TIPOS_CAMPANHA.map((t) => (
                                <SelectItem key={t.value} value={t.value}>
                                  {t.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="mt-1 text-xs text-slate-500">
                            {TIPOS_CAMPANHA.find((t) => t.value === tipoCampanha)?.description}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label>Fase comercial</Label>
                            <Select
                              value={cicloComercial || '__none__'}
                              onValueChange={(v) =>
                                setCicloComercial(v === '__none__' ? '' : v)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="—" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">—</SelectItem>
                                {CICLOS_COMERCIAIS_OPS.map((c) => (
                                  <SelectItem key={c.value} value={c.value}>
                                    {c.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Linha focal</Label>
                            <Input
                              value={linhaFocal}
                              onChange={(e) => setLinhaFocal(e.target.value)}
                              placeholder="Ex.: Premium"
                            />
                          </div>
                        </div>
                        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                          <p className="text-[11px] font-medium text-slate-500">
                            Preview · {phasePreview.length} fases
                          </p>
                          <p className="text-xs text-slate-700">
                            {phasePreview.map((p) => p.label).join(' → ')}
                          </p>
                        </div>
                      </div>
                    ) : isItemCyclePipelineKey(pipeline) ? (
                      <p className="text-xs text-slate-500">
                        Template: {getItemCycleOption(pipeline)?.label}.{' '}
                        {getItemCycleOption(pipeline)?.hint}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500">
                        Template: Ciclo Mensal de Campanhas (4 fases)
                      </p>
                    )}
                  </>
                ) : (
                  <div>
                    <Label>Serviço existente *</Label>
                    <Select value={serviceId} onValueChange={setServiceId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o serviço" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {services.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {services.length === 0 && (
                      <p className="text-xs text-amber-600 mt-1">
                        Este cliente ainda não tem serviços. Use o modo “Novo serviço”.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <div>
                  <Label>Data de início *</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {isItemCycle
                      ? 'Ciclo pronto para receber itens como tarefas.'
                      : effectivePipeline === 'narrativa'
                        ? `${phasePreview.length} fases serão agendadas em sequência (dias úteis).`
                        : 'As 4 fases serão agendadas em sequência (dias úteis).'}
                  </p>
                </div>
                {!isItemCycle ? (
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={generateTasks}
                      onCheckedChange={(v) => setGenerateTasks(Boolean(v))}
                    />
                    {effectivePipeline === 'narrativa'
                      ? 'Gerar tarefas e subtarefas agora'
                      : 'Gerar tarefas das 4 fases agora'}
                  </label>
                ) : (
                  <p className="text-xs text-slate-500">
                    Itens são criados depois, como tarefas, com o checklist padrão do
                    template.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              disabled={loading || bootstrapping}
              onClick={() => setStep((s) => s - 1)}
            >
              Voltar
            </Button>
          )}
          {step < 3 ? (
            <Button
              type="button"
              disabled={
                bootstrapping ||
                (step === 1 && !canNextFrom1) ||
                (step === 2 && !canNextFrom2)
              }
              onClick={() => setStep((s) => s + 1)}
            >
              Continuar
            </Button>
          ) : (
            <Button type="button" disabled={loading || !canSubmit} onClick={handleSubmit}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando…
                </>
              ) : (
                'Criar ciclo'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
