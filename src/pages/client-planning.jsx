import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { useT } from '@/components/i18n/I18nProvider';
import { Client } from '@/api/entities';
import { Service } from '@/api/entities';
import { CyclePlan } from '@/api/entities';
import { LearningEntry } from '@/api/entities';
import { generateCyclePlan } from '@/api/functions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, Clock, Plus, Filter, Search, Bell, Users,
  CheckCircle, AlertCircle, TrendingUp, TrendingDown,
  BarChart3, Target, Zap, Brain, Award, ArrowRight,
  User, Building, Briefcase, PlayCircle, PauseCircle,
  Settings, Eye, Edit, FileText, MessageCircle, Lightbulb,
  ChevronRight, ChevronDown, MoreHorizontal, Star,
  Activity, DollarSign, Timer, Sparkles, Send, ThumbsUp,
  ThumbsDown, History, RotateCcw, Save, X, Mail
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
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-700',
    icon: Edit
  },
  ai_generated: {
    label: 'Gerado pela IA',
    color: 'blue',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    icon: Sparkles
  },
  under_review: {
    label: 'Em Revisão',
    color: 'amber',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-700',
    icon: Eye
  },
  pending_approval: {
    label: 'Aguardando Aprovação',
    color: 'purple',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-700',
    icon: Clock
  },
  approved: {
    label: 'Aprovado',
    color: 'green',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-700',
    icon: CheckCircle
  },
  rejected: {
    label: 'Rejeitado',
    color: 'red',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-700',
    icon: X
  }
};

// Prioridades dos entregáveis
const PRIORITY_LEVELS = {
  low: { 
    label: 'Baixa', 
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
    icon: '●'
  },
  medium: { 
    label: 'Média', 
    color: 'yellow',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-700',
    icon: '●●'
  },
  high: { 
    label: 'Alta', 
    color: 'orange',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-700',
    icon: '●●●'
  },
  urgent: { 
    label: 'Urgente', 
    color: 'red',
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
    icon: '●●●●'
  }
};

