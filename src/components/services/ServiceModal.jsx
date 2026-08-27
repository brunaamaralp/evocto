
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles } from 'lucide-react';
import { Service } from '@/api/entities';
import { User } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';
import ServiceCreationWizard from './ServiceCreationWizard';
import { SERVICE_CATEGORIES } from '@/constants/serviceCategories';

export default function ServiceModal({
  isOpen,
  onClose,
  onServiceCreated,
  clients = [],
  selectedTemplate = null,
  selectedClient = null,
  mode = 'wizard'
}) {
  const { user, agencyId } = useSession();
  const [teamMembers, setTeamMembers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // P5: Carregar membros da equipe para atribuição de tarefas
  useEffect(() => {
    const loadTeamMembers = async () => {
      if (!agencyId) return;
      try {
        const members = await User.filter({
          agencyId,
          role: { $in: ['owner', 'admin', 'team'] }
        });
        setTeamMembers(members);
      } catch (error) {
        console.error('Erro ao carregar membros da equipe:', error);
      }
    };

    if (isOpen) {
      loadTeamMembers();
    }
  }, [isOpen, agencyId]);

  // P5: Carregar templates se não foram fornecidos
  useEffect(() => {
    const fetchTemplates = async () => {
      if (!agencyId) return;
      setLoadingTemplates(true);
      try {
        const fetchedTemplates = await Service.filter({
          agencyId,
          is_template: true,
          is_active: true
        });
        setTemplates(fetchedTemplates);
      } catch (err) {
        console.error('Failed to fetch templates:', err);
      } finally {
        setLoadingTemplates(false);
      }
    };

    if (isOpen && templates.length === 0) {
      fetchTemplates();
    }
  }, [isOpen, agencyId, templates.length]);

  // P5: Usar wizard como padrão para a criação de serviços
  if (mode === 'wizard') {
    return (
      <ServiceCreationWizard
        isOpen={isOpen}
        onClose={onClose}
        onServiceCreated={onServiceCreated}
        selectedTemplate={selectedTemplate}
        selectedClient={selectedClient}
        clients={clients}
        templates={templates}
        loadingTemplates={loadingTemplates}
        teamMembers={teamMembers}
        serviceCategories={SERVICE_CATEGORIES}
      />
    );
  }

  // P5: Manter modal simples como fallback
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Criar Instância de Serviço (Modo Simples)</DialogTitle>
        </DialogHeader>

        <div className="text-center py-8">
          <Alert variant="destructive" className="mb-4">
            <Sparkles className="h-4 w-4" />
            <AlertDescription>
              Este modo é obsoleto. Por favor, use o modo wizard para uma experiência otimizada de criação de serviços.
            </AlertDescription>
          </Alert>

          <Button
            onClick={() => {
              alert('Aguarde: O modo wizard será ativado na próxima atualização da página ou reinício da sessão.');
              onClose();
            }}
            className="flex items-center gap-2 mx-auto"
          >
            <Sparkles className="h-4 w-4" />
            Ativar Modo Wizard (Reiniciar)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
