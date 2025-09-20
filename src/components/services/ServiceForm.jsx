
import React, { useState, useRef, useEffect } from 'react';
import { Service, AuditLog } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const FREQUENCY_OPTIONS = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'biweekly', label: 'Quinzenal' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'one_time', label: 'Avulso (uma vez)' } // Added 'one_time' option
];

const APPROVAL_POLICIES = [
  { value: 'auto_with_guardrails', label: 'Auto com guardrails' },
  { value: 'always_ask', label: 'Sempre pedir aprovação' }
];

export default function ServiceForm({ isOpen, onClose, onSuccess, clientId = null }) {
  const [formData, setFormData] = useState({
    name: '',
    defaultFrequency: 'monthly',
    approvalPolicy: 'auto_with_guardrails'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const nameInputRef = useRef(null);
  const { agency } = useSession();

  // Focus management
  useEffect(() => {
    if (isOpen && nameInputRef.current) {
      // Small delay to ensure modal is fully rendered
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        defaultFrequency: 'monthly',
        approvalPolicy: 'auto_with_guardrails'
      });
      setError('');
      setLoading(false);
    }
  }, [isOpen]);

  // Keyboard handlers
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      handleClose();
    } else if (e.key === 'Enter' && isFormValid() && !loading) {
      e.preventDefault();
      handleSubmit(e); // Pass the event object
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  const isFormValid = () => {
    return formData.name.trim().length >= 2;
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent default form submission behavior

    if (!isFormValid() || loading) return;
    
    setLoading(true);
    setError('');
    
    try {
      const serviceData = {
        agencyId: agency.id,
        clientId: clientId || null,
        name: formData.name.trim(),
        category: 'marketing_digital', // Default category
        is_template: !clientId, // If no clientId, it's a template
        slas: {
          delivery_time: formData.defaultFrequency === 'weekly' ? '7 days' : '14 days',
          revision_rounds: 2,
          response_time: '24 hours'
        },
        pricing: {
          // Adjust pricing type based on frequency, 'one_time' services are typically not 'retainer'
          type: formData.defaultFrequency === 'one_time' ? 'one_time' : 'retainer',
          billing_cycle: formData.defaultFrequency
        },
        rules_guardrails: {
          validation_prompt: 'Revisar entregáveis conforme acordado',
          guardrails: [
            {
              category: 'approval',
              rule: formData.approvalPolicy,
              severity: 'medium'
            }
          ]
        },
        health_monitoring: {
          kpi_targets: [],
          sla_hours: {
            learning_triage: 48,
            briefing_review: 72
          }
        }
      };

      const newService = await Service.create(serviceData);
      
      let creationSuccessMessage = 'Serviço criado com sucesso!';

      // NEW: If it's a newly created one-time service for a client, generate tasks automatically
      if (clientId && formData.defaultFrequency === 'one_time') {
        try {
          const { generateTasksFromService } = await import('@/api/functions');
          const taskGeneration = await generateTasksFromService({
            serviceId: newService.id,
            autoAssign: true,
            startDate: new Date().toISOString()
          });
          
          if (taskGeneration.data?.success) {
            creationSuccessMessage = `Serviço criado com sucesso! ${taskGeneration.data.tasksCreated} tarefas foram geradas automaticamente.`;
          } else {
            // Service created, but task generation might be pending or failed without critical error
            creationSuccessMessage = 'Serviço criado com sucesso!';
            toast.info('As tarefas serão geradas em breve.'); // Inform user tasks are pending
          }
        } catch (taskError) {
          console.warn('Falha na geração automática de tarefas:', taskError);
          // Service creation itself was successful, but task generation failed
          creationSuccessMessage = 'Serviço criado com sucesso!';
          toast.warning('Erro ao gerar tarefas automaticamente. Gere manualmente se necessário.');
        }
      }

      // Log service creation
      await AuditLog.create({
        agencyId: agency.id,
        entity_type: 'Service',
        entity_id: newService.id,
        action: clientId ? 'SERVICE_CREATED' : 'SERVICE_TEMPLATE_CREATED',
        actor_id: 'current_user',
        meta_json: {
          service_name: formData.name,
          frequency: formData.defaultFrequency,
          approval_policy: formData.approvalPolicy,
          is_template: !clientId,
          client_id: clientId
        }
      });

      toast.success(creationSuccessMessage); // Use the dynamically determined success message
      onSuccess(newService);
      handleClose();

    } catch (err) {
      console.error('Service creation error:', err);
      
      let errorMessage = 'Erro ao criar serviço. Tente novamente.';
      
      if (err.message?.includes('409') || err.message?.toLowerCase().includes('duplicate')) {
        errorMessage = 'Já existe um serviço com este nome. Escolha outro nome.';
      } else if (err.message?.includes('403')) {
        errorMessage = 'Sem permissão para criar serviços. Verifique suas credenciais.';
      } else if (err.message?.includes('500')) {
        errorMessage = 'Erro interno. Nossa equipe foi notificada.';
      }
      
      setError(errorMessage);
      
      // Log error for debugging
      await AuditLog.create({
        agencyId: agency.id,
        entity_type: 'Service',
        entity_id: 'failed',
        action: 'SERVICE_CREATION_ERROR',
        actor_id: 'current_user',
        meta_json: {
          error_message: errorMessage,
          original_error: err.message,
          form_data: formData
        }
      }).catch(() => {}); // Don't fail if logging fails
      
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="sm:max-w-md"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader>
          <DialogTitle>Novo Serviço</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="service-name">
              Nome do Serviço <span className="text-red-500">*</span>
            </Label>
            <Input
              id="service-name"
              ref={nameInputRef}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Social Media, Google Ads"
              disabled={loading}
              autoComplete="off"
            />
            {formData.name.trim() && formData.name.trim().length < 2 && (
              <p className="text-xs text-red-600">Nome deve ter pelo menos 2 caracteres</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="frequency">Frequência Padrão</Label>
            <Select
              value={formData.defaultFrequency}
              onValueChange={(value) => setFormData({ ...formData, defaultFrequency: value })}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCY_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="approval">Aprovação Padrão</Label>
            <Select
              value={formData.approvalPolicy}
              onValueChange={(value) => setFormData({ ...formData, approvalPolicy: value })}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APPROVAL_POLICIES.map(policy => (
                  <SelectItem key={policy.value} value={policy.value}>
                    {policy.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={(e) => handleSubmit(e)} // Pass the event object to handleSubmit
            disabled={!isFormValid() || loading}
            className="min-w-[100px]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
