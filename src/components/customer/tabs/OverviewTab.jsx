import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/components/i18n/I18nProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  Users,
  FileText,
  CheckCircle,
  Clock,
  BarChart3,
  Calendar,
  ArrowRight,
  Plus,
  Zap,
  Info
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

// --- MOCK/DUMMY IMPLEMENTATIONS FOR EXTERNAL DEPENDENCIES ---
// These would typically be imported from actual project files.
// They are included here to make the provided file self-contained and runnable.

// Mock PublicBriefingResponse entity
class PublicBriefingResponse {
  static data = [
    // Example dummy data
    { id: 'pb1', agencyId: 'agency-123', clientId: 'client-abc', status: 'completed', completion_score: 80, questions: [{ id: 'q1', answered: true }, { id: 'q2', answered: true }] },
    { id: 'pb2', agencyId: 'agency-123', clientId: 'client-def', status: 'in_progress', completion_score: 40, questions: [{ id: 'q1', answered: true }, { id: 'q2', answered: false }] },
  ];

  static async filter({ agencyId, clientId }) {
    console.log(`Mock: Filtering PublicBriefingResponse for agencyId: ${agencyId}, clientId: ${clientId}`);
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100));
    return PublicBriefingResponse.data.filter(pb => pb.agencyId === agencyId && pb.clientId === clientId);
  }
}

// Mock Brief entity
class Brief {
  static data = [
    // Example dummy data
    { id: 'b1', agencyId: 'agency-123', projectId: 'client-abc', status: 'IN_PROGRESS', completion_score: 70, business_context: 'Some context', company_profile: 'Some profile' },
  ];

  static async update(id, data) {
    console.log(`Mock: Updating Brief ${id} with data:`, data);
    await new Promise(resolve => setTimeout(resolve, 100));
    const index = Brief.data.findIndex(b => b.id === id);
    if (index !== -1) {
      Brief.data[index] = { ...Brief.data[index], ...data };
      return Brief.data[index];
    }
    return null;
  }

  static async create(data) {
    console.log('Mock: Creating Brief with data:', data);
    await new Promise(resolve => setTimeout(resolve, 100));
    const newBrief = { id: `b-${Date.now()}`, ...data };
    Brief.data.push(newBrief);
    return newBrief;
  }

  static async filter({ agencyId, projectId }) {
    console.log(`Mock: Filtering Brief for agencyId: ${agencyId}, projectId: ${projectId}`);
    await new Promise(resolve => setTimeout(resolve, 100));
    return Brief.data.filter(b => b.agencyId === agencyId && b.projectId === projectId);
  }
}

// Dummy implementations for briefingUtils functions
const isBriefingCompleted = (briefings, publicBriefings) => {
  console.log('Mock: isBriefingCompleted called', { briefings, publicBriefings });
  // Simplified logic for dummy: consider completed if any brief or public brief has score > 90
  const briefCompleted = (briefings || []).some(b => b.completion_score > 90 && b.status === 'READY');
  const publicBriefCompleted = (publicBriefings || []).some(pb => pb.completion_score > 90 && pb.status === 'completed');
  return briefCompleted || publicBriefCompleted;
};

const getBriefingCompletionDetails = (briefings, publicBriefings) => {
  console.log('Mock: getBriefingCompletionDetails called', { briefings, publicBriefings });
  // Simplified dummy logic
  let bestPercentage = 0;
  if ((briefings || []).length > 0) {
    bestPercentage = Math.max(bestPercentage, briefings[0].completion_score || 0);
  }
  if ((publicBriefings || []).length > 0) {
    bestPercentage = Math.max(bestPercentage, publicBriefings[0].completion_score || 0);
  }
  const completed = bestPercentage > 90; // Arbitrary completion threshold for mock
  return { completed, bestPercentage };
};
// --- END MOCK/DUMMY IMPLEMENTATIONS ---


