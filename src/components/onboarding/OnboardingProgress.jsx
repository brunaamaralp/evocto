import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const OnboardingStep = ({ 
  number, 
  title, 
  description, 
  completed, 
  current, 
  action, 
  href 
}) => (
  <div className={`flex items-start gap-4 p-4 rounded-lg transition-all ${
    current ? 'bg-blue-50 border border-blue-200' : 
    completed ? 'bg-green-50 border border-green-200' : 
    'bg-slate-50 border border-slate-200'
  }`}>
    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
      completed ? 'bg-green-500 text-white' :
      current ? 'bg-blue-500 text-white' :
      'bg-slate-300 text-slate-600'
    }`}>
      {completed ? <CheckCircle className="w-4 h-4" /> : number}
    </div>
    
    <div className="flex-1 min-w-0">
      <h3 className={`font-medium ${
        completed ? 'text-green-800' :
        current ? 'text-blue-800' :
        'text-slate-700'
      }`}>
        {title}
      </h3>
      <p className="text-sm text-slate-600 mt-1">{description}</p>
      
      {current && action && href && (
        <Button asChild size="sm" className="mt-3">
          <Link to={href}>
            {action}
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </Button>
      )}
      
      {completed && (
        <Badge variant="outline" className="mt-2 text-green-700 border-green-300">
          <CheckCircle className="w-3 h-3 mr-1" />
          Concluído
        </Badge>
      )}
    </div>
  </div>
);

export default function OnboardingProgress({ onboardingState }) {
  const steps = [
    {
      number: 1,
      title: "Adicionar Primeiro Cliente",
      description: "Cadastre um cliente para começar a organizar briefings e planejamentos",
      completed: onboardingState.hasClients,
      current: !onboardingState.hasClients,
      action: "Adicionar Cliente",
      href: createPageUrl('customers/new')
    },
    {
      number: 2,
      title: "Preencher Briefing",
      description: "Complete o briefing estratégico para gerar insights personalizados",
      completed: onboardingState.hasBriefing,
      current: onboardingState.hasClients && !onboardingState.hasBriefing,
      action: "Preencher Briefing",
      href: createPageUrl('customers')
    },
    {
      number: 3,
      title: "Gerar Planejamento do Mês",
      description: "Use IA para criar estratégias personalizadas baseadas no briefing",
      completed: onboardingState.hasPlan,
      current: onboardingState.hasBriefing && !onboardingState.hasPlan,
      action: "Gerar Planejamento",
      href: createPageUrl('cycles')
    },
    {
      number: 4,
      title: "Enviar para Aprovação",
      description: "Compartilhe o planejamento com o cliente para aprovação",
      completed: onboardingState.hasApproval,
      current: onboardingState.hasPlan && !onboardingState.hasApproval,
      action: "Enviar Aprovação",
      href: createPageUrl('cycles')
    },
    {
      number: 5,
      title: "Conhecer os Aprendizados",
      description: "Descubra onde seus insights e boas práticas ficam organizados",
      completed: onboardingState.knowsLearnings,
      current: onboardingState.hasApproval && !onboardingState.knowsLearnings,
      action: "Ver Aprendizados",
      href: createPageUrl('library')
    }
  ];

  const completedSteps = steps.filter(step => step.completed).length;
  const progressPercentage = (completedSteps / steps.length) * 100;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            🐙 Primeiros Passos com o Evocto
          </CardTitle>
          <Badge variant="outline">
            {completedSteps} de {steps.length} concluídos
          </Badge>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {steps.map((step) => (
            <OnboardingStep key={step.number} {...step} />
          ))}
        </div>
        
        {completedSteps === steps.length && (
          <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
            <div className="text-center">
              <div className="text-2xl mb-2">🎉</div>
              <h3 className="font-semibold text-green-800 mb-1">
                Parabéns! Onboarding Completo
              </h3>
              <p className="text-sm text-green-700">
                Você está pronto para usar todas as funcionalidades do Evocto!
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}