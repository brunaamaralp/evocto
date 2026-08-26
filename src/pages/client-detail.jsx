
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft,
  Building, 
  Plus, 
  Zap, 
  FileText, 
  BarChart3,
  CheckCircle,
  Circle,
  AlertCircle,
  Loader2,
  Target,
  Calendar,
  Users,
  Database
} from 'lucide-react';
import { useSession } from '@/components/auth/SessionManager';
import { Client } from '@/api/entities';
import { Service } from '@/api/entities';
import { Link } from 'react-router-dom';
import { createPageUrl, getUrlSearchParam } from '@/utils';

export default function ClientDetailPage() {
  const { user, agencyId, isAuthenticated } = useSession();
  const [client, setClient] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // CORREÇÃO: Leitura correta do parâmetro clientId da URL
  const getClientIdFromUrl = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const clientId = getUrlSearchParam(urlParams, 'clientId', 'id');
    console.log('🔍 Debug URL params:', {
      fullUrl: window.location.href,
      search: window.location.search,
      clientIdFromUrl: clientId,
      allParams: Object.fromEntries(urlParams.entries())
    });
    return clientId;
  };

  const clientId = getClientIdFromUrl();

  const loadClientData = useCallback(async () => {
    if (!clientId || !agencyId) {
      console.log('❌ Parâmetros faltando:', { clientId, agencyId });
      setError(!clientId ? 'ID do cliente não encontrado na URL' : 'Agency ID não encontrado');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Carregando dados do cliente:', { clientId, agencyId });

      // Carregar cliente
      const clientData = await Client.get(clientId);
      
      if (!clientData) {
        console.log('❌ Cliente não encontrado no banco:', clientId);
        setError('Cliente não encontrado');
        setLoading(false);
        setClient(null); // Explicitly set client to null if not found
        return;
      }
      
      if (clientData.agencyId !== agencyId) {
        console.log('❌ Cliente pertence a outra agência:', {
          clientAgency: clientData.agencyId,
          userAgency: agencyId
        });
        setError('Cliente não encontrado ou sem permissão de acesso');
        setLoading(false);
        setClient(null); // Explicitly set client to null if no permission
        return;
      }

      console.log('✅ Cliente carregado:', clientData.name);
      setClient(clientData);

      // Carregar serviços do cliente
      const clientServices = await Service.filter({
        agencyId,
        clientId,
        is_template: false
      });
      
      console.log('✅ Serviços carregados:', clientServices.length);
      setServices(clientServices);

    } catch (error) {
      console.error('❌ Erro ao carregar dados do cliente:', error);
      setError(`Erro ao carregar cliente: ${error.message}`);
      setClient(null); // Ensure client is null on error
    } finally {
      setLoading(false);
    }
  }, [clientId, agencyId]);

  useEffect(() => {
    if (isAuthenticated && agencyId) {
      loadClientData();
    } else {
      console.log('⏳ Aguardando autenticação:', { isAuthenticated, agencyId });
    }
  }, [isAuthenticated, agencyId, loadClientData]);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  if (!clientId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">ID do cliente não encontrado</h2>
          <p className="text-gray-600 mb-4">
            Verifique se o link está correto ou se o cliente foi selecionado corretamente.
          </p>
          <div className="bg-gray-100 p-3 rounded text-xs text-left mb-4">
            <p><strong>URL atual:</strong> {window.location.href}</p>
            <p><strong>Parâmetros:</strong> {window.location.search}</p>
          </div>
          <Button asChild className="mt-4">
            <Link to={createPageUrl('clients')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar aos Clientes
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando dados do cliente...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro ao Carregar Cliente</h2>
          <p className="text-red-600 mb-4">{error}</p>
          
          <div className="bg-gray-100 p-3 rounded text-xs text-left mb-4">
            <p><strong>Debug Info:</strong></p>
            <p>Client ID: {clientId || 'N/A'}</p>
            <p>Agency ID: {agencyId || 'N/A'}</p>
            <p>URL: {window.location.href}</p>
            <p>Auth: {isAuthenticated ? 'Yes' : 'No'}</p>
          </div>
          
          <div className="flex gap-2 justify-center">
            <Button asChild variant="outline">
              <Link to={createPageUrl('clients')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar aos Clientes
              </Link>
            </Button>
            <Button onClick={() => window.location.reload()}>
              Tentar Novamente
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Cliente não encontrado</p>
          <Button asChild className="mt-4" variant="outline">
            <Link to={createPageUrl('clients')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar aos Clientes
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Setup checklist para clientes novos
  const setupChecklist = [
    {
      id: 'services',
      title: 'Criar primeiro serviço',
      description: 'Defina qual serviço será prestado para este cliente',
      completed: services.length > 0,
      action: 'Criar Serviço',
      href: createPageUrl(`services?action=new&clientId=${clientId}`)
    },
    {
      id: 'briefing',
      title: 'Preencher briefing',
      description: 'Colete informações detalhadas sobre o negócio do cliente',
      completed: false, // TODO: verificar se tem briefing
      action: 'Preencher Briefing',
      href: createPageUrl(`briefing-editor?clientId=${clientId}`)
    },
    {
      id: 'team',
      title: 'Convidar cliente para o portal',
      description: 'Permita que o cliente acesse seu portal exclusivo',
      completed: false, // TODO: verificar se cliente tem acesso
      action: 'Enviar Convite',
      href: createPageUrl(`invites?action=invite-client&clientId=${clientId}`)
    },
    {
      id: 'kpis',
      title: 'Configurar KPIs',
      description: 'Defina indicadores de performance para acompanhar',
      completed: false, // TODO: verificar se tem KPIs
      action: 'Configurar KPIs',
      href: createPageUrl(`financial-kpis?clientId=${clientId}`)
    }
  ];

  const completedSteps = setupChecklist.filter(step => step.completed).length;
  const isSetupComplete = completedSteps === setupChecklist.length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="sm">
            <Link to={createPageUrl('clients')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Clientes
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
            <p className="text-gray-600">{client.legal_name}</p>
          </div>
        </div>
        <Badge variant={client.status === 'ativo' ? 'default' : 'secondary'}>
          {client.status}
        </Badge>
      </div>

      {/* Setup Guide (se não está completo) */}
      {!isSetupComplete && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Zap className="w-5 h-5" />
              Configuração Inicial ({completedSteps}/{setupChecklist.length})
            </CardTitle>
            <p className="text-blue-700 text-sm">
              Complete estas etapas para começar a trabalhar com {client.name}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {setupChecklist.map((step) => (
                <div key={step.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div className="flex items-center gap-3">
                    {step.completed ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-400" />
                    )}
                    <div>
                      <h4 className="font-medium text-gray-900">{step.title}</h4>
                      <p className="text-sm text-gray-600">{step.description}</p>
                    </div>
                  </div>
                  {!step.completed && (
                    <Button asChild size="sm">
                      <Link to={step.href}>
                        <Plus className="w-4 h-4 mr-1" />
                        {step.action}
                      </Link>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Serviços</p>
                <p className="text-3xl font-bold">{services.length}</p>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ciclos Ativos</p>
                <p className="text-3xl font-bold">0</p>
              </div>
              <Calendar className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">KPIs</p>
                <p className="text-3xl font-bold">0</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Documentos</p>
                <p className="text-3xl font-bold">0</p>
              </div>
              <FileText className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button asChild variant="outline" className="h-auto p-4 justify-start">
              <Link to={createPageUrl(`services?action=new&clientId=${clientId}`)}>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Target className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">Novo Serviço</div>
                    <div className="text-sm text-gray-500">Criar contrato de serviço</div>
                  </div>
                </div>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-auto p-4 justify-start">
              <Link to={createPageUrl(`briefing-editor?clientId=${clientId}`)}>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FileText className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">Briefing</div>
                    <div className="text-sm text-gray-500">Coletar informações</div>
                  </div>
                </div>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-auto p-4 justify-start">
              <Link to={createPageUrl(`financial-kpis?clientId=${clientId}`)}>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Database className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">KPIs</div>
                    <div className="text-sm text-gray-500">Definir indicadores</div>
                  </div>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Serviços */}
      {services.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Serviços Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {services.map((service) => (
                <div key={service.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{service.name}</h4>
                    <p className="text-sm text-gray-600">{service.description}</p>
                  </div>
                  <Badge variant="outline">{service.service_status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State para Serviços */}
      {services.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum serviço configurado
            </h3>
            <p className="text-gray-600 mb-6">
              Para começar a trabalhar com {client.name}, crie o primeiro serviço.
            </p>
            <Button asChild>
              <Link to={createPageUrl(`services?action=new&clientId=${clientId}`)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Serviço
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
