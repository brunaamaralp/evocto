import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { getClientDashboardData } from '@/api/functions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Clock, CheckCircle, FileText, AlertCircle, 
  Calendar, User, Building, Mail, RefreshCw, Loader2,
  BarChart3, TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import ClientGoalsKPIDashboard from '@/components/client_portal/ClientGoalsKPIDashboard';
import ClientFileManager from '@/components/client_portal/ClientFileManager';
import ExecutiveDashboard from '@/components/client_portal/ExecutiveDashboard';
import ProgressFeedbackSystem from '@/components/client_portal/ProgressFeedbackSystem';
import EducationalMicrotexts from '@/components/client_portal/EducationalMicrotexts';
import ClientOnboardingSystem from '@/components/client_portal/ClientOnboardingSystem';

export default function ClientPortalPage() {
  const { user, isAuthenticated, loading: sessionLoading, agencyId } = useSession();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Verificar se é primeira visita e mostrar onboarding
  useEffect(() => {
    if (!sessionLoading && isAuthenticated && user && user.role === 'client') {
      const hasCompletedOnboarding = localStorage.getItem(`onboarding_completed_${user.clientId}`);
      if (!hasCompletedOnboarding) {
        setShowOnboarding(true);
      }
    }
  }, [sessionLoading, isAuthenticated, user]);

  // REDIRECIONAMENTO - sempre chamado, verificações dentro
  useEffect(() => {
    if (!sessionLoading && isAuthenticated && user) {
      // Se não é cliente, redirecionar imediatamente
      if (user.role !== 'client') {
        console.log(`[ClientPortal] Non-client user (${user.role}) accessing client portal, redirecting to dashboard`);
        setShouldRedirect(true);
        window.location.replace('/today');
        return;
      }
      
      // Debug: log user data apenas para clientes
      console.log('[ClientPortal] Client user data:', {
        isAuthenticated,
        userRole: user?.role,
        clientId: user?.clientId,
        agencyId,
        userEmail: user?.email
      });
    }
  }, [sessionLoading, isAuthenticated, user, agencyId]);

  // Load dashboard data - sempre chamado, verificações dentro
  useEffect(() => {
    const loadDashboardData = async () => {
      // Só executar para clientes autenticados - todas as verificações dentro
      if (!sessionLoading && isAuthenticated && user) {
        if (user.role !== 'client') {
          return; // Não faz nada se não é cliente
        }

        if (!user.clientId) {
          setError('ID do cliente não encontrado. Entre em contato com sua consultoria.');
          setLoading(false);
          return;
        }

        if (!agencyId && !user.agencyId) {
          setError('ID da agência não encontrado. Entre em contato com sua consultoria.');
          setLoading(false);
          return;
        }

        try {
          setLoading(true);
          setError(null);
          
          console.log('[ClientPortal] Loading dashboard data for client:', user.clientId);
          
          const response = await getClientDashboardData();
          
          if (response.data?.success) {
            setDashboardData(response.data);
            console.log('[ClientPortal] Dashboard data loaded successfully');
          } else {
            throw new Error(response.data?.message || 'Falha ao carregar dados do dashboard');
          }
        } catch (err) {
          console.error('[ClientPortal] Error loading dashboard:', err);
          setError(`Erro ao carregar dados: ${err.message}`);
          toast.error('Erro ao carregar dados do portal');
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    loadDashboardData();
  }, [sessionLoading, isAuthenticated, user, agencyId]);

  // Handle refresh - função separada para refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    
    if (!isAuthenticated || !user || user.role !== 'client') {
      setRefreshing(false);
      return;
    }

    if (!user.clientId) {
      setError('ID do cliente não encontrado. Entre em contato com sua consultoria.');
      setRefreshing(false);
      return;
    }

    if (!agencyId && !user.agencyId) {
      setError('ID da agência não encontrado. Entre em contato com sua consultoria.');
      setRefreshing(false);
      return;
    }

    try {
      setError(null);
      
      console.log('[ClientPortal] Refreshing dashboard data for client:', user.clientId);
      
      const response = await getClientDashboardData();
      
      if (response.data?.success) {
        setDashboardData(response.data);
        console.log('[ClientPortal] Dashboard data refreshed successfully');
        toast.success('Dados atualizados com sucesso');
      } else {
        throw new Error(response.data?.message || 'Falha ao carregar dados do dashboard');
      }
    } catch (err) {
      console.error('[ClientPortal] Error refreshing dashboard:', err);
      setError(`Erro ao carregar dados: ${err.message}`);
      toast.error('Erro ao atualizar dados do portal');
    } finally {
      setRefreshing(false);
    }
  };

  // Show redirecting state
  if (shouldRedirect) {
    return <LoadingState message="Redirecionando..." />;
  }

  // Show loading while session is loading
  if (sessionLoading) {
    return <LoadingState message="Verificando sua sessão..." />;
  }

  // Show error if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <EmptyState
          icon="lock"
          title="Acesso Negado"
          description="Você precisa fazer login para acessar o portal do cliente."
          primaryAction={{
            label: 'Fazer Login',
            onClick: () => window.location.href = '/client-login'
          }}
        />
      </div>
    );
  }

  // Show error for non-clients
  if (user?.role !== 'client') {
    return <LoadingState message="Redirecionando..." />;
  }

  // Show main portal
  if (dashboardData && !loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Portal do Cliente</h1>
            <p className="text-gray-600">Bem-vindo, {user.name || user.email}</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
    <TabsList className="grid w-full grid-cols-6">
      <TabsTrigger value="overview" className="flex items-center gap-2">
        <Building className="w-4 h-4" />
        <span className="hidden sm:inline">Visão Geral</span>
      </TabsTrigger>
      <TabsTrigger value="executive" className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4" />
        <span className="hidden sm:inline">Dashboard</span>
      </TabsTrigger>
      <TabsTrigger value="progress" className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4" />
        <span className="hidden sm:inline">Progresso</span>
      </TabsTrigger>
      <TabsTrigger value="goals" className="flex items-center gap-2">
        <CheckCircle className="w-4 h-4" />
        <span className="hidden sm:inline">Metas & KPIs</span>
      </TabsTrigger>
      <TabsTrigger value="files" className="flex items-center gap-2">
        <FileText className="w-4 h-4" />
        <span className="hidden sm:inline">Arquivos</span>
      </TabsTrigger>
      <TabsTrigger value="help" className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4" />
        <span className="hidden sm:inline">Ajuda</span>
      </TabsTrigger>
    </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Serviços Ativos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600">
                      {dashboardData.services?.length || 0}
                    </div>
                    <p className="text-sm text-gray-600">Serviços em andamento</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Aprovações Pendentes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-orange-600">
                      {dashboardData.approvals?.pending?.length || 0}
                    </div>
                    <p className="text-sm text-gray-600">Aguardando sua aprovação</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Documentos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">
                      {dashboardData.documents?.length || 0}
                    </div>
                    <p className="text-sm text-gray-600">Documentos disponíveis</p>
                  </CardContent>
                </Card>
              </div>

              {dashboardData.approvals?.pending?.length > 0 && (
                <Card className="border-orange-200 bg-orange-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-orange-900 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      Aprovações Pendentes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {dashboardData.approvals.pending.slice(0, 3).map((approval, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg">
                          <div>
                            <h4 className="font-medium text-gray-900">{approval.title}</h4>
                            <p className="text-sm text-gray-600">{approval.description}</p>
                          </div>
                          <Button size="sm" variant="outline">
                            Revisar
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="executive">
              <ExecutiveDashboard 
                clientId={user.clientId} 
                serviceId={dashboardData.services?.[0]?.id}
              />
            </TabsContent>

            <TabsContent value="progress">
              <ProgressFeedbackSystem 
                clientId={user.clientId} 
                serviceId={dashboardData.services?.[0]?.id}
              />
            </TabsContent>

            <TabsContent value="goals">
              <ClientGoalsKPIDashboard 
                clientId={user.clientId} 
                serviceId={dashboardData.services?.[0]?.id}
              />
            </TabsContent>

            <TabsContent value="files">
              <ClientFileManager 
                clientId={user.clientId} 
                serviceId={dashboardData.services?.[0]?.id}
              />
            </TabsContent>

            <TabsContent value="help">
              <EducationalMicrotexts />
            </TabsContent>

            <TabsContent value="approvals">
              <div className="text-center py-12">
                <Clock className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Sistema de Aprovações</h3>
                <p className="text-gray-600">Funcionalidade em desenvolvimento</p>
              </div>
            </TabsContent>

            <TabsContent value="reports">
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Relatórios</h3>
                <p className="text-gray-600">Funcionalidade em desenvolvimento</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }

  // Show error state
  if (error && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Portal do Cliente</h1>
            <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
              {refreshing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              {refreshing ? 'Atualizando...' : 'Tentar Novamente'}
            </Button>
          </div>
          
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertCircle className="w-6 h-6 text-red-600 mr-3" />
                <div>
                  <h3 className="font-semibold text-red-800">Erro no Portal</h3>
                  <p className="text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Debug info sempre visível em caso de erro */}
          <Card className="mt-4 border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="text-sm text-yellow-800">Debug Info</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs text-yellow-700">
                {JSON.stringify({
                  isAuthenticated,
                  userRole: user?.role,
                  clientId: user?.clientId,
                  agencyId: agencyId || user?.agencyId,
                  userEmail: user?.email
                }, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show loading state
  if (loading) {
    return <LoadingState message="Carregando seu portal..." />;
  }

  // Show main portal content
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Bem-vindo, {user?.full_name || 'Cliente'}! 👋
            </h1>
            <p className="text-gray-600 mt-1">
              {dashboardData?.client?.company || 'Seu portal de acompanhamento'}
            </p>
          </div>
          <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
            {refreshing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            {refreshing ? 'Atualizando...' : 'Atualizar'}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="w-8 h-8 text-yellow-600 mr-4" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Aprovações Pendentes</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {dashboardData?.stats?.pendingApprovals || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="w-8 h-8 text-green-600 mr-4" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Serviços Ativos</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {dashboardData?.stats?.activeServices || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <FileText className="w-8 h-8 text-blue-600 mr-4" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Relatórios Disponíveis</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {dashboardData?.reports?.count || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Calendar className="w-8 h-8 text-purple-600 mr-4" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Última Atualização</p>
                  <p className="text-sm font-bold text-gray-900">
                    {dashboardData?.lastUpdated ? 
                      new Date(dashboardData.lastUpdated).toLocaleDateString('pt-BR') : 
                      'Hoje'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="approvals">
              Aprovações 
              {dashboardData?.stats?.pendingApprovals > 0 && (
                <Badge className="ml-2" variant="secondary">
                  {dashboardData.stats.pendingApprovals}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="reports">Relatórios</TabsTrigger>
            <TabsTrigger value="briefing">Briefing</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Atividade Recente</CardTitle>
                </CardHeader>
                <CardContent>
                  {dashboardData?.activity?.length > 0 ? (
                    <div className="space-y-4">
                      {dashboardData.activity.slice(0, 5).map((activity, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {activity.title}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(activity.date).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">Nenhuma atividade recente</p>
                  )}
                </CardContent>
              </Card>

              {/* Services Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Status dos Serviços</CardTitle>
                </CardHeader>
                <CardContent>
                  {dashboardData?.services?.active?.length > 0 ? (
                    <div className="space-y-3">
                      {dashboardData.services.active.map((service, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                          <div>
                            <p className="font-medium text-gray-900">{service.name}</p>
                            <p className="text-sm text-gray-600">{service.category}</p>
                          </div>
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            Ativo
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">Nenhum serviço ativo</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="approvals">
            <Card>
              <CardHeader>
                <CardTitle>Aprovações Pendentes</CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData?.approvals?.pending?.length > 0 ? (
                  <div className="space-y-4">
                    {dashboardData.approvals.pending.map((approval, index) => (
                      <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">{approval.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{approval.description}</p>
                            <p className="text-xs text-gray-500 mt-2">
                              Expira em: {new Date(approval.expiresAt).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <Button size="sm">
                            Revisar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon="check"
                    title="Nenhuma aprovação pendente"
                    description="Todas as aprovações foram processadas."
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>Relatórios Disponíveis</CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData?.reports?.available?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {dashboardData.reports.available.map((report, index) => (
                      <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">{report.cyclePeriod}</h4>
                            <p className="text-sm text-gray-600">
                              Status: {report.status}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Atualizado: {new Date(report.updated_date).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <Button size="sm" variant="outline">
                            Visualizar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon="file"
                    title="Nenhum relatório disponível"
                    description="Os relatórios aparecerão aqui quando estiverem prontos."
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="briefing">
            <Card>
              <CardHeader>
                <CardTitle>Briefing Atual</CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData?.briefings?.current ? (
                  <div>
                    <p className="text-gray-600 mb-4">
                      Seu briefing foi atualizado em {' '}
                      {new Date(dashboardData.briefings.current.updated_date).toLocaleDateString('pt-BR')}
                    </p>
                    <Button>Visualizar Briefing</Button>
                  </div>
                ) : (
                  <EmptyState
                    icon="clipboard"
                    title="Nenhum briefing disponível"
                    description="O briefing do seu projeto aparecerá aqui quando estiver pronto."
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal de Onboarding */}
      <ClientOnboardingSystem
        isOpen={showOnboarding}
        onClose={() => {
          setShowOnboarding(false);
          localStorage.setItem(`onboarding_completed_${user.clientId}`, 'true');
        }}
        clientId={user.clientId}
        serviceId={dashboardData.services?.[0]?.id}
      />
    </div>
  );
}