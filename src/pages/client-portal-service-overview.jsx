import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { Service } from '@/api/entities';
import { Task } from '@/api/entities';
import { ClientDocument } from '@/api/entities';
import LoadingState from '@/components/shared/LoadingState';
import ErrorState from '@/components/shared/ErrorState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, Clock, FileText, CheckCircle2, 
  AlertTriangle, Users, Target 
} from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function ClientPortalServiceOverviewPage() {
  const { user, isAuthenticated } = useSession();
  const [service, setService] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Extrair serviceId da URL
  const urlParams = new URLSearchParams(window.location.search);
  const serviceId = urlParams.get('serviceId');

  useEffect(() => {
    if (!isAuthenticated || !serviceId) return;

    const loadServiceData = async () => {
      try {
        setLoading(true);

        // Verificar se usuário é cliente e tem acesso ao serviço
        if (user.role !== 'client') {
          throw new Error('Access denied - Client only area');
        }

        const [serviceData, tasksData, documentsData] = await Promise.all([
          Service.get(serviceId),
          Task.filter({ serviceId, clientId: user.data.clientId }, '-updated_date'),
          ClientDocument.filter({ 
            serviceId, 
            clientId: user.data.clientId,
            visibility: ['client', 'public']
          }, '-created_date')
        ]);

        // Verificar se cliente tem acesso ao serviço
        if (!serviceData || serviceData.clientId !== user.data.clientId) {
          throw new Error('Service not found or access denied');
        }

        setService(serviceData);
        setTasks(tasksData || []);
        setDocuments(documentsData || []);

      } catch (err) {
        console.error('Error loading service data:', err);
        setError({
          type: err.message.includes('not found') ? '404' : '403',
          message: err.message
        });
      } finally {
        setLoading(false);
      }
    };

    loadServiceData();
  }, [isAuthenticated, serviceId, user]);

  const getBreadcrumbs = () => {
    const breadcrumbs = [
      { label: 'Portal do Cliente', href: createPageUrl('client-portal-overview') }
    ];

    if (service) {
      breadcrumbs.push({ label: service.name });
      breadcrumbs.push({ label: 'Visão Geral' });
    }

    return breadcrumbs;
  };

  const calculateProgress = () => {
    if (!service?.deliverables) return 0;

    const total = service.deliverables.length;
    const completed = service.deliverables.filter(d => 
      ['completed', 'approved'].includes(d.status)
    ).length;

    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const getStatusColor = (status) => {
    const colors = {
      'not_started': 'bg-gray-100 text-gray-800',
      'in_progress': 'bg-blue-100 text-blue-800',
      'ready_for_review': 'bg-yellow-100 text-yellow-800',
      'ready_for_approval': 'bg-orange-100 text-orange-800',
      'approved': 'bg-green-100 text-green-800',
      'completed': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <LoadingState 
          variant="skeleton" 
          size="page"
          message="Carregando informações do serviço..."
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <ErrorState
          type={error.type}
          title={error.type === '404' ? 'Serviço Não Encontrado' : 'Acesso Negado'}
          message={error.message}
          backUrl={createPageUrl('client-portal-overview')}
        />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <ErrorState
          type="404"
          backUrl={createPageUrl('client-portal-overview')}
        />
      </div>
    );
  }

  const progress = calculateProgress();
  const nextDeliverable = service.deliverables?.find(d => 
    ['ready_for_approval', 'in_progress'].includes(d.status)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          {/* Breadcrumbs */}
          <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
            {getBreadcrumbs().map((crumb, index) => (
              <React.Fragment key={index}>
                {crumb.href ? (
                  <a href={crumb.href} className="hover:text-gray-900">
                    {crumb.label}
                  </a>
                ) : (
                  <span className="text-gray-900 font-medium">{crumb.label}</span>
                )}
                {index < getBreadcrumbs().length - 1 && (
                  <span className="text-gray-400">/</span>
                )}
              </React.Fragment>
            ))}
          </nav>

          {/* Service Header */}
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {service.name}
              </h1>
              <p className="text-gray-600 mt-1">{service.description}</p>
            </div>
            
            <div className="text-right">
              <Badge className={getStatusColor(service.service_status)}>
                {service.service_status || 'Em Andamento'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Progress Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                Progresso Geral
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Conclusão</span>
                  <span className="text-sm font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-gray-500">
                  {service.deliverables?.filter(d => ['completed', 'approved'].includes(d.status)).length || 0} de {service.deliverables?.length || 0} fases concluídas
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-600" />
                Cronograma
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Início</span>
                  <span className="text-sm font-medium">
                    {service.start_date ? new Date(service.start_date).toLocaleDateString('pt-BR') : 'A definir'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Previsão</span>
                  <span className="text-sm font-medium">
                    {service.end_date ? new Date(service.end_date).toLocaleDateString('pt-BR') : 'A definir'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-green-600" />
                Equipe
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Sua agência está executando este projeto com nossa equipe especializada.
              </p>
              <div className="mt-2">
                <span className="inline-flex items-center text-xs bg-blue-100 text-blue-800 rounded-full px-2 py-1">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Equipe Dedicada
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Next Action Required */}
        {nextDeliverable && (
          <Card className="mb-8 border-l-4 border-l-orange-500 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <AlertTriangle className="w-5 h-5" />
                Ação Necessária
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-orange-700">
                <strong>{nextDeliverable.name}</strong> - {nextDeliverable.status === 'ready_for_approval' ? 'Aguardando sua aprovação' : 'Em desenvolvimento'}
              </p>
              {nextDeliverable.status === 'ready_for_approval' && (
                <div className="mt-3">
                  <a 
                    href={createPageUrl('client-portal-service-documents', { serviceId: service.id })}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Ver documentos para aprovação →
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Deliverables Timeline */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Fases do Projeto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {service.deliverables?.map((deliverable, index) => (
                <div key={deliverable.id} className="flex items-start space-x-4 p-4 rounded-lg border">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-800">
                    {index + 1}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900">{deliverable.name}</h3>
                      <Badge className={getStatusColor(deliverable.status)}>
                        {deliverable.status?.replace('_', ' ') || 'Em planejamento'}
                      </Badge>
                    </div>
                    
                    {deliverable.description && (
                      <p className="text-sm text-gray-600 mb-2">{deliverable.description}</p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {deliverable.duration_days} dias
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {deliverable.estimated_hours}h estimadas
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Documents */}
        {documents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Documentos Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {documents.slice(0, 5).map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">{doc.title}</h4>
                      <p className="text-xs text-gray-500">
                        {new Date(doc.created_date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {doc.group}
                    </Badge>
                  </div>
                ))}
                
                {documents.length > 5 && (
                  <div className="pt-3 border-t">
                    <a 
                      href={createPageUrl('client-portal-service-documents', { serviceId: service.id })}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Ver todos os documentos ({documents.length}) →
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}