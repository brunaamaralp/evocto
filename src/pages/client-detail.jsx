import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Plus,
  Zap,
  FileText,
  CheckCircle,
  Circle,
  AlertCircle,
  Loader2,
  Target,
  Calendar,
  AlertTriangle,
  Clock,
  Database,
} from 'lucide-react';
import { useSession } from '@/components/auth/SessionManager';
import { createPageUrl, getUrlSearchParam } from '@/utils';
import useClientHubData from '@/hooks/useClientHubData';
import ClientContextSidebar from '@/components/layout/ClientContextSidebar';
import ClientAttentionPanel from '@/components/client/ClientAttentionPanel';
import ClientExecutionPanel from '@/components/client/ClientExecutionPanel';
import ClientKnowledgeSummary from '@/components/client/ClientKnowledgeSummary';
import InviteClientModal from '@/components/client/InviteClientModal';

export default function ClientDetailPage() {
  const { agencyId, isAuthenticated } = useSession();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  const clientId = useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return getUrlSearchParam(urlParams, 'clientId', 'id');
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('open') === 'invite') {
      setInviteModalOpen(true);
    }
  }, []);

  const {
    client,
    briefs,
    documents,
    learnings,
    evolutionEvents,
    loading,
    error,
    reload,
    activeServices,
    activeCycles,
    attentionItems,
    counts,
  } = useClientHubData(clientId, agencyId);

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
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            ID do cliente não encontrado
          </h2>
          <p className="text-gray-600 mb-4">
            Abra o perfil a partir da lista de clientes.
          </p>
          <Button asChild variant="outline">
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
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Carregando perfil do cliente...</p>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Erro ao Carregar Cliente
          </h2>
          <p className="text-red-600 mb-4">{error || 'Cliente não encontrado'}</p>
          <div className="flex gap-2 justify-center">
            <Button asChild variant="outline">
              <Link to={createPageUrl('clients')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Clientes
              </Link>
            </Button>
            <Button onClick={reload}>Tentar novamente</Button>
          </div>
        </div>
      </div>
    );
  }

  const hasServices = activeServices.length > 0;
  const setupChecklist = [
    {
      id: 'services',
      title: 'Criar primeiro serviço',
      description: 'Defina qual serviço será prestado para este cliente',
      completed: hasServices,
      action: 'Criar Serviço',
      href: createPageUrl(`services?action=new&clientId=${clientId}`),
    },
    {
      id: 'briefing',
      title: 'Preencher briefing',
      description: 'Colete informações detalhadas sobre o negócio do cliente',
      completed: briefs.length > 0,
      action: 'Preencher Briefing',
      href: createPageUrl(`briefing-campanha?clientId=${clientId}`),
    },
    {
      id: 'invite',
      title: 'Convidar cliente para o portal',
      description: 'Permita que o cliente acesse seu portal exclusivo',
      completed: Boolean(client.portal_enabled || client.has_portal_access),
      action: 'Enviar Convite',
      onClick: () => setInviteModalOpen(true),
    },
  ];

  const showSetup = !hasServices;
  const completedSteps = setupChecklist.filter((step) => step.completed).length;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <ClientContextSidebar
        clientId={clientId}
        client={client}
        serviceCount={counts.services}
      />

      <main className="flex-1 min-w-0 p-6 space-y-6 overflow-auto">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500 mb-1">Perfil do cliente</p>
            <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
            {(client.legal_name || client.email) && (
              <p className="text-gray-600">{client.legal_name || client.email}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={client.status === 'ativo' ? 'default' : 'secondary'}>
              {client.status || '—'}
            </Badge>
            {counts.attention > 0 && (
              <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">
                {counts.attention} atenção
              </Badge>
            )}
            <Button asChild size="sm">
              <Link to={createPageUrl(`services?action=new&clientId=${clientId}`)}>
                <Plus className="w-4 h-4 mr-1" />
                Novo serviço
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to={createPageUrl(`briefing-campanha?clientId=${clientId}`)}>
                <FileText className="w-4 h-4 mr-1" />
                Novo briefing
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Serviços</p>
                <p className="text-2xl font-bold">{counts.services}</p>
              </div>
              <Target className="h-7 w-7 text-blue-600" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ciclos ativos</p>
                <p className="text-2xl font-bold">{counts.cyclesActive}</p>
              </div>
              <Calendar className="h-7 w-7 text-green-600" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Aprovações</p>
                <p className="text-2xl font-bold">{counts.approvalsPending}</p>
              </div>
              <Clock className="h-7 w-7 text-amber-600" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Merece atenção</p>
                <p className="text-2xl font-bold">{counts.attention}</p>
              </div>
              <AlertTriangle className="h-7 w-7 text-red-500" />
            </CardContent>
          </Card>
        </div>

        {showSetup && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-900 text-base">
                <Zap className="w-5 h-5" />
                Configuração inicial ({completedSteps}/{setupChecklist.length})
              </CardTitle>
              <p className="text-blue-700 text-sm">
                Complete estas etapas para começar a operar com {client.name}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {setupChecklist.map((step) => (
                  <div
                    key={step.id}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border"
                  >
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
                      step.onClick ? (
                        <Button size="sm" onClick={step.onClick}>
                          <Plus className="w-4 h-4 mr-1" />
                          {step.action}
                        </Button>
                      ) : (
                        <Button asChild size="sm">
                          <Link to={step.href}>
                            <Plus className="w-4 h-4 mr-1" />
                            {step.action}
                          </Link>
                        </Button>
                      )
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <ClientAttentionPanel items={attentionItems} />
          <ClientExecutionPanel
            clientId={clientId}
            activeServices={activeServices}
            activeCycles={activeCycles}
          />
        </div>

        <ClientKnowledgeSummary
          clientId={clientId}
          briefs={briefs}
          learnings={learnings}
          evolutionEvents={evolutionEvents}
          documents={documents}
          kpisCount={counts.kpis}
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ações rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button asChild variant="outline" className="h-auto p-4 justify-start">
                <Link to={createPageUrl(`client-services?clientId=${clientId}`)}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Target className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Serviços</div>
                      <div className="text-sm text-gray-500">Operação e ciclos</div>
                    </div>
                  </div>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto p-4 justify-start">
                <Link to={createPageUrl(`client-briefing?clientId=${clientId}`)}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <FileText className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Briefing</div>
                      <div className="text-sm text-gray-500">Contexto do negócio</div>
                    </div>
                  </div>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto p-4 justify-start">
                <Link to={createPageUrl(`client-learnings?clientId=${clientId}`)}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Database className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Aprendizados</div>
                      <div className="text-sm text-gray-500">Base de conhecimento</div>
                    </div>
                  </div>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      <InviteClientModal
        isOpen={inviteModalOpen}
        onClose={() => {
          setInviteModalOpen(false);
          const url = new URL(window.location.href);
          url.searchParams.delete('open');
          window.history.replaceState({}, '', url.toString());
        }}
        client={client}
      />
    </div>
  );
}
