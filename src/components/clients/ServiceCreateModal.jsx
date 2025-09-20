import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Service } from '@/api/entities';
import { createServiceInstance } from '@/api/functions';
import { Loader2, Plus, AlertCircle } from 'lucide-react';

export default function ServiceCreateModal({ isOpen, onClose, onSuccess, clientId, clientName }) {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      setError('');
      setSelectedTemplateId('');
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    try {
      const templatesData = await Service.filter({ is_template: true, is_active: true });
      setTemplates(templatesData || []);
    } catch (err) {
      setError('Erro ao carregar templates');
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
      // DEBUG
      console.log('[DEBUG] Criando serviço para cliente:', { clientId, templateId: selectedTemplateId });

      const response = await createServiceInstance({
        clientId: clientId,
        templateId: selectedTemplateId
      });

      // DEBUG DA RESPOSTA
      console.log('[DEBUG] Resposta createServiceInstance (ServiceCreateModal):', response);

      // CORREÇÃO: Múltiplas tentativas para extrair o serviceId
      const newServiceId = response?.data?.service?.id || 
                          response?.data?.serviceId || 
                          response?.data?.id ||
                          response?.service?.id ||
                          response?.serviceId ||
                          response?.id;

      console.log('[DEBUG] ServiceId extraído (ServiceCreateModal):', newServiceId);

      if (newServiceId) {
        if (onSuccess) {
          onSuccess(newServiceId);
        }
        onClose();
      } else {
        console.error('[DEBUG] Falha ao extrair serviceId da resposta:', response);
        setError('Serviço criado, mas não foi possível obter o ID');
      }
    } catch (err) {
      console.error('[DEBUG] Erro na criação do serviço:', err);
      setError(err.message || 'Erro ao criar serviço');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
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
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um template" />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-auto">
                {templates.map(template => (
                  <SelectItem key={template.id} value={template.id}>
                    <div>
                      <div className="font-medium">{template.name}</div>
                      <div className="text-xs text-gray-500">{template.category}</div>
                      {template.description && (
                        <div className="text-xs text-gray-400 mt-1">{template.description.slice(0, 60)}...</div>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={loading || !selectedTemplateId}>
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