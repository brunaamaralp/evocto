import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle, 
  Circle,
  Home,
  BarChart3,
  FileText,
  Users,
  Settings,
  Lightbulb,
  Target,
  TrendingUp,
  Calendar,
  Bell,
  HelpCircle,
  X,
  Play,
  Pause,
  SkipForward
} from 'lucide-react';
import { useSession } from '@/components/auth/SessionManager';
import { toast } from 'sonner';

/**
 * Sistema de Onboarding para Clientes
 */
export default function ClientOnboardingSystem({ isOpen, onClose, clientId, serviceId }) {
  const { user } = useSession();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);

  const onboardingSteps = [
    {
      id: 'welcome',
      title: 'Bem-vindo ao Portal!',
      description: 'Vamos conhecer seu novo espaço de acompanhamento',
      icon: Home,
      content: WelcomeStep,
      duration: 30000, // 30 segundos
      canSkip: false
    },
    {
      id: 'dashboard',
      title: 'Seu Dashboard Executivo',
      description: 'Entenda como navegar pelo seu painel principal',
      icon: BarChart3,
      content: DashboardStep,
      duration: 45000, // 45 segundos
      canSkip: true
    },
    {
      id: 'kpis',
      title: 'Indicadores de Performance',
      description: 'Aprenda sobre os KPIs de marketing que acompanhamos',
      icon: Target,
      content: KPIsStep,
      duration: 60000, // 1 minuto
      canSkip: true
    },
    {
      id: 'progress',
      title: 'Acompanhamento de Progresso',
      description: 'Veja como acompanhar o andamento do projeto',
      icon: TrendingUp,
      content: ProgressStep,
      duration: 45000, // 45 segundos
      canSkip: true
    },
    {
      id: 'documents',
      title: 'Documentos e Entregáveis',
      description: 'Saiba onde encontrar seus relatórios e documentos',
      icon: FileText,
      content: DocumentsStep,
      duration: 30000, // 30 segundos
      canSkip: true
    },
    {
      id: 'team',
      title: 'Sua Equipe da Agência',
      description: 'Conheça quem está trabalhando no seu projeto',
      icon: Users,
      content: TeamStep,
      duration: 30000, // 30 segundos
      canSkip: true
    },
    {
      id: 'notifications',
      title: 'Notificações e Alertas',
      description: 'Configure como receber atualizações importantes',
      icon: Bell,
      content: NotificationsStep,
      duration: 30000, // 30 segundos
      canSkip: true
    },
    {
      id: 'help',
      title: 'Precisa de Ajuda?',
      description: 'Saiba onde encontrar suporte e recursos',
      icon: HelpCircle,
      content: HelpStep,
      duration: 30000, // 30 segundos
      canSkip: true
    }
  ];

  useEffect(() => {
    if (isOpen) {
      loadOnboardingProgress();
    }
  }, [isOpen, clientId]);

  useEffect(() => {
    if (autoPlay && isPlaying) {
      const timer = setTimeout(() => {
        nextStep();
      }, onboardingSteps[currentStep].duration);
      
      return () => clearTimeout(timer);
    }
  }, [currentStep, autoPlay, isPlaying]);

  const loadOnboardingProgress = async () => {
    try {
      // Simular carregamento do progresso do onboarding
      const response = await fetch(`/api/client-onboarding/progress/${clientId}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCompletedSteps(new Set(data.completedSteps || []));
        
        // Encontrar o primeiro passo não concluído
        const firstIncomplete = onboardingSteps.findIndex(step => 
          !data.completedSteps?.includes(step.id)
        );
        if (firstIncomplete !== -1) {
          setCurrentStep(firstIncomplete);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar progresso do onboarding:', error);
    }
  };

  const nextStep = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipStep = () => {
    if (onboardingSteps[currentStep].canSkip) {
      nextStep();
    }
  };

  const completeStep = async (stepId) => {
    const newCompleted = new Set(completedSteps);
    newCompleted.add(stepId);
    setCompletedSteps(newCompleted);

    try {
      await fetch(`/api/client-onboarding/complete-step`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          clientId,
          stepId,
          completedAt: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Erro ao marcar passo como concluído:', error);
    }
  };

  const completeOnboarding = async () => {
    try {
      await fetch(`/api/client-onboarding/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          clientId,
          completedAt: new Date().toISOString()
        })
      });

      toast.success('Onboarding concluído! Bem-vindo ao portal!');
      onClose();
    } catch (error) {
      console.error('Erro ao concluir onboarding:', error);
      toast.error('Erro ao concluir onboarding');
    }
  };

  const toggleAutoPlay = () => {
    setAutoPlay(!autoPlay);
    setIsPlaying(!autoPlay);
  };

  const currentStepData = onboardingSteps[currentStep];
  const progress = ((currentStep + 1) / onboardingSteps.length) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-gray-900">
                {currentStepData.title}
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                {currentStepData.description}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAutoPlay}
              >
                {autoPlay ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {autoPlay ? 'Pausar' : 'Auto'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Passo {currentStep + 1} de {onboardingSteps.length}</span>
            <span>{Math.round(progress)}% concluído</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Indicators */}
        <div className="flex justify-center gap-2 mb-6">
          {onboardingSteps.map((step, index) => (
            <div
              key={step.id}
              className={`w-3 h-3 rounded-full transition-colors duration-300 ${
                index === currentStep 
                  ? 'bg-blue-600' 
                  : completedSteps.has(step.id) 
                    ? 'bg-green-600' 
                    : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <currentStepData.content 
                onComplete={() => completeStep(currentStepData.id)}
                clientId={clientId}
                serviceId={serviceId}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={previousStep}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Anterior
            </Button>
            {currentStepData.canSkip && (
              <Button
                variant="ghost"
                onClick={skipStep}
              >
                <SkipForward className="w-4 h-4 mr-2" />
                Pular
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {currentStep === onboardingSteps.length - 1 ? (
              <Button
                onClick={completeOnboarding}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Concluir Onboarding
              </Button>
            ) : (
              <Button
                onClick={nextStep}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Próximo
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Passo de Boas-vindas
 */
function WelcomeStep({ onComplete }) {
  return (
    <div className="text-center space-y-6">
      <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
        <Home className="w-12 h-12 text-blue-600" />
      </div>
      
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          🎉 Bem-vindo ao seu Portal!
        </h2>
        <p className="text-lg text-gray-600 mb-6">
          Este é o seu espaço pessoal para acompanhar o progresso do seu projeto com a agência.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
        <div className="p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">📊 Dashboard Executivo</h3>
          <p className="text-blue-800 text-sm">
            Veja seus resultados de marketing e o progresso do projeto em tempo real.
          </p>
        </div>
        
        <div className="p-4 bg-green-50 rounded-lg">
          <h3 className="font-semibold text-green-900 mb-2">📈 Acompanhamento</h3>
          <p className="text-green-800 text-sm">
            Monitore metas, entregáveis e próximos passos do seu projeto.
          </p>
        </div>
        
        <div className="p-4 bg-purple-50 rounded-lg">
          <h3 className="font-semibold text-purple-900 mb-2">💬 Comunicação</h3>
          <p className="text-purple-800 text-sm">
            Mantenha-se conectado com sua equipe da agência.
          </p>
        </div>
      </div>

      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <h3 className="font-semibold text-yellow-900 mb-2">💡 Dica Importante</h3>
        <p className="text-yellow-800 text-sm">
          Este tour vai te mostrar todas as funcionalidades. Você pode pausar a qualquer momento e retomar depois.
        </p>
      </div>

      <Button
        onClick={onComplete}
        className="bg-blue-600 hover:bg-blue-700"
      >
        <CheckCircle className="w-4 h-4 mr-2" />
        Entendi! Vamos começar
      </Button>
    </div>
  );
}

/**
 * Passo do Dashboard
 */
function DashboardStep({ onComplete }) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Seu Dashboard Executivo
        </h2>
        <p className="text-gray-600">
          Aqui você encontra uma visão geral do seu projeto
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-2">📊 Resumo Executivo</h3>
          <p className="text-sm text-gray-600 mb-3">
            Status geral do projeto, progresso e próximo marco.
          </p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progresso Geral</span>
              <span className="font-medium">68%</span>
            </div>
            <Progress value={68} className="h-2" />
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-2">🎯 KPIs Principais</h3>
          <p className="text-sm text-gray-600 mb-3">
            Indicadores de performance mais importantes para suas campanhas.
          </p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Receita Mensal</span>
              <span className="font-medium text-green-600">R$ 128.000</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Margem de Lucro</span>
              <span className="font-medium text-blue-600">15,2%</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">💡 Como Usar</h3>
        <ul className="text-blue-800 text-sm space-y-1">
          <li>• Clique nos KPIs para ver mais detalhes</li>
          <li>• Use os filtros de período para analisar tendências</li>
          <li>• Exporte relatórios em PDF quando necessário</li>
        </ul>
      </div>

      <Button
        onClick={onComplete}
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        <CheckCircle className="w-4 h-4 mr-2" />
        Entendi o Dashboard
      </Button>
    </div>
  );
}

/**
 * Passo dos KPIs
 */
function KPIsStep({ onComplete }) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Target className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Indicadores de Performance (KPIs)
        </h2>
        <p className="text-gray-600">
          Entenda o que cada número significa para seu negócio
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 border-green-200 bg-green-50">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <h3 className="font-semibold text-green-900">Receita Mensal</h3>
          </div>
          <p className="text-sm text-green-800 mb-2">
            Total de vendas realizadas no mês
          </p>
          <p className="text-xs text-green-700">
            💡 Meta: Crescer 10-15% ao mês
          </p>
        </Card>

        <Card className="p-4 border-blue-200 bg-blue-50">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Target className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="font-semibold text-blue-900">Margem de Lucro</h3>
          </div>
          <p className="text-sm text-blue-800 mb-2">
            Percentual de lucro sobre as vendas
          </p>
          <p className="text-xs text-blue-700">
            💡 Meta: Entre 15-25% é saudável
          </p>
        </Card>
      </div>

      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <h3 className="font-semibold text-yellow-900 mb-2">🎯 Dica de Ouro</h3>
        <p className="text-yellow-800 text-sm">
          Foque em melhorar um KPI por vez. Tentar melhorar tudo ao mesmo tempo pode ser contraproducente.
        </p>
      </div>

      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-2">📚 Quer Saber Mais?</h3>
        <p className="text-gray-700 text-sm mb-3">
          Cada KPI tem explicações detalhadas e dicas de como melhorar. 
          Clique no ícone de ajuda (?) ao lado de cada indicador.
        </p>
        <Button variant="outline" size="sm">
          <HelpCircle className="w-4 h-4 mr-2" />
          Ver Glossário Completo
        </Button>
      </div>

      <Button
        onClick={onComplete}
        className="w-full bg-green-600 hover:bg-green-700"
      >
        <CheckCircle className="w-4 h-4 mr-2" />
        Entendi os KPIs
      </Button>
    </div>
  );
}

/**
 * Passo de Progresso
 */
function ProgressStep({ onComplete }) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <TrendingUp className="w-8 h-8 text-purple-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Acompanhamento de Progresso
        </h2>
        <p className="text-gray-600">
          Veja como acompanhar o andamento do seu projeto
        </p>
      </div>

      <div className="space-y-4">
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-3">📈 Progresso por Fase</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Diagnóstico</span>
              <div className="flex items-center gap-2">
                <Progress value={100} className="w-24 h-2" />
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Planejamento</span>
              <div className="flex items-center gap-2">
                <Progress value={85} className="w-24 h-2" />
                <span className="text-sm font-medium">85%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Implementação</span>
              <div className="flex items-center gap-2">
                <Progress value={45} className="w-24 h-2" />
                <span className="text-sm font-medium">45%</span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-3">📋 Entregáveis</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm">Relatório de Diagnóstico</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm">Plano de Ação</span>
            </div>
            <div className="flex items-center gap-2">
              <Circle className="w-4 h-4 text-blue-600" />
              <span className="text-sm">Estratégia de Preços</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">💡 Próximos Passos</h3>
        <p className="text-blue-800 text-sm">
          Sempre que você acessar o portal, verá claramente o que precisa ser feito em seguida.
        </p>
      </div>

      <Button
        onClick={onComplete}
        className="w-full bg-purple-600 hover:bg-purple-700"
      >
        <CheckCircle className="w-4 h-4 mr-2" />
        Entendi o Acompanhamento
      </Button>
    </div>
  );
}

/**
 * Passo de Documentos
 */
function DocumentsStep({ onComplete }) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-orange-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Documentos e Entregáveis
        </h2>
        <p className="text-gray-600">
          Saiba onde encontrar seus relatórios e documentos
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-2">📄 Relatórios</h3>
          <p className="text-sm text-gray-600 mb-3">
            Relatórios mensais, análises e diagnósticos
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Relatório de Diagnóstico</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4 text-green-600" />
              <span>Plano de Ação</span>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-2">📊 Dashboards</h3>
          <p className="text-sm text-gray-600 mb-3">
            Visualizações interativas dos seus dados
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <BarChart3 className="w-4 h-4 text-purple-600" />
              <span>Dashboard de Performance</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-orange-600" />
              <span>Análise de Tendências</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="p-4 bg-green-50 rounded-lg">
        <h3 className="font-semibold text-green-900 mb-2">💾 Download e Export</h3>
        <p className="text-green-800 text-sm">
          Todos os documentos podem ser baixados em PDF ou Excel para sua conveniência.
        </p>
      </div>

      <Button
        onClick={onComplete}
        className="w-full bg-orange-600 hover:bg-orange-700"
      >
        <CheckCircle className="w-4 h-4 mr-2" />
        Entendi os Documentos
      </Button>
    </div>
  );
}

/**
 * Passo da Equipe
 */
function TeamStep({ onComplete }) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8 text-indigo-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Sua Equipe da Agência
        </h2>
        <p className="text-gray-600">
          Conheça quem está trabalhando no seu projeto
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Consultor Principal</h3>
              <p className="text-sm text-gray-600">João Silva</p>
            </div>
          </div>
          <p className="text-sm text-gray-700">
            Responsável pela estratégia geral e acompanhamento do projeto.
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Analista de Performance</h3>
              <p className="text-sm text-gray-600">Maria Santos</p>
            </div>
          </div>
          <p className="text-sm text-gray-700">
            Especialista em análise de dados de marketing e indicadores de performance.
          </p>
        </Card>
      </div>

      <div className="p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">💬 Comunicação</h3>
        <p className="text-blue-800 text-sm">
          Você pode entrar em contato com qualquer membro da equipe através do chat ou agendar reuniões.
        </p>
      </div>

      <Button
        onClick={onComplete}
        className="w-full bg-indigo-600 hover:bg-indigo-700"
      >
        <CheckCircle className="w-4 h-4 mr-2" />
        Conheci a Equipe
      </Button>
    </div>
  );
}

/**
 * Passo de Notificações
 */
function NotificationsStep({ onComplete }) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Bell className="w-8 h-8 text-yellow-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Notificações e Alertas
        </h2>
        <p className="text-gray-600">
          Configure como receber atualizações importantes
        </p>
      </div>

      <div className="space-y-4">
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-3">🔔 Tipos de Notificação</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">Novos Relatórios</span>
                <p className="text-xs text-gray-600">Quando um relatório é disponibilizado</p>
              </div>
              <Badge variant="outline" className="text-green-600">Ativo</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">Alertas de KPIs</span>
                <p className="text-xs text-gray-600">Quando indicadores saem da meta</p>
              </div>
              <Badge variant="outline" className="text-green-600">Ativo</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">Lembretes de Tarefas</span>
                <p className="text-xs text-gray-600">Quando há ações pendentes</p>
              </div>
              <Badge variant="outline" className="text-green-600">Ativo</Badge>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-3">📱 Canais de Notificação</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Email</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Portal (notificações internas)</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span>SMS (opcional)</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="p-4 bg-yellow-50 rounded-lg">
        <h3 className="font-semibold text-yellow-900 mb-2">⚙️ Personalização</h3>
        <p className="text-yellow-800 text-sm">
          Você pode personalizar quais notificações receber e como recebê-las nas configurações.
        </p>
      </div>

      <Button
        onClick={onComplete}
        className="w-full bg-yellow-600 hover:bg-yellow-700"
      >
        <CheckCircle className="w-4 h-4 mr-2" />
        Configurei as Notificações
      </Button>
    </div>
  );
}

/**
 * Passo de Ajuda
 */
function HelpStep({ onComplete }) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <HelpCircle className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Precisa de Ajuda?
        </h2>
        <p className="text-gray-600">
          Saiba onde encontrar suporte e recursos
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-2">💬 Chat de Suporte</h3>
          <p className="text-sm text-gray-600 mb-3">
            Converse diretamente com nossa equipe
          </p>
          <Button variant="outline" size="sm" className="w-full">
            Abrir Chat
          </Button>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-2">📚 Centro de Ajuda</h3>
          <p className="text-sm text-gray-600 mb-3">
            Artigos e tutoriais detalhados
          </p>
          <Button variant="outline" size="sm" className="w-full">
            Ver Artigos
          </Button>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-2">📞 Telefone</h3>
          <p className="text-sm text-gray-600 mb-3">
            Suporte por telefone durante horário comercial
          </p>
          <Button variant="outline" size="sm" className="w-full">
            Ligar Agora
          </Button>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-2">📧 Email</h3>
          <p className="text-sm text-gray-600 mb-3">
            Envie suas dúvidas por email
          </p>
          <Button variant="outline" size="sm" className="w-full">
            Enviar Email
          </Button>
        </Card>
      </div>

      <div className="p-4 bg-green-50 rounded-lg">
        <h3 className="font-semibold text-green-900 mb-2">🎉 Parabéns!</h3>
        <p className="text-green-800 text-sm">
          Você concluiu o tour do portal! Agora você está pronto para aproveitar ao máximo todas as funcionalidades.
        </p>
      </div>

      <Button
        onClick={onComplete}
        className="w-full bg-red-600 hover:bg-red-700"
      >
        <CheckCircle className="w-4 h-4 mr-2" />
        Finalizar Tour
      </Button>
    </div>
  );
}