const KPICard = ({ icon: Icon, title, value, subtitle, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    orange: 'bg-orange-100 text-orange-600',
    purple: 'bg-purple-100 text-purple-600'
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-sm font-medium text-slate-600">{title}</p>
            {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const QuickActionCard = ({ icon: Icon, title, description, action, color = 'blue' }) => {
  const colorClasses = {
    blue: 'hover:bg-blue-50 border-blue-200',
    green: 'hover:bg-green-50 border-green-200',
    purple: 'hover:bg-purple-50 border-purple-200',
    orange: 'hover:bg-orange-50 border-orange-200'
  };

  return (
    <Card className={`cursor-pointer transition-all ${colorClasses[color]}`} onClick={action}>
      <CardContent className="p-6">
        <div className="flex items-center gap-3">
          <Icon className="w-6 h-6 text-slate-600" />
          <div className="flex-1">
            <h4 className="font-semibold text-slate-900">{title}</h4>
            <p className="text-sm text-slate-600">{description}</p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </div>
      </CardContent>
    </Card>
  );
};

export default function OverviewTab({ customer, services = [], cycles = [], onRefresh }) {
  const { t } = useTranslation();

  // Estados para dados de briefing e loading
  const [loading, setLoading] = useState(true);
  const [briefings, setBriefings] = useState([]);
  const [publicBriefings, setPublicBriefings] = useState([]);

  // Mock agencyId - Em um aplicativo real, isso viria do contexto de autenticação/usuário
  const agencyId = 'agency-123'; // Hardcoded for example purposes

  // Função para carregar dados do briefing
  const loadBriefingData = async () => {
    if (!customer?.id || !agencyId) return;

    setLoading(true);
    try {
      const [briefingData, publicBriefingData] = await Promise.all([
        Brief.filter({ agencyId: agencyId, projectId: customer.id }),
        PublicBriefingResponse.filter({ agencyId: agencyId, clientId: customer.id })
      ]);
      setBriefings(briefingData);
      setPublicBriefings(publicBriefingData);
    } catch (error) {
      console.error('Failed to load briefing data:', error);
      // Handle error (e.g., display a message)
    } finally {
      setLoading(false);
    }
  };

  // useEffect para carregar dados quando o customer mudar
  useEffect(() => {
    loadBriefingData();
  }, [customer?.id, agencyId, onRefresh]); // Include onRefresh to re-trigger if parent requests refresh

  // Calcular KPIs
  const kpis = {
    activeServices: services.filter(s => s.is_active).length,
    activeCycles: cycles.filter(c => ['approved', 'in_execution'].includes(c.status)).length,
    capturedInsights: 0, // Placeholder - seria calculado dos aprendizados
    approvalRate: cycles.length > 0 ? Math.round((cycles.filter(c => c.status === 'approved').length / cycles.length) * 100) : 0
  };

  // Status atual baseado nos dados
  const getCurrentStatus = () => {
    if (services.length === 0) {
      return t('customer.overview.waitingInitialBriefing');
    }

    const activeCycles = cycles.filter(c => c.status === 'in_execution');
    if (activeCycles.length > 0) {
      return `${activeCycles.length} ${t('customer.overview.kpis.inExecution')}`;
    }

    return t('customer.overview.noPlanningYet');
  };

  // Último planejamento
  const getLastPlanning = () => {
    const lastCycle = cycles
      .filter(c => c.status === 'completed')
      .sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date))[0];

    if (lastCycle) {
      return lastCycle.cyclePeriod;
    }

    return t('customer.overview.noPlanningYet');
  };

  // Foco principal (do último ciclo ou serviço principal)
  const getMainFocus = () => {
    const lastCycle = cycles
      .sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date))[0];

    if (lastCycle?.planData?.mudancaChave) {
      return lastCycle.planData.mudancaChave;
    }

    if (services.length > 0) {
      return services[0].category?.replace('_', ' ') || services[0].name;
    }

    return t('customer.overview.vehicularVictories');
  };

  const quickActions = [
    {
      icon: FileText,
      title: t('customer.overview.quickActions.fillBriefing'),
      description: 'Completar informações estratégicas',
      color: 'blue',
      action: () => console.log('Fill briefing')
    },
    {
      icon: Calendar,
      title: t('customer.overview.quickActions.generatePlan'),
      description: 'Criar planejamento do próximo ciclo',
      color: 'green',
      action: () => console.log('Generate plan')
    },
    {
      icon: CheckCircle,
      title: t('customer.overview.quickActions.viewApprovals'),
      description: 'Revisar aprovações pendentes',
      color: 'orange',
      action: () => console.log('View approvals')
    },
    {
      icon: Plus,
      title: t('customer.overview.quickActions.addLearning'),
      description: 'Capturar novo insight',
      color: 'purple',
      action: () => console.log('Add learning')
    }
  ];

  // Verificação unificada do setup
  const briefingOk = !loading && isBriefingCompleted(briefings, publicBriefings);

  return (
    <div className="space-y-8">
      {/* Seção de Status de Setup */}
      {!briefingOk && !loading && (
        <Card className="border-l-4 border-yellow-500 bg-yellow-50 text-yellow-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Info className="w-5 h-5 text-yellow-600" />
              {t('customer.overview.setupStatusTitle', 'Setup Status')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-4">
              {t('customer.overview.setupStatusDescription', 'Ainda faltam algumas informações para o setup inicial do cliente.')}
            </p>
            {/* Cartão de conclusão rápida do Briefing */}
            {(() => {
              const info = getBriefingCompletionDetails(briefings, publicBriefings);
              const canConclude = !info.completed && info.bestPercentage >= 50;
              if (!canConclude) return null;
              return (
                <Card className="border-blue-200 bg-blue-50 mt-4">
                  <CardHeader>
                    <CardTitle className="text-blue-900 text-base">Conclusão rápida do Briefing</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="text-sm text-blue-900">
                      Detectamos {Math.round(info.bestPercentage)}% de preenchimento. Você pode concluir o briefing agora.
                    </div>
                    <Button
                      onClick={async () => {
                        if (!customer?.id || !agencyId) {
                          console.error("Customer ID or Agency ID missing for brief completion.");
                          return;
                        }
                        const localInfo = getBriefingCompletionDetails(briefings, publicBriefings);
                        if (briefings.length > 0 && briefings[0].id) {
                          await Brief.update(briefings[0].id, { status: 'READY', completion_score: Math.max(60, briefings[0].completion_score || 0) });
                        } else {
                          await Brief.create({
                            agencyId: agencyId,
                            projectId: customer.id,
                            status: 'READY',
                            completion_score: Math.max(60, Math.round(localInfo.bestPercentage)),
                            business_context: '',
                            company_profile: ''
                          });
                        }
                        // Recarregar dados após a conclusão para atualizar o estado
                        if (onRefresh) {
                            onRefresh(); // Trigger parent refresh if available
                        } else {
                            loadBriefingData(); // Refresh local data
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Concluir Briefing
                    </Button>
                  </CardContent>
                </Card>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Resumo Estratégico */}
      <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            {t('customer.overview.strategicSummary')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold mb-2">{t('customer.overview.currentStatus')}</h4>
              <p className="text-blue-100">{getCurrentStatus()}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">{t('customer.overview.lastPlanning')}</h4>
              <p className="text-blue-100">{getLastPlanning()}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">{t('customer.overview.mainFocus')}</h4>
              <p className="text-blue-100">{getMainFocus()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-4">KPIs</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            icon={Users}
            title={t('customer.overview.kpis.activeServices')}
            value={kpis.activeServices}
            subtitle={`${kpis.activeServices} ${t('customer.overview.kpis.contracts')}`}
            color="blue"
          />
          <KPICard
            icon={Clock}
            title={t('customer.overview.kpis.activeCycles')}
            value={kpis.activeCycles}
            subtitle={`${kpis.activeCycles} ${t('customer.overview.kpis.inExecution')}`}
            color="orange"
          />
          <KPICard
            icon={TrendingUp}
            title={t('customer.overview.kpis.capturedInsights')}
            value={kpis.capturedInsights}
            subtitle={`${kpis.capturedInsights} ${t('customer.overview.kpis.insightsCaptured')}`}
            color="purple"
          />
          <KPICard
            icon={CheckCircle}
            title={t('customer.overview.kpis.approvalRate')}
            value={`${kpis.approvalRate}%`}
            subtitle={`${t('customer.overview.kpis.averageOf')} ${t('customer.overview.kpis.lastMonths')}`}
            color="green"
          />
        </div>
      </div>

      {/* Ações Rápidas */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-4">
          {t('customer.overview.quickActions.title')}
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {quickActions.map((action, index) => (
            <motion.div key={index} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <QuickActionCard {...action} />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Atividade Recente */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            {t('customer.overview.recentActivity.title')}
          </CardTitle>
          <Button variant="outline" size="sm">
            {t('customer.overview.recentActivity.showMore')}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {cycles.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Calendar className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p>{t('customer.overview.recentActivity.noActivity')}</p>
              </div>
            ) : (
              cycles.slice(0, 3).map((cycle) => (
                <div key={cycle.id} className="flex items-center gap-3 p-3 border border-slate-100 rounded-lg">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <FileText className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{cycle.cyclePeriod}</p>
                    <p className="text-sm text-slate-600">
                      Status: {cycle.status} • {new Date(cycle.updated_date).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {cycle.status}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}