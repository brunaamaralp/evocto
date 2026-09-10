import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Plus,
  CheckCircle,
  Circle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useSession } from '@/components/auth/SessionManager';
import { createPageUrl, getUrlSearchParam } from '@/utils';
import useClientHubData from '@/hooks/useClientHubData';
import ClientAttentionPanel from '@/components/client/ClientAttentionPanel';
import ClientActiveCampaignsPanel from '@/components/client/ClientActiveCampaignsPanel';
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
      <div className="flex min-h-[60vh] items-center justify-center px-6">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-7 w-7 animate-spin text-[#007bff]" aria-hidden />
          <p className="text-sm text-[#555]">Verificando autenticação…</p>
        </div>
      </div>
    );
  }

  if (!clientId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="max-w-md text-center">
          <AlertCircle className="mx-auto mb-4 h-10 w-10 text-[#c0392b]" aria-hidden />
          <h2 className="mb-2 text-xl font-semibold text-[#111]">
            ID do cliente não encontrado
          </h2>
          <p className="mb-5 text-sm text-[#555]">
            Abra o perfil a partir da lista de clientes.
          </p>
          <Button asChild variant="outline">
            <Link to={createPageUrl('clients')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar aos Clientes
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-7 w-7 animate-spin text-[#007bff]" aria-hidden />
          <p className="text-sm text-[#555]">Carregando cliente…</p>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="max-w-md text-center">
          <AlertCircle className="mx-auto mb-4 h-10 w-10 text-[#c0392b]" aria-hidden />
          <h2 className="mb-2 text-xl font-semibold text-[#111]">Erro ao carregar cliente</h2>
          <p className="mb-5 text-sm text-[#c0392b]">{error || 'Cliente não encontrado'}</p>
          <div className="flex justify-center gap-2">
            <Button asChild variant="outline">
              <Link to={createPageUrl('clients')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Clientes
              </Link>
            </Button>
            <Button onClick={reload} className="bg-[#007bff] hover:bg-[#0056b3]">
              Tentar novamente
            </Button>
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
      action: 'Enviar convite',
      onClick: () => setInviteModalOpen(true),
    },
  ];

  const showSetup = !hasCampaigns;
  const completedSteps = setupChecklist.filter((step) => step.completed).length;
  const statusLabel = client.status
    ? String(client.status).charAt(0).toUpperCase() + String(client.status).slice(1)
    : null;

  const metaParts = [
    statusLabel,
    `${counts.campaignsActive} campanha${counts.campaignsActive === 1 ? '' : 's'}`,
    counts.tasksPending > 0
      ? `${counts.tasksPending} tarefa${counts.tasksPending === 1 ? '' : 's'}`
      : null,
    counts.approvalsPending > 0
      ? `${counts.approvalsPending} aprovação${counts.approvalsPending === 1 ? '' : 'ões'}`
      : null,
    client.legal_name || client.email || null,
  ].filter(Boolean);

  return (
    <div className="mx-auto max-w-4xl space-y-10 px-1 pb-8 sm:px-0">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-2">
          <h1 className="truncate text-[1.375rem] font-bold tracking-tight text-[#111] sm:text-[1.5rem]">
            {client.name || 'Cliente'}
          </h1>
          <p className="text-sm text-[#555]">{metaParts.join(' · ')}</p>
        </div>
        <Button
          asChild
          className="w-full shrink-0 bg-[#007bff] hover:bg-[#0056b3] sm:w-auto"
        >
          <Link to={createPageUrl(`briefing-campanha?clientId=${clientId}`)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nova campanha
          </Link>
        </Button>
      </header>

      {showSetup ? (
        <section
          aria-labelledby="setup-heading"
          className="rounded-xl border border-[#eee] bg-[#fafafa] p-5 sm:p-6"
        >
          <h2 id="setup-heading" className="text-base font-semibold text-[#111]">
            Configuração inicial ({completedSteps}/{setupChecklist.length})
          </h2>
          <p className="mt-1 text-sm text-[#555]">
            Complete estas etapas para começar a operar com {client.name}
          </p>
          <ul className="mt-5 space-y-3">
            {setupChecklist.map((step) => (
              <li
                key={step.id}
                className="flex flex-col gap-3 rounded-xl border border-[#eee] bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  {step.completed ? (
                    <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#27ae60]" aria-hidden />
                  ) : (
                    <Circle className="mt-0.5 h-5 w-5 shrink-0 text-[#555]" aria-hidden />
                  )}
                  <div className="min-w-0">
                    <h3 className="font-medium text-[#111]">{step.title}</h3>
                    <p className="text-sm text-[#555]">{step.description}</p>
                  </div>
                </div>
                {!step.completed ? (
                  step.onClick ? (
                    <Button
                      size="sm"
                      className="w-full shrink-0 bg-[#007bff] hover:bg-[#0056b3] sm:w-auto"
                      onClick={step.onClick}
                    >
                      {step.action}
                    </Button>
                  ) : (
                    <Button
                      asChild
                      size="sm"
                      className="w-full shrink-0 bg-[#007bff] hover:bg-[#0056b3] sm:w-auto"
                    >
                      <Link to={step.href}>{step.action}</Link>
                    </Button>
                  )
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div id="campanhas">
        <ClientActiveCampaignsPanel
          clientId={clientId}
          campaigns={activeCampaigns}
          showCreateCta={activeCampaigns.length === 0}
        />
      </div>

      {attentionItems.length > 0 ? (
        <ClientAttentionPanel items={attentionItems} />
      ) : null}

      <section
        aria-labelledby="more-heading"
        className="border-t border-[#eee] pt-8"
      >
        <h2 id="more-heading" className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#555]">
          Mais neste cliente
        </h2>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <Link
            to={createPageUrl(`client-briefing?clientId=${clientId}`)}
            className="text-sm font-medium text-[#007bff] hover:underline"
          >
            Briefings
          </Link>
          <Link
            to={createPageUrl(`client-tasks?clientId=${clientId}`)}
            className="text-sm font-medium text-[#007bff] hover:underline"
          >
            Tarefas
          </Link>
          <Link
            to={createPageUrl(`client-services?clientId=${clientId}`)}
            className="text-sm font-medium text-[#007bff] hover:underline"
          >
            Serviços e ciclos
          </Link>
          <Link
            to={createPageUrl(`performance-kpis?clientId=${clientId}`)}
            className="text-sm font-medium text-[#007bff] hover:underline"
          >
            KPIs{counts.kpis > 0 ? ` (${counts.kpis})` : ''}
          </Link>
        </div>
      </section>

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
