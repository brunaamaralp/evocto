import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  FileText, Download, Settings, Calendar, 
  TrendingUp, BarChart3, FileSpreadsheet, Target
} from 'lucide-react';
import { toast } from 'sonner';
import { generateCustomReports } from '@/api/functions';
import { resolveServiceCategory } from '@/constants/serviceCategories';

const REPORT_TYPES = {
  service_status: {
    name: 'Status do Serviço',
    icon: BarChart3,
    description: 'Etapa atual, próximos marcos e análise de riscos',
    category: 'Operacional',
    formats: ['pdf', 'csv']
  },
  tasks_schedule: {
    name: 'Cronograma de Tarefas',
    icon: Calendar,
    description: 'Lista completa de tarefas e timeline do projeto',
    category: 'Operacional',
    formats: ['pdf', 'csv']
  },
  diagnostic_final: {
    name: 'Diagnóstico Final',
    icon: Target,
    description: 'Relatório consolidado do diagnóstico de comunicação e marca',
    category: 'Diagnóstico',
    formats: ['pdf']
  },
  content_strategy_report: {
    name: 'Estratégia de Conteúdo',
    icon: TrendingUp,
    description: 'Pilares, narrativa e calendário editorial definidos',
    category: 'Conteúdo',
    formats: ['pdf']
  },
  marketing_360_monthly: {
    name: 'Marketing 360 Mensal',
    icon: FileText,
    description: 'Relatório mensal do retainer de marketing operacional',
    category: 'Marketing 360',
    formats: ['pdf']
  },
  marketing_360_final: {
    name: 'Marketing 360 — Encerramento',
    icon: FileSpreadsheet,
    description: 'Relatório de encerramento do ciclo / contrato',
    category: 'Marketing 360',
    formats: ['pdf']
  }
};

