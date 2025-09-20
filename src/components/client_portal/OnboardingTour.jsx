
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  ArrowRight, ArrowLeft, CheckCircle, 
  FileText, Eye, BarChart3, HelpCircle,
  Star, X, SkipForward
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from '@/components/auth/SessionManager';
import { toast } from 'sonner';

const tourSteps = [
  {
    id: 'welcome',
    title: 'Bem-vindo ao seu Portal! 🎉',
    description: 'Este é o seu espaço para acompanhar projetos e aprovar campanhas.',
    icon: Star,
    highlight: 'dashboard-overview',
    action: null,
    tip: 'Você pode pular este tour a qualquer momento.'
  },
  {
    id: 'approvals',
    title: 'Aprovações Pendentes',
    description: 'Aqui você vê tudo que precisa da sua aprovação. Clique para revisar!',
    icon: CheckCircle,
    highlight: 'pending-approvals',
    action: 'highlight-approvals-card',
    tip: 'Aprovações urgentes aparecem em vermelho.'
  },
  {
    id: 'briefing',
    title: 'Briefing do Projeto',
    description: 'Visualize todos os detalhes e objetivos do seu projeto.',
    icon: FileText,
    highlight: 'briefing-tab',
    action: 'show-briefing-preview',
    tip: 'O briefing é atualizado conforme o projeto evolui.'
  },
  {
    id: 'reports',
    title: 'Relatórios de Performance',
    description: 'Acompanhe métricas e resultados das suas campanhas.',
    icon: BarChart3,
    highlight: 'reports-section',
    action: 'show-sample-chart',
    tip: 'Relatórios são atualizados semanalmente.'
  },
  {
    id: 'help',
    title: 'Precisa de Ajuda?',
    description: 'Use o botão de ajuda sempre que tiver dúvidas.',
    icon: HelpCircle,
    highlight: 'help-button',
    action: 'pulse-help-button',
    tip: 'Nossa equipe responde em até 24 horas.'
  }
];

export default function OnboardingTour({ 
  isOpen, 
  onClose, 
  onComplete 
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const { user, updateUser } = useSession();

  const currentStepData = tourSteps[currentStep];
  const progress = ((currentStep + 1) / tourSteps.length) * 100;
  const isLastStep = currentStep === tourSteps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCompletedSteps(prev => [...prev, currentStep]);
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    toast.info('Você pode acessar o tour novamente nas configurações');
    onClose();
  };

  const handleComplete = async () => {
    try {
      // Marcar tutorial como completo
      await updateUser({
        tutorial_completed: true,
        tutorial_completed_at: new Date().toISOString()
      });

      toast.success('Tour concluído! Explore à vontade 🚀');
      onComplete?.();
      onClose();
    } catch (error) {
      console.error('Erro ao completar tutorial:', error);
      toast.error('Erro ao salvar progresso do tutorial');
    }
  };

  const StepIcon = currentStepData?.icon || Star;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center">
              <StepIcon className="w-6 h-6 mr-3 text-blue-600" />
              Tour do Portal
            </DialogTitle>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">
                {currentStep + 1} de {tourSteps.length}
              </Badge>
              <Button variant="ghost" size="icon" onClick={handleSkip}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <Progress value={progress} className="mt-2" />
        </DialogHeader>

        <div className="space-y-6">
          {/* Step Content */}
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="p-3 rounded-full bg-blue-100">
                    <StepIcon className="w-8 h-8 text-blue-600" />
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {currentStepData.title}
                    </h3>
                    <p className="text-gray-600 text-lg leading-relaxed">
                      {currentStepData.description}
                    </p>
                    
                    {currentStepData.tip && (
                      <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-700">
                          💡 <strong>Dica:</strong> {currentStepData.tip}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Interactive Demo Area */}
            <Card>
              <CardContent className="p-6">
                <TourStepDemo step={currentStepData} />
              </CardContent>
            </Card>
          </motion.div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Anterior
            </Button>

            <div className="flex space-x-2">
              <Button variant="ghost" onClick={handleSkip}>
                <SkipForward className="w-4 h-4 mr-2" />
                Pular Tour
              </Button>
              
              <Button onClick={handleNext} className="flex items-center">
                {isLastStep ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Concluir Tour
                  </>
                ) : (
                  <>
                    Próximo
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Componente para demonstrações interativas de cada step
function TourStepDemo({ step }) {
  switch (step.id) {
    case 'welcome':
      return (
        <div className="text-center py-8">
          <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
            <Star className="w-12 h-12 text-blue-600" />
          </div>
          <h4 className="text-lg font-semibold mb-2">Sua Central de Comando</h4>
          <p className="text-gray-600">
            Tudo que você precisa para acompanhar seus projetos, em um só lugar.
          </p>
        </div>
      );

    case 'approvals':
      return (
        <div className="space-y-4">
          <h4 className="font-semibold">Exemplo de Aprovação Pendente:</h4>
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Badge className="bg-orange-100 text-orange-800 mb-2">URGENTE</Badge>
                  <h5 className="font-medium">Campanha Black Friday 2024</h5>
                  <p className="text-sm text-gray-600">Expira em 2 dias</p>
                </div>
                <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
                  <Eye className="w-4 h-4 mr-2" />
                  Revisar
                </Button>
              </div>
            </CardContent>
          </Card>
          <p className="text-sm text-gray-600">
            👆 Clique em "Revisar" para ver o conteúdo completo e tomar sua decisão.
          </p>
        </div>
      );

    case 'briefing':
      return (
        <div className="space-y-4">
          <h4 className="font-semibold">Seu Briefing Atualizado:</h4>
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <h5 className="font-medium text-blue-900">Objetivo Principal</h5>
                <p className="text-sm text-blue-700">Aumentar vendas em 30%</p>
              </CardContent>
            </Card>
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <h5 className="font-medium text-green-900">Público-alvo</h5>
                <p className="text-sm text-green-700">Mulheres 25-45 anos</p>
              </CardContent>
            </Card>
          </div>
        </div>
      );

    case 'reports':
      return (
        <div className="space-y-4">
          <h4 className="font-semibold">Suas Métricas de Performance:</h4>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Impressões', value: '125,4K', trend: '+12%' },
              { label: 'Cliques', value: '3,2K', trend: '+8%' },
              { label: 'Conversões', value: '156', trend: '+15%' }
            ].map((metric, i) => (
              <Card key={i} className="border-purple-200 bg-purple-50">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-purple-900">{metric.value}</p>
                  <p className="text-sm text-purple-700">{metric.label}</p>
                  <Badge className="bg-green-100 text-green-800 text-xs mt-1">
                    {metric.trend}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      );

    case 'help':
      return (
        <div className="text-center py-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
            <HelpCircle className="w-8 h-8 text-blue-600" />
          </div>
          <h4 className="font-semibold mb-2">Sempre Aqui Para Ajudar</h4>
          <p className="text-gray-600 mb-4">
            Nossa equipe está pronta para resolver suas dúvidas.
          </p>
          <Button variant="outline" className="animate-pulse">
            <HelpCircle className="w-4 h-4 mr-2" />
            Preciso de Ajuda
          </Button>
        </div>
      );

    default:
      return null;
  }
}
