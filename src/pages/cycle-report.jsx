import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CyclePlan, Client, Service, LearningEntry } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Loader2, 
  Download, 
  Share2, 
  TrendingUp, 
  Calendar,
  Target,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  FileText,
  ArrowRight,
  Star,
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';

const MetricCard = ({ label, value, suffix = "", trend, icon: Icon, color = "blue" }) => (
  <Card className="relative overflow-hidden">
    <CardContent className="pt-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{label}</p>
          <p className={`text-2xl font-bold text-${color}-600 mt-1`}>
            {value !== null && value !== undefined ? `${value}${suffix}` : '—'}
          </p>
          {trend && (
            <p className={`text-xs mt-1 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend > 0 ? '+' : ''}{trend}% vs anterior
            </p>
          )}
        </div>
        {Icon && (
          <div className={`p-3 bg-${color}-100 rounded-full`}>
            <Icon className={`w-6 h-6 text-${color}-600`} />
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);

const StatusIndicator = ({ status, label }) => {
  const config = {
    excellent: { color: 'bg-green-100 text-green-800', icon: CheckCircle2, label: 'Excelente' },
    good: { color: 'bg-blue-100 text-blue-800', icon: TrendingUp, label: 'Bom' },
    attention: { color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle, label: 'Atenção' },
    poor: { color: 'bg-red-100 text-red-800', icon: AlertTriangle, label: 'Crítico' }
  };

  const { color, icon: Icon } = config[status] || config.good;

  return (
    <Badge className={`${color} flex items-center gap-1`}>
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  );
};

const SatisfactionStars = ({ score }) => {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${
            star <= score ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300'
          }`}
        />
      ))}
      <span className="ml-2 text-sm text-slate-600">({score}/5)</span>
    </div>
  );
};

