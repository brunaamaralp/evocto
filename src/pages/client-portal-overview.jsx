import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { Service } from '@/api/entities';
import { Task } from '@/api/entities';
import { ApprovalRequest } from '@/api/entities';
import LoadingState from '@/components/shared/LoadingState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, Clock, CheckCircle2, AlertTriangle, 
  Target, Calendar, Users, ArrowRight 
} from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function ClientPortalOverviewPage() {
  const { user, isAuthenticated } = useSession();
  const [services, setServices] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [recentTasks, setRecentTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || user.role !== 'client') return;

    const loadDashboardData = async () => {
      try {
        setLoading(true);

        const [servicesData, approvalsData, tasksData] = await Promise.all([
          Service.filter({ clientId: user.data.clientId }, '-updated_date'),
          ApprovalRequest.filter({ 
            clientId: user.data.clientId,
            status: 'pending' 
          }),
          Task.filter({ 
            clientId: user.data.clientId,
            status: ['in_progress', 'ready_for_review'] 
          }, '-updated_date', 5)
        ]);

        setServices(servicesData || []);
        setPendingApprovals(approvalsData || []);
        setRecentTasks(tasksData || []);

      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [isAuthenticated, user]);

  const getServiceProgress = (service) => {
    if (!service.deliverables || service.deliverables.length === 0) return 0;
    
    const completed = service.deliverables.filter(d => 
      ['completed', 'approved'].includes(d.status)
    ).length;
    
    return Math.round((completed / service.deliverables.length) * 100);
  };

  const getServiceStatusColor = (status) => {
    const colors = {
      'active': 'bg-green-100 text-green-800',
      'draft': 'bg-gray-100 text-gray-800',
      'on_hold': 'bg-yellow-100 text-yellow-800',
      'completed': 'bg-blue-100 text-blue-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <LoadingState 
          variant="skeleton" 
          size="page"
          message="Carregando portal do cliente..."
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Portal do Cliente
          </h1>
          <p className="text-gray-600 mt-2">
            Bem-vindo, {user.full_name}. Acompanhe o progresso dos seus projetos.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Projetos Ativos</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {services.filter(s => s.service_status === 'active').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Aprovações Pendentes</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {pendingApprovals.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Projetos Concluídos</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {services.filter(s => s.service_status === 'completed').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Equipe Dedicada</p>
                  <p className="text-2xl font-bold text-gray-900">
                    <CheckCircle2 className="w-5 h-5 inline text-green-500" />
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Approvals */}
        {pendingApprovals.length > 0 && (
          <Card className="mb-8 border-l-4 border-l-orange-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <AlertTriangle className="w-5 h-5" />
                Aprovações Pendentes ({pendingApprovals.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingApprovals.map((approval) => (
                  <div key={approval.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-orange-900">{approval.title}</h4>
                      <p className="text-sm text-orange-700">{approval.description}</p>
                    </div>
                    <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
                      Revisar
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Services */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Seus Projetos</CardTitle>
          </CardHeader>
          <CardContent>
            {services.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">Nenhum projeto em andamento</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {services.map((service) => {
                  const progress = getServiceProgress(service);
                  return (
                    <div key={service.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900">{service.name}</h3>
                          <p className="text-gray-600 text-sm">{service.description}</p>
                        </div>
                        <Badge className={getServiceStatusColor(service.service_status)}>
                          {service.service_status || 'Em Andamento'}
                        </Badge>
                      </div>

                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-600">Progresso</span>
                          <span className="font-medium">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          {service.start_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              Iniciado em {new Date(service.start_date).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Target className="w-4 h-4" />
                            {service.deliverables?.length || 0} fases
                          </span>
                        </div>

                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.location.href = createPageUrl('client-portal-service-overview', { serviceId: service.id })}
                        >
                          Ver Detalhes
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}