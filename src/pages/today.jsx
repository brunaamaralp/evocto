import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Clock, 
  CheckSquare, 
  AlertCircle, 
  Users, 
  Briefcase, 
  TrendingUp, 
  RefreshCw,
  Plus,
  Activity,
  Loader2
} from 'lucide-react';
import { useSession } from '@/components/auth/SessionManager';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function TodayPage() {
  const { user, agencyId, loading: sessionLoading } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [todayData, setTodayData] = useState(null);

  const loadTodayData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!agencyId) {
        console.warn('Today - No agencyId found in user:', user);
        setError('ID da organização não encontrado. Verifique se você está logado corretamente.');
        setLoading(false);
        return;
      }

      // Simular carregamento de dados do dia - substitua por queries reais quando necessário
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const today = new Date().toLocaleDateString('pt-BR');
      
      setTodayData({
        date: today,
        stats: {
          totalClients: 12,
          activeServices: 8,
          pendingTasks: 23,
          completedThisWeek: 15
        },
        urgentTasks: [
          { id: 1, title: 'Reunião com cliente ABC', time: '14:00', client: 'Empresa ABC', priority: 'high' },
          { id: 2, title: 'Entrega de relatório financeiro', time: '16:30', client: 'Empresa XYZ', priority: 'high' },
          { id: 3, title: 'Revisar análise de dados', time: '18:00', client: 'Startup DEF', priority: 'medium' }
        ],
        pendingApprovals: [
          { id: 1, type: 'cycle_plan', client: 'Empresa ABC', description: 'Plano do ciclo Janeiro 2024', expires: '2 horas' },
          { id: 2, type: 'briefing', client: 'Empresa XYZ', description: 'Briefing atualizado', expires: '1 dia' }
        ],
        recentActivity: [
          { id: 1, type: 'task_completed', description: 'Análise financeira concluída - Empresa ABC', time: '2h atrás' },
          { id: 2, type: 'client_added', description: 'Novo cliente "Startup DEF" adicionado', time: '3h atrás' },
          { id: 3, type: 'approval_pending', description: 'Plano de ciclo aguardando aprovação', time: '4h atrás' }
        ]
      });
      
    } catch (error) {
      console.error('Erro ao carregar dados de hoje:', error);
      setError(`Erro ao carregar dados: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [agencyId, user]);

  useEffect(() => {
    if (sessionLoading) return;
    
    console.log('Today - User:', user);
    console.log('Today - AgencyId:', agencyId);
    
    loadTodayData();
  }, [user, agencyId, sessionLoading, loadTodayData]);

  if (sessionLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando dados de hoje...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro ao carregar dados</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={loadTodayData} className="flex items-center mx-auto">
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
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Calendar className="h-8 w-8 mr-3 text-blue-600" />
          Hoje
        </h1>
        <p className="text-gray-600 mt-1">
          {todayData?.date} • Sua agenda e tarefas prioritárias
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Clientes</p>
                <p className="text-3xl font-bold text-gray-900">{todayData?.stats.totalClients}</p>
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
                <p className="text-3xl font-bold text-gray-900">{todayData?.stats.activeServices}</p>
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
                <p className="text-3xl font-bold text-gray-900">{todayData?.stats.pendingTasks}</p>
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
                <p className="text-3xl font-bold text-gray-900">{todayData?.stats.completedThisWeek}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tarefas Urgentes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2 text-red-500" />
              Tarefas Urgentes de Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {todayData?.urgentTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{task.title}</p>
                    <p className="text-xs text-gray-500">{task.time} • {task.client}</p>
                  </div>
                  <Badge variant={task.priority === 'high' ? 'destructive' : 'default'}>
                    {task.priority === 'high' ? 'Urgente' : 'Médio'}
                  </Badge>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Link to={createPageUrl('tasks')}>
                <Button variant="outline" className="w-full">
                  Ver Todas as Tarefas
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Aprovações Pendentes */}
        <Card>
          <CardContent className="p-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 text-orange-500" />
                Aprovações Pendentes
              </CardTitle>
            </CardHeader>
            <div className="space-y-4">
              {todayData?.pendingApprovals.map((approval) => (
                <div key={approval.id} className="flex items-center justify-between p-3 border rounded-lg bg-orange-50">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{approval.description}</p>
                    <p className="text-xs text-gray-500">{approval.client}</p>
                  </div>
                  <Badge variant="secondary">
                    Expira em {approval.expires}
                  </Badge>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Link to={createPageUrl('approval-dashboard')}>
                <Button variant="outline" className="w-full">
                  Ver Todas as Aprovações
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

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
              {todayData?.recentActivity.map((activity) => (
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

        {/* Ações Rápidas */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              <Link to={createPageUrl('clients')}>
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Cliente
                </Button>
              </Link>
              <Link to={createPageUrl('services')}>
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Serviço
                </Button>
              </Link>
              <Link to={createPageUrl('tasks')}>
                <Button variant="outline" className="w-full justify-start">
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Criar Tarefa
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}