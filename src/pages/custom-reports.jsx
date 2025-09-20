import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { Client } from '@/api/entities';
import { Service } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  FileText, Download, Calendar, Filter, 
  BarChart3, PieChart, TrendingUp, Users,
  Settings, Eye, Plus, Clock
} from 'lucide-react';
import LoadingState from '@/components/shared/LoadingState';
import EmptyState from '@/components/shared/EmptyState';
import { toast } from 'sonner';
import { generateCustomReports } from '@/api/functions';

const REPORT_TYPES = [
  {
    id: 'service_status',
    name: 'Status de Serviços',
    description: 'Relatório detalhado do estado atual dos serviços',
    icon: BarChart3,
    formats: ['pdf', 'csv']
  },
  {
    id: 'tasks_schedule',
    name: 'Cronograma de Tarefas', 
    description: 'Cronograma completo das tarefas por cliente/serviço',
    icon: Calendar,
    formats: ['pdf', 'csv']
  },
  {
    id: 'diagnostic_final',
    name: 'Diagnóstico Final',
    description: 'Relatório consolidado de diagnóstico financeiro',
    icon: TrendingUp,
    formats: ['pdf']
  },
  {
    id: 'margin_implementation',
    name: 'Implementação - Aumento de Margem',
    description: 'Resultados da implementação de aumento de margem',
    icon: PieChart,
    formats: ['pdf']
  },
  {
    id: 'gf360_monthly',
    name: 'GF360 Mensal',
    description: 'Relatório mensal da Gestão Financeira 360',
    icon: FileText,
    formats: ['pdf']
  },
  {
    id: 'gf360_final',
    name: 'GF360 Final',
    description: 'Relatório final de encerramento GF360 (10 meses)',
    icon: Settings,
    formats: ['pdf']
  }
];

export default function CustomReportsPage() {
  const { user, agencyId } = useSession();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [recentReports, setRecentReports] = useState([]);
  
  const [selectedReportType, setSelectedReportType] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('pdf');
  const [reportData, setReportData] = useState({});

  // Carregar dados iniciais
  useEffect(() => {
    const loadData = async () => {
      if (!agencyId) return;

      try {
        setLoading(true);
        
        const [clientsData, servicesData] = await Promise.all([
          Client.filter({ agencyId }),
          Service.filter({ agencyId, is_template: false })
        ]);

        setClients(clientsData || []);
        setServices(servicesData || []);
        
        // TODO: Carregar histórico de relatórios recentes
        setRecentReports([]);
        
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast.error('Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [agencyId]);

  // Filtrar serviços pelo cliente selecionado
  const filteredServices = selectedClient 
    ? services.filter(s => s.clientId === selectedClient)
    : services;

  const selectedReportConfig = REPORT_TYPES.find(r => r.id === selectedReportType);
  const selectedClientData = clients.find(c => c.id === selectedClient);
  const selectedServiceData = services.find(s => s.id === selectedService);

  const handleGenerateReport = async () => {
    if (!selectedReportType || !selectedClient) {
      toast.error('Selecione o tipo de relatório e cliente');
      return;
    }

    try {
      setGenerating(true);
      
      const reportPayload = {
        reportType: selectedReportType,
        serviceId: selectedService || null,
        clientId: selectedClient,
        format: selectedFormat,
        autoSave: true,
        reportData: {
          ...reportData,
          generatedBy: user.email,
          generatedAt: new Date().toISOString()
        }
      };

      const result = await generateCustomReports(reportPayload);
      
      if (result.status === 200) {
        // Criar link de download
        const blob = new Blob([result.data], { 
          type: selectedFormat === 'pdf' ? 'application/pdf' : 'text/csv' 
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedReportType}_${selectedClientData?.name}_${Date.now()}.${selectedFormat}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();

        toast.success('Relatório gerado com sucesso!');
        
        // Adicionar à lista de relatórios recentes
        const newReport = {
          id: Date.now(),
          type: selectedReportType,
          typeName: selectedReportConfig?.name,
          client: selectedClientData?.name,
          service: selectedServiceData?.name,
          format: selectedFormat,
          generatedAt: new Date().toISOString(),
          generatedBy: user.full_name
        };
        setRecentReports(prev => [newReport, ...prev.slice(0, 9)]);
        
      } else {
        throw new Error('Falha na geração do relatório');
      }
      
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast.error('Erro ao gerar relatório: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <LoadingState message="Carregando dados para relatórios..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Relatórios Customizados</h1>
          <p className="text-gray-600 mt-1">
            Gere relatórios personalizados para seus clientes e serviços
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Painel de configuração */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Seleção do tipo de relatório */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Tipo de Relatório
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {REPORT_TYPES.map(report => (
                    <div
                      key={report.id}
                      onClick={() => setSelectedReportType(report.id)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedReportType === report.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <report.icon className={`w-5 h-5 mt-1 ${
                          selectedReportType === report.id ? 'text-blue-600' : 'text-gray-500'
                        }`} />
                        <div>
                          <h3 className="font-medium text-gray-900">{report.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">{report.description}</p>
                          <div className="flex gap-1 mt-2">
                            {report.formats.map(format => (
                              <Badge key={format} variant="outline" className="text-xs">
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

            {/* Configurações do relatório */}
            {selectedReportType && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Configurações
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  
                  {/* Cliente */}
                  <div>
                    <Label htmlFor="client">Cliente *</Label>
                    <Select value={selectedClient} onValueChange={setSelectedClient}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map(client => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Serviço (opcional) */}
                  <div>
                    <Label htmlFor="service">Serviço (opcional)</Label>
                    <Select value={selectedService} onValueChange={setSelectedService}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos os serviços" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>Todos os serviços</SelectItem>
                        {filteredServices.map(service => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Formato */}
                  <div>
                    <Label htmlFor="format">Formato</Label>
                    <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedReportConfig?.formats.map(format => (
                          <SelectItem key={format} value={format}>
                            {format.toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Campos específicos do relatório */}
                  {selectedReportType === 'gf360_monthly' && (
                    <div>
                      <Label htmlFor="month">Mês de Referência</Label>
                      <Input
                        type="month"
                        value={reportData.month || ''}
                        onChange={(e) => setReportData(prev => ({ ...prev, month: e.target.value }))}
                      />
                    </div>
                  )}

                  {selectedReportType === 'margin_implementation' && (
                    <div>
                      <Label htmlFor="roi">ROI Alcançado (%)</Label>
                      <Input
                        type="number"
                        placeholder="Ex: 312"
                        value={reportData.roi || ''}
                        onChange={(e) => setReportData(prev => ({ ...prev, roi: e.target.value }))}
                      />
                    </div>
                  )}

                  {/* Botão de gerar */}
                  <Separator />
                  <Button 
                    onClick={handleGenerateReport}
                    disabled={!selectedReportType || !selectedClient || generating}
                    className="w-full"
                  >
                    {generating ? (
                      <>
                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                        Gerando Relatório...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Gerar Relatório
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Painel lateral - Relatórios recentes */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Relatórios Recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentReports.length > 0 ? (
                  <div className="space-y-3">
                    {recentReports.map(report => (
                      <div 
                        key={report.id}
                        className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-gray-900">
                              {report.typeName}
                            </h4>
                            <p className="text-xs text-gray-600">
                              {report.client}
                              {report.service && ` • ${report.service}`}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(report.generatedAt).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {report.format.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={FileText}
                    title="Nenhum relatório gerado"
                    description="Seus relatórios recentes aparecerão aqui"
                    className="py-8"
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}