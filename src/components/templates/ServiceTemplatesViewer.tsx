/**
 * 🧾 Visualizador de Templates Padrão Corretos
 * 
 * Componente para visualizar os templates padrão dos 3 serviços principais
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Target, 
  BarChart3, 
  Clock, 
  Users, 
  DollarSign,
  CheckCircle,
  ArrowRight,
  Eye,
  Copy,
  Download,
  Calendar,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { DEFAULT_SERVICE_TEMPLATES } from '@/templates/defaultServiceTemplates';
import { toast } from 'sonner';
import {
  getCategoryLabel as getServiceCategoryLabel,
  getOfferingLabel,
  SERVICE_OFFERING_TYPES,
} from '@/constants/serviceCategories';

export default function ServiceTemplatesViewer() {
  const [selectedTemplate, setSelectedTemplate] = useState('diagnostico_comunicacao');
  const [activeTab, setActiveTab] = useState('overview');

  const template = DEFAULT_SERVICE_TEMPLATES[selectedTemplate];

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(JSON.stringify(template, null, 2));
    toast.success('Template copiado para a área de transferência!');
  };

  const handleDownloadTemplate = () => {
    const dataStr = JSON.stringify(template, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `${template.name.replace(/\s+/g, '_').toLowerCase()}_template.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast.success('Template baixado com sucesso!');
  };

  const getCategoryColor = (category) => {
    const colors = {
      diagnostico_comunicacao: 'bg-blue-100 text-blue-800',
      estrategia_conteudo: 'bg-green-100 text-green-800',
      marketing_360: 'bg-purple-100 text-purple-800',
      comunicacao: 'bg-blue-100 text-blue-800',
      conteudo: 'bg-green-100 text-green-800',
      marketing_digital: 'bg-purple-100 text-purple-800',
      // legado
      diagnostico_financeiro: 'bg-blue-100 text-blue-800',
      mentoria_precificacao: 'bg-green-100 text-green-800',
      gestao_financeira_360: 'bg-purple-100 text-purple-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getCategoryLabel = (category) => {
    return getOfferingLabel(category) || getServiceCategoryLabel(category);
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'high': 'bg-red-100 text-red-800',
      'medium': 'bg-yellow-100 text-yellow-800',
      'low': 'bg-green-100 text-green-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const getTaskTypeIcon = (type) => {
    const icons = {
      'coleta_dados': '📊',
      'analise_financeira': '📈',
      'relatorio_financeiro': '📋',
      'planejamento_estrategico': '🎯',
      'treinamento': '🎓',
      'reuniao_alinhamento': '👥',
      'analise_documentos': '📄',
      'auditoria': '🔍',
      'implementacao': '⚙️',
      'consultoria': '💼',
      'administrativo': '📝'
    };
    return icons[type] || '📝';
  };

  const getDurationLabel = (template) => {
    if (template.pricing.duration_months === 1) {
      return '1 mês';
    } else if (template.pricing.duration_months === 4) {
      return '4 meses';
    } else if (template.pricing.duration_months === 12) {
      return '12 meses (contínuo)';
    }
    return `${template.pricing.duration_months} meses`;
  };

  const getBillingLabel = (billingCycle) => {
    const labels = {
      'one_time': 'Pagamento Único',
      'monthly': 'Mensal',
      'quarterly': 'Trimestral',
      'yearly': 'Anual'
    };
    return labels[billingCycle] || billingCycle;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Templates Padrão de Serviços</h1>
          <p className="text-gray-600 mt-2">
            Os 3 serviços principais de comunicação e marketing com fases, tarefas e KPIs detalhados
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={handleCopyTemplate} variant="outline">
            <Copy className="w-4 h-4 mr-2" />
            Copiar Template
          </Button>
          <Button onClick={handleDownloadTemplate}>
            <Download className="w-4 h-4 mr-2" />
            Baixar Template
          </Button>
        </div>
      </div>

      {/* Template Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(SERVICE_OFFERING_TYPES).map(([key, offering]) => {
          const offeringTemplate = DEFAULT_SERVICE_TEMPLATES[key];
          if (!offeringTemplate) return null;
          return (
          <Card 
            key={key}
            className={`cursor-pointer transition-all ${
              selectedTemplate === key 
                ? 'ring-2 ring-blue-500 bg-blue-50' 
                : 'hover:shadow-md'
            }`}
            onClick={() => setSelectedTemplate(key)}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span className="text-lg">{offeringTemplate.name}</span>
                <Badge className={getCategoryColor(key)}>
                  {offering.label}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-3">{offeringTemplate.description}</p>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span>{offeringTemplate.pricing.estimated_hours}h</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span>{getDurationLabel(offeringTemplate)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4 text-gray-500" />
                  <span>R$ {offeringTemplate.pricing.base_price.toLocaleString()}</span>
                </div>
              </div>
              <div className="mt-2">
                <Badge variant="outline" className="text-xs">
                  {getBillingLabel(offeringTemplate.pricing.billing_cycle)}
                </Badge>
              </div>
            </CardContent>
          </Card>
          );
        })}
      </div>

      {/* Template Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {template.name}
            <Badge className={getCategoryColor(template.category)}>
              {getCategoryLabel(template.category)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="phases">Fases</TabsTrigger>
              <TabsTrigger value="kpis">KPIs</TabsTrigger>
              <TabsTrigger value="briefing">Briefing</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Informações Básicas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Descrição</label>
                      <p className="text-sm">{template.description}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Categoria</label>
                      <p className="text-sm">{getCategoryLabel(template.category)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Idioma</label>
                      <p className="text-sm">{template.language.toUpperCase()}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Configurações</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Preço Base</label>
                      <p className="text-sm">R$ {template.pricing.base_price.toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Horas Estimadas</label>
                      <p className="text-sm">{template.pricing.estimated_hours} horas</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Duração</label>
                      <p className="text-sm">{getDurationLabel(template)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Ciclo de Cobrança</label>
                      <p className="text-sm">{getBillingLabel(template.pricing.billing_cycle)}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Estatísticas */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Estatísticas do Template</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {template.deliverables.length}
                      </div>
                      <div className="text-sm text-gray-600">Fases</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {template.deliverables.reduce((sum, d) => sum + d.tasks.length, 0)}
                      </div>
                      <div className="text-sm text-gray-600">Tarefas</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {template.default_kpis.length}
                      </div>
                      <div className="text-sm text-gray-600">KPIs</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {template.briefing_template.questions.length}
                      </div>
                      <div className="text-sm text-gray-600">Perguntas</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Phases Tab */}
            <TabsContent value="phases" className="space-y-4">
              {template.deliverables.map((phase, index) => (
                <Card key={phase.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target className="w-5 h-5" />
                        <span>{phase.name}</span>
                        <Badge variant="outline">{phase.order}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{phase.estimated_hours}h</Badge>
                        {phase.required && (
                          <Badge variant="destructive">Obrigatório</Badge>
                        )}
                        {phase.recurring && (
                          <Badge variant="outline" className="text-green-600">
                            Recorrente
                          </Badge>
                        )}
                        {phase.frequency && (
                          <Badge variant="outline" className="text-blue-600">
                            {phase.frequency}
                          </Badge>
                        )}
                      </div>
                    </CardTitle>
                    <p className="text-sm text-gray-600">{phase.description}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {phase.tasks.map((task, taskIndex) => (
                        <div key={task.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{getTaskTypeIcon(task.type)}</span>
                              <h4 className="font-medium">{task.title}</h4>
                              <Badge className={getPriorityColor(task.priority)}>
                                {task.priority}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{task.estimated_hours}h</Badge>
                              <Badge variant="secondary">{task.type}</Badge>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                          <div className="space-y-1">
                            {task.checklist.map((item, itemIndex) => (
                              <div key={itemIndex} className="flex items-center gap-2 text-sm">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                <span className={item.required ? 'font-medium' : 'text-gray-600'}>
                                  {item.text}
                                </span>
                                {item.required && (
                                  <Badge variant="destructive" className="text-xs">
                                    Obrigatório
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* KPIs Tab */}
            <TabsContent value="kpis" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {template.default_kpis.map((kpi) => (
                  <Card key={kpi.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        {kpi.name}
                        <Badge variant="outline">{kpi.category}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Descrição</label>
                        <p className="text-sm">{kpi.description}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Fórmula</label>
                        <p className="text-sm font-mono bg-gray-100 p-2 rounded">
                          {kpi.formula}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Valor Alvo</label>
                        <p className="text-sm">
                          {kpi.target_value !== null ? kpi.target_value : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Frequência</label>
                        <p className="text-sm">
                          {kpi.frequency === 'monthly' ? 'Mensal' :
                           kpi.frequency === 'quarterly' ? 'Trimestral' :
                           kpi.frequency === 'yearly' ? 'Anual' : 'Único'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Alertas</label>
                        <div className="flex gap-2">
                          <Badge variant="outline" className="text-xs">
                            Baixo: {kpi.alert_thresholds.low || 'N/A'}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Alto: {kpi.alert_thresholds.high || 'N/A'}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Briefing Tab */}
            <TabsContent value="briefing" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    {template.briefing_template.title}
                  </CardTitle>
                  <p className="text-sm text-gray-600">{template.briefing_template.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {template.briefing_template.questions.map((question, index) => (
                      <div key={question.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{question.text}</h4>
                          {question.required && (
                            <Badge variant="destructive">Obrigatório</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{question.type}</Badge>
                          {question.options && (
                            <Badge variant="secondary">
                              {question.options.length} opções
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

