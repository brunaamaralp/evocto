
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Users, 
  Briefcase,
  CheckSquare, 
  AlertCircle, 
  Clock,
  Plus,
  RefreshCw,
  Activity,
  Loader2,
  Building,
  FileText
} from 'lucide-react';
import { useSession } from '@/components/auth/SessionManager';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Client } from '@/api/entities';
import { Service } from '@/api/entities';
import { Task } from '@/api/entities';

/**
 * DASHBOARD LIMPO - Apenas métricas essenciais da nova estrutura
 */
export default function DashboardPage() {
  const { user, agencyId, loading: sessionLoading } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!agencyId) {
        setError('ID da organização não encontrado.');
        setLoading(false);
        return;
      }

      // 🎯 MÉTRICAS LIMPAS: Apenas conceitos atuais
      const [clients, services, tasks] = await Promise.all([
        Client.filter({ agencyId }),
        Service.filter({ agencyId, is_template: false, is_active: true }),
        Task.filter({ agencyId })
      ]);

      // Calcular estatísticas
      const activeClients = clients.filter(c => c.status === 'ativo').length;
      const activeServices = services.length;
      const pendingTasks = tasks.filter(t => ['todo', 'in_progress'].includes(t.status)).length;
      const completedTasksThisWeek = tasks.filter(t => {
        if (t.status !== 'completed' || !t.completedAt) return false;
        const completedDate = new Date(t.completedAt);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return completedDate >= weekAgo;
      }).length;

      // Atividade recente
      const recentActivity = [
        ...clients.slice(-3).map(c => ({
          id: `client-${c.id}`,
          type: 'client_added',
          description: `Novo cliente "${c.name}" adicionado`,
          time: new Date(c.created_date).toLocaleDateString()
        })),
        ...services.slice(-3).map(s => ({
          id: `service-${s.id}`,
          type: 'service_started',
          description: `Serviço "${s.name}" iniciado`,
          time: new Date(s.created_date).toLocaleDateString()
        })),
        ...tasks.filter(t => t.status === 'completed').slice(-3).map(t => ({
          id: `task-${t.id}`,
          type: 'task_completed',
          description: `Tarefa "${t.title}" concluída`,
          time: t.completedAt ? new Date(t.completedAt).toLocaleDateString() : 'Recentemente'
        }))
      ].slice(-5);

      // Tarefas próximas do prazo
      const upcomingTasks = tasks
        .filter(t => t.dueDate && ['todo', 'in_progress'].includes(t.status))
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, 5)
        .map(t => ({
          id: t.id,
          title: t.title,
          dueDate: new Date(t.dueDate).toLocaleDateString(),
          priority: t.priority || 'medium',
          clientName: 'Cliente' // TODO: Buscar nome do cliente
        }));
      
      setDashboardData({
        stats: {
          totalClients: activeClients,
          activeServices,
          pendingTasks,
          completedThisWeek: completedTasksThisWeek
        },
        recentActivity,
        upcomingTasks
      });
      
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      setError(`Erro ao carregar dados: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => {
    if (!sessionLoading && agencyId) {
      loadDashboardData();
    }
  }, [sessionLoading, agencyId, loadDashboardData]);

  if (sessionLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro ao carregar</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={loadDashboardData} className="flex items-center mx-auto">
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Visão geral da sua agência
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Clientes Ativos</p>
                <p className="text-3xl font-bold text-gray-900">{dashboardData.stats.totalClients}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Serviços Ativos</p>
                <p className="text-3xl font-bold text-gray-900">{dashboardData.stats.activeServices}</p>
              </div>
              <Briefcase className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tarefas Pendentes</p>
                <p className="text-3xl font-bold text-gray-900">{dashboardData.stats.pendingTasks}</p>
              </div>
              <CheckSquare className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Concluídas (Semana)</p>
                <p className="text-3xl font-bold text-gray-900">{dashboardData.stats.completedThisWeek}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Atividade Recente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Atividade Recente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{activity.description}</p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Próximas Tarefas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Próximas Tarefas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData.upcomingTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{task.title}</p>
                    <p className="text-xs text-gray-500">Vence em {task.dueDate}</p>
                  </div>
                  <Badge 
                    variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'}
                  >
                    {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ações Rápidas */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Link to={createPageUrl('clients')}>
              <Button variant="outline" className="w-full justify-start">
                <Plus className="h-4 w-4 mr-2" />
                Novo Cliente
              </Button>
            </Link>
            <Link to={createPageUrl('services')}>
              <Button variant="outline" className="w-full justify-start">
                <Building className="h-4 w-4 mr-2" />
                Template Serviço
              </Button>
            </Link>
            <Link to={createPageUrl('tasks-manager')}>
              <Button variant="outline" className="w-full justify-start">
                <CheckSquare className="h-4 w-4 mr-2" />
                Ver Tarefas
              </Button>
            </Link>
            <Link to={createPageUrl('library')}>
              <Button variant="outline" className="w-full justify-start">
                <FileText className="h-4 w-4 mr-2" />
                Biblioteca
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
