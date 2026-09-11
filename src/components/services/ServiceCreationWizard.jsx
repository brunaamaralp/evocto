import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Client } from '@/api/entities';
import { Service } from '@/api/entities';
import { createServiceInstance } from '@/api/functions';
import { ensureCicloMensalTemplate } from '@/api/functions/ensureCicloMensalTemplate';
import { ensureProducaoConteudoTemplate } from '@/api/functions/ensureProducaoConteudoTemplate';
import { useSession } from '@/components/auth/SessionManager';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

async function loadAgencyTemplates(agencyId) {
  if (!agencyId) return [];
  await Promise.all([
    ensureCicloMensalTemplate(agencyId).catch(() => null),
    ensureProducaoConteudoTemplate(agencyId).catch(() => null),
  ]);
  let list = await Service.filter({ agencyId, is_template: true }, '-updated_date', 100);
  if (!Array.isArray(list) || list.length === 0) {
    const all = await Service.filter({ agencyId }, '-updated_date', 100);
    list = (Array.isArray(all) ? all : []).filter(
      (s) => s.is_template === true || s.is_template === 'true' || s.is_template === 1
    );
  }
  return Array.isArray(list) ? list : [];
}

export default function ServiceCreationWizard({
  isOpen = true,
  onClose,
  onSuccess,
  onServiceCreated,
  clientId,
  selectedClient = null,
  clients: clientsProp = [],
  templates: templatesProp = [],
}) {
  const { agencyId } = useSession();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');

  const [clients, setClients] = useState(clientsProp || []);
  const [templates, setTemplates] = useState(templatesProp || []);

  const [selectedClientId, setSelectedClientId] = useState(
    clientId || selectedClient?.id || ''
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  useEffect(() => {
    if (Array.isArray(clientsProp) && clientsProp.length > 0) {
      setClients(clientsProp);
    }
  }, [clientsProp]);

  useEffect(() => {
    if (Array.isArray(templatesProp) && templatesProp.length > 0) {
      setTemplates(templatesProp);
    }
  }, [templatesProp]);

  useEffect(() => {
    if (clientId || selectedClient?.id) {
      setSelectedClientId(clientId || selectedClient.id);
    }
  }, [clientId, selectedClient]);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    const loadData = async () => {
      setLoadingData(true);
      setError('');
      try {
        const needsClients = !(clientsProp?.length > 0);
        const needsTemplates = !(templatesProp?.length > 0);

        const [clientsData, templatesData] = await Promise.all([
          needsClients
            ? Client.filter(agencyId ? { agencyId } : {}, '-updated_date', 100)
            : Promise.resolve(clientsProp),
          needsTemplates
            ? loadAgencyTemplates(agencyId)
            : Promise.resolve(templatesProp),
        ]);

        if (cancelled) return;
        setClients(Array.isArray(clientsData) ? clientsData : []);
        setTemplates(Array.isArray(templatesData) ? templatesData : []);
      } catch (_err) {
        if (!cancelled) setError('Erro ao carregar clientes/templates');
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    };

    loadData();
    return () => { cancelled = true; };
  }, [isOpen, agencyId, clientsProp, templatesProp]);

  const handleCreateService = async () => {
    if (!selectedClientId || !selectedTemplateId) {
      setError('Selecione um cliente e um template');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await createServiceInstance({
        clientId: selectedClientId,
        templateId: selectedTemplateId,
      });

      const newService =
        response?.serviceInstance ||
        response?.data?.service ||
        response?.data ||
        response;
      const newServiceId = newService?.id;

      if (!newServiceId) {
        throw new Error('Instância criada, mas não foi possível obter o ID do serviço');
      }

      toast.success('Serviço criado a partir do template');
      const notify = onServiceCreated || onSuccess;
      notify?.(newService);
      onClose?.();
    } catch (err) {
      console.error('[ServiceCreationWizard] Erro:', err);
      setError(err.message || 'Erro ao criar instância do serviço');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Criar Nova Instância de Serviço</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {loadingData ? (
            <div className="flex items-center justify-center py-8 text-sm text-gray-600">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Carregando templates...
            </div>
          ) : (
            <>
              <div>
                <Label>Cliente</Label>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Template de Serviço</Label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                        {template.category ? ` (${template.category})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {templates.length === 0 && (
                  <p className="text-sm text-amber-700 mt-2">
                    Nenhum template disponível. Vá em Templates e instale os templates padrão.
                  </p>
                )}
              </div>
            </>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateService}
              disabled={loading || loadingData || !selectedClientId || !selectedTemplateId}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Criar Serviço
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
