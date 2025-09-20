import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  PlayCircle,
  Users,
  Wrench,
  FileText,
  Calendar,
  CheckCircle2,
  TrendingUp,
  Lightbulb,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function ClientDemo() {
  const demoData = {
    client: {
      name: 'TechCorp Demo',
      company: 'TechCorp Soluções',
      industry: 'Tecnologia',
      status: 'ativo'
    },
    service: {
      name: 'Social Media',
      status: 'active',
      currentCycle: 'Janeiro 2025'
    },
    briefing: {
      completionScore: 85,
      status: 'approved'
    },
    insights: {
      persona: 'Gerentes de TI de empresas médias, entre 30-45 anos, que buscam soluções eficientes',
      painPoints: ['Falta de tempo para avaliar tecnologias', 'Pressão por resultados rápidos'],
      toneOfVoice: 'Técnico, mas acessível. Confiável e direto.'
    },
    learnings: [
      {
        title: 'Posts técnicos geram 3x mais engajamento',
        description: 'Conteúdo educativo sobre arquitetura de sistemas teve performance superior',
        niche: 'B2B Tech',
        format: 'LinkedIn Carousel'
      },
      {
        title: 'Horário ideal: 14h-16h em dias úteis',
        description: 'Análise de 3 meses mostra pico de engajamento no meio da tarde',
        niche: 'B2B Tech',
        format: 'Todas as redes'
      }
    ]
  };

  return (
    <div className="space-y-8">
      {/* Demo Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
            <PlayCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Cliente Demo</h1>
            <p className="text-slate-600">Explore todas as funcionalidades com dados de exemplo</p>
          </div>
          <Badge className="bg-blue-100 text-blue-800 ml-auto">DEMONSTRAÇÃO</Badge>
        </div>
        
        <Alert>
          <Lightbulb className="h-4 w-4" />
          <AlertDescription>
            Este cliente contém dados fictícios para demonstração. Você pode navegar por todas as telas 
            sem afetar dados reais da sua agência.
          </AlertDescription>
        </Alert>
      </div>

      {/* Client Overview */}
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Client Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                Informações do Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-slate-600">Nome:</span>
                  <span className="text-sm text-slate-900">{demoData.client.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-slate-600">Empresa:</span>
                  <span className="text-sm text-slate-900">{demoData.client.company}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-slate-600">Setor:</span>
                  <span className="text-sm text-slate-900">{demoData.client.industry}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-slate-600">Status:</span>
                  <Badge className="bg-green-100 text-green-800 capitalize">
                    {demoData.client.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Briefing & Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-purple-600" />
                Briefing e Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">Completude do Briefing:</span>
                  <Badge className="bg-green-100 text-green-800">
                    {demoData.briefing.completionScore}% Completo
                  </Badge>
                </div>
                
                <div className="space-y-3 pt-4 border-t">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 mb-2">Persona Principal</h4>
                    <p className="text-sm text-slate-600">{demoData.insights.persona}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 mb-2">Principais Dores</h4>
                    <ul className="space-y-1">
                      {demoData.insights.painPoints.map((pain, index) => (
                        <li key={index} className="text-sm text-slate-600 flex items-start gap-2">
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full mt-2 flex-shrink-0"></span>
                          {pain}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 mb-2">Tom de Voz</h4>
                    <p className="text-sm text-slate-600">{demoData.insights.toneOfVoice}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Service Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-green-600" />
                Serviço Ativo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-slate-600">Serviço:</span>
                  <span className="text-sm text-slate-900">{demoData.service.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-slate-600">Ciclo Atual:</span>
                  <span className="text-sm text-slate-900">{demoData.service.currentCycle}</span>
                </div>
                <Badge className="bg-green-100 text-green-800 w-full justify-center">
                  Em Execução
                </Badge>
              </div>
              
              <div className="pt-4">
                <Button variant="outline" className="w-full" disabled>
                  <Calendar className="w-4 h-4 mr-2" />
                  Ver Plano do Ciclo
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Learning Library */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                Aprendizados Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {demoData.learnings.map((learning, index) => (
                  <div key={index} className="p-3 bg-slate-50 rounded-lg">
                    <h4 className="text-sm font-semibold text-slate-900 mb-1">
                      {learning.title}
                    </h4>
                    <p className="text-xs text-slate-600 mb-2">
                      {learning.description}
                    </p>
                    <div className="flex gap-1">
                      <Badge variant="secondary" className="text-xs">
                        {learning.niche}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {learning.format}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              
              <Button variant="outline" className="w-full mt-4" disabled>
                <ArrowRight className="w-4 h-4 mr-2" />
                Ver Biblioteca Completa
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Navigation Actions */}
      <Card className="bg-slate-50">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Experimente outras funcionalidades
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            <Link to={createPageUrl('clients')}>
              <Button variant="outline" className="w-full">
                <Users className="w-4 h-4 mr-2" />
                Criar Cliente Real
              </Button>
            </Link>
            <Link to={createPageUrl('services-overview')}>
              <Button variant="outline" className="w-full">
                <Wrench className="w-4 h-4 mr-2" />
                Configurar Serviço
              </Button>
            </Link>
            <Link to={createPageUrl('briefings')}>
              <Button variant="outline" className="w-full">
                <FileText className="w-4 h-4 mr-2" />
                Gerar Briefing
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}