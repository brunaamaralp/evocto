
import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { useT } from '@/components/i18n/I18nProvider';
import { CyclePlan } from '@/api/entities';
import { Service } from '@/api/entities';
import { generateCyclePlan } from '@/api/functions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, Target, CheckCircle, Clock, AlertCircle, Zap,
  Edit, Save, X, Plus, Trash2, Eye, EyeOff, History, 
  Brain, Users, BarChart3, TrendingUp, Award, Lightbulb,
  ArrowRight, ChevronDown, ChevronRight, Sparkles, Settings,
  FileText, MessageCircle, Send, ThumbsUp, ThumbsDown,
  PlayCircle, PauseCircle, RotateCcw, Filter, Search, Briefcase
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { motion, AnimatePresence } from 'framer-motion';

// Status do planejamento
const PLANNING_STATUS = {
  draft: {
    label: 'Rascunho',
    color: 'gray',
    gradient: 'from-gray-500 to-slate-600',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-700',
    icon: Edit
  },
  ai_generated: {
    label: 'Gerado pela IA',
    color: 'blue',
    gradient: 'from-blue-500 to-cyan-600',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    icon: Sparkles
  },
  agency_review: {
    label: 'Em Revisão',
    color: 'amber',
    gradient: 'from-amber-500 to-orange-600',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    icon: Eye
  },
  pending_approval: {
    label: 'Aguardando Aprovação',
    color: 'purple',
    gradient: 'from-purple-500 to-violet-600',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    icon: Clock
  },
  approved: {
    label: 'Aprovado',
    color: 'green',
    gradient: 'from-green-500 to-emerald-600',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    icon: CheckCircle
  },
  in_execution: {
    label: 'Em Execução',
    color: 'indigo',
    gradient: 'from-indigo-500 to-blue-600',
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-700',
    icon: PlayCircle
  },
  completed: {
    label: 'Concluído',
    color: 'emerald',
    gradient: 'from-emerald-500 to-green-600',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    icon: Award
  }
};

// Tipos de entregáveis
const DELIVERABLE_TYPES = {
  marketing: {
    label: 'Marketing Digital',
    icon: TrendingUp,
    color: 'blue',
    gradient: 'from-blue-500 to-cyan-600'
  },
  content: {
    label: 'Conteúdo',
    icon: FileText,
    color: 'purple',
    gradient: 'from-purple-500 to-pink-600'
  },
  development: {
    label: 'Desenvolvimento',
    icon: Settings,
    color: 'green',
    gradient: 'from-green-500 to-emerald-600'
  },
  analysis: {
    label: 'Análise',
    icon: BarChart3,
    color: 'amber',
    gradient: 'from-amber-500 to-orange-600'
  }
};

