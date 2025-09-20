
import React, { useState, useEffect, useCallback } from 'react';
import { CyclePlan, Service } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  BarChart3, Download, Calendar, CheckCircle, 
  TrendingUp, Target, Lightbulb, FileText,
  ExternalLink, Eye, Activity, Award
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const getStatusBadge = (status) => {
  const statusConfig = {
    'completed': { color: 'bg-green-100 text-green-700', label: 'Concluído', icon: CheckCircle },
    'approved': { color: 'bg-blue-100 text-blue-700', label: 'Aprovado', icon: CheckCircle },
    'in_execution': { color: 'bg-yellow-100 text-yellow-700', label: 'Em Execução', icon: Activity }
  };

  const config = statusConfig[status] || statusConfig.completed;
  const Icon = config.icon;

  return (
    <Badge className={`${config.color} flex items-center gap-1`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
};

const CyclePlanCard = ({ cycle, service }) => {
  const handleDownloadPDF = async () => {
    if (cycle.approvalData?.pdfUrl) {
      try {
        const link = document.createElement('a');
        link.href = cycle.approvalData.pdfUrl;
        link.download = `relatorio-${cycle.cyclePeriod.replace(/\s+/g, '-').toLowerCase()}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Download iniciado');
      } catch (error) {
        toast.error('Erro ao fazer download');
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="group"
    >
      <Card className="h-full hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg font-semibold text-gray-900 mb-2">
                Relatório - {cycle.cyclePeriod}
              </CardTitle>
              <div className="flex items-center gap-2 mb-3">
                {getStatusBadge(cycle.status)}
                <Badge variant="outline" className="text-xs">
                  {service?.name || 'Serviço'}
                </Badge>
              </div>
              
              {cycle.planData?.mudancaChave && (
                <p className="text-sm text-gray-600 line-clamp-2">
                  {cycle.planData.mudancaChave}
                </p>
              )}
            </div>
            
            <div className="text-right text-sm text-gray-500 ml-4">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {cycle.contextData?.generatedAt ? 
                  format(new Date(cycle.contextData.generatedAt), 'MMM yyyy', { locale: ptBR }) :
                  format(new Date(cycle.updated_date), 'MMM yyyy', { locale: ptBR })
                }
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Resultados e Métricas */}
          {(cycle.contextData?.results || cycle.closing_notes) && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Resultados do Ciclo
              </h4>
              {cycle.closing_notes ? (
                <p className="text-sm text-blue-800">
                  {cycle.closing_notes}
                </p>
              ) : (
                <div className="text-sm text-blue-800 space-y-1">
                  {typeof cycle.contextData.results === 'object' 
                    ? Object.entries(cycle.contextData.results).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="capitalize">{key.replace(/_/g, ' ')}:</span>
                          <span className="font-medium">{value}</span>
                        </div>
                      ))
                    : cycle.contextData.results
                  }
                </div>
              )}
            </div>
          )}

          {/* Prioridades Realizadas */}
          {cycle.planData?.prioridades && cycle.planData.prioridades.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Principais Atividades
              </h4>
              <ul className="space-y-1">
                {cycle.planData.prioridades.slice(0, 3).map((prioridade, index) => (
                  <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>
                      {typeof prioridade === 'string' ? prioridade : prioridade.tarefa || 'Atividade realizada'}
                    </span>
                  </li>
                ))}
                {cycle.planData.prioridades.length > 3 && (
                  <li className="text-xs text-gray-500 ml-6">
                    +{cycle.planData.prioridades.length - 3} outras atividades
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Aprendizados Aplicados */}
          {cycle.contextData?.basedOnLearnings > 0 && (
            <div className="bg-purple-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-purple-800">
                <Lightbulb className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {cycle.contextData.basedOnLearnings} insights aplicados neste ciclo
                </span>
              </div>
            </div>
          )}

          <Separator />

          {/* Ações */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              {cycle.approvalData?.approved_at ? 
                `Aprovado em ${format(new Date(cycle.approvalData.approved_at), 'dd MMM yyyy', { locale: ptBR })}` :
                `Concluído em ${format(new Date(cycle.updated_date), 'dd MMM yyyy', { locale: ptBR })}`
              }
            </div>
            
            <div className="flex items-center gap-2">
              {cycle.approvalData?.pdfUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Download className="w-4 h-4" />
                  PDF
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default function CycleReportsView({ clientId }) {
  const [cycles, setCycles] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadCycleReports = useCallback(async () => {
    try {
      setLoading(true);

      // Buscar ciclos concluídos/aprovados do cliente
      const cyclesList = await CyclePlan.filter({ 
        clientId: clientId,
        status: { $in: ['completed', 'approved'] }
      }, '-updated_date');

      setCycles(cyclesList);

      // Buscar serviços para mapear nomes
      if (cyclesList.length > 0) {
        const serviceIds = [...new Set(cyclesList.map(c => c.serviceId))];
        const servicesList = await Service.filter({
          id: { $in: serviceIds }
        });
        setServices(servicesList);
      }
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error);
      toast.error('Erro ao carregar relatórios');
    } finally {
      setLoading(false);
    }
  }, [clientId]); // clientId is a dependency for useCallback

  useEffect(() => {
    if (clientId) {
      loadCycleReports();
    }
  }, [clientId, loadCycleReports]); // loadCycleReports is now a stable function due to useCallback

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="animate-pulse bg-gray-200 h-64 rounded-lg"></div>
        ))}
      </div>
    );
  }

  if (cycles.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Nenhum Relatório Disponível
          </h3>
          <p className="text-gray-600">
            Os relatórios dos ciclos concluídos aparecerão aqui quando estiverem disponíveis.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Relatórios de Ciclo</h2>
          <p className="text-gray-600 mt-1">
            Acompanhe os resultados e entregas de cada período
          </p>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Award className="w-4 h-4" />
          <span>{cycles.length} relatório(s) disponível(eis)</span>
        </div>
      </div>

      {/* Grade de Relatórios */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cycles.map((cycle) => {
          const service = services.find(s => s.id === cycle.serviceId);
          return (
            <CyclePlanCard
              key={cycle.id}
              cycle={cycle}
              service={service}
            />
          );
        })}
      </div>

      {/* Resumo de Performance */}
      {cycles.length > 1 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Resumo de Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{cycles.length}</p>
                <p className="text-sm text-gray-600">Ciclos Concluídos</p>
              </div>
              
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {Math.round(cycles.reduce((sum, c) => sum + (c.contextData?.basedOnLearnings || 0), 0) / cycles.length)}
                </p>
                <p className="text-sm text-gray-600">Insights Médios/Ciclo</p>
              </div>
              
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {cycles.reduce((sum, c) => sum + (c.planData?.prioridades?.length || 0), 0)}
                </p>
                <p className="text-sm text-gray-600">Atividades Realizadas</p>
              </div>
              
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">
                  {cycles.filter(c => c.approvalData?.pdfUrl).length}
                </p>
                <p className="text-sm text-gray-600">Relatórios com PDF</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
