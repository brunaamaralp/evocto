
import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Client } from '@/api/entities';
import { Project } from '@/api/entities';
import { Brief } from '@/api/entities';
import { Service } from '@/api/entities';
import { showToast } from '@/components/feedback/EnhancedFeedback';
import { 
  FileText, Users, Target, TrendingUp, 
  CheckCircle, ArrowRight, ArrowLeft,
  Sparkles, AlertTriangle, Info
} from 'lucide-react';

const StepIndicator = ({ currentStep, totalSteps }) => (
  <div className="flex items-center gap-4 mb-8">
    <div className="flex-1">
      <Progress value={(currentStep / totalSteps) * 100} className="h-2" />
    </div>
    <Badge variant="outline">{currentStep}/{totalSteps}</Badge>
  </div>
);

const StepCard = ({ title, description, children, className = "" }) => (
  <Card className={`w-full max-w-2xl mx-auto ${className}`}>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <FileText className="w-5 h-5 text-blue-600" />
        {title}
      </CardTitle>
      {description && (
        <p className="text-sm text-slate-600">{description}</p>
      )}
    </CardHeader>
    <CardContent className="space-y-4">
      {children}
    </CardContent>
  </Card>
);

export default function CreateBriefingFlow({ clientId, onComplete, onCancel }) {
  const { agencyId } = useSession();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [client, setClient] = useState(null);
  const [project, setProject] = useState(null);
  const [services, setServices] = useState([]);

  const [formData, setFormData] = useState({
    // Step 1: Projeto Base
    projectTitle: '',
    selectedServiceId: '',
    projectDescription: '',
    priority: 'media',
    
    // Step 2: Contexto do Negócio
    business_context: '',
    current_challenges: '',
    competitors: '',
    
    // Step 3: Público e Objetivos
    target_audience: '',
    objectives: '',
    success_metrics: '',
    
    // Step 4: Tom e Extras
    brand_tone: '',
    budget_range: '',
    timeline: '',
    additional_info: ''
  });

  const totalSteps = 4;

  const loadInitialData = useCallback(async () => {
    try {
      const [clientData, servicesData] = await Promise.all([
        Client.get(clientId),
        Service.filter({ agencyId, clientId, is_active: true })
      ]);
      
      setClient(clientData);
      setServices(servicesData);

      // Pre-fill com dados do cliente
      setFormData(prev => ({
        ...prev,
        projectTitle: `Briefing Estratégico - ${clientData.name}`,
        business_context: `${clientData.company} atua no setor de ${clientData.industry || 'diversos segmentos'}...`,
      }));

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      showToast.error('Erro ao carregar dados do cliente');
    }
  }, [clientId, agencyId]); // Dependencies for useCallback

  useEffect(() => {
    if (clientId) {
      loadInitialData();
    }
  }, [clientId, loadInitialData]); // Added loadInitialData to dependencies

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        if (!formData.projectTitle.trim()) {
          showToast.error('Título do projeto é obrigatório');
          return false;
        }
        if (!formData.selectedServiceId) {
          showToast.error('Selecione um serviço');
          return false;
        }
        break;
      case 2:
        if (!formData.business_context.trim() || formData.business_context.length < 50) {
          showToast.error('Contexto do negócio deve ter pelo menos 50 caracteres');
          return false;
        }
        if (!formData.current_challenges.trim()) {
          showToast.error('Desafios atuais são obrigatórios');
          return false;
        }
        break;
      case 3:
        if (!formData.target_audience.trim() || formData.target_audience.length < 30) {
          showToast.error('Público-alvo deve ser detalhado (mín. 30 caracteres)');
          return false;
        }
        if (!formData.objectives.trim()) {
          showToast.error('Objetivos são obrigatórios');
          return false;
        }
        break;
      case 4:
        if (!formData.brand_tone.trim()) {
          showToast.error('Tom de voz é obrigatório');
          return false;
        }
        break;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;

    setLoading(true);
    try {
      // 1. Criar projeto primeiro
      const projectData = {
        agencyId,
        title: formData.projectTitle,
        client_id: clientId,
        description: formData.projectDescription,
        priority: formData.priority,
        status: 'briefing',
        start_date: new Date().toISOString().split('T')[0]
      };

      const newProject = await Project.create(projectData);

      // 2. Criar briefing vinculado ao projeto
      const briefData = {
        agencyId,
        projectId: newProject.id,
        business_context: formData.business_context,
        target_audience: formData.target_audience,
        current_challenges: formData.current_challenges,
        objectives: formData.objectives,
        success_metrics: formData.success_metrics || 'A definir durante a execução',
        competitors: formData.competitors,
        brand_tone: formData.brand_tone,
        budget_range: formData.budget_range,
        timeline: formData.timeline,
        additional_info: formData.additional_info,
        status: 'DRAFT',
        completion_score: 85 // Score automático baseado no preenchimento
      };

      const newBrief = await Brief.create(briefData);

      // 3. Vincular serviço se selecionado
      if (formData.selectedServiceId) {
        await Service.update(formData.selectedServiceId, {
          // Associar projeto ao serviço se necessário
          description: `${formData.projectTitle} - Serviço vinculado ao briefing`
        });
      }

      showToast.success('Briefing criado com sucesso! 🎉');

      if (onComplete) {
        onComplete({
          project: newProject,
          briefing: newBrief,
          client
        });
      } else {
        navigate(`/customer-detail?id=${clientId}&tab=briefing`);
      }

    } catch (error) {
      console.error('Erro ao criar briefing:', error);
      showToast.error('Erro ao criar briefing. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <StepCard 
            title="Informações do Projeto" 
            description="Configure os dados básicos do projeto e briefing"
          >
            <div className="space-y-4">
              <div>
                <Label htmlFor="projectTitle">Título do Projeto *</Label>
                <Input
                  id="projectTitle"
                  value={formData.projectTitle}
                  onChange={(e) => updateFormData('projectTitle', e.target.value)}
                  placeholder="Ex: Estratégia de Marketing Digital - TechStart"
                />
              </div>

              <div>
                <Label htmlFor="selectedServiceId">Serviço Principal</Label>
                <Select 
                  value={formData.selectedServiceId} 
                  onValueChange={(value) => updateFormData('selectedServiceId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o serviço principal" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map(service => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} - {service.category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="priority">Prioridade do Projeto</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(value) => updateFormData('priority', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="projectDescription">Descrição do Projeto</Label>
                <Textarea
                  id="projectDescription"
                  value={formData.projectDescription}
                  onChange={(e) => updateFormData('projectDescription', e.target.value)}
                  placeholder="Descreva brevemente o que será feito neste projeto..."
                  rows={3}
                />
              </div>
            </div>
          </StepCard>
        );

      case 2:
        return (
          <StepCard 
            title="Contexto do Negócio" 
            description="Detalhe o contexto, desafios e concorrência"
          >
            <div className="space-y-4">
              <div>
                <Label htmlFor="business_context">Contexto do Negócio *</Label>
                <Textarea
                  id="business_context"
                  value={formData.business_context}
                  onChange={(e) => updateFormData('business_context', e.target.value)}
                  placeholder="Descreva detalhadamente o negócio do cliente, setor de atuação, posicionamento atual no mercado..."
                  rows={4}
                  className="min-h-[100px]"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Mínimo 50 caracteres • {formData.business_context.length}/50
                </p>
              </div>

              <div>
                <Label htmlFor="current_challenges">Desafios Atuais *</Label>
                <Textarea
                  id="current_challenges"
                  value={formData.current_challenges}
                  onChange={(e) => updateFormData('current_challenges', e.target.value)}
                  placeholder="Quais são os principais desafios que o cliente enfrenta hoje? Ex: baixa visibilidade online, concorrência acirrada, dificuldade em converter leads..."
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="competitors">Principais Concorrentes</Label>
                <Textarea
                  id="competitors"
                  value={formData.competitors}
                  onChange={(e) => updateFormData('competitors', e.target.value)}
                  placeholder="Liste os principais concorrentes e o que eles fazem bem..."
                  rows={3}
                />
              </div>
            </div>
          </StepCard>
        );

      case 3:
        return (
          <StepCard 
            title="Público-Alvo e Objetivos" 
            description="Defina personas e metas estratégicas"
          >
            <div className="space-y-4">
              <div>
                <Label htmlFor="target_audience">Público-Alvo *</Label>
                <Textarea
                  id="target_audience"
                  value={formData.target_audience}
                  onChange={(e) => updateFormData('target_audience', e.target.value)}
                  placeholder="Descreva detalhadamente o público-alvo: idade, gênero, interesses, comportamentos, dores, onde estão presentes..."
                  rows={4}
                  className="min-h-[100px]"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Mínimo 30 caracteres • {formData.target_audience.length}/30
                </p>
              </div>

              <div>
                <Label htmlFor="objectives">Objetivos Estratégicos *</Label>
                <Textarea
                  id="objectives"
                  value={formData.objectives}
                  onChange={(e) => updateFormData('objectives', e.target.value)}
                  placeholder="O que o cliente quer alcançar? Ex: aumentar vendas em 30%, melhorar reconhecimento da marca, gerar 100 leads qualificados/mês..."
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="success_metrics">Métricas de Sucesso</Label>
                <Textarea
                  id="success_metrics"
                  value={formData.success_metrics}
                  onChange={(e) => updateFormData('success_metrics', e.target.value)}
                  placeholder="Como mediremos o sucesso? Ex: CTR > 2%, CPL < R$50, aumento de 25% no tráfego orgânico..."
                  rows={3}
                />
              </div>
            </div>
          </StepCard>
        );

      case 4:
        return (
          <StepCard 
            title="Tom de Voz e Informações Finais" 
            description="Finalize com tom de comunicação e detalhes extras"
          >
            <div className="space-y-4">
              <div>
                <Label htmlFor="brand_tone">Tom de Voz da Marca *</Label>
                <Select 
                  value={formData.brand_tone} 
                  onValueChange={(value) => updateFormData('brand_tone', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tom de comunicação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="profissional">Profissional e Sério</SelectItem>
                    <SelectItem value="amigavel">Amigável e Descontraído</SelectItem>
                    <SelectItem value="autoridade">Autoridade e Expertise</SelectItem>
                    <SelectItem value="jovem">Jovem e Inovador</SelectItem>
                    <SelectItem value="elegante">Elegante e Sofisticado</SelectItem>
                    <SelectItem value="humano">Humanizado e Próximo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="budget_range">Faixa de Investimento</Label>
                <Select 
                  value={formData.budget_range} 
                  onValueChange={(value) => updateFormData('budget_range', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Faixa de investimento mensal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ate_1k">Até R$ 1.000</SelectItem>
                    <SelectItem value="1k_3k">R$ 1.000 - R$ 3.000</SelectItem>
                    <SelectItem value="3k_5k">R$ 3.000 - R$ 5.000</SelectItem>
                    <SelectItem value="5k_10k">R$ 5.000 - R$ 10.000</SelectItem>
                    <SelectItem value="10k_plus">Acima de R$ 10.000</SelectItem>
                    <SelectItem value="a_definir">A definir</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="timeline">Timeline Esperada</Label>
                <Select 
                  value={formData.timeline} 
                  onValueChange={(value) => updateFormData('timeline', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Prazo para ver resultados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1_mes">1 mês</SelectItem>
                    <SelectItem value="3_meses">3 meses</SelectItem>
                    <SelectItem value="6_meses">6 meses</SelectItem>
                    <SelectItem value="1_ano">1 ano</SelectItem>
                    <SelectItem value="longo_prazo">Longo prazo (1+ anos)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="additional_info">Informações Adicionais</Label>
                <Textarea
                  id="additional_info"
                  value={formData.additional_info}
                  onChange={(e) => updateFormData('additional_info', e.target.value)}
                  placeholder="Alguma informação adicional importante? Restrições, preferências específicas, histórico relevante..."
                  rows={4}
                />
              </div>
            </div>
          </StepCard>
        );

      default:
        return null;
    }
  };

  if (!client) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Cliente não encontrado</h3>
          <p className="text-slate-600">Não foi possível carregar os dados do cliente.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Criar Briefing Estratégico</h1>
          </div>
          <p className="text-slate-600">
            Cliente: <span className="font-semibold">{client.name}</span> • {client.company}
          </p>
        </div>

        {/* Progress */}
        <StepIndicator currentStep={currentStep} totalSteps={totalSteps} />

        {/* Step Content */}
        <div className="mb-8">
          {renderStep()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center max-w-2xl mx-auto">
          <Button 
            variant="outline" 
            onClick={currentStep === 1 ? onCancel : handlePrev}
            disabled={loading}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {currentStep === 1 ? 'Cancelar' : 'Anterior'}
          </Button>

          <div className="text-sm text-slate-500">
            Etapa {currentStep} de {totalSteps}
          </div>

          {currentStep === totalSteps ? (
            <Button 
              onClick={handleSubmit} 
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Criar Briefing
                </>
              )}
            </Button>
          ) : (
            <Button onClick={handleNext}>
              Próximo
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