export default function CycleReport() {
  const { cycleId } = useParams();
  const navigate = useNavigate();
  const { agency, user } = useSession();
  
  const [cycle, setCycle] = useState(null);
  const [client, setClient] = useState(null);
  const [service, setService] = useState(null);
  const [learnings, setLearnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (cycleId && agency?.id) {
      loadReportData();
    }
  }, [cycleId, agency?.id]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const cycleData = await CyclePlan.get(cycleId);
      if (!cycleData || cycleData.agencyId !== agency.id) {
        toast.error("Relatório não encontrado ou sem permissão");
        navigate('/cycles');
        return;
      }

      const [clientData, serviceData] = await Promise.all([
        Client.get(cycleData.clientId),
        Service.get(cycleData.serviceId)
      ]);

      setCycle(cycleData);
      setClient(clientData);
      setService(serviceData);

      // Carregar aprendizados relacionados ao ciclo
      const cycleLearnings = await LearningEntry.filter({
        agencyId: agency.id,
        sourceRef: cycleId,
        sourceType: 'execution'
      });
      setLearnings(cycleLearnings);

    } catch (error) {
      console.error("Erro ao carregar relatório:", error);
      toast.error("Falha ao carregar relatório");
      navigate('/cycles');
    } finally {
      setLoading(false);
    }
  };

  const calculatePerformanceStatus = (results) => {
    if (!results) return 'attention';
    
    const { ctr, conversion_rate, roas } = results;
    let score = 0;
    
    if (ctr >= 2.0) score += 1;
    if (conversion_rate >= 3.0) score += 1;
    if (roas >= 4.0) score += 1;
    
    if (score >= 3) return 'excellent';
    if (score >= 2) return 'good';
    if (score >= 1) return 'attention';
    return 'poor';
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      // Aqui você implementaria a geração do PDF
      // Por ora, vamos simular
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success("PDF exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      toast.error("Falha ao exportar PDF");
    } finally {
      setExporting(false);
    }
  };

  const handleShareReport = async () => {
    try {
      const reportUrl = `${window.location.origin}${createPageUrl(`cycle-report/${cycleId}`)}`;
      await navigator.clipboard.writeText(reportUrl);
      toast.success("Link do relatório copiado!");
    } catch (error) {
      toast.error("Falha ao copiar link");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  const closingData = cycle?.closing_data || {};
  const results = closingData.results || {};
  const performanceStatus = calculatePerformanceStatus(results);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Relatório de Ciclo</h1>
          <p className="text-slate-600 mt-1">
            {client?.name} - {service?.name}
          </p>
          <div className="flex items-center gap-3 mt-3">
            <Badge className="bg-slate-100 text-slate-800">
              {cycle?.cyclePeriod}
            </Badge>
            <Badge className="bg-green-100 text-green-800">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Concluído
            </Badge>
            <StatusIndicator status={performanceStatus} label="Performance Geral" />
            {cycle?.created_date && (
              <span className="text-sm text-slate-500">
                Finalizado {formatDistanceToNow(new Date(cycle.updated_date), { addSuffix: true, locale: ptBR })}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleShareReport}>
            <Share2 className="w-4 h-4 mr-2" />
            Compartilhar
          </Button>
          <Button 
            variant="outline" 
            onClick={handleExportPDF}
            disabled={exporting}
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Exportar PDF
          </Button>
          <Button onClick={() => navigate('/cycles')}>
            <ArrowRight className="w-4 h-4 mr-2" />
            Ver Todos os Ciclos
          </Button>
        </div>
      </div>

      {/* Resumo Executivo */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid lg:grid-cols-3 gap-6"
      >
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Resumo Executivo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {closingData.achievements && (
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Principais Conquistas</h4>
                <p className="text-slate-700">{closingData.achievements}</p>
              </div>
            )}
            
            {closingData.challenges && (
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Desafios Superados</h4>
                <p className="text-slate-700">{closingData.challenges}</p>
              </div>
            )}
            
            {closingData.next_cycle_recommendations && (
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Recomendações</h4>
                <p className="text-slate-700">{closingData.next_cycle_recommendations}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Satisfação do Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {closingData.satisfaction_score && (
              <div>
                <SatisfactionStars score={closingData.satisfaction_score} />
              </div>
            )}
            
            {closingData.client_feedback && (
              <div>
                <h4 className="font-semibold text-slate-900 mb-2 text-sm">Feedback</h4>
                <p className="text-sm text-slate-600 italic">"{closingData.client_feedback}"</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Métricas de Performance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Métricas de Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                label="Impressões"
                value={results.impressions?.toLocaleString('pt-BR')}
                icon={Target}
                color="blue"
              />
              <MetricCard
                label="Cliques"
                value={results.clicks?.toLocaleString('pt-BR')}
                icon={TrendingUp}
                color="green"
              />
              <MetricCard
                label="CTR"
                value={results.ctr}
                suffix="%"
                icon={BarChart3}
                color="purple"
              />
              <MetricCard
                label="Conversões"
                value={results.conversions}
                icon={CheckCircle2}
                color="orange"
              />
            </div>
            
            <Separator className="my-6" />
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                label="Taxa de Conversão"
                value={results.conversion_rate}
                suffix="%"
                color="green"
              />
              <MetricCard
                label="Custo Total"
                value={results.cost ? `R$ ${results.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : null}
                color="red"
              />
              <MetricCard
                label="CPL"
                value={results.cpl ? `R$ ${results.cpl.toFixed(2)}` : null}
                color="yellow"
              />
              <MetricCard
                label="ROAS"
                value={results.roas}
                suffix="x"
                color="blue"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Plano Original vs Resultados */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid lg:grid-cols-2 gap-6"
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Plano Original
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cycle?.planData?.mudancaChave && (
              <div>
                <h4 className="font-semibold text-slate-900 mb-2 text-sm">Mudança-Chave</h4>
                <p className="text-sm text-slate-700">{cycle.planData.mudancaChave}</p>
              </div>
            )}
            
            {cycle?.planData?.prioridades && cycle.planData.prioridades.length > 0 && (
              <div>
                <h4 className="font-semibold text-slate-900 mb-2 text-sm">Prioridades</h4>
                <ul className="space-y-1">
                  {cycle.planData.prioridades.slice(0, 3).map((prioridade, idx) => (
                    <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full mt-2 flex-shrink-0"></span>
                      {typeof prioridade === 'string' ? prioridade : prioridade.tarefa || prioridade}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Aprendizados Extraídos ({learnings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {learnings.length > 0 ? (
              <div className="space-y-3">
                {learnings.slice(0, 3).map((learning) => (
                  <div key={learning.id} className="p-3 bg-slate-50 rounded-lg">
                    <h4 className="font-medium text-sm text-slate-900">{learning.title}</h4>
                    <p className="text-xs text-slate-600 mt-1">{learning.description}</p>
                    <div className="flex justify-between items-center mt-2">
                      <Badge variant="outline" className="text-xs">
                        Confiança: {learning.confidence_score}%
                      </Badge>
                    </div>
                  </div>
                ))}
                {learnings.length > 3 && (
                  <p className="text-xs text-slate-500 text-center">
                    ... e mais {learnings.length - 3} aprendizados
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-6">
                Nenhum aprendizado foi extraído deste ciclo
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Footer */}
      <Card className="border-t-4 border-t-purple-500">
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-sm text-slate-600">
              Relatório gerado automaticamente pelo sistema EvolvIA em {' '}
              {new Date().toLocaleDateString('pt-BR', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              ID do Ciclo: {cycleId} | Agência: {agency?.agencyName}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}