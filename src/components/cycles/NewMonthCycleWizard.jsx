import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Client, Service } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';
import { createMonthCycle } from '@/api/functions/createMonthCycle';
import { ensureCicloMensalTemplate } from '@/api/functions/ensureCicloMensalTemplate';
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

function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Wizard: Novo ciclo do mês a partir do template Ciclo Mensal 4 Semanas.
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

  const [clientId, setClientId] = useState(defaultClientId || '');
  const [mode, setMode] = useState(defaultServiceId ? 'existing' : 'new');
  const [serviceId, setServiceId] = useState(defaultServiceId || '');
  const [startDate, setStartDate] = useState(todayYmd());
  const [serviceName, setServiceName] = useState('');
  const [generateTasks, setGenerateTasks] = useState(true);

  useEffect(() => {
    if (!open || !agencyId) return;

    let cancelled = false;
    (async () => {
      setBootstrapping(true);
      try {
        const [clientsData, template] = await Promise.all([
          Client.filter({ agencyId }).catch(() => []),
          ensureCicloMensalTemplate(agencyId),
        ]);
        if (cancelled) return;
        setClients(Array.isArray(clientsData) ? clientsData : []);
        setTemplateId(template?.id || '');
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

  const canNextFrom1 = Boolean(clientId);
  const canNextFrom2 =
    mode === 'new' ? Boolean(templateId) : Boolean(serviceId);
  const canSubmit = Boolean(clientId && startDate && (mode === 'new' ? templateId : serviceId));

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const result = await createMonthCycle({
        agencyId,
        clientId,
        startDate,
        templateId: mode === 'new' ? templateId : undefined,
        serviceId: mode === 'existing' ? serviceId : undefined,
        serviceName:
          serviceName ||
          (selectedClient
            ? `${selectedClient.name || selectedClient.company_name} — Ciclo Mensal`
            : undefined),
        generateTasks,
        ownerId: user?.id || user?.data?.id,
      });

      toast.success(
        generateTasks
          ? `Ciclo criado com ${result.tasksCreated} tarefas`
          : 'Ciclo criado com sucesso'
      );
      onOpenChange?.(false);
      onSuccess?.(result);

      const dest = createPageUrl(
        `delivery-workspace?serviceId=${result.service.id}&section=tasks`
      );
      navigate(dest);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || 'Falha ao criar ciclo');
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
            Novo ciclo do mês
          </DialogTitle>
          <DialogDescription>
            Cria as 4 semanas (ROTEIROS → PRODUÇÃO → REVISÃO → PUBLICAÇÃO) a partir do
            template padrão.
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
                  <div>
                    <Label>Nome do serviço (opcional)</Label>
                    <Input
                      value={serviceName}
                      onChange={(e) => setServiceName(e.target.value)}
                      placeholder={
                        selectedClient
                          ? `${selectedClient.name || selectedClient.company_name} — Ciclo Mensal`
                          : 'Ciclo Mensal'
                      }
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Template: Ciclo Mensal 4 Semanas
                    </p>
                  </div>
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
                    As 4 fases serão agendadas em sequência (dias úteis).
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={generateTasks}
                    onCheckedChange={(v) => setGenerateTasks(Boolean(v))}
                  />
                  Gerar tarefas das 4 fases agora
                </label>
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
