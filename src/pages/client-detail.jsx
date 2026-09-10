import { useEffect, useMemo, useState } from 'react';
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
  Clock,
  Megaphone,
} from 'lucide-react';
import { useSession } from '@/components/auth/SessionManager';
import { createPageUrl, getUrlSearchParam } from '@/utils';
import useClientHubData from '@/hooks/useClientHubData';
import ClientAttentionPanel from '@/components/client/ClientAttentionPanel';
import ClientActiveCampaignsPanel from '@/components/client/ClientActiveCampaignsPanel';
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
    loading,
    error,
    reload,
    activeServices,
    activeCycles,
    activeCampaigns,
    attentionItems,
    counts,
  } = useClientHubData(clientId, agencyId);

  useEffect(() => {
    if (loading) return;
    if (window.location.hash !== '#campanhas') return;
    const el = document.getElementById('campanhas');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [loading, activeCampaigns.length]);

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

  const hasCampaigns = activeCampaigns.length > 0;
  const setupChecklist = [
    {
      id: 'campaign',
      title: 'Criar primeira campanha',
      description: 'Defina a campanha do mês para este cliente',
      completed: hasCampaigns,
      action: 'Nova campanha',
      href: createPageUrl(`briefing-campanha?clientId=${clientId}`),
    },
    {
      id: 'context',
      title: 'Briefing de contexto',
      description: 'Histórico e materiais de referência do cliente',
      completed: briefs.length > 0,
      action: 'Abrir briefings',
      href: createPageUrl(`client-briefing?clientId=${clientId}`),
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

  const showSetup = !hasCampaigns;
  const completedSteps = setupChecklist.filter((step) => step.completed).length;

  return (
    <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#18162A]">{client.name}</h1>
            {(client.legal_name || client.email) && (
              <p className="text-[#7A7595]">{client.legal_name || client.email}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={client.status === 'ativo' ? 'default' : 'secondary'}>
              {client.status || '—'}
            </Badge>
            {counts.attention > 0 && (
              <Badge className="bg-[#FFF8E6] text-[#7A5A10] hover:bg-[#FFF8E6]">
                {counts.attention} atenção
              </Badge>
            )}
            <Button asChild size="sm">
              <Link to={createPageUrl(`briefing-campanha?clientId=${clientId}`)}>
                <Plus className="w-4 h-4 mr-1" />
                Nova campanha
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to={createPageUrl(`client-briefing?clientId=${clientId}`)}>
                <FileText className="w-4 h-4 mr-1" />
                Briefings
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-[#E6F7F0] border-transparent shadow-none">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-[#085041]">Campanhas ativas</p>
                <p className="text-2xl font-bold text-[#18162A]">{counts.campaignsActive}</p>
              </div>
              <Megaphone className="h-7 w-7 text-[#22C98A]" />
            </CardContent>
          </Card>
          <Card className="bg-[#FFF8E6] border-transparent shadow-none">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-[#7A5A10]">Tarefas pendentes</p>
                <p className="text-2xl font-bold text-[#18162A]">{counts.tasksPending}</p>
              </div>
              <Clock className="h-7 w-7 text-[#E0B84A]" />
            </CardContent>
          </Card>
          <Card className="bg-[#EDE9FB] border-transparent shadow-none">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-[#4A2FA3]">Aprovações</p>
                <p className="text-2xl font-bold text-[#18162A]">{counts.approvalsPending}</p>
              </div>
              <Target className="h-7 w-7 text-[#6C47D8]" />
            </CardContent>
          </Card>
        </div>

        {showSetup && (
          <Card className="border-[#C5DBF0] bg-[#EAF2FB]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#2E5A7A] text-base">
                <Zap className="w-5 h-5" />
                Configuração inicial ({completedSteps}/{setupChecklist.length})
              </CardTitle>
              <p className="text-[#2E5A7A]/80 text-sm">
                Complete estas etapas para começar a operar com {client.name}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {setupChecklist.map((step) => (
                  <div
                    key={step.id}
                    className="flex items-center justify-between p-3 bg-white rounded-xl border border-[#E8E5F5]/80"
                  >
                    <div className="flex items-center gap-3">
                      {step.completed ? (
                        <CheckCircle className="w-5 h-5 text-[#22C98A]" />
                      ) : (
                        <Circle className="w-5 h-5 text-[#7A7595]" />
                      )}
                      <div>
                        <h4 className="font-medium text-[#18162A]">{step.title}</h4>
                        <p className="text-sm text-[#7A7595]">{step.description}</p>
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

        <div id="campanhas">
          <ClientActiveCampaignsPanel
            clientId={clientId}
            campaigns={activeCampaigns}
            showCreateCta={activeCampaigns.length === 0}
          />
        </div>

        <ClientAttentionPanel items={attentionItems} />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <ClientExecutionPanel
            clientId={clientId}
            activeServices={activeServices}
            activeCycles={activeCycles}
          />
          <ClientKnowledgeSummary clientId={clientId} briefs={briefs} kpisCount={counts.kpis} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ações rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button asChild variant="outline" className="h-auto p-4 justify-start rounded-xl">
                <Link to={createPageUrl(`client-briefing?clientId=${clientId}`)}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#EDE9FB] rounded-xl">
                      <FileText className="w-5 h-5 text-[#6C47D8]" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Briefings</div>
                      <div className="text-sm text-[#7A7595]">Contexto e histórico</div>
                    </div>
                  </div>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto p-4 justify-start rounded-xl">
                <Link to={createPageUrl(`client-tasks?clientId=${clientId}`)}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#FFF8E6] rounded-xl">
                      <Clock className="w-5 h-5 text-[#E0B84A]" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Tarefas</div>
                      <div className="text-sm text-[#7A7595]">Fila deste cliente</div>
                    </div>
                  </div>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

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
