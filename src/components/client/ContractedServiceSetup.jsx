import { useCallback, useEffect, useMemo, useState } from 'react';
import { Briefcase, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Service } from '@/api/entities';
import { createServiceInstance } from '@/api/functions';
import { ensureCicloMensalTemplate } from '@/api/functions/ensureCicloMensalTemplate';
import { ensureCicloNarrativaTemplate } from '@/api/functions/ensureCicloNarrativaTemplate';
import { normalizeDeliverableTaskShapes } from '@/templates/cicloMensal4SemanasTemplate';
import { toast } from 'sonner';

function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Passo guiado: definir o serviço contratado do cliente.
 */
export default function ContractedServiceSetup({
  open,
  onClose,
  agencyId,
  clientId,
  clientName = 'Cliente',
  onCreated,
}) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [startDate, setStartDate] = useState(todayYmd());

  const selectedTemplate = useMemo(
    () => templates.find((t) => String(t.id) === String(templateId)) || null,
    [templates, templateId]
  );

  const loadTemplates = useCallback(async () => {
    if (!agencyId) return;
    setLoading(true);
    setError('');
    try {
      await Promise.all([
        ensureCicloNarrativaTemplate(agencyId).catch(() => null),
        ensureCicloMensalTemplate(agencyId).catch(() => null),
      ]);
      const list = await Service.filter({
        agencyId,
        is_template: true,
        is_active: true,
      });
      const templatesList = Array.isArray(list) ? list : [];
      setTemplates(templatesList);
      if (templatesList.length > 0) {
        const preferred =
          templatesList.find((t) =>
            String(t.offering_key || t.name || '')
              .toLowerCase()
              .includes('narrativa')
          ) || templatesList[0];
        setTemplateId(preferred.id);
        setServiceName(`${clientName} — ${preferred.name}`);
      }
    } catch (err) {
      console.error('[ContractedServiceSetup]', err);
      setError(err?.message || 'Não foi possível carregar os templates.');
    } finally {
      setLoading(false);
    }
  }, [agencyId, clientName]);

  useEffect(() => {
    if (!open) return;
    setStartDate(todayYmd());
    setServiceName('');
    setTemplateId('');
    loadTemplates();
  }, [open, loadTemplates]);

  useEffect(() => {
    if (!selectedTemplate || !open) return;
    setServiceName((prev) => {
      if (prev && !prev.startsWith(`${clientName} —`)) return prev;
      return `${clientName} — ${selectedTemplate.name}`;
    });
  }, [selectedTemplate, clientName, open]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!templateId || !clientId) {
      setError('Selecione um template de serviço.');
      return;
    }
    if (!serviceName.trim()) {
      setError('Informe o nome do serviço contratado.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const template = selectedTemplate || (await Service.get(templateId));
      const result = await createServiceInstance({
        templateId,
        clientId,
        templateName: serviceName.trim(),
        startDate: startDate || todayYmd(),
        customizations: {
          name: serviceName.trim(),
          start_date: startDate || todayYmd(),
          service_status: 'setup',
          deliverables: normalizeDeliverableTaskShapes(template?.deliverables || []),
        },
      });
      const instance =
        result?.serviceInstance || result?.data?.serviceInstance || result?.data;
      if (!instance?.id) {
        throw new Error('Falha ao criar a instância do serviço.');
      }
      toast.success('Serviço contratado definido.');
      onCreated?.(instance);
      onClose?.();
    } catch (err) {
      console.error('[ContractedServiceSetup] create', err);
      setError(err?.message || 'Erro ao criar o serviço.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contracted-service-title"
    >
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white shadow-lg sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-[#eee] px-5 py-4">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2 text-[#007bff]">
              <Briefcase className="h-4 w-4" aria-hidden />
              <span className="text-xs font-semibold uppercase tracking-wide">
                Contrato
              </span>
            </div>
            <h2
              id="contracted-service-title"
              className="text-lg font-semibold text-[#111]"
            >
              Qual serviço foi contratado?
            </h2>
            <p className="mt-1 text-sm text-[#555]">
              Defina o serviço de {clientName} antes de campanhas e tarefas.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={onClose}
            disabled={saving}
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-[#555]">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Carregando templates…
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="contracted-template">Template do serviço *</Label>
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger id="contracted-template">
                    <SelectValue placeholder="Selecione um template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((tpl) => (
                      <SelectItem key={tpl.id} value={tpl.id}>
                        {tpl.name}
                        {tpl.category ? ` · ${tpl.category}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {templates.length === 0 ? (
                  <p className="text-xs text-[#c0392b]">
                    Nenhum template ativo encontrado para a agência.
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contracted-name">Nome do serviço *</Label>
                <Input
                  id="contracted-name"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder={`${clientName} — Serviço`}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contracted-start">Data de início</Label>
                <Input
                  id="contracted-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              {selectedTemplate?.deliverables?.length ? (
                <p className="text-xs text-[#555]">
                  {selectedTemplate.deliverables.length} fase
                  {selectedTemplate.deliverables.length === 1 ? '' : 's'} neste
                  template
                  {selectedTemplate.description
                    ? ` · ${selectedTemplate.description}`
                    : ''}
                </p>
              ) : null}
            </>
          )}

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Agora não
            </Button>
            <Button
              type="submit"
              className="bg-[#007bff] hover:bg-[#0056b3]"
              disabled={saving || loading || !templateId}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Salvando…
                </>
              ) : (
                'Definir serviço'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
