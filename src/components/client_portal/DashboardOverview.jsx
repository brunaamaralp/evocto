import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { Task } from '@/api/entities';
import { Service } from '@/api/entities';
import { ApprovalRequest } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import ProcessStepper from '@/components/client/ProcessStepper';
import { 
  Clock, CheckCircle, AlertCircle, FileText, 
  TrendingUp, Calendar, Target, ArrowRight,
  Bell, Settings, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function DashboardOverview({ clientId }) {
  const { user } = useSession();
  const [services, setServices] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState(null);

  const loadDashboardData = useCallback(async () => {
    if (!clientId || !user?.data?.agencyId) return;

    try {
      setLoading(true);

      // Carregar serviços do cliente
      const servicesData = await Service.filter({
        agencyId: user.data.agencyId,
        clientId: clientId,
        is_template: false,
        is_active: true
      }, '-updated_date');

      // Carregar tarefas relacionadas aos serviços
      const tasksData = await Task.filter({
        agencyId: user.data.agencyId,
        clientId: clientId
      }, '-updated_date');

      // Carregar aprovações pendentes
      const approvalsData = await ApprovalRequest.filter({
        agencyId: user.data.agencyId,
        clientId: clientId,
        status: 'pending'
      }, '-created_date');

      setServices(servicesData || []);
      setTasks(tasksData || []);
      setApprovals(approvalsData || []);

      // Selecionar o primeiro serviço ativo por padrão
      if (servicesData && servicesData.length > 0) {
        setSelectedService(servicesData[0]);
      }

    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      toast.error('Erro ao carregar informações do dashboard');
    } finally {
      setLoading(false);
    }
  }, [clientId, user?.data?.agencyId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Calcular estatísticas
  const stats = React.useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
    const overdueTasks = tasks.filter(t => 
      t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed'
    ).length;

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      activeServices: services.length,
      pendingApprovals: approvals.length
    };
  }, [tasks, services, approvals]);

  // Filtrar tarefas do serviço selecionado
  const selectedServiceTasks = React.useMemo(() => {
    if (!selectedService) return [];
    return tasks.filter(task => task.serviceId === selectedService.id);
  }, [tasks, selectedService]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-48 bg-gray-200 rounded-lg"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Bem-vindo ao Portal do Cliente
              </h1>
              <p className="text-gray-600">
                Acompanhe o progresso dos seus projetos e mantenha-se informado sobre todas as atividades.
              </p>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <Badge className="bg-green-100 text-green-800 px-3 py-1">
                {stats.activeServices} Serviço{stats.activeServices !== 1 ? 's' : ''} Ativo{stats.activeServices !== 1 ? 's' : ''}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Target className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalTasks}</div>
              <div className="text-sm text-gray-600">Total de Tarefas</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.completedTasks}</div>
              <div className="text-sm text-gray-600">Concluídas</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.inProgressTasks}</div>
              <div className="text-sm text-gray-600">Em Andamento</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Bell className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.pendingApprovals}</div>
              <div className="text-sm text-gray-600">Aprovações Pendentes</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service Selector */}
      {services.length > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <span className="font-medium text-gray-700">Visualizando progresso de:</span>
              <div className="flex gap-2">
                {services.map(service => (
                  <Button
                    key={service.id}
                    variant={selectedService?.id === service.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedService(service)}
                  >
                    {service.name}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Process Stepper - Main Feature */}
      {selectedService && (
        <ProcessStepper
          service={selectedService}
          tasks={selectedServiceTasks}
          deliverables={selectedService.deliverables || []}
          showProgress={true}
        />
      )}

      {/* Pending Approvals */}
      {approvals.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertCircle className="w-5 h-5" />
              Aprovações Pendentes ({approvals.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {approvals.slice(0, 3).map(approval => (
                <div key={approval.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <FileText className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{approval.title}</h4>
                      <p className="text-sm text-gray-600">
                        {approval.description || 'Aguardando sua aprovação'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Enviado em {new Date(approval.created_date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" asChild>
                    <Link to={`/approval/${approval.token}`}>
                      <Eye className="w-4 h-4 mr-2" />
                      Revisar
                    </Link>
                  </Button>
                </div>
              ))}
              
              {approvals.length > 3 && (
                <div className="text-center pt-3">
                  <Button variant="outline" size="sm" asChild>
                    <Link to={createPageUrl('client-portal') + '?tab=approvals'}>
                      Ver todas as aprovações ({approvals.length})
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Tasks */}
      {selectedServiceTasks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span>Tarefas Recentes</span>
              <Button variant="outline" size="sm" asChild>
                <Link to={createPageUrl('client-portal') + '?tab=tasks'}>
                  Ver todas
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {selectedServiceTasks.slice(0, 5).map(task => (
                <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full mt-2 bg-blue-500"></div>
                    <div>
                      <h4 className="font-medium text-gray-900">{task.title}</h4>
                      <p className="text-sm text-gray-600">{task.description}</p>
                      {task.dueDate && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <Calendar className="w-3 h-3" />
                          Prazo: {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge 
                    className={
                      task.status === 'completed' ? 'bg-green-100 text-green-800' :
                      task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }
                  >
                    {task.status === 'completed' ? 'Concluída' :
                     task.status === 'in_progress' ? 'Em Andamento' : 'Pendente'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {services.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Nenhum projeto ativo
            </h3>
            <p className="text-gray-600 mb-4">
              Não há projetos ativos no momento. Entre em contato com sua agência para mais informações.
            </p>
            <Button variant="outline">
              <Settings className="w-4 h-4 mr-2" />
              Configurações
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}