// Status das tarefas
const TASK_STATUS = {
  pending: { label: 'Pendente', color: 'bg-gray-100 text-gray-700', icon: Clock },
  in_progress: { label: 'Em Andamento', color: 'bg-blue-100 text-blue-700', icon: PlayCircle },
  completed: { label: 'Concluída', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  blocked: { label: 'Bloqueada', color: 'bg-red-100 text-red-700', icon: AlertCircle }
};

// Componente de status visual
const StatusBadge = ({ status, withIcon = true }) => {
  const config = PLANNING_STATUS[status] || PLANNING_STATUS.draft;
  const StatusIcon = config.icon;

  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${config.bgColor} ${config.borderColor} border`}>
      {withIcon && <StatusIcon className={`w-4 h-4 ${config.textColor}`} />}
      <span className={`font-medium ${config.textColor}`}>
        {config.label}
      </span>
    </div>
  );
};

// Card de entregável
const DeliverableCard = ({ deliverable, onEdit, onAddComment, readonly = false, comments = [] }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedDeliverable, setEditedDeliverable] = useState(deliverable);
  const [newComment, setNewComment] = useState('');

  const priority = PRIORITY_LEVELS[deliverable.priority] || PRIORITY_LEVELS.medium;

  const handleSave = () => {
    onEdit(editedDeliverable);
    setIsEditing(false);
    toast.success('Entregável atualizado com sucesso!');
  };

  const handleAddComment = () => {
    if (newComment.trim()) {
      onAddComment(deliverable.id, newComment);
      setNewComment('');
      toast.success('Comentário adicionado!');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short'
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300"
    >
      <div className="p-6">
        {/* Header do entregável */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            {isEditing ? (
              <Input
                value={editedDeliverable.title}
                onChange={(e) => setEditedDeliverable({
                  ...editedDeliverable, 
                  title: e.target.value
                })}
                className="text-lg font-semibold mb-2"
              />
            ) : (
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {deliverable.title}
              </h3>
            )}
            
            <div className="flex items-center gap-3 mb-3">
              <Badge className={`${priority.bgColor} ${priority.textColor} border-0`}>
                <span className="mr-1">{priority.icon}</span>
                {priority.label}
              </Badge>
              
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(deliverable.deadline)}</span>
              </div>

              {deliverable.objective && (
                <Badge variant="outline">
                  {deliverable.objective}
                </Badge>
              )}
            </div>

            {isEditing ? (
              <Textarea
                value={editedDeliverable.description}
                onChange={(e) => setEditedDeliverable({
                  ...editedDeliverable, 
                  description: e.target.value
                })}
                className="mb-3"
                rows={3}
              />
            ) : (
              <p className="text-gray-600 mb-3 leading-relaxed">
                {deliverable.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 ml-4">
            {!readonly && (
              <>
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={handleSave}>
                      <Save className="w-4 h-4 mr-1" />
                      Salvar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                    <Edit className="w-4 h-4 mr-1" />
                    Revisar
                  </Button>
                )}
              </>
            )}
            
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Insights da IA */}
        {deliverable.aiInsights && (
          <div className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-200">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-600 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="font-medium text-blue-900 mb-1">Insights da IA</h4>
                <p className="text-sm text-blue-800">
                  {deliverable.aiInsights}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Seção expandida */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="pt-4 border-t border-gray-200"
            >
              {/* Comentários */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Comentários
                </h4>
                
                <div className="space-y-3 mb-4">
                  {comments.map((comment, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {comment.author.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm text-gray-900">
                              {comment.author}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDate(comment.date)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">
                            {comment.text}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {!readonly && (
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">EU</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                      <Textarea
                        placeholder="Adicionar comentário..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        rows={2}
                      />
                      <div className="flex justify-end">
                        <Button size="sm" onClick={handleAddComment}>
                          Comentar
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// Card de tarefa
const TaskCard = ({ task, onStatusChange }) => {
  const status = TASK_STATUS[task.status] || TASK_STATUS.pending;
  const StatusIcon = status.icon;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 mb-1">{task.title}</h4>
          <p className="text-sm text-gray-600 mb-2">{task.description}</p>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <User className="w-4 h-4" />
              {task.assignee}
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {new Date(task.deadline).toLocaleDateString('pt-BR')}
            </div>
          </div>
        </div>
        <Select
          value={task.status}
          onValueChange={(value) => onStatusChange(task.id, value)}
        >
          <SelectTrigger className="w-32">
            <div className={`flex items-center gap-2 ${status.color}`}>
              <StatusIcon className="w-4 h-4" />
              <span className="text-xs">{status.label}</span>
            </div>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(TASK_STATUS).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {config.label}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

// Componente principal
export default function ClientPlanningPage() {
  const session = useSession();
  const t = useT();
  
  // Estados principais
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState(null);
  const [service, setService] = useState(null);
  const [planData, setPlanData] = useState(null);
  const [planStatus, setPlanStatus] = useState('ai_generated');
  const [tasks, setTasks] = useState([]);
  const [comments, setComments] = useState({});
  const [feedbackText, setFeedbackText] = useState('');
  
  // Estados de UI
  const [isGenerating, setIsGenerating] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  
  // Simular dados do cliente (em produção viria de parâmetros da URL)
  useEffect(() => {
    const loadClientData = async () => {
      try {
        setLoading(true);
        
        // Simular carregamento dos dados
        setTimeout(() => {
          setClient({
            id: '1',
            name: 'Loja Virtual ABC',
            email: 'contato@lojavirtual.com',
            industry: 'E-commerce'
          });
          
          setService({
            id: '1',
            name: 'Marketing Digital Completo',
            category: 'marketing_digital'
          });
          
          // Simular planejamento gerado pela IA
          setPlanData({
            id: '1',
            cyclePeriod: 'Maio 2024',
            objective: 'Aumentar vendas online em 15%',
            deliverables: [
              {
                id: '1',
                title: 'Campanha de Marketing Digital',
                description: 'Criação e lançamento de campanha segmentada no Facebook e Instagram para aumentar o alcance e conversões.',
                priority: 'high',
                deadline: '2024-05-15',
                objective: 'Aumentar vendas',
                aiInsights: 'Baseado nos aprendizados anteriores, campanhas segmentadas por idade (25-45 anos) e interesse em produtos sustentáveis resultaram em 23% mais conversões. Recomendamos aplicar essa segmentação.',
                category: 'marketing'
              },
              {
                id: '2',
                title: 'Otimização do Layout da Loja',
                description: 'Ajustes no design da página inicial e de produtos para melhorar a experiência do usuário e taxa de conversão.',
                priority: 'medium',
                deadline: '2024-05-20',
                objective: 'Melhorar UX',
                aiInsights: 'Análises de heatmap anteriores mostraram que 67% dos usuários não rolam além da primeira dobra. Sugerimos otimizar o layout superior com produtos em destaque.',
                category: 'design'
              },
              {
                id: '3',
                title: 'Estratégia de E-mail Marketing',
                description: 'Desenvolvimento de sequência de e-mails automatizada para nutrição de leads e recuperação de carrinho abandonado.',
                priority: 'medium',
                deadline: '2024-05-25',
                objective: 'Aumentar retenção',
                aiInsights: 'E-mails de carrinho abandonado com desconto de 10% enviados após 2 horas tiveram taxa de conversão de 18% nos últimos ciclos. Vamos aplicar essa estratégia.',
                category: 'email'
              }
            ],
            confidence: 87,
            aiRationale: 'Este planejamento foi gerado considerando o histórico de 6 ciclos anteriores, briefing atualizado e 12 aprendizados relevantes da biblioteca da agência.'
          });
          
          setComments({
            '1': [
              {
                id: '1',
                author: 'Maria Silva (Agência)',
                date: '2024-05-01',
                text: 'Excelente sugestão da IA. Vamos incluir também testes A/B nos criativos.'
              }
            ],
            '2': [],
            '3': [
              {
                id: '2',
                author: 'João Santos (Cliente)',
                date: '2024-05-02',
                text: 'Gostaria de revisar os templates de e-mail antes da implementação.'
              }
            ]
          });
          
          setLoading(false);
        }, 1500);
        
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setLoading(false);
      }
    };

    loadClientData();
  }, []);

  // Funções de ação
  const handleEditDeliverable = (editedDeliverable) => {
    setPlanData(prev => ({
      ...prev,
      deliverables: prev.deliverables.map(d => 
        d.id === editedDeliverable.id ? editedDeliverable : d
      )
    }));
    setPlanStatus('under_review');
  };

  const handleAddComment = (deliverableId, commentText) => {
    const newComment = {
      id: Date.now().toString(),
      author: 'Usuário Atual',
      date: new Date().toISOString(),
      text: commentText
    };

    setComments(prev => ({
      ...prev,
      [deliverableId]: [...(prev[deliverableId] || []), newComment]
    }));
  };

  const handleSendForApproval = async () => {
    setIsGenerating(true);
    
    // Simular envio
    setTimeout(() => {
      setPlanStatus('pending_approval');
      setIsGenerating(false);
      toast.success('Planejamento enviado para aprovação do cliente!');
    }, 2000);
  };

  const handleGenerateTasks = async () => {
    if (planStatus !== 'approved') {
      toast.error('O planejamento precisa estar aprovado para gerar tarefas.');
      return;
    }

    setIsGenerating(true);
    
    // Simular geração de tarefas
    setTimeout(() => {
      const generatedTasks = planData.deliverables.flatMap(deliverable => [
        {
          id: `task_${deliverable.id}_1`,
          deliverableId: deliverable.id,
          title: `Criar briefing para: ${deliverable.title}`,
          description: 'Desenvolver briefing detalhado com especificações técnicas',
          assignee: 'Maria Silva',
          deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending'
        },
        {
          id: `task_${deliverable.id}_2`,
          deliverableId: deliverable.id,
          title: `Executar: ${deliverable.title}`,
          description: 'Implementar conforme especificações do planejamento',
          assignee: 'João Santos',
          deadline: deliverable.deadline,
          status: 'pending'
        }
      ]);
      
      setTasks(generatedTasks);
      setIsGenerating(false);
      toast.success(`${generatedTasks.length} tarefas geradas com sucesso!`);
    }, 2000);
  };

  const handleTaskStatusChange = (taskId, newStatus) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, status: newStatus } : task
    ));
    toast.success('Status da tarefa atualizado!');
  };

  const handleApprovalAction = (action) => {
    if (action === 'approve') {
      setPlanStatus('approved');
      toast.success('Planejamento aprovado pelo cliente!');
    } else {
      setPlanStatus('rejected');
      toast.error('Planejamento rejeitado. Revisão necessária.');
    }
    setShowApprovalDialog(false);
  };

  // Função para obter botões de ação baseados no status
  const getActionButtons = () => {
    switch (planStatus) {
      case 'ai_generated':
      case 'under_review':
        return (
          <Button onClick={handleSendForApproval} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Timer className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Enviar para Aprovação
              </>
            )}
          </Button>
        );
      
      case 'pending_approval':
        return (
          <div className="flex items-center gap-3">
            <Badge className="bg-purple-100 text-purple-700">
              <Clock className="w-4 h-4 mr-1" />
              Aguardando aprovação do cliente
            </Badge>
            <Button variant="outline" onClick={() => setShowApprovalDialog(true)}>
              Simular Aprovação
            </Button>
          </div>
        );
      
      case 'approved':
        return (
          <Button onClick={handleGenerateTasks} disabled={isGenerating || tasks.length > 0}>
            {isGenerating ? (
              <>
                <Timer className="w-4 h-4 mr-2 animate-spin" />
                Gerando Tarefas...
              </>
            ) : tasks.length > 0 ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Tarefas Geradas
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Gerar Tarefas
              </>
            )}
          </Button>
        );
      
      case 'rejected':
        return (
          <Button variant="outline" onClick={() => setPlanStatus('under_review')}>
            <Edit className="w-4 h-4 mr-2" />
            Revisar Planejamento
          </Button>
        );
      
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando planejamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Planejamento - {client?.name}
              </h1>
              <div className="flex items-center gap-4">
                <StatusBadge status={planStatus} />
                {planData && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{planData.cyclePeriod}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {getActionButtons()}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Objetivo e Confiança da IA */}
        {planData && (
          <div className="mb-8">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl text-blue-900 mb-2">
                      {planData.objective}
                    </CardTitle>
                    <p className="text-gray-600">
                      {planData.aiRationale}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-blue-600 mb-1">
                      {planData.confidence}%
                    </div>
                    <div className="text-sm text-gray-500">
                      Confiança da IA
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Entregáveis */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Target className="w-5 h-5" />
                Entregáveis Sugeridos pela IA
              </h2>
              
              <div className="space-y-6">
                {planData?.deliverables.map(deliverable => (
                  <DeliverableCard
                    key={deliverable.id}
                    deliverable={deliverable}
                    onEdit={handleEditDeliverable}
                    onAddComment={handleAddComment}
                    comments={comments[deliverable.id] || []}
                    readonly={planStatus === 'approved'}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar com informações e tarefas */}
          <div className="space-y-6">
            {/* Informações do Cliente */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Informações do Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="font-medium text-gray-900">Nome:</span>
                  <p className="text-gray-600">{client?.name}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-900">E-mail:</span>
                  <p className="text-gray-600">{client?.email}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-900">Setor:</span>
                  <p className="text-gray-600">{client?.industry}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-900">Serviço:</span>
                  <p className="text-gray-600">{service?.name}</p>
                </div>
              </CardContent>
            </Card>

            {/* Histórico de Alterações */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Histórico
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                    <div>
                      <p className="font-medium">Planejamento gerado pela IA</p>
                      <p className="text-gray-500">Hoje às 09:30</p>
                    </div>
                  </div>
                  {planStatus === 'under_review' && (
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-amber-500 mt-2"></div>
                      <div>
                        <p className="font-medium">Em revisão pela agência</p>
                        <p className="text-gray-500">Hoje às 10:15</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tarefas Geradas */}
            {tasks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Tarefas ({tasks.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {tasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onStatusChange={handleTaskStatusChange}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Dialog de Aprovação (Simulação) */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Simular Aprovação do Cliente</DialogTitle>
            <DialogDescription>
              Esta é uma simulação da interface que o cliente veria para aprovar o planejamento.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Feedback do Cliente (opcional)
              </label>
              <Textarea
                placeholder="Comentários sobre o planejamento..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                rows={3}
              />
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                onClick={() => handleApprovalAction('approve')}
                className="bg-green-600 hover:bg-green-700"
              >
                <ThumbsUp className="w-4 h-4 mr-2" />
                Aprovar Planejamento
              </Button>
              <Button 
                variant="outline"
                onClick={() => handleApprovalAction('reject')}
                className="border-red-300 text-red-700 hover:bg-red-50"
              >
                <ThumbsDown className="w-4 h-4 mr-2" />
                Solicitar Alterações
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}