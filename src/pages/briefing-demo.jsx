/**
 * 🧾 Página de Demonstração do Sistema de Briefing Híbrido
 * 
 * Página para demonstrar o funcionamento completo do sistema
 * Inclui formulário de briefing e visualização de ajustes
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Settings, 
  BarChart3, 
  Play,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import BriefingForm from '@/components/briefing/BriefingForm';
import TaskAdjustmentsViewer from '@/components/briefing/TaskAdjustmentsViewer';
import { useBriefing } from '@/hooks/useBriefing';
import { useTaskAdjustments } from '@/hooks/useTaskAdjustments';
import { toast } from 'sonner';

export default function BriefingDemoPage() {
  const [activeTab, setActiveTab] = useState('briefing');
  const [selectedService, setSelectedService] = useState('diagnostico_comunicacao');
  const [demoServiceId] = useState('demo-service-123');
  const [demoClientId] = useState('demo-client-456');

  const { 
    briefing, 
    adjustments, 
    stats,
    isLoading,
    isSubmitting,
    error,
    hasActiveBriefing,
    adjustmentsCount
  } = useBriefing(demoServiceId);

  const {
    adjustments: taskAdjustments,
    stats: adjustmentStats,
    totalAdjustments
  } = useTaskAdjustments(demoServiceId);

  // Dados de demonstração
  const demoTasks = [
    {
      id: 'task-1',
      template_key: 'solicitar_documentos_basicos',
      title: 'Solicitar Documentos Básicos',
      description: 'Coletar extratos bancários, fluxo de caixa, notas fiscais',
      priority: 'medium',
      status: 'todo',
      estimated_hours: 2
    },
    {
      id: 'task-2',
      template_key: 'avaliar_fluxo_caixa',
      title: 'Avaliar Fluxo de Caixa',
      description: 'Analisar fluxo de caixa dos últimos 3 a 6 meses',
      priority: 'high',
      status: 'todo',
      estimated_hours: 3
    },
    {
      id: 'task-3',
      template_key: 'criar_relatorio_pdf',
      title: 'Criar Relatório em PDF',
      description: 'Elaborar relatório completo com achados e indicadores',
      priority: 'medium',
      status: 'todo',
      estimated_hours: 2
    }
  ];

  const serviceTypes = [
    { value: 'diagnostico_comunicacao', label: 'Diagnóstico de Comunicação e Marca' },
    { value: 'estrategia_conteudo', label: 'Estratégia de Conteúdo e Posicionamento' },
    { value: 'marketing_360', label: 'Marketing Operacional 360' }
  ];

  const handleBriefingSubmitted = (result) => {
    console.log('Briefing enviado:', result);
    toast.success(`Briefing enviado! ${result.adjustments.length} ajustes aplicados.`);
    setActiveTab('adjustments');
  };

  const handleRunDemo = () => {
    toast.info('Executando demonstração do sistema de briefing...');
    setActiveTab('briefing');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sistema de Briefing Híbrido</h1>
          <p className="text-gray-600 mt-2">
            Demonstração do sistema de briefing personalizado por consultor com IA determinística
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={handleRunDemo} variant="outline">
            <Play className="w-4 h-4 mr-2" />
            Executar Demo
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {hasActiveBriefing ? '1' : '0'}
            </div>
            <div className="text-sm text-gray-600">Briefing Ativo</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {totalAdjustments}
            </div>
            <div className="text-sm text-gray-600">Ajustes Aplicados</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {demoTasks.length}
            </div>
            <div className="text-sm text-gray-600">Tarefas Base</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {selectedService === 'diagnostico_comunicacao' ? '1' : 
               selectedService === 'estrategia_conteudo' ? '4' : '12'}
            </div>
            <div className="text-sm text-gray-600">Meses de Duração</div>
          </CardContent>
        </Card>
      </div>

      {/* Service Type Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Tipo de Serviço
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {serviceTypes.map(service => (
              <Card 
                key={service.value}
                className={`cursor-pointer transition-all ${
                  selectedService === service.value 
                    ? 'ring-2 ring-blue-500 bg-blue-50' 
                    : 'hover:shadow-md'
                }`}
                onClick={() => setSelectedService(service.value)}
              >
                <CardContent className="p-4">
                  <h3 className="font-medium">{service.label}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {service.value === 'diagnostico_comunicacao' && 'Diagnóstico de marca, mensagem e presença digital'}
                    {service.value === 'estrategia_conteudo' && 'Estratégia editorial e posicionamento de marca'}
                    {service.value === 'marketing_360' && 'Operação completa de marketing e performance'}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="briefing">Briefing</TabsTrigger>
          <TabsTrigger value="adjustments">Ajustes</TabsTrigger>
          <TabsTrigger value="tasks">Tarefas</TabsTrigger>
        </TabsList>

        {/* Briefing Tab */}
        <TabsContent value="briefing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Formulário de Briefing
                {briefing && (
                  <Badge variant="outline">
                    Versão {briefing.versao}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BriefingForm
                servicoInstanciaId={demoServiceId}
                clienteId={demoClientId}
                servicoTipo={selectedService}
                onBriefingSubmitted={handleBriefingSubmitted}
              />
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5" />
                Como Funciona
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <div>
                  <h4 className="font-medium">Preenchimento pelo Consultor</h4>
                  <p className="text-sm text-gray-600">
                    O consultor preenche o briefing durante a reunião de kickoff com informações específicas do cliente.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <div>
                  <h4 className="font-medium">Aplicação de Regras de IA</h4>
                  <p className="text-sm text-gray-600">
                    O sistema aplica regras determinísticas baseadas no briefing para personalizar as tarefas.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <div>
                  <h4 className="font-medium">Personalização Automática</h4>
                  <p className="text-sm text-gray-600">
                    As tarefas são ajustadas automaticamente: priorizadas, adiadas, ocultadas ou novas tarefas são criadas.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Adjustments Tab */}
        <TabsContent value="adjustments" className="space-y-4">
          <TaskAdjustmentsViewer
            servicoInstanciaId={demoServiceId}
            tasks={demoTasks}
            showStats={true}
          />
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Tarefas Personalizadas
                {hasActiveBriefing && (
                  <Badge variant="outline" className="text-green-600">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Ajustadas pela IA
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {demoTasks.map(task => (
                  <Card key={task.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{task.title}</h4>
                            <Badge variant="outline">{task.priority}</Badge>
                            {hasActiveBriefing && (
                              <Badge variant="outline" className="text-blue-600">
                                Ajustado
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>{task.estimated_hours}h estimadas</span>
                            <span>Status: {task.status}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span className="font-medium">Erro:</span>
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

