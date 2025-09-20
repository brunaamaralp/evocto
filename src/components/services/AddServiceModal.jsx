import React, { useState, useEffect } from 'react';
import { Service, CyclePlan, AuditLog, Client } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Plus, Wrench, Package, Hash, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { navigateToCycle, navigateToCustomer } from '@/components/utils/navigation';
import { format, addMonths, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const FREQUENCY_LABELS = {
  daily: 'Diário',
  weekly: 'Semanal',
  monthly: 'Mensal',
  quarterly: 'Trimestral'
};

const DeliverablePreview = ({ deliverables }) => {
  if (!deliverables || deliverables.length === 0) {
    return (
      <Card className="bg-slate-50">
        <CardContent className="pt-4 text-center">
          <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          <p className="text-sm text-slate-500">Nenhum entregável definido neste template</p>
        </CardContent>
      </Card>
    );
  }

  const totalHours = deliverables.reduce((sum, d) => sum + (d.estimated_hours || 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="w-4 h-4" />
          Entregáveis Inclusos ({deliverables.length})
        </CardTitle>
        {totalHours > 0 && (
          <p className="text-sm text-slate-500">Total estimado: {totalHours}h</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {deliverables.map(deliverable => (
            <div key={deliverable.id} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  <Hash className="w-3 h-3 mr-1" />
                  {deliverable.quantity}x {FREQUENCY_LABELS[deliverable.frequency]}
                </Badge>
                <span className="text-sm font-medium">{deliverable.name}</span>
              </div>
              {deliverable.estimated_hours > 0 && (
                <Badge variant="outline" className="text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  {deliverable.estimated_hours}h
                </Badge>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default function AddServiceModal({ isOpen, onClose, customerId, onSuccess }) {
  const { agency, user } = useSession();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [cycleFrequency, setCycleFrequency] = useState('monthly');
  const [isOneTimeService, setIsOneTimeService] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const targetDate = today.getDate() > 20 ? addMonths(today, 1) : today;
    return format(startOfMonth(targetDate), 'yyyy-MM-dd');
  });
  const [approvalPolicy, setApprovalPolicy] = useState('manual_approve');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo');

  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(customerId || '');

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      if (!isOpen || !agency?.id) return;
      
      setIsLoading(true);
      try {
        const promises = [];
        
        // Always fetch templates
        promises.push(Service.filter({ 
          agencyId: agency.id, 
          is_template: true,
          is_active: true 
        }));
        
        // Only fetch customers if customerId is not provided
        if (!customerId) {
          promises.push(Client.filter({ agencyId: agency.id }));
        } else {
          promises.push(Promise.resolve([]));
        }
        
        const [fetchedTemplates, customersData] = await Promise.all(promises);
        
        if (!cancelled) {
          setTemplates(fetchedTemplates);
          if (!customerId) {
            setCustomers(customersData);
          }
        }
      } catch (error) {
        // Silent error handling for production
        if (!cancelled) {
          setTemplates([]);
          setCustomers([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [isOpen, agency?.id, customerId]);

  useEffect(() => {
    const template = templates.find(t => t.id === selectedTemplateId);
    if (template?.pricing?.billing_cycle === 'one_time') {
      setIsOneTimeService(true);
      setCycleFrequency('');
    } else {
      setIsOneTimeService(false);
      if (cycleFrequency === '') { 
        setCycleFrequency('monthly');
      }
    }
  }, [selectedTemplateId, templates, cycleFrequency]);

  const cloneDeliverables = (templateDeliverables) => {
    if (!templateDeliverables || templateDeliverables.length === 0) {
      return [];
    }
    
    return templateDeliverables.map(deliverable => ({
      ...deliverable,
      id: `del_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      assigned_to: null,
      due_date: null,
      execution_status: 'pending',
      created_from_template: true,
      template_deliverable_id: deliverable.id
    }));
  };
  
  const handleSubmit = async () => {
    const targetCustomerId = customerId || selectedCustomerId;
    if (!selectedTemplateId || !targetCustomerId || (!isOneTimeService && !cycleFrequency) || !startDate) {
      toast.warning("Por favor, preencha todos os campos para criar o serviço.");
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(startDate) < today) {
      toast.error("A data de início do serviço não pode ser no passado.");
      return;
    }

    setIsSubmitting(true);
    const idempotencyKey = `service-create-${targetCustomerId}-${selectedTemplateId}-${Date.now()}`;
    
    try {
      const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
      if (!selectedTemplate) {
        toast.error("Template selecionado não encontrado.");
        setIsSubmitting(false);
        return;
      }

      const clonedDeliverables = cloneDeliverables(selectedTemplate.deliverables);

      const serviceContractData = {
        agencyId: agency.id,
        customerId: targetCustomerId,
        name: selectedTemplate.name.replace(' (Padrão)', ''),
        description: selectedTemplate.description,
        category: selectedTemplate.category,
        channels: selectedTemplate.channels || [],
        deliverables: clonedDeliverables,
        pricing: { ...selectedTemplate.pricing },
        is_template: false,
        is_active: true,
        cycle_frequency: isOneTimeService ? null : cycleFrequency,
        start_date: startDate,
        timezone: timezone,
        approval_policy: approvalPolicy,
      };

      const serviceContract = await Service.create(serviceContractData, { idempotencyKey });
      
      await AuditLog.create({
        agencyId: agency.id,
        entity_type: 'Service',
        entity_id: serviceContract.id,
        action: 'SERVICE_CONTRACT_CREATED',
        actor_id: user.email,
        meta_json: { 
          customerId: targetCustomerId, 
          templateId: selectedTemplateId, 
          deliverablesCloned: clonedDeliverables.length,
          idempotencyKey 
        }
      });

      if (!isOneTimeService) {
        const cycleDate = new Date(startDate);
        const cyclePlanData = {
          agencyId: agency.id,
          serviceId: serviceContract.id,
          customerId: targetCustomerId,
          cyclePeriod: format(cycleDate, 'MMM/yyyy', { locale: ptBR }),
          status: 'planning',
          planData: { 
            prioridades: [], 
            ajustesEstrategicos: {}, 
            pendenciasCliente: [],
            entregaveisPrevistos: clonedDeliverables.map(d => ({
              id: d.id,
              name: d.name,
              quantity: d.quantity,
              frequency: d.frequency,
              status: 'planned'
            }))
          },
          version: 'v1.0'
        };

        const cyclePlan = await CyclePlan.create(cyclePlanData, { idempotencyKey: `cycle-${idempotencyKey}` });
        
        await AuditLog.create({
          agencyId: agency.id,
          entity_type: 'CyclePlan',
          entity_id: cyclePlan.id,
          action: 'CYCLE_PLAN_CREATED',
          actor_id: user.email,
          meta_json: { 
            serviceId: serviceContract.id, 
            status: 'planning', 
            deliverablesIncluded: clonedDeliverables.length,
            idempotencyKey: `cycle-${idempotencyKey}` 
          }
        });

        toast.success(`Serviço criado com ${clonedDeliverables.length} entregáveis clonados do template!`);
        if (onSuccess) onSuccess();
        
        // Navigate to cycle plan
        navigate(navigateToCycle(cyclePlan.id));
      } else {
        toast.success(`Serviço criado com ${clonedDeliverables.length} entregáveis!`);
        if (onSuccess) onSuccess();
        onClose();
        
        // Navigate to customer detail to see the new service
        navigate(navigateToCustomer(targetCustomerId));
      }
      
    } catch (error) {
      toast.error("Falha ao criar serviço.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto" data-modal="add-service">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Serviço</DialogTitle>
          <DialogDescription>
            Configure um serviço para este cliente a partir de um modelo.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-24">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center p-4 bg-slate-50 rounded-lg border border-dashed">
              <h3 className="font-semibold text-slate-800 mb-2">Configure os Serviços da Sua Agência</h3>
              <p className="text-sm text-slate-600 mb-4">
                Primeiro, defina quais tipos de serviços sua agência oferece em &quot;Minha Agência &gt; Serviços Oferecidos&quot;. 
                Depois você poderá aplicá-los aos seus clientes.
              </p>
              <Button onClick={() => navigate('/my-agency')} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Ir para Minha Agência
              </Button>
            </div>
          ) : (
            <>
              {!customerId && (
                <div className="space-y-2">
                  <Label htmlFor="customer-select-modal">Cliente *</Label>
                  <Select onValueChange={setSelectedCustomerId} value={selectedCustomerId}>
                    <SelectTrigger id="customer-select-modal" aria-label="Selecionar cliente">
                      <SelectValue placeholder="Selecione um cliente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map(customer => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="service-template-modal">Tipo de Serviço *</Label>
                <Select onValueChange={setSelectedTemplateId} value={selectedTemplateId}>
                  <SelectTrigger id="service-template-modal" aria-label="Selecionar template de serviço">
                    <SelectValue placeholder="Selecione um template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name} ({template.pricing?.billing_cycle === 'one_time' ? 'Pontual' : 'Recorrente'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedTemplate && (
                <DeliverablePreview deliverables={selectedTemplate.deliverables} />
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="frequency-modal">Frequência do Ciclo *</Label>
                  <Select 
                    onValueChange={setCycleFrequency} 
                    value={cycleFrequency}
                    disabled={isOneTimeService}
                  >
                    <SelectTrigger id="frequency-modal" aria-label={isOneTimeService ? "Não aplicável para serviço pontual" : "Frequência do Ciclo"}>
                      <SelectValue placeholder={isOneTimeService ? "N/A" : "Selecione..."} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="quarterly">Trimestral</SelectItem>
                    </SelectContent>
                  </Select>
                  {isOneTimeService && <p className="text-xs text-slate-500">Não aplicável para serviços pontuais.</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start-date-modal">Data de Início *</Label>
                  <Input 
                    id="start-date-modal"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    aria-label="Data de início do serviço"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timezone-modal">Fuso Horário</Label>
                  <Input 
                    id="timezone-modal"
                    type="text"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    aria-label="Fuso horário"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="approval-policy-modal">Aprovação</Label>
                   <Select onValueChange={setApprovalPolicy} value={approvalPolicy}>
                    <SelectTrigger id="approval-policy-modal" aria-label="Política de aprovação">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual_approve">Manual</SelectItem>
                      <SelectItem value="auto_approve">Automática</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!selectedTemplateId || isSubmitting || (!customerId && !selectedCustomerId) || (!isOneTimeService && !cycleFrequency) || !startDate}
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wrench className="w-4 h-4 mr-2" />}
            Criar Serviço
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}