// Componente de status visual
const PlanningStatusBadge = ({ status, withIcon = true }) => {
  const config = PLANNING_STATUS[status] || PLANNING_STATUS.draft;
  const StatusIcon = config.icon;

  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${config.bgColor} border border-opacity-50`}>
      {withIcon && <StatusIcon className={`w-4 h-4 ${config.textColor}`} />}
      <span className={`font-medium ${config.textColor}`}>
        {config.label}
      </span>
    </div>
  );
};

// Card de entregável
const DeliverableCard = ({ deliverable, onEdit, onRemove, readonly = false }) => {
  const type = DELIVERABLE_TYPES[deliverable.type] || DELIVERABLE_TYPES.marketing;
  const TypeIcon = type.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300"
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${type.gradient} flex items-center justify-center`}>
              <TypeIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">{deliverable.title}</h4>
              <Badge variant="outline" className={`mt-1 ${type.color === 'blue' ? 'border-blue-200 text-blue-700' : ''}`}>
                {type.label}
              </Badge>
            </div>
          </div>
          
          {!readonly && (
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(deliverable)}
                    className="text-gray-500 hover:text-blue-600"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Editar entregável</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(deliverable.id)}
                    className="text-gray-500 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Remover entregável</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
        
        <p className="text-gray-600 text-sm mb-4 leading-relaxed">
          {deliverable.description}
        </p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm">
            {deliverable.deadline && (
              <div className="flex items-center gap-1 text-gray-500">
                <Calendar className="w-4 h-4" />
                <span>{new Date(deliverable.deadline).toLocaleDateString('pt-BR')}</span>
              </div>
            )}
            
            {deliverable.priority && (
              <Badge 
                className={`
                  ${deliverable.priority === 'high' ? 'bg-red-100 text-red-700 border-red-200' : ''}
                  ${deliverable.priority === 'medium' ? 'bg-amber-100 text-amber-700 border-amber-200' : ''}
                  ${deliverable.priority === 'low' ? 'bg-green-100 text-green-700 border-green-200' : ''}
                `}
              >
                {deliverable.priority === 'high' ? 'Alta' : 
                 deliverable.priority === 'medium' ? 'Média' : 'Baixa'} Prioridade
              </Badge>
            )}
          </div>
          
          {deliverable.estimatedHours && (
            <div className="text-sm text-gray-500">
              {deliverable.estimatedHours}h estimadas
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Modal para edição de entregável
const DeliverableModal = ({ deliverable, open, onClose, onSave }) => {
  const [formData, setFormData] = useState(deliverable || {
    title: '',
    description: '',
    type: 'marketing',
    priority: 'medium',
    deadline: '',
    estimatedHours: ''
  });

  useEffect(() => {
    if (deliverable) {
      setFormData(deliverable);
    }
  }, [deliverable]);

  const handleSave = () => {
    if (!formData.title || !formData.description) {
      toast.error('Título e descrição são obrigatórios');
      return;
    }
    
    onSave(formData);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Target className="w-6 h-6 text-blue-600" />
            {deliverable ? 'Editar Entregável' : 'Novo Entregável'}
          </DialogTitle>
          <DialogDescription>
            Configure os detalhes do entregável para este ciclo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Título do Entregável
              </label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Nome do entregável..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo
              </label>
              <Select 
                value={formData.type} 
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DELIVERABLE_TYPES).map(([key, type]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <type.icon className="w-4 h-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição
            </label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descreva o entregável e seus objetivos..."
              rows={4}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prioridade
              </label>
              <Select 
                value={formData.priority} 
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prazo
              </label>
              <Input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Horas Estimadas
              </label>
              <Input
                type="number"
                value={formData.estimatedHours}
                onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              {deliverable ? 'Atualizar' : 'Criar'} Entregável
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Componente principal
export default function PlanningTab({ client }) {
  const { agencyId } = useSession();
  const [currentPlan, setCurrentPlan] = useState(null);
  const [plans, setPlans] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showDeliverableModal, setShowDeliverableModal] = useState(false);
  const [editingDeliverable, setEditingDeliverable] = useState(null);
  const [filters, setFilters] = useState({
    period: 'current',
    status: 'all',
    type: 'all'
  });

  // Carregar dados iniciais
  const loadData = useCallback(async () => {
    if (!client?.id || !agencyId) return;

    try {
      setLoading(true);
      
      const [clientServices, clientPlans] = await Promise.all([
        Service.filter({ agencyId, clientId: client.id }),
        CyclePlan.filter({ agencyId, clientId: client.id }, '-updated_date', 20)
      ]);

      setServices(clientServices);
      setPlans(clientPlans);
      
      // Encontrar plano atual (mais recente)
      const current = clientPlans.find(p => 
        p.status === 'draft' || p.status === 'pending_approval' || p.status === 'in_execution'
      ) || clientPlans[0];
      
      setCurrentPlan(current);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados do planejamento');
    } finally {
      setLoading(false);
    }
  }, [client?.id, agencyId]);

  // Gerar novo planejamento com IA
  const generateNewPlan = async (serviceId) => {
    if (!serviceId) {
      toast.error('Selecione um serviço para gerar o planejamento');
      return;
    }

    setGenerating(true);
    try {
      const targetPeriod = `${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`;
      
      const response = await generateCyclePlan({
        serviceId,
        targetPeriod,
        mode: 'generate'
      });

      if (response.success) {
        toast.success('Planejamento gerado com sucesso!');
        await loadData(); // Recarregar dados
      } else {
        throw new Error(response.error || 'Falha na geração do planejamento');
      }
    } catch (error) {
      console.error('Erro na geração:', error);
      toast.error('Erro ao gerar planejamento');
    } finally {
      setGenerating(false);
    }
  };

  // Salvar alterações no planejamento
  const savePlanChanges = async (updatedData) => {
    if (!currentPlan) return;

    try {
      await CyclePlan.update(currentPlan.id, {
        planData: {
          ...currentPlan.planData,
          ...updatedData
        }
      });

      toast.success('Planejamento atualizado com sucesso');
      loadData();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar alterações');
    }
  };

  // Alterar status do planejamento
  const changeStatus = async (newStatus) => {
    if (!currentPlan) return;

    try {
      await CyclePlan.update(currentPlan.id, { status: newStatus });
      toast.success('Status atualizado com sucesso');
      loadData();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast.error('Erro ao alterar status');
    }
  };

  // Gerenciar entregáveis
  const handleSaveDeliverable = (deliverableData) => {
    const deliverables = currentPlan?.planData?.deliverables || [];
    
    if (editingDeliverable) {
      // Editar existente
      const updatedDeliverables = deliverables.map(d => 
        d.id === editingDeliverable.id ? { ...deliverableData, id: d.id } : d
      );
      savePlanChanges({ deliverables: updatedDeliverables });
    } else {
      // Criar novo
      const newDeliverable = {
        ...deliverableData,
        id: `deliverable_${Date.now()}`
      };
      savePlanChanges({ deliverables: [...deliverables, newDeliverable] });
    }
    
    setEditingDeliverable(null);
  };

  const removeDeliverable = (deliverableId) => {
    const updatedDeliverables = (currentPlan?.planData?.deliverables || []).filter(
      d => d.id !== deliverableId
    );
    savePlanChanges({ deliverables: updatedDeliverables });
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center py-20"
      >
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-4"
          />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Carregando Planejamento</h3>
          <p className="text-gray-600">Preparando dados do ciclo...</p>
        </div>
      </motion.div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto p-6">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <Calendar className="w-8 h-8 text-white" />
                  </div>
                  
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                      Planejamento do Mês
                    </h1>
                    <p className="text-gray-600 mt-1 text-lg">
                      {client?.company || client?.name}
                    </p>
                    {currentPlan && (
                      <div className="flex items-center gap-3 mt-3">
                        <PlanningStatusBadge status={currentPlan.status} />
                        <span className="text-sm text-gray-500">
                          {currentPlan.cyclePeriod}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
                  {/* Ações baseadas no status */}
                  {!currentPlan && services.length > 0 && (
                    <div className="flex items-center gap-3">
                      <Select onValueChange={generateNewPlan}>
                        <SelectTrigger className="w-64">
                          <SelectValue placeholder="Gerar planejamento para..." />
                        </SelectTrigger>
                        <SelectContent>
                          {services.map(service => (
                            <SelectItem key={service.id} value={service.id}>
                              {service.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      {generating && (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <Sparkles className="w-6 h-6 text-blue-600" />
                        </motion.div>
                      )}
                    </div>
                  )}
                  
                  {currentPlan && (
                    <div className="flex items-center gap-3">
                      {currentPlan.status === 'draft' && (
                        <Button
                          onClick={() => changeStatus('agency_review')}
                          className="bg-gradient-to-r from-blue-500 to-blue-600"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Revisar Planejamento
                        </Button>
                      )}
                      
                      {currentPlan.status === 'agency_review' && (
                        <Button
                          onClick={() => changeStatus('pending_approval')}
                          className="bg-gradient-to-r from-purple-500 to-purple-600"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Enviar para Aprovação
                        </Button>
                      )}
                      
                      {currentPlan.status === 'approved' && (
                        <Button
                          onClick={() => changeStatus('in_execution')}
                          className="bg-gradient-to-r from-green-500 to-green-600"
                        >
                          <PlayCircle className="w-4 h-4 mr-2" />
                          Iniciar Execução
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {currentPlan ? (
            <div className="space-y-8">
              {/* Resumo do Planejamento */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="shadow-xl border-0">
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl flex items-center justify-center">
                        <Target className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl">Objetivo Principal</CardTitle>
                        <p className="text-gray-600">Meta estratégica para este ciclo</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100">
                      <p className="text-lg text-gray-800 leading-relaxed">
                        {currentPlan.planData?.mudancaChave || 'Objetivo não definido'}
                      </p>
                      
                      {currentPlan.planData?.expectativas && (
                        <div className="mt-4 flex items-center gap-2 text-green-700">
                          <TrendingUp className="w-5 h-5" />
                          <span className="font-medium">
                            {currentPlan.planData.expectativas}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Entregáveis */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="shadow-xl border-0">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                          <BarChart3 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-2xl">Entregáveis do Ciclo</CardTitle>
                          <p className="text-gray-600">Deliveries e ações prioritárias</p>
                        </div>
                      </div>
                      
                      {currentPlan.status === 'draft' || currentPlan.status === 'agency_review' ? (
                        <Button
                          onClick={() => {
                            setEditingDeliverable(null);
                            setShowDeliverableModal(true);
                          }}
                          className="bg-gradient-to-r from-blue-500 to-blue-600"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Adicionar Entregável
                        </Button>
                      ) : null}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <AnimatePresence>
                        {(currentPlan.planData?.deliverables || currentPlan.planData?.prioridades || []).map((item, index) => {
                          // Converter formato antigo para novo se necessário
                          const deliverable = typeof item === 'string' ? {
                            id: `priority_${index}`,
                            title: item,
                            description: 'Prioridade do planejamento',
                            type: 'marketing',
                            priority: 'medium'
                          } : item;

                          return (
                            <DeliverableCard
                              key={deliverable.id || index}
                              deliverable={deliverable}
                              onEdit={setEditingDeliverable}
                              onRemove={removeDeliverable}
                              readonly={currentPlan.status !== 'draft' && currentPlan.status !== 'agency_review'}
                            />
                          );
                        })}
                      </AnimatePresence>
                      
                      {(!currentPlan.planData?.deliverables || currentPlan.planData.deliverables.length === 0) && 
                       (!currentPlan.planData?.prioridades || currentPlan.planData.prioridades.length === 0) && (
                        <div className="col-span-full text-center py-12">
                          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Target className="w-12 h-12 text-gray-400" />
                          </div>
                          <h3 className="text-xl font-semibold text-gray-700 mb-2">
                            Nenhum entregável definido
                          </h3>
                          <p className="text-gray-500 mb-6">
                            Adicione entregáveis para estruturar o planejamento do ciclo
                          </p>
                          <Button
                            onClick={() => {
                              setEditingDeliverable(null);
                              setShowDeliverableModal(true);
                            }}
                            className="bg-gradient-to-r from-blue-500 to-blue-600"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Adicionar Primeiro Entregável
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Sugestões da IA */}
              {currentPlan.planData?.sugestoesIA && currentPlan.planData.sugestoesIA.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Card className="shadow-xl border-0">
                    <CardHeader>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                          <Lightbulb className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-2xl">Sugestões da IA</CardTitle>
                          <p className="text-gray-600">Recomendações baseadas em dados históricos</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {currentPlan.planData.sugestoesIA.map((sugestao, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100"
                          >
                            <div className="flex items-start gap-4">
                              <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                                <Sparkles className="w-4 h-4 text-white" />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 mb-2">
                                  {typeof sugestao === 'string' ? sugestao : sugestao.hipotese}
                                </h4>
                                {typeof sugestao === 'object' && (
                                  <>
                                    {sugestao.teste && (
                                      <p className="text-sm text-gray-600 mb-2">
                                        <strong>Como testar:</strong> {sugestao.teste}
                                      </p>
                                    )}
                                    {sugestao.metrica_sucesso && (
                                      <p className="text-sm text-green-700">
                                        <strong>Métrica de sucesso:</strong> {sugestao.metrica_sucesso}
                                      </p>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20"
            >
              <div className="w-32 h-32 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-8">
                <Calendar className="w-16 h-16 text-blue-500" />
              </div>
              <h3 className="text-3xl font-bold text-gray-800 mb-4">
                Nenhum planejamento ativo
              </h3>
              <p className="text-gray-600 mb-8 text-lg">
                {services.length === 0 
                  ? 'Configure um serviço para este cliente antes de gerar planejamentos'
                  : 'Gere um novo planejamento usando IA baseado nos serviços configurados'
                }
              </p>
              
              {services.length > 0 && (
                <div className="max-w-md mx-auto">
                  <Select onValueChange={generateNewPlan}>
                    <SelectTrigger className="text-left">
                      <SelectValue placeholder="Selecione um serviço para gerar planejamento" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map(service => (
                        <SelectItem key={service.id} value={service.id}>
                          <div className="flex items-center gap-3">
                            <Briefcase className="w-4 h-4" />
                            <span>{service.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Modais */}
        <DeliverableModal
          deliverable={editingDeliverable}
          open={showDeliverableModal}
          onClose={() => {
            setShowDeliverableModal(false);
            setEditingDeliverable(null);
          }}
          onSave={handleSaveDeliverable}
        />
      </div>
    </TooltipProvider>
  );
}
