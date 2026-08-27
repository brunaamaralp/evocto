import React, { useCallback } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, CheckCircle, Clock, Calendar, 
  TrendingUp, TrendingDown, AlertCircle
} from 'lucide-react';
import { SERVICE_CATEGORIES } from '@/constants/serviceCategories';

const SLA_LIMITS = Object.fromEntries(
  Object.keys(SERVICE_CATEGORIES).map((key) => [key, { max_days: 365, recommended_days: 120 }])
);

const PREDEFINED_SERVICE_DURATIONS = {
  'Diagnóstico de Comunicação e Marca': 30,
  'Estratégia de Conteúdo e Posicionamento': 45,
  'Marketing Operacional 360': 300,
  // legado
  'Diagnóstico Financeiro Avulso': 30,
  'Mentoria em Aumento de Margem': 120,
  'Gestão Financeira 360': 300
};

export default function ServiceSLAValidator({ 
  service, 
  deliverables = [], 
  onSLAWarning = null,
  showDetailed = true 
}) {
  const calculateSLAMetrics = useCallback(() => {
    const totalPhaseDays = deliverables.reduce((sum, d) => sum + (d.duration_days || 0), 0);
    const totalEstimatedHours = deliverables.reduce((sum, d) => sum + (d.estimated_hours || 0), 0);
    
    // Determinar duração esperada do serviço
    const expectedDuration = PREDEFINED_SERVICE_DURATIONS[service?.name] || 
                           SLA_LIMITS[service?.category]?.recommended_days || 
                           120; // fallback padrão
    
    const maxAllowedDuration = SLA_LIMITS[service?.category]?.max_days || 365;
    
    // Calcular métricas
    const utilizationRate = expectedDuration > 0 ? (totalPhaseDays / expectedDuration) * 100 : 0;
    const isOverBudget = totalPhaseDays > expectedDuration;
    const isCriticalOverBudget = totalPhaseDays > maxAllowedDuration;
    const efficiency = totalEstimatedHours > 0 ? totalPhaseDays / (totalEstimatedHours / 8) : 0; // assumindo 8h/dia
    
    // Identificar fases problemáticas
    const problematicPhases = deliverables.filter(d => {
      const phaseEfficiency = d.estimated_hours > 0 ? d.duration_days / (d.estimated_hours / 8) : 1;
      return phaseEfficiency > 2 || phaseEfficiency < 0.5; // muito lento ou muito rápido
    });
    
    // Sugestões de otimização
    const suggestions = [];
    
    if (isOverBudget) {
      const excessDays = totalPhaseDays - expectedDuration;
      suggestions.push({
        type: 'warning',
        message: `Serviço excede a duração recomendada em ${excessDays} dias`,
        action: 'Considere reduzir a duração das fases ou dividir em múltiplos serviços'
      });
    }
    
    if (problematicPhases.length > 0) {
      suggestions.push({
        type: 'info',
        message: `${problematicPhases.length} fase(s) com eficiência questionável`,
        action: 'Revisar estimativas de horas vs dias para as fases destacadas'
      });
    }
    
    if (efficiency < 0.7) {
      suggestions.push({
        type: 'warning',
        message: 'Baixa eficiência geral detectada',
        action: 'Considere paralelizar tarefas ou otimizar processos'
      });
    }
    
    return {
      totalPhaseDays,
      totalEstimatedHours,
      expectedDuration,
      maxAllowedDuration,
      utilizationRate,
      isOverBudget,
      isCriticalOverBudget,
      efficiency,
      problematicPhases,
      suggestions,
      workingDaysPerWeek: Math.round(totalEstimatedHours / totalPhaseDays / 8 * 7) || 5
    };
  }, [service?.name, service?.category, deliverables]);

  const metrics = calculateSLAMetrics();
  
  // Notificar callback se houver warnings
  React.useEffect(() => {
    if (onSLAWarning && (metrics.isOverBudget || metrics.suggestions.length > 0)) {
      onSLAWarning({
        hasWarnings: true,
        metrics,
        severity: metrics.isCriticalOverBudget ? 'critical' : 
                  metrics.isOverBudget ? 'high' : 'medium'
      });
    }
  }, [onSLAWarning, metrics.isOverBudget, metrics.isCriticalOverBudget, metrics.suggestions.length, metrics]);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getUtilizationStatus = () => {
    if (metrics.utilizationRate <= 85) return { color: 'text-green-600', icon: CheckCircle, label: 'Ótimo' };
    if (metrics.utilizationRate <= 100) return { color: 'text-yellow-600', icon: Clock, label: 'Adequado' };
    if (metrics.utilizationRate <= 120) return { color: 'text-orange-600', icon: AlertTriangle, label: 'Atenção' };
    return { color: 'text-red-600', icon: AlertCircle, label: 'Crítico' };
  };

  const utilizationStatus = getUtilizationStatus();
  const UtilizationIcon = utilizationStatus.icon;

  if (deliverables.length === 0) {
    return (
      <Alert className="border-gray-200 bg-gray-50">
        <Clock className="h-4 w-4" />
        <AlertDescription>
          Adicione fases ao serviço para visualizar a análise de SLA
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resumo Principal */}
      <Card className={`border-l-4 ${
        metrics.isCriticalOverBudget ? 'border-l-red-500' :
        metrics.isOverBudget ? 'border-l-orange-500' :
        'border-l-green-500'
      }`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UtilizationIcon className={`w-5 h-5 ${utilizationStatus.color}`} />
              <span>Análise de SLA</span>
              <Badge variant="outline" className={utilizationStatus.color}>
                {utilizationStatus.label}
              </Badge>
            </div>
            <div className="text-sm font-normal text-gray-600">
              {metrics.totalPhaseDays} de {metrics.expectedDuration} dias
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {metrics.totalPhaseDays}
              </div>
              <div className="text-xs text-gray-600">Dias Planejados</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {metrics.totalEstimatedHours}h
              </div>
              <div className="text-xs text-gray-600">Horas Estimadas</div>
            </div>
            
            <div className="text-center">
              <div className={`text-2xl font-bold ${utilizationStatus.color}`}>
                {Math.round(metrics.utilizationRate)}%
              </div>
              <div className="text-xs text-gray-600">Utilização SLA</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {metrics.workingDaysPerWeek}d/sem
              </div>
              <div className="text-xs text-gray-600">Intensidade</div>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Utilização do SLA</span>
              <span className="text-sm text-gray-600">
                {Math.round(metrics.utilizationRate)}%
              </span>
            </div>
            <Progress 
              value={Math.min(metrics.utilizationRate, 150)} 
              className={`h-3 ${
                metrics.utilizationRate > 100 ? '[&>div]:bg-red-500' :
                metrics.utilizationRate > 85 ? '[&>div]:bg-yellow-500' :
                '[&>div]:bg-green-500'
              }`}
              max={150}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0%</span>
              <span className="font-medium">85% (Ideal)</span>
              <span className="text-orange-600">100% (Limite)</span>
              <span className="text-red-600">150%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alertas e Sugestões */}
      {metrics.suggestions.length > 0 && (
        <div className="space-y-2">
          {metrics.suggestions.map((suggestion, index) => (
            <Alert key={index} className={getSeverityColor(suggestion.type)}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium">{suggestion.message}</div>
                <div className="text-sm mt-1">{suggestion.action}</div>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Análise Detalhada por Fase */}
      {showDetailed && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Análise por Fase ({deliverables.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {deliverables.map((deliverable, index) => {
                const phaseEfficiency = deliverable.estimated_hours > 0 
                  ? deliverable.duration_days / (deliverable.estimated_hours / 8) 
                  : 1;
                
                const isProblematic = metrics.problematicPhases.includes(deliverable);
                const phaseUtilization = metrics.expectedDuration > 0 
                  ? (deliverable.duration_days / metrics.expectedDuration) * 100 
                  : 0;

                return (
                  <div 
                    key={deliverable.id || index}
                    className={`p-3 rounded-lg border ${
                      isProblematic ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{deliverable.name}</span>
                        <Badge variant="outline" className="text-xs">
                          Fase {deliverable.phase}
                        </Badge>
                        {isProblematic && (
                          <Badge variant="destructive" className="text-xs">
                            Revisar
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        {deliverable.duration_days}d • {deliverable.estimated_hours || 0}h
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Utilização SLA:</span>
                        <span className={`ml-1 font-medium ${
                          phaseUtilization > 30 ? 'text-red-600' :
                          phaseUtilization > 20 ? 'text-orange-600' :
                          'text-green-600'
                        }`}>
                          {Math.round(phaseUtilization)}%
                        </span>
                      </div>
                      
                      <div>
                        <span className="text-gray-600">Eficiência:</span>
                        <span className={`ml-1 font-medium ${
                          phaseEfficiency > 2 || phaseEfficiency < 0.5 ? 'text-red-600' :
                          phaseEfficiency > 1.5 || phaseEfficiency < 0.7 ? 'text-orange-600' :
                          'text-green-600'
                        }`}>
                          {phaseEfficiency.toFixed(1)}x
                        </span>
                      </div>
                      
                      <div>
                        <span className="text-gray-600">Intensidade:</span>
                        <span className="ml-1 font-medium">
                          {deliverable.duration_days > 0 
                            ? Math.round((deliverable.estimated_hours || 0) / deliverable.duration_days / 8 * 7)
                            : 0}d/sem
                        </span>
                      </div>
                    </div>

                    {/* Barra de progresso da fase */}
                    <div className="mt-2">
                      <Progress 
                        value={Math.min(phaseUtilization, 50)} 
                        className="h-1" 
                        max={50}
                      />
                    </div>

                    {isProblematic && (
                      <div className="mt-2 text-xs text-orange-700">
                        {phaseEfficiency > 2 && "⚠️ Fase muito lenta - considere paralelizar tarefas"}
                        {phaseEfficiency < 0.5 && "⚠️ Fase muito acelerada - verifique estimativas"}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Cronograma Visual */}
            <div className="mt-6 pt-4 border-t">
              <h4 className="font-medium mb-3">Cronograma Estimado</h4>
              <div className="space-y-2">
                {deliverables.map((deliverable, index) => {
                  const startDay = deliverables
                    .slice(0, index)
                    .reduce((sum, d) => sum + (d.duration_days || 0), 0);
                  const width = metrics.totalPhaseDays > 0 
                    ? (deliverable.duration_days / metrics.totalPhaseDays) * 100 
                    : 0;
                  
                  return (
                    <div key={deliverable.id || index} className="flex items-center gap-3">
                      <div className="w-20 text-xs text-gray-600 truncate">
                        {deliverable.name}
                      </div>
                      <div className="flex-1 relative bg-gray-200 rounded-full h-4">
                        <div 
                          className={`absolute top-0 left-0 h-full rounded-full ${
                            deliverable.priority === 'high' ? 'bg-red-500' :
                            deliverable.priority === 'medium' ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}
                          style={{ 
                            width: `${width}%`,
                            marginLeft: `${(startDay / metrics.totalPhaseDays) * 100}%`
                          }}
                        />
                      </div>
                      <div className="text-xs text-gray-600 w-16 text-right">
                        {deliverable.duration_days}d
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>Início</span>
                <span>Meio do Projeto</span>
                <span>Fim ({metrics.totalPhaseDays}d)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}