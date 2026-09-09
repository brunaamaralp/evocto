import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '@/components/auth/SessionManager';
import { Client } from '@/api/entities';
import { Service } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  FileText, Download, Calendar, 
  BarChart3, PieChart, TrendingUp,
  Settings, Clock, ArrowRight
} from 'lucide-react';
import LoadingState from '@/components/shared/LoadingState';
import EmptyState from '@/components/shared/EmptyState';
import { toast } from 'sonner';
import { generateCustomReports } from '@/api/functions';
import { getModulePastel, getCardPastel } from '@/lib/modulePastels';
import { createPageUrl } from '@/utils';

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
    description: 'Relatório consolidado de diagnóstico de comunicação e marca',
    icon: TrendingUp,
    formats: ['pdf']
  },
  {
    id: 'content_strategy_report',
    name: 'Estratégia de Conteúdo',
    description: 'Pilares, narrativa e calendário editorial definidos',
    icon: PieChart,
    formats: ['pdf']
  },
  {
    id: 'marketing_360_monthly',
    name: 'Marketing 360 Mensal',
    description: 'Relatório mensal do retainer de marketing operacional',
    icon: FileText,
    formats: ['pdf']
  },
  {
    id: 'marketing_360_final',
    name: 'Marketing 360 — Encerramento',
    description: 'Relatório final de encerramento do ciclo / contrato',
    icon: Settings,
    formats: ['pdf']
  }
];

export default function CustomReportsPage() {
  const { user, agencyId } = useSession();
  const pastel = getModulePastel('reports');
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
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#18162A]">Relatórios Customizados</h1>
        <p className="text-[#7A7595] mt-1">
          Gere relatórios personalizados para seus clientes e serviços
        </p>
      </div>

      <Card className="border-transparent bg-[#FFF0E6]">
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-white/80 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-[#E8955A]" />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-[#18162A]">Hub de horas</h2>
              <p className="text-sm text-[#7A7595] mt-0.5">
                Consulte tempo registrado da equipe, por período e por pessoa
              </p>
            </div>
          </div>
          <Button asChild className="shrink-0">
            <Link to={createPageUrl('hours-hub')}>
              Abrir hub
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className={`border-transparent ${pastel.soft}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#7A7595]" />
                Tipo de Relatório
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {REPORT_TYPES.map((report, index) => {
                  const cardPastel = getCardPastel(index);
                  const isSelected = selectedReportType === report.id;
                  return (
                    <div
                      key={report.id}
                      onClick={() => setSelectedReportType(report.id)}
                      className={`p-4 rounded-2xl cursor-pointer transition-all border ${
                        isSelected
                          ? `border-[#6C47D8] ring-2 ring-[#6C47D8]/20 ${cardPastel.bg}`
                          : `border-transparent hover:shadow-[var(--shadow-elevated)] ${cardPastel.bg}`
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <report.icon className={`w-5 h-5 mt-1 shrink-0 ${
                          isSelected ? 'text-[#6C47D8]' : cardPastel.text
                        }`} />
                        <div>
                          <h3 className="font-medium text-[#18162A]">{report.name}</h3>
                          <p className="text-sm text-[#7A7595] mt-1">{report.description}</p>
                          <div className="flex gap-1 mt-2">
                            {report.formats.map(format => (
                              <Badge key={format} variant="outline" className="text-xs bg-white/60">
                                {format.toUpperCase()}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {selectedReportType && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-[#7A7595]" />
                  Configurações
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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

        <div>
          <Card className={`border-transparent ${pastel.bg}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#7A7595]" />
                Relatórios Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentReports.length > 0 ? (
                <div className="space-y-3">
                  {recentReports.map(report => (
                    <div 
                      key={report.id}
                      className="p-3 rounded-xl bg-white/70 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-[#18162A]">
                            {report.typeName}
                          </h4>
                          <p className="text-xs text-[#7A7595]">
                            {report.client}
                            {report.service && ` • ${report.service}`}
                          </p>
                          <p className="text-xs text-[#7A7595] mt-1">
                            {new Date(report.generatedAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs bg-white/60">
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
  );
}
