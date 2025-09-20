
import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Client } from '@/api/entities';
import { Service } from '@/api/entities';
import { Brief } from '@/api/entities';
import { showToast } from '@/components/feedback/EnhancedFeedback';
import { 
  CheckCircle, Users, Briefcase, FileText, 
  ArrowRight, Play, Target, Sparkles
} from 'lucide-react';

const OnboardingStep = ({ icon: Icon, title, description, completed, current, onClick }) => (
  <Card 
    className={`cursor-pointer transition-all duration-200 ${
      completed ? 'bg-green-50 border-green-200' : 
      current ? 'bg-blue-50 border-blue-200 shadow-md' : 
      'hover:bg-slate-50'
    }`}
    onClick={onClick}
  >
    <CardContent className="p-4">
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
          completed ? 'bg-green-500 text-white' : 
          current ? 'bg-blue-500 text-white' : 
          'bg-slate-200 text-slate-600'
        }`}>
          {completed ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-600">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          {completed && <Badge variant="outline" className="bg-green-100 text-green-700">Concluído</Badge>}
          {current && <Badge className="bg-blue-500">Em andamento</Badge>}
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function AgencyOnboarding() {
  const { agencyId } = useSession();
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [steps, setSteps] = useState({
    firstClient: { completed: false, current: true },
    firstService: { completed: false, current: false },
    firstBriefing: { completed: false, current: false }
  });

  // 🔧 CORREÇÃO: useCallback para checkProgress
  const checkProgress = useCallback(async () => {
    if (!agencyId) return;

    try {
      const [clients, services, briefs] = await Promise.all([
        Client.filter({ agencyId }),
        Service.filter({ agencyId }),
        Brief.filter({ agencyId })
      ]);

      const hasClients = clients.length > 0;
      const hasServices = services.length > 0;
      const hasBriefs = briefs.length > 0;

      setSteps({
        firstClient: { 
          completed: hasClients, 
          current: !hasClients 
        },
        firstService: { 
          completed: hasServices, 
          current: hasClients && !hasServices 
        },
        firstBriefing: { 
          completed: hasBriefs, 
          current: hasServices && !hasBriefs 
        }
      });

      const completedSteps = [hasClients, hasServices, hasBriefs].filter(Boolean).length;
      setProgress((completedSteps / 3) * 100);

      // Se tudo está completo, redirecionar para dashboard
      if (completedSteps === 3) {
        setTimeout(() => {
          navigate('/dashboard');
          showToast.success('Parabéns! Sua agência está configurada e pronta para uso! 🎉');
        }, 2000);
      }

    } catch (error) {
      console.error('Erro ao verificar progresso:', error);
    }
  }, [agencyId, navigate]); // Adicionado navigate nas dependências

  // 🔧 CORREÇÃO: Incluir checkProgress nas dependências
  useEffect(() => {
    checkProgress();
  }, [checkProgress]);

  const handleCreateClient = () => {
    navigate('/customers');
  };

  const handleCreateService = () => {
    navigate('/services-overview');
  };

  const handleCreateBriefing = () => {
    navigate('/customers'); // Vai para clientes onde pode criar briefing
  };

  const stepsConfig = [
    {
      key: 'firstClient',
      icon: Users,
      title: 'Adicionar Primeiro Cliente',
      description: 'Cadastre seu primeiro cliente para começar a usar a plataforma',
      onClick: handleCreateClient
    },
    {
      key: 'firstService',
      icon: Briefcase,
      title: 'Configurar Primeiro Serviço',
      description: 'Crie um serviço recorrente para seu cliente (ex: Redes Sociais)',
      onClick: handleCreateService
    },
    {
      key: 'firstBriefing',
      icon: FileText,
      title: 'Criar Primeiro Briefing',
      description: 'Faça o briefing estratégico do seu cliente para começar os ciclos',
      onClick: handleCreateBriefing
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-6">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Bem-vindo ao Evocto! 
          </h1>
          <p className="text-xl text-slate-600 mb-6">
            Vamos configurar sua agência em 3 passos simples
          </p>
          <div className="max-w-md mx-auto">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-slate-700">Progresso da configuração</span>
              <Badge variant="outline">{Math.round(progress)}% completo</Badge>
            </div>
            <Progress value={progress} className="h-2 bg-slate-200" />
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {stepsConfig.map((stepConfig) => {
            const stepData = steps[stepConfig.key];
            return (
              <OnboardingStep
                key={stepConfig.key}
                icon={stepConfig.icon}
                title={stepConfig.title}
                description={stepConfig.description}
                completed={stepData.completed}
                current={stepData.current}
                onClick={stepConfig.onClick}
              />
            );
          })}
        </div>

        {/* Call to Action */}
        {progress === 0 && (
          <div className="mt-12 text-center">
            <Button 
              onClick={handleCreateClient}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-4 text-lg"
            >
              <Play className="w-5 h-5 mr-2" />
              Começar Configuração
            </Button>
          </div>
        )}

        {/* Progress Message */}
        {progress > 0 && progress < 100 && (
          <div className="mt-8 text-center">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-6">
                <Target className="w-8 h-8 text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                  Ótimo progresso! 
                </h3>
                <p className="text-blue-700">
                  Você está a {3 - Math.round(progress/33.33)} passo(s) de ter sua agência completamente configurada.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
