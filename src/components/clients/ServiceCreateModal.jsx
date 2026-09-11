import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Service } from '@/api/entities';
import { createServiceInstance } from '@/api/functions';
import { ensureCicloMensalTemplate } from '@/api/functions/ensureCicloMensalTemplate';
import { ensureProducaoConteudoTemplate } from '@/api/functions/ensureProducaoConteudoTemplate';
import { useSession } from '@/components/auth/SessionManager';
import { Loader2, Plus, AlertCircle } from 'lucide-react';

export default function ServiceCreateModal({ isOpen, onClose, onSuccess, clientId, clientName }) {
  const { agencyId } = useSession();
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      setError('');
      setSelectedTemplateId('');
    }
  }, [isOpen, agencyId]);

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      if (agencyId) {
        await Promise.all([
          ensureCicloMensalTemplate(agencyId).catch(() => null),
          ensureProducaoConteudoTemplate(agencyId).catch(() => null),
        ]);
      }

      let list = agencyId
        ? await Service.filter({ agencyId, is_template: true }, '-updated_date', 100)
        : await Service.filter({ is_template: true }, '-updated_date', 100);

      if ((!Array.isArray(list) || list.length === 0) && agencyId) {
        const all = await Service.filter({ agencyId }, '-updated_date', 100);
        list = (Array.isArray(all) ? all : []).filter(
          (s) => s.is_template === true || s.is_template === 'true' || s.is_template === 1
        );
      }

      setTemplates(Array.isArray(list) ? list : []);
    } catch (_err) {
      setError('Erro ao carregar templates');
      setTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleCreate = async () => {
    if (!selectedTemplateId) {
      setError('Selecione um template');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await createServiceInstance({
        clientId,
        templateId: selectedTemplateId,
      });

      const newServiceId =
        response?.serviceInstance?.id ||
        response?.data?.service?.id ||
        response?.data?.serviceId ||
        response?.data?.id ||
        response?.service?.id ||
        response?.serviceId ||
        response?.id;

      if (newServiceId) {
        onSuccess?.(newServiceId);
        onClose?.();
      } else {
        setError('Serviço criado, mas não foi possível obter o ID');
      }
    } catch (err) {
      console.error('[ServiceCreateModal] Erro:', err);
      setError(err.message || 'Erro ao criar serviço');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Criar Serviço para {clientName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded border">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div>
            <Label>Template de Serviço *</Label>
            {loadingTemplates ? (
              <div className="flex items-center gap-2 text-sm text-gray-600 py-3">
                <Loader2 className="w-4 h-4 animate-spin" />
                Carregando templates...
              </div>
            ) : (
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um template" />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-auto">
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div>
                        <div className="font-medium">{template.name}</div>
                        <div className="text-xs text-gray-500">{template.category}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {!loadingTemplates && templates.length === 0 && (
              <p className="text-sm text-amber-700 mt-2">
                Nenhum template disponível. Instale os templates padrão na aba Templates.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={loading || loadingTemplates || !selectedTemplateId}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Serviço'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
