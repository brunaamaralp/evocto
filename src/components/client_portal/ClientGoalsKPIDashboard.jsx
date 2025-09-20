import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Target, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  BarChart3,
  Plus,
  Edit,
  Calendar,
  Award,
  Zap
} from 'lucide-react';
import { useClientGoalsKPIs } from '@/hooks/useClientGoalsKPIs';
import GoalFormModal from './GoalFormModal';
import KPIFormModal from './KPIFormModal';
import ProgressUpdateModal from './ProgressUpdateModal';
import KPIRecordModal from './KPIRecordModal';

/**
 * Dashboard principal de Metas e KPIs do cliente
 */
export default function ClientGoalsKPIDashboard({ clientId, serviceId = null }) {
  const {
    goals,
    kpis,
    loading,
    error,
    loadGoals,
    loadKPIs,
    getGoalsStats,
    getKPIsStats,
    getPerformanceAlerts
  } = useClientGoalsKPIs();

  const [activeTab, setActiveTab] = useState('overview');
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showKPIForm, setShowKPIForm] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showKPIModal, setShowKPIModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [selectedKPI, setSelectedKPI] = useState(null);

  useEffect(() => {
    if (clientId) {
      loadGoals(clientId);
      loadKPIs(clientId, serviceId);
    }
  }, [clientId, serviceId, loadGoals, loadKPIs]);

  const goalsStats = getGoalsStats();
  const kpisStats = getKPIsStats();
  const alerts = getPerformanceAlerts();

  const getGoalStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getKPIStatusColor = (kpi) => {
    const records = kpi.records || [];
    if (records.length < 2) return 'bg-gray-100 text-gray-800';
    
    const latest = records[records.length - 1];
    const previous = records[records.length - 2];
    
    if (latest.value > previous.value) return 'bg-green-100 text-green-800';
    if (latest.value < previous.value) return 'bg-red-100 text-red-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'goal_deadline': return Clock;
      case 'goal_progress': return Target;
      case 'kpi_decline': return TrendingDown;
      default: return AlertTriangle;
    }
  };

  const getAlertSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'border-red-200 bg-red-50';
      case 'medium': return 'border-yellow-200 bg-yellow-50';
      case 'low': return 'border-blue-200 bg-blue-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-200 h-24 rounded-lg"></div>
          ))}
        </div>
        <div className="animate-pulse bg-gray-200 h-64 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Metas e KPIs</h2>
          <p className="text-gray-600">Acompanhe seu progresso e performance</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowGoalForm(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Nova Meta
          </Button>
          <Button onClick={() => setShowKPIForm(true)} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Novo KPI
          </Button>
        </div>
      </div>

      {/* Alertas de Performance */}
      {alerts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-orange-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Alertas de Performance ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.slice(0, 3).map((alert, index) => {
              const AlertIcon = getAlertIcon(alert.type);
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-3 rounded-lg border ${getAlertSeverityColor(alert.severity)}`}
                >
                  <div className="flex items-start gap-3">
                    <AlertIcon className="w-5 h-5 text-orange-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{alert.title}</h4>
                      <p className="text-sm text-gray-600">{alert.message}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {alert.severity === 'high' ? 'Alto' : alert.severity === 'medium' ? 'Médio' : 'Baixo'}
                    </Badge>
                  </div>
                </motion.div>
              );
            })}
            {alerts.length > 3 && (
              <p className="text-sm text-orange-700 text-center">
                +{alerts.length - 3} alertas adicionais
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Target className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{goalsStats.total}</div>
              <div className="text-sm text-gray-600">Total de Metas</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{goalsStats.completed}</div>
              <div className="text-sm text-gray-600">Metas Concluídas</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{kpisStats.total}</div>
              <div className="text-sm text-gray-600">KPIs Monitorados</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{kpisStats.improving}</div>
              <div className="text-sm text-gray-600">KPIs Melhorando</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="goals">Metas</TabsTrigger>
          <TabsTrigger value="kpis">KPIs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Progresso Geral */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Progresso Geral das Metas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Progresso Médio</span>
                  <span className="text-sm text-gray-600">{goalsStats.avgProgress}%</span>
                </div>
                <Progress value={goalsStats.avgProgress} className="h-2" />
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-600">{goalsStats.completed}</div>
                    <div className="text-xs text-gray-600">Concluídas</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{goalsStats.active}</div>
                    <div className="text-xs text-gray-600">Ativas</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">{goalsStats.overdue}</div>
                    <div className="text-xs text-gray-600">Atrasadas</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KPIs em Destaque */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                KPIs em Destaque
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {kpis.slice(0, 3).map((kpi, index) => {
                  const records = kpi.records || [];
                  const latest = records[records.length - 1];
                  const previous = records[records.length - 2];
                  const trend = latest && previous ? latest.value - previous.value : 0;
                  
                  return (
                    <div key={kpi.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{kpi.name}</h4>
                        <p className="text-sm text-gray-600">{kpi.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">
                          {latest ? latest.value : 'N/A'} {kpi.unit}
                        </div>
                        {trend !== 0 && (
                          <div className={`text-sm flex items-center gap-1 ${
                            trend > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {Math.abs(trend).toFixed(1)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="goals" className="space-y-4">
          {goals.length === 0 ? (
            <Card className="border-dashed border-gray-300">
              <CardContent className="p-12 text-center">
                <Target className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma meta definida</h3>
                <p className="text-gray-600 mb-4">Crie sua primeira meta para começar a acompanhar seu progresso</p>
                <Button onClick={() => setShowGoalForm(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeira Meta
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {goals.map((goal, index) => (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{goal.title}</h3>
                            <Badge className={getGoalStatusColor(goal.status)}>
                              {goal.status === 'completed' ? 'Concluída' : 
                               goal.status === 'active' ? 'Ativa' : 'Pausada'}
                            </Badge>
                          </div>
                          <p className="text-gray-600 mb-3">{goal.description}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            {goal.targetDate && (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                Prazo: {new Date(goal.targetDate).toLocaleDateString('pt-BR')}
                              </div>
                            )}
                            {goal.priority && (
                              <Badge variant="outline" className="text-xs">
                                Prioridade: {goal.priority}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedGoal(goal);
                            setShowProgressModal(true);
                          }}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Atualizar
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Progresso</span>
                          <span className="text-sm text-gray-600">{goal.progress || 0}%</span>
                        </div>
                        <Progress value={goal.progress || 0} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="kpis" className="space-y-4">
          {kpis.length === 0 ? (
            <Card className="border-dashed border-gray-300">
              <CardContent className="p-12 text-center">
                <BarChart3 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum KPI definido</h3>
                <p className="text-gray-600 mb-4">Configure KPIs para monitorar sua performance</p>
                <Button onClick={() => setShowKPIForm(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Configurar Primeiro KPI
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {kpis.map((kpi, index) => (
                <motion.div
                  key={kpi.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{kpi.name}</h3>
                            <Badge className={getKPIStatusColor(kpi)}>
                              {(() => {
                                const records = kpi.records || [];
                                if (records.length < 2) return 'Sem dados';
                                const latest = records[records.length - 1];
                                const previous = records[records.length - 2];
                                return latest.value > previous.value ? 'Melhorando' : 
                                       latest.value < previous.value ? 'Declinando' : 'Estável';
                              })()}
                            </Badge>
                          </div>
                          <p className="text-gray-600 mb-3">{kpi.description}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>Unidade: {kpi.unit}</span>
                            <span>Meta: {kpi.targetValue} {kpi.unit}</span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedKPI(kpi);
                            setShowKPIModal(true);
                          }}
                        >
                          <Zap className="w-4 h-4 mr-1" />
                          Registrar
                        </Button>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Valor Atual</span>
                          <span className="text-lg font-bold text-gray-900">
                            {kpi.currentValue || 'N/A'} {kpi.unit}
                          </span>
                        </div>
                        
                        {kpi.records && kpi.records.length > 0 && (
                          <div className="text-sm text-gray-600">
                            Última atualização: {new Date(kpi.lastRecordedAt).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {showGoalForm && (
        <GoalFormModal
          isOpen={showGoalForm}
          onClose={() => setShowGoalForm(false)}
          clientId={clientId}
          serviceId={serviceId}
          onSuccess={() => {
            setShowGoalForm(false);
            loadGoals(clientId);
          }}
        />
      )}

      {showKPIForm && (
        <KPIFormModal
          isOpen={showKPIForm}
          onClose={() => setShowKPIForm(false)}
          clientId={clientId}
          serviceId={serviceId}
          onSuccess={() => {
            setShowKPIForm(false);
            loadKPIs(clientId, serviceId);
          }}
        />
      )}

      {showProgressModal && selectedGoal && (
        <ProgressUpdateModal
          isOpen={showProgressModal}
          onClose={() => setShowProgressModal(false)}
          goal={selectedGoal}
          onSuccess={() => {
            setShowProgressModal(false);
            setSelectedGoal(null);
            loadGoals(clientId);
          }}
        />
      )}

      {showKPIModal && selectedKPI && (
        <KPIRecordModal
          isOpen={showKPIModal}
          onClose={() => setShowKPIModal(false)}
          kpi={selectedKPI}
          onSuccess={() => {
            setShowKPIModal(false);
            setSelectedKPI(null);
            loadKPIs(clientId, serviceId);
          }}
        />
      )}
    </div>
  );
}

