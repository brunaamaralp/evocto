
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Area, AreaChart
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Clock, Users, Target, 
  AlertCircle, CheckCircle, Calendar, Zap, Flag 
} from 'lucide-react';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

export default function TaskAnalytics({ tasks, users, analytics }) {
  
  // Time-based analytics
  const timeAnalytics = useMemo(() => {
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    // Tasks created per day (last 30 days)
    const tasksByDay = {};
    const completedByDay = {};
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      tasksByDay[dateStr] = 0;
      completedByDay[dateStr] = 0;
    }
    
    tasks.forEach(task => {
      // Created tasks
      const createdDate = new Date(task.created_date).toISOString().split('T')[0];
      if (tasksByDay.hasOwnProperty(createdDate)) {
        tasksByDay[createdDate]++;
      }
      
      // Completed tasks
      if (task.completedAt) {
        const completedDate = new Date(task.completedAt).toISOString().split('T')[0];
        if (completedByDay.hasOwnProperty(completedDate)) {
          completedByDay[completedDate]++;
        }
      }
    });

    const chartData = Object.keys(tasksByDay).map(date => ({
      date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      created: tasksByDay[date],
      completed: completedByDay[date]
    }));

    return {
      chartData,
      weeklyCreated: tasks.filter(t => new Date(t.created_date) > last7Days).length,
      weeklyCompleted: tasks.filter(t => t.completedAt && new Date(t.completedAt) > last7Days).length,
      monthlyCreated: tasks.filter(t => new Date(t.created_date) > last30Days).length,
      monthlyCompleted: tasks.filter(t => t.completedAt && new Date(t.completedAt) > last30Days).length
    };
  }, [tasks]);

  // User performance analytics
  const userAnalytics = useMemo(() => {
    const userStats = {};
    
    users.forEach(user => {
      const userTasks = tasks.filter(t => t.assignedTo === user.id);
      const completedTasks = userTasks.filter(t => t.status === 'completed');
      const overdueTasks = userTasks.filter(t => 
        t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed'
      );
      
      // Calculate average completion time
      const completionTimes = completedTasks
        .filter(t => t.completedAt && t.created_date)
        .map(t => {
          const start = new Date(t.created_date);
          const end = new Date(t.completedAt);
          return (end - start) / (1000 * 60 * 60 * 24); // days
        });
      
      const avgCompletionTime = completionTimes.length > 0 
        ? completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length 
        : 0;

      // Calculate workload score
      const inProgressTasks = userTasks.filter(t => 
        ['todo', 'in_progress', 'in_review'].includes(t.status)
      );
      const workloadScore = inProgressTasks.reduce((sum, task) => {
        const priority = { urgent: 4, high: 3, medium: 2, low: 1 };
        return sum + (priority[task.priority] || 2);
      }, 0);

      userStats[user.id] = {
        name: user.full_name || user.email,
        email: user.email,
        total: userTasks.length,
        completed: completedTasks.length,
        inProgress: inProgressTasks.length,
        overdue: overdueTasks.length,
        completionRate: userTasks.length > 0 ? (completedTasks.length / userTasks.length) * 100 : 0,
        avgCompletionTime: Math.round(avgCompletionTime * 10) / 10,
        workloadScore,
        productivity: completedTasks.length > 5 && avgCompletionTime < 3 ? 'high' : 
                     overdueTasks.length > 2 || avgCompletionTime > 7 ? 'low' : 'medium'
      };
    });

    return Object.values(userStats).sort((a, b) => b.completionRate - a.completionRate);
  }, [tasks, users]);

  // Priority and type distribution
  const distributionAnalytics = useMemo(() => {
    const priorityData = [
      { name: 'Urgente', value: tasks.filter(t => t.priority === 'urgent').length, color: '#EF4444' },
      { name: 'Alta', value: tasks.filter(t => t.priority === 'high').length, color: '#F59E0B' },
      { name: 'Média', value: tasks.filter(t => t.priority === 'medium').length, color: '#10B981' },
      { name: 'Baixa', value: tasks.filter(t => t.priority === 'low').length, color: '#3B82F6' }
    ].filter(item => item.value > 0);

    const statusData = [
      { name: 'Backlog', value: tasks.filter(t => t.status === 'backlog').length },
      { name: 'A Fazer', value: tasks.filter(t => t.status === 'todo').length },
      { name: 'Em Progresso', value: tasks.filter(t => t.status === 'in_progress').length },
      { name: 'Em Revisão', value: tasks.filter(t => t.status === 'in_review').length },
      { name: 'Concluído', value: tasks.filter(t => t.status === 'completed').length },
      { name: 'Bloqueado', value: tasks.filter(t => t.status === 'blocked').length }
    ].filter(item => item.value > 0);

    return { priorityData, statusData };
  }, [tasks]);

  // Performance trends
  const performanceTrends = useMemo(() => {
    const trends = {
      velocityTrend: timeAnalytics.weeklyCompleted > timeAnalytics.monthlyCompleted / 4 ? 'up' : 'down',
      creationTrend: timeAnalytics.weeklyCreated > timeAnalytics.monthlyCreated / 4 ? 'up' : 'down',
      overallHealth: analytics.overdue < 3 && analytics.completionRate > 70 ? 'good' : 
                     analytics.overdue > 5 || analytics.completionRate < 50 ? 'poor' : 'fair'
    };

    return trends;
  }, [timeAnalytics, analytics]);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Taxa de Conclusão</p>
                <p className="text-2xl font-bold">{analytics.completionRate}%</p>
                <Progress value={analytics.completionRate} className="mt-2 h-2" />
              </div>
              <div className={`p-2 rounded-full ${
                analytics.completionRate > 80 ? 'bg-green-100' : 
                analytics.completionRate > 60 ? 'bg-yellow-100' : 'bg-red-100'
              }`}>
                <Target className={`w-5 h-5 ${
                  analytics.completionRate > 80 ? 'text-green-600' : 
                  analytics.completionRate > 60 ? 'text-yellow-600' : 'text-red-600'
                }`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Velocidade Semanal</p>
                <p className="text-2xl font-bold">{analytics.velocityThisWeek}</p>
                <div className="flex items-center gap-1 mt-1">
                  {performanceTrends.velocityTrend === 'up' ? (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  )}
                  <span className={`text-xs ${
                    performanceTrends.velocityTrend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {performanceTrends.velocityTrend === 'up' ? 'Subindo' : 'Descendo'}
                  </span>
                </div>
              </div>
              <Zap className="w-5 h-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tempo Médio</p>
                <p className="text-2xl font-bold">{analytics.avgCompletionTime}d</p>
                <p className="text-xs text-gray-500 mt-1">Por tarefa concluída</p>
              </div>
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tarefas Atrasadas</p>
                <p className="text-2xl font-bold text-red-600">{analytics.overdue}</p>
                {analytics.overdue > 0 && (
                  <Badge variant="destructive" className="text-xs mt-1">
                    Requer atenção
                  </Badge>
                )}
              </div>
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Creation vs Completion Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="w-5 h-5" />
              Criação vs Conclusão (30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={timeAnalytics.chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="created" 
                  stackId="1" 
                  stroke="#3B82F6" 
                  fill="#3B82F6" 
                  fillOpacity={0.6}
                  name="Criadas"
                />
                <Area 
                  type="monotone" 
                  dataKey="completed" 
                  stackId="2" 
                  stroke="#10B981" 
                  fill="#10B981" 
                  fillOpacity={0.6}
                  name="Concluídas"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Priority Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flag className="w-5 h-5" />
              Distribuição por Prioridade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={distributionAnalytics.priorityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {distributionAnalytics.priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* User Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Performance por Usuário
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {userAnalytics.slice(0, 10).map((user, index) => (
              <div key={user.email} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full text-sm font-medium">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <p className="text-sm text-gray-600">{user.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <p className="font-medium">{user.total}</p>
                    <p className="text-gray-600">Total</p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-green-600">{user.completed}</p>
                    <p className="text-gray-600">Concluídas</p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-blue-600">{user.inProgress}</p>
                    <p className="text-gray-600">Em Progresso</p>
                  </div>
                  {user.overdue > 0 && (
                    <div className="text-center">
                      <p className="font-medium text-red-600">{user.overdue}</p>
                      <p className="text-gray-600">Atrasadas</p>
                    </div>
                  )}
                  <div className="text-center">
                    <p className="font-medium">{user.completionRate.toFixed(1)}%</p>
                    <p className="text-gray-600">Taxa</p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium">{user.avgCompletionTime}d</p>
                    <p className="text-gray-600">Tempo Médio</p>
                  </div>
                  
                  <Badge 
                    variant={user.productivity === 'high' ? 'default' : 
                             user.productivity === 'medium' ? 'secondary' : 'destructive'}
                    className="ml-2"
                  >
                    {user.productivity === 'high' ? 'Alta' :
                     user.productivity === 'medium' ? 'Média' : 'Baixa'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Distribuição por Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={distributionAnalytics.statusData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Health Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Resumo de Saúde do Projeto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-lg border-l-4 ${
              performanceTrends.overallHealth === 'good' ? 'bg-green-50 border-green-500' :
              performanceTrends.overallHealth === 'fair' ? 'bg-yellow-50 border-yellow-500' :
              'bg-red-50 border-red-500'
            }`}>
              <h4 className="font-medium mb-2">Estado Geral</h4>
              <Badge 
                variant={performanceTrends.overallHealth === 'good' ? 'default' :
                        performanceTrends.overallHealth === 'fair' ? 'secondary' : 'destructive'}
              >
                {performanceTrends.overallHealth === 'good' ? 'Saudável' :
                 performanceTrends.overallHealth === 'fair' ? 'Atenção' : 'Crítico'}
              </Badge>
            </div>

            <div className="p-4 rounded-lg border-l-4 bg-blue-50 border-blue-500">
              <h4 className="font-medium mb-2">Tendência de Criação</h4>
              <div className="flex items-center gap-2">
                {performanceTrends.creationTrend === 'up' ? (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                )}
                <span className={performanceTrends.creationTrend === 'up' ? 'text-green-600' : 'text-red-600'}>
                  {performanceTrends.creationTrend === 'up' ? 'Crescendo' : 'Diminuindo'}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-lg border-l-4 bg-purple-50 border-purple-500">
              <h4 className="font-medium mb-2">Capacidade da Equipe</h4>
              <div className="text-sm">
                <p>{userAnalytics.filter(u => u.workloadScore > 10).length} usuários sobrecarregados</p>
                <p>{userAnalytics.filter(u => u.productivity === 'high').length} usuários de alta performance</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
