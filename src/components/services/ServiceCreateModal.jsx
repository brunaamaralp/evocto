import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Client } from '@/api/entities';
import { Service } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';
import { createServiceInstance } from '@/api/functions';

export default function ServiceCreateModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  preselectedTemplateId = null 
}) {
  const { user, agencyId } = useSession();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState(preselectedTemplateId || '');
  const [loadingData, setLoadingData] = useState(true);

  // CORREÇÃO: Função de fechar com useCallback
  const handleClose = useCallback(() => {
    console.log('🔴 Fechando modal ServiceCreateModal');
    
    // Reset form
    setSelectedClientId('');
    setSelectedTemplateId(preselectedTemplateId || '');
    setLoading(false);
    
    // Call parent close function
    if (onClose) {
      onClose();
    }
  }, [onClose, preselectedTemplateId]);

  // CORREÇÃO: Função de carregar dados com useCallback
  const loadInitialData = useCallback(async () => {
    try {
      setLoadingData(true);
      console.log('📋 Carregando dados para modal ServiceCreate');

      const [clientsData, templatesData] = await Promise.all([
        Client.filter({ agencyId, status: 'ativo' }),
        Service.filter({ agencyId, is_template: true, is_active: true })
      ]);

      console.log(`✅ Carregados ${clientsData.length} clientes e ${templatesData.length} templates`);

      setClients(clientsData);
      setTemplates(templatesData);
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoadingData(false);
    }
  }, [agencyId]);

  // Carregar dados quando modal abre
  useEffect(() => {
    if (isOpen && agencyId) {
      loadInitialData();
    }
  }, [isOpen, agencyId, loadInitialData]);

  // Definir template pré-selecionado
  useEffect(() => {
    if (preselectedTemplateId) {
      setSelectedTemplateId(preselectedTemplateId);
    }
  }, [preselectedTemplateId]);

  // CORREÇÃO: Handler para ESC key com dependências corretas
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && isOpen) {
        console.log('🔴 ESC pressionado - fechando modal');
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      return () => document.removeEventListener('keydown', handleEscKey);
    }
  }, [isOpen, handleClose]);

  const handleSubmit = async () => {
    if (!selectedClientId || !selectedTemplateId) {
      toast.error('Selecione um cliente e um template');
      return;
    }

    try {
      setLoading(true);
      console.log('🚀 Criando serviço:', { selectedClientId, selectedTemplateId });

      const response = await createServiceInstance({
        templateId: selectedTemplateId,
        clientId: selectedClientId,
        customizations: {
          start_date: new Date().toISOString()
        }
      });

      if (response.success) {
        toast.success('Serviço criado com sucesso!');
        console.log('✅ Serviço criado:', response.serviceInstance);
        
        if (onSuccess) {
          onSuccess(response.serviceInstance);
        }
        
        handleClose();
      } else {
        throw new Error('Falha na criação do serviço');
      }
    } catch (error) {
      console.error('❌ Erro ao criar serviço:', error);
      toast.error(`Erro ao criar serviço: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // CORREÇÃO: Não renderizar se não estiver aberto
  if (!isOpen) {
    return null;
  }

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        console.log('🔄 Dialog onOpenChange:', open);
        if (!open) {
          handleClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-[425px]" onPointerDownOutside={handleClose}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Criar Nova Instância de Serviço</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-6 w-6 rounded-full hover:bg-gray-100"
              type="button"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {loadingData ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Carregando dados...</span>
            </div>
          ) : (
            <>
              {/* Seleção de Cliente */}
              <div className="space-y-2">
                <Label htmlFor="client-select">Cliente</Label>
                <Select 
                  value={selectedClientId} 
                  onValueChange={setSelectedClientId}
                  disabled={loading}
                >
                  <SelectTrigger id="client-select">
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
                {clients.length === 0 && (
                  <p className="text-sm text-gray-500">
                    Nenhum cliente ativo encontrado
                  </p>
                )}
              </div>

              {/* Seleção de Template */}
              <div className="space-y-2">
                <Label htmlFor="template-select">Template de Serviço</Label>
                <Select 
                  value={selectedTemplateId} 
                  onValueChange={setSelectedTemplateId}
                  disabled={loading}
                >
                  <SelectTrigger id="template-select">
                    <SelectValue placeholder="Selecione um template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {templates.length === 0 && (
                  <p className="text-sm text-gray-500">
                    Nenhum template disponível
                  </p>
                )}
              </div>
            </>
          )}

          {/* Botões de Ação */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              variant="outline" 
              onClick={handleClose}
              disabled={loading}
              type="button"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={loading || loadingData || !selectedClientId || !selectedTemplateId}
              type="button"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Serviço'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}