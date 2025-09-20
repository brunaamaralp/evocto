import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { Task, User, CyclePlan } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, TrendingDown, Clock, CheckCircle,
  AlertTriangle, BarChart3, Users, Target,
  Calendar, Zap, Timer, Activity
} from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts';
import { motion } from 'framer-motion';

// Métricas de produtividade
const ProductivityMetrics = ({ tasks, timeRange = 'week' }) => {
  const [metrics, setMetrics] = useState({});

  useEffect(() => {
    if (!tasks.length) return;

    const now = new Date();
    const completedTasks = tasks.filter(t => t.status === 'completed');
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
    const overdueTasks = tasks.filter(t => 
      t.dueDate && new Date(t.dueDate) < now && t.status !== 'completed'
    );

    // Velocidade da equipe (tarefas concluídas por semana)
    const weeklyCompleted = completedTasks.filter(t => {
      const completedDate = new Date(t.completedAt);
      const weekStart = startOfWeek(now);
      return completedDate >= weekStart;
    }).length;

    // Tempo médio de conclusão
    const tasksWithTime = completedTasks.filter(t => t.startDate && t.completedAt);
    const avgCompletionTime = tasksWithTime.length > 0 
      ? tasksWithTime.reduce((sum, task) => {
          const start = new Date(task.startDate);
          const end = new Date(task.completedAt);
          return sum + (end - start) / (1000 * 60 * 60 * 24); // dias
        }, 0) / tasksWithTime.length
      : 0;

    // Taxa de entrega no prazo
    const tasksWithDueDate = completedTasks.filter(t => t.dueDate);
    const onTimeDeliveries = tasksWithDueDate.filter(t => 
      new Date(t.completedAt) <= new Date(t.dueDate)
    ).length;
    const onTimeRate = tasksWithDueDate.length > 0 
      ? (onTimeDeliveries / tasksWithDueDate.length) * 100 
      : 0;

    // Burndown - tarefas restantes vs tempo
    const totalEstimatedHours = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
    const completedHours = completedTasks.reduce((sum, t) => sum + (t.actualHours || t.estimatedHours || 0), 0);
    const remainingHours = totalEstimatedHours - completedHours;

    setMetrics({
      velocity: weeklyCompleted,
      avgCompletionTime: Math.round(avgCompletionTime * 10) / 10,
      onTimeRate: Math.round(onTimeRate),
      remainingHours,
      completedHours,
      totalHours: totalEstimatedHours,
      overdueTasks: overdueTasks.length,
      efficiency: totalEstimatedHours > 0 ? Math.round((completedHours / totalEstimatedHours) * 100) : 0
    });
  }, [tasks, timeRange]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Velocidade</p>
              <p className="text-2xl font-bold">{metrics.velocity || 0}</p>
              <p className="text-xs text-gray-500">tarefas/semana</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tempo Médio</p>
              <p className="text-2xl font-bold">{metrics.avgCompletionTime || 0}</p>
              <p className="text-xs text-gray-500">dias</p>
            </div>
            <Timer className="w-8 h-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">No Prazo</p>
              <p className="text-2xl font-bold">{metrics.onTimeRate || 0}%</p>
              <p className="text-xs text-gray-500">entregas</p>
            </div>
            <Target className="w-8 h-8 text-purple-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Eficiência</p>
              <p className="text-2xl font-bold">{metrics.efficiency || 0}%</p>
              <p className="text-xs text-gray-500">horas planejadas</p>
            </div>
            <Zap className="w-8 h-8 text-yellow-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Gráfico de burndown
const BurndownChart = ({ tasks }) => {
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    if (!tasks.length) return;

    // Gerar dados dos últimos 7 dias
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'MM/dd');
      
      // Tarefas concluídas até esta data
      const completedByDate = tasks.filter(t => 
        t.status === 'completed' && 
        t.completedAt && 
        new Date(t.completedAt) <= date
      ).length;

      // Tarefas criadas até esta data
      const createdByDate = tasks.filter(t => 
        new Date(t.created_date) <= date
      ).length;

      const remaining = createdByDate - completedByDate;

      data.push({
        date: dateStr,
        remaining,
        completed: completedByDate,
        total: createdByDate
      });
    }

    setChartData(data);
  }, [tasks]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Burndown Chart
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line 
              type="monotone" 
              dataKey="remaining" 
              stroke="#3b82f6" 
              strokeWidth={2}
              name="Tarefas Restantes"
            />
            <Line 
              type="monotone" 
              dataKey="completed" 
              stroke="#10b981" 
              strokeWidth={2}
              name="Tarefas Concluídas"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// Widget de distribuição por status
const TaskDistributionChart = ({ tasks }) => {
  const [distributionData, setDistributionData] = useState([]);

  useEffect(() => {
    if (!tasks.length) return;

    const statusCounts = tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {});

    const statusLabels = {
      todo: 'A Fazer',
      in_progress: 'Em Progresso',
      in_review: 'Em Revisão', 
      completed: 'Concluídas',
      blocked: 'Bloqueadas',
      cancelled: 'Canceladas'
    };

    const data = Object.entries(statusCounts).map(([status, count]) => ({
      status: statusLabels[status] || status,
      count,
      percentage: Math.round((count / tasks.length) * 100)
    }));

    setDistributionData(data);
  }, [tasks]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Distribuição por Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={distributionData}>
            <XAxis dataKey="status" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// Widget principal de produtividade
export const TasksProductivityWidget = ({ 
  clientId = null, 
  cycleId = null, 
  showCharts = true,
  timeRange = 'week' 
}) => {
  const { user } = useSession();
  const [tasks, setTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadProductivityData = useCallback(async () => {
    try {
      setLoading(true);
      
      const filters = { agencyId: user.agencyId };
      if (clientId) filters.clientId = clientId;
      if (cycleId) filters.cycleId = cycleId;

      const [tasksData, membersData] = await Promise.all([
        Task.filter(filters, '-updated_date'),
        User.filter({ agencyId: user.agencyId, role: { $in: ['admin', 'team'] } })
      ]);

      setTasks(tasksData);
      setTeamMembers(membersData);
    } catch (error) {
      console.error('Erro ao carregar dados de produtividade:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.agencyId, clientId, cycleId]);

  useEffect(() => {
    if (user?.agencyId) {
      loadProductivityData();
    }
  }, [loadProductivityData, user?.agencyId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="ml-3 text-gray-600">Carregando métricas...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Métricas principais */}
      <ProductivityMetrics tasks={tasks} timeRange={timeRange} />
      
      {/* Gráficos */}
      {showCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BurndownChart tasks={tasks} />
          <TaskDistributionChart tasks={tasks} />
        </div>
      )}

      {/* Performance da equipe */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Performance da Equipe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teamMembers.map(member => {
              const memberTasks = tasks.filter(t => t.assignedTo === member.id);
              const completedTasks = memberTasks.filter(t => t.status === 'completed');
              const completionRate = memberTasks.length > 0 
                ? (completedTasks.length / memberTasks.length) * 100 
                : 0;

              return (
                <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">
                        {member.full_name?.charAt(0) || 'U'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{member.full_name}</p>
                      <p className="text-sm text-gray-600">
                        {memberTasks.length} tarefas • {completedTasks.length} concluídas
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress value={completionRate} className="w-20" />
                    <span className="text-sm font-medium">{Math.round(completionRate)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TasksProductivityWidget;