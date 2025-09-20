import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Client } from '@/api/entities';
import { Service } from '@/api/entities';
import { createServiceInstance } from '@/api/functions';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ServiceCreationWizard({ onClose, onSuccess, clientId }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [clients, setClients] = useState([]);
  const [templates, setTemplates] = useState([]);
  
  const [selectedClientId, setSelectedClientId] = useState(clientId || '');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [customizations, setCustomizations] = useState({});

  React.useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [clientsData, templatesData] = await Promise.all([
        Client.list('-updated_date', 50),
        Service.filter({ is_template: true, is_active: true }, '-updated_date', 50)
      ]);
      setClients(clientsData || []);
      setTemplates(templatesData || []);
    } catch (err) {
      setError('Erro ao carregar dados');
    }
  };

  const handleCreateService = async () => {
    setLoading(true);
    setError('');
    
    try {
      // ADICIONAR DEBUG AQUI
      console.log('[DEBUG] Iniciando criação de serviço com:', {
        clientId: selectedClientId,
        templateId: selectedTemplateId
      });

      const response = await createServiceInstance({
        clientId: selectedClientId,
        templateId: selectedTemplateId
      });

      // ADICIONAR DEBUG DA RESPOSTA COMPLETA
      console.log('[DEBUG] Resposta da API createServiceInstance:', response);

      // CORREÇÃO: Extrair serviceId corretamente da resposta
      const newServiceId = response?.data?.service?.id || response?.data?.serviceId || response?.data?.id;
      
      console.log('[DEBUG] ServiceId extraído:', newServiceId);

      if (newServiceId) {
        if (onSuccess) {
          onSuccess(newServiceId);
        } else {
          // Redirecionar para página do serviço
          window.location.href = `/service-detail?serviceId=${newServiceId}`;
        }
      } else {
        console.error('[DEBUG] Falha ao extrair serviceId da resposta:', response);
        setError('Instância criada, mas não foi possível obter o ID do serviço');
      }
    } catch (err) {
      console.error('[DEBUG] Erro na criação do serviço:', err);
      setError(err.message || 'Erro ao criar instância do serviço');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
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

          <div>
            <Label>Cliente</Label>
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map(client => (
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
                {templates.map(template => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name} ({template.category})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateService} 
              disabled={loading || !selectedClientId || !selectedTemplateId}
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