export default function CustomReportGenerator({ 
  serviceId, 
  clientId, 
  serviceName,
  serviceCategory,
  onReportGenerated 
}) {
  const [selectedReport, setSelectedReport] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('pdf');
  const [reportData, setReportData] = useState({});
  const [customNotes, setCustomNotes] = useState('');
  const [generating, setGenerating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Filtrar relatórios baseado na categoria do serviço
  const getAvailableReports = () => {
    const resolvedCategory = resolveServiceCategory(serviceCategory);
    const categoryReports = {
      marketing_digital: ['service_status', 'tasks_schedule', 'diagnostic_final', 'gf360_monthly', 'gf360_final'],
      branding: ['service_status', 'tasks_schedule'],
      comunicacao: ['service_status', 'tasks_schedule', 'diagnostic_final'],
      midia_paga: ['service_status', 'tasks_schedule'],
      organico: ['service_status', 'tasks_schedule'],
      conteudo: ['service_status', 'tasks_schedule', 'diagnostic_final'],
      copywriting: ['service_status', 'tasks_schedule'],
      design: ['service_status', 'tasks_schedule'],
      email_marketing: ['service_status', 'tasks_schedule'],
      analytics: ['service_status', 'tasks_schedule', 'diagnostic_final'],
      automacao: ['service_status', 'tasks_schedule'],
      produto: ['service_status', 'tasks_schedule'],
      desenvolvimento: ['service_status', 'tasks_schedule'],
      consultoria_estrategica: ['service_status', 'tasks_schedule', 'margin_implementation'],
    };

    const availableTypes = categoryReports[resolvedCategory] || ['service_status', 'tasks_schedule'];
    
    return Object.entries(REPORT_TYPES).filter(([key]) => 
      availableTypes.includes(key)
    );
  };

  const handleGenerateReport = async () => {
    if (!selectedReport) {
      toast.error('Selecione um tipo de relatório');
      return;
    }

    setGenerating(true);
    
    try {
      const payload = {
        reportType: selectedReport,
        serviceId,
        clientId,
        format: selectedFormat,
        autoSave: true,
        reportData: {
          ...reportData,
          customNotes: customNotes.trim(),
          generatedBy: 'user_request',
          timestamp: new Date().toISOString()
        }
      };

      const result = await generateCustomReports(payload);
      
      if (result.status === 200) {
        // Download do arquivo
        const blob = new Blob([result.data], { 
          type: selectedFormat === 'pdf' ? 'application/pdf' : 'text/csv' 
        });
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${REPORT_TYPES[selectedReport].name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.${selectedFormat}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();

        toast.success('Relatório gerado com sucesso');
        onReportGenerated?.();
        
        // Reset form
        setSelectedReport('');
        setReportData({});
        setCustomNotes('');
        
      } else {
        throw new Error('Falha na geração do relatório');
      }
      
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast.error('Erro ao gerar relatório');
    } finally {
      setGenerating(false);
    }
  };

  const reportConfig = selectedReport ? REPORT_TYPES[selectedReport] : null;
  const ReportIcon = reportConfig?.icon || FileText;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Relatórios Customizados</h3>
          <p className="text-sm text-gray-600">Gere relatórios específicos para este serviço</p>
        </div>
      </div>

      <div className="grid gap-4">
        {/* Seleção do Tipo de Relatório */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tipo de Relatório</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              {getAvailableReports().map(([key, config]) => (
                <div
                  key={key}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedReport === key
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedReport(key)}
                >
                  <div className="flex items-start gap-3">
                    <config.icon className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{config.name}</h4>
                        <Badge variant="outline" className="text-xs">
                          {config.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{config.description}</p>
                      <div className="flex gap-1 mt-2">
                        {config.formats.map(format => (
                          <Badge key={format} variant="secondary" className="text-xs">
                            {format.toUpperCase()}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Configurações do Relatório */}
        {selectedReport && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ReportIcon className="w-4 h-4" />
                Configurações - {reportConfig.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Formato */}
              <div className="space-y-2">
                <Label>Formato</Label>
                <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {reportConfig.formats.map(format => (
                      <SelectItem key={format} value={format}>
                        {format.toUpperCase()} - {format === 'pdf' ? 'Documento' : 'Planilha'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Notas Personalizadas */}
              <div className="space-y-2">
                <Label>Observações Adicionais</Label>
                <Textarea
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="Adicione observações específicas para este relatório..."
                  rows={3}
                />
              </div>

              {/* Configurações Avançadas */}
              <Dialog open={showAdvanced} onOpenChange={setShowAdvanced}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4 mr-2" />
                    Configurações Avançadas
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Configurações Avançadas</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <p className="text-sm text-gray-600">
                      Configurações específicas para {reportConfig.name}
                    </p>
                    
                    {/* Configurações específicas por tipo de relatório */}
                    {selectedReport === 'gf360_monthly' && (
                      <div className="space-y-2">
                        <Label>Mês de Referência</Label>
                        <Select 
                          value={reportData.month || ''} 
                          onValueChange={(value) => setReportData({...reportData, month: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o mês" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({length: 12}, (_, i) => {
                              const date = new Date(2024, i, 1);
                              const monthName = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                              return (
                                <SelectItem key={i} value={monthName}>
                                  {monthName}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {selectedReport === 'margin_implementation' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Margem Antes (%)</Label>
                            <input
                              type="number"
                              className="w-full px-3 py-2 border rounded-md"
                              value={reportData.marginBefore || ''}
                              onChange={(e) => setReportData({
                                ...reportData, 
                                marginBefore: parseFloat(e.target.value) || 0
                              })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Margem Depois (%)</Label>
                            <input
                              type="number"
                              className="w-full px-3 py-2 border rounded-md"
                              value={reportData.marginAfter || ''}
                              onChange={(e) => setReportData({
                                ...reportData, 
                                marginAfter: parseFloat(e.target.value) || 0
                              })}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        )}

        {/* Botão de Geração */}
        {selectedReport && (
          <div className="flex justify-end">
            <Button 
              onClick={handleGenerateReport}
              disabled={generating}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Gerando...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Gerar Relatório
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}