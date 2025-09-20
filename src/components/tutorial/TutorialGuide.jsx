import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Wrench, 
  FileText, 
  Calendar,
  CheckCircle2,
  ArrowRight,
  X,
  PlayCircle
} from 'lucide-react';
import { createPageUrl } from '@/utils';
import { useTutorial } from './useTutorial';
import { useNavigate } from 'react-router-dom';

const MISSIONS = [
  {
    id: 'client_created',
    title: 'Criar Cliente',
    description: 'Configure seu primeiro cliente com informações básicas',
    icon: Users,
    href: createPageUrl('clients'),
    ctaText: 'Criar Cliente',
    order: 1
  },
  {
    id: 'service_contract_created',
    title: 'Adicionar Serviço',
    description: 'Defina um serviço recorrente usando template',
    icon: Wrench,
    href: createPageUrl('services-overview'),
    ctaText: 'Adicionar Serviço',
    order: 2
  },
  {
    id: 'briefing_rc_created',
    title: 'Gerar Briefing',
    description: 'Crie um RC (link de aprovação) para o cliente',
    icon: FileText,
    href: createPageUrl('briefings'),
    ctaText: 'Gerar Briefing',
    order: 3
  },
  {
    id: 'cycle_plan_opened',
    title: 'Abrir Plano do Ciclo',
    description: 'Visualize o primeiro plano de execução',
    icon: Calendar,
    href: createPageUrl('active-cycles'),
    ctaText: 'Ver Planos',
    order: 4
  }
];

export default function TutorialGuide() {
  const navigate = useNavigate();
  const { 
    progress, 
    isCompleted, 
    isHidden, 
    markMissionComplete, 
    skipTutorial,
    openDemoClient
  } = useTutorial();

  if (isCompleted || isHidden) return null;

  const completedCount = Object.values(progress).filter(Boolean).length;
  const progressPercentage = (completedCount / MISSIONS.length) * 100;

  return (
    <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 mb-8">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <PlayCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg text-slate-900">Comece aqui</CardTitle>
              <p className="text-sm text-slate-600">Configure sua agência em 4 passos simples</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={skipTutorial}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Progresso: {completedCount}/{MISSIONS.length}</span>
            <span className="text-slate-500">{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {MISSIONS.map((mission) => {
            const isCompleted = progress[mission.id];
            const Icon = mission.icon;
            
            return (
              <div 
                key={mission.id}
                className={`p-4 rounded-lg border transition-all ${
                  isCompleted 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-white border-slate-200 hover:border-blue-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${isCompleted ? 'bg-green-100' : 'bg-slate-100'}`}>
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <Icon className="w-4 h-4 text-slate-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-medium text-sm ${isCompleted ? 'text-green-900' : 'text-slate-900'}`}>
                      {mission.title}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {mission.description}
                    </p>
                    {!isCompleted && (
                      <Link to={mission.href}>
                        <Button size="sm" className="mt-2 h-7 text-xs">
                          {mission.ctaText}
                        </Button>
                      </Link>
                    )}
                    {isCompleted && (
                      <Badge variant="secondary" className="mt-2 bg-green-100 text-green-800">
                        Concluído
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <Button 
            variant="outline"
            onClick={openDemoClient}
            className="text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            <PlayCircle className="w-4 h-4 mr-2" />
            Explorar com dados de exemplo
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={skipTutorial}
            className="text-slate-500"
          >
            Pular por agora
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}