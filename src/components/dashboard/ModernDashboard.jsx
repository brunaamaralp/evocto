
import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { useT } from '@/components/i18n/I18nProvider';
import { Card, Typography, StatusBadge } from '@/components/ui/design-system';
import { Client, Service, CyclePlan, LearningEntry, Notification } from '@/api/entities';
import {
  TrendingUp,
  Users,
  Briefcase,
  Calendar,
  BookOpen,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight,
  Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function ModernDashboard() {
  const { agencyId } = useSession();
  const t = useT();
  const [stats, setStats] = useState({
    clients: 0,
    services: 0,
    activeCycles: 0,
    learnings: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [quickActions, setQuickActions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    if (!agencyId) return;
    
    try {
      const [clients, services, cycles, learnings, notifications] = await Promise.all([
        Client.filter({ agencyId }),
        Service.filter({ agencyId, is_active: true }),
        CyclePlan.filter({ agencyId, status: { $in: ['pending_approval', 'in_execution'] } }),
        LearningEntry.filter({ agencyId, reviewed: false }, '-created_date', 5),
        Notification.filter({ userId: 'current', readAt: null }, '-created_date', 5)
      ]);

      setStats({
        clients: clients.length,
        services: services.length,
        activeCycles: cycles.length,
        learnings: learnings.length
      });

      // Simulated recent activity
      setRecentActivity([
        {
          id: 1,
          type: 'cycle_approved',
          title: 'Plano de Janeiro aprovado',
          client: 'Tech Startup',
          time: '2 horas atrás',
          status: 'success'
        },
        {
          id: 2,
          type: 'learning_added',
          title: 'Novo aprendizado adicionado',
          description: 'CTR melhorou 15% com novo formato',
          time: '5 horas atrás',
          status: 'info'
        }
      ]);

      setQuickActions([
        {
          id: 1,
          title: t('dashboard.quickActions.createBriefing', 'Criar Briefing'),
          description: 'Iniciar novo projeto',
          icon: Calendar,
          href: 'briefings',
          color: 'primary'
        },
        {
          id: 2,
          title: t('dashboard.quickActions.addClient', 'Adicionar Cliente'),
          description: 'Cadastrar novo cliente',
          icon: Users,
          href: 'clients',
          color: 'success'
        }
      ]);

    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, [agencyId, t]); // Added t to dependencies as it's used inside

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]); // Depend on the memoized function

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-6 text-white">
        <Typography variant="h2" className="text-white mb-2">
          {t('dashboard.welcome', 'Bom dia!')}
        </Typography>
        <Typography variant="body1" className="text-primary-100">
          {t('dashboard.subtitle', 'Vamos ver como estão seus projetos hoje.')}
        </Typography>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <Typography variant="caption" className="text-secondary-500">
                {t('dashboard.stats.clients', 'Clientes')}
              </Typography>
              <Typography variant="h3" className="text-secondary-900">
                {stats.clients}
              </Typography>
            </div>
            <div className="p-3 bg-primary-100 rounded-lg">
              <Users className="h-6 w-6 text-primary-600" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-2">
            <TrendingUp className="h-4 w-4 text-success-500" />
            <Typography variant="caption" className="text-success-600">
              +12% este mês
            </Typography>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <Typography variant="caption" className="text-secondary-500">
                {t('dashboard.stats.services', 'Serviços Ativos')}
              </Typography>
              <Typography variant="h3" className="text-secondary-900">
                {stats.services}
              </Typography>
            </div>
            <div className="p-3 bg-success-100 rounded-lg">
              <Briefcase className="h-6 w-6 text-success-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <Typography variant="caption" className="text-secondary-500">
                {t('dashboard.stats.cycles', 'Ciclos Ativos')}
              </Typography>
              <Typography variant="h3" className="text-secondary-900">
                {stats.activeCycles}
              </Typography>
            </div>
            <div className="p-3 bg-warning-100 rounded-lg">
              <Calendar className="h-6 w-6 text-warning-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <Typography variant="caption" className="text-secondary-500">
                {t('dashboard.stats.learnings', 'Aprendizados')}
              </Typography>
              <Typography variant="h3" className="text-secondary-900">
                {stats.learnings}
              </Typography>
            </div>
            <div className="p-3 bg-info-100 rounded-lg">
              <BookOpen className="h-6 w-6 text-info-600" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <Typography variant="h4">
              {t('dashboard.recentActivity', 'Atividade Recente')}
            </Typography>
            <Link
              to={createPageUrl('today')}
              className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
            >
              Ver todos
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-4 p-3 bg-secondary-50 rounded-lg">
                <div className="p-2 bg-white rounded-lg">
                  {activity.type === 'cycle_approved' ? (
                    <CheckCircle className="h-4 w-4 text-success-500" />
                  ) : (
                    <Zap className="h-4 w-4 text-primary-500" />
                  )}
                </div>
                <div className="flex-1">
                  <Typography variant="body2" className="font-medium">
                    {activity.title}
                  </Typography>
                  {activity.client && (
                    <Typography variant="caption" className="text-secondary-500">
                      {activity.client}
                    </Typography>
                  )}
                  {activity.description && (
                    <Typography variant="caption" className="text-secondary-500">
                      {activity.description}
                    </Typography>
                  )}
                </div>
                <Typography variant="caption" className="text-secondary-400">
                  {activity.time}
                </Typography>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick Actions */}
        <Card>
          <Typography variant="h4" className="mb-4">
            {t('dashboard.quickActions.title', 'Ações Rápidas')}
          </Typography>
          <div className="space-y-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.id}
                  to={createPageUrl(action.href)}
                  className="flex items-center gap-3 p-3 rounded-lg border border-secondary-200 hover:border-primary-300 hover:bg-primary-50 transition-all group"
                >
                  <div className="p-2 bg-secondary-100 rounded-lg group-hover:bg-primary-100">
                    <Icon className="h-4 w-4 text-secondary-600 group-hover:text-primary-600" />
                  </div>
                  <div className="flex-1">
                    <Typography variant="body2" className="font-medium">
                      {action.title}
                    </Typography>
                    <Typography variant="caption">
                      {action.description}
                    </Typography>
                  </div>
                  <ArrowRight className="h-4 w-4 text-secondary-400 group-hover:text-primary-600" />
                </Link>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
