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
  CalendarDays,
  Briefcase,
} from 'lucide-react';
import { useSession } from '@/components/auth/SessionManager';
import { createPageUrl, getUrlSearchParam } from '@/utils';
import useClientHubData from '@/hooks/useClientHubData';
import ClientAttentionPanel from '@/components/client/ClientAttentionPanel';
import ClientActiveCampaignsPanel from '@/components/client/ClientActiveCampaignsPanel';
import InviteClientModal from '@/components/client/InviteClientModal';
import ContractedServiceSetup from '@/components/client/ContractedServiceSetup';
import NewCampaignLauncher from '@/components/campaigns/NewCampaignLauncher';
import { toast } from 'sonner';
import {
  buildAnnualPlanHref,
  buildBrainstormHref,
  deriveAnnualPlanFromBriefs,
  getPlanMonth,
} from '@/lib/planoAnualHub';

function isActiveContractedService(service) {
  if (!service?.id || service.is_template) return false;
  if (service.is_active === false) return false;
  const status = String(service.service_status || '').toLowerCase();
  return !['cancelled', 'archived', 'completed'].includes(status);
}

export default function ClientDetailPage() {
  const { agencyId, isAuthenticated } = useSession();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [serviceSetupOpen, setServiceSetupOpen] = useState(false);

  const clientId = useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return getUrlSearchParam(urlParams, 'clientId', 'id');
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('open') === 'invite') {
      setInviteModalOpen(true);
    }
    if (params.get('setup') === 'service') {
      setServiceSetupOpen(true);
    }
  }, []);

  const {
    client,
    services,
    briefs,
    loading,
    error,
    reload,
    activeCampaigns,
    attentionItems,
    counts,
  } = useClientHubData(clientId, agencyId);

  const now = new Date();
  const currentMes = now.getMonth() + 1;
  const currentAno = now.getFullYear();
  const annualPlan = useMemo(
    () => deriveAnnualPlanFromBriefs(briefs, currentAno),
    [briefs, currentAno]
  );
  const planMonth = useMemo(
    () => getPlanMonth(annualPlan, currentMes),
    [annualPlan, currentMes]
  );

  const activeServices = useMemo(
    () => (Array.isArray(services) ? services : []).filter(isActiveContractedService),
    [services]
  );
  const hasService = activeServices.length > 0;
  const primaryService = activeServices[0] || null;

  useEffect(() => {
    if (loading) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('open') !== 'nova-campanha') return;
    if (!hasService) {
      toast.info('Defina o serviço contratado antes de criar a campanha.');
      setServiceSetupOpen(true);
      return;
    }
    setLauncherOpen(true);
  }, [loading, hasService]);

  useEffect(() => {
    if (loading) return;
    if (window.location.hash !== '#campanhas') return;
    const el = document.getElementById('campanhas');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [loading, activeCampaigns.length]);

  const clearSetupParam = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('setup');
    window.history.replaceState({}, '', url.toString());
  };

  const openCampaignLauncher = () => {
    if (!hasService) {
      toast.info('Defina o serviço contratado antes de criar a campanha.');
      setServiceSetupOpen(true);
      return;
    }
    setLauncherOpen(true);
  };

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
  const hasBriefingOrPlan = briefs.some(
    (b) =>
      b.brief_kind === 'campanha_anual' ||
      b.brief_kind === 'campanha_mensal'
  );
  const hasInvite = Boolean(client.portal_enabled || client.has_portal_access);

  const setupChecklist = [
    {
      id: 'service',
      title: 'Definir serviço contratado',
      description: hasService
        ? primaryService?.name || 'Serviço ativo neste cliente'
        : 'Escolha o template e o nome do contrato com o cliente',
      completed: hasService,
      action: 'Definir serviço',
      onClick: () => setServiceSetupOpen(true),
    },
    {
      id: 'context',
      title: 'Briefing inicial e plano',
      description: 'Onboarding do cliente e planejamento do ano',
      completed: hasBriefingOrPlan,
      action: 'Abrir hub',
      href: createPageUrl(`client-briefing?clientId=${clientId}`),
    },
    {
      id: 'campaign',
      title: 'Criar primeira campanha',
      description: hasService
        ? 'Defina a campanha do mês neste serviço'
        : 'Disponível depois de definir o serviço contratado',
      completed: hasCampaigns,
      action: 'Nova campanha',
      onClick: openCampaignLauncher,
    },
    {
      id: 'invite',
      title: 'Convidar cliente para o portal',
      description: 'Permita que o cliente acesse seu portal exclusivo',
      completed: hasInvite,
      action: 'Enviar convite',
      onClick: () => setInviteModalOpen(true),
    },
  ];

  const completedSteps = setupChecklist.filter((step) => step.completed).length;
  const showSetup = completedSteps < setupChecklist.length;
  const statusLabel = client.status
    ? String(client.status).charAt(0).toUpperCase() + String(client.status).slice(1)
    : null;

  const metaParts = [
    statusLabel,
    hasService
      ? `${activeServices.length} serviço${activeServices.length === 1 ? '' : 's'}`
      : 'sem serviço',
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
        {hasService ? (
          <Button
            className="w-full shrink-0 bg-[#007bff] hover:bg-[#0056b3] sm:w-auto"
            onClick={openCampaignLauncher}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Nova campanha
          </Button>
        ) : (
          <Button
            className="w-full shrink-0 bg-[#007bff] hover:bg-[#0056b3] sm:w-auto"
            onClick={() => setServiceSetupOpen(true)}
          >
            <Briefcase className="mr-1.5 h-4 w-4" />
            Definir serviço
          </Button>
        )}
      </header>

      {!hasService ? (
        <section className="rounded-xl border border-[#d6e8ff] bg-[#f3f8ff] p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#007bff]">
                Próximo passo
              </p>
              <p className="mt-1 text-sm font-semibold text-[#111]">
                Qual serviço {client.name} contratou?
              </p>
              <p className="text-xs text-[#555]">
                Sem serviço, campanhas e tarefas não têm contrato para operar.
              </p>
            </div>
            <Button
              className="bg-[#007bff] hover:bg-[#0056b3]"
              onClick={() => setServiceSetupOpen(true)}
            >
              <Briefcase className="mr-1.5 h-4 w-4" />
              Definir serviço
            </Button>
          </div>
        </section>
      ) : null}

      {planMonth?.actionable ? (
        <section className="rounded-xl border border-[#d6e8ff] bg-[#f3f8ff] p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#007bff]">
                Mês do plano · {planMonth.mesLabel}
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-[#111]">
                {planMonth.campanha?.nome_campanha ||
                  planMonth.tema?.titulo ||
                  'Campanha planejada'}
              </p>
              <p className="text-xs text-[#555]">
                Status: {planMonth.status_mes}
                {planMonth.campanha?.ciclo_comercial
                  ? ` · ${planMonth.campanha.ciclo_comercial}`
                  : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild className="bg-[#007bff] hover:bg-[#0056b3]">
                <Link
                  to={buildBrainstormHref(clientId, {
                    mes: currentMes,
                    ano: annualPlan?.ano || currentAno,
                    planId: annualPlan?.id,
                    modo: 'plano',
                  })}
                >
                  <CalendarDays className="mr-1.5 h-4 w-4" />
                  Brainstorm deste mês
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to={buildAnnualPlanHref(clientId, annualPlan?.id)}>
                  Ver plano anual
                </Link>
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      {showSetup ? (
        <section
          aria-labelledby="setup-heading"
          className="rounded-xl border border-[#eee] bg-[#fafafa] p-5 sm:p-6"
        >
          <h2 id="setup-heading" className="text-base font-semibold text-[#111]">
            Configuração inicial ({completedSteps}/{setupChecklist.length})
          </h2>
          <p className="mt-1 text-sm text-[#555]">
            Serviço → briefing → campanha → convite para {client.name}
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
          onCreateCampaign={openCampaignLauncher}
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
            to={createPageUrl(`client-services?clientId=${clientId}`)}
            className="text-sm font-medium text-[#007bff] hover:underline"
          >
            Serviços e ciclos
            {hasService ? ` (${activeServices.length})` : ''}
          </Link>
          <Link
            to={buildAnnualPlanHref(clientId, annualPlan?.id)}
            className="text-sm font-medium text-[#007bff] hover:underline"
          >
            Plano anual
          </Link>
          <Link
            to={createPageUrl(`client-brainstorm?clientId=${clientId}`)}
            className="text-sm font-medium text-[#007bff] hover:underline"
          >
            Brainstorm
          </Link>
          <Link
            to={createPageUrl(`client-briefing?clientId=${clientId}`)}
            className="text-sm font-medium text-[#007bff] hover:underline"
          >
            Campanhas & plano
          </Link>
          <Link
            to={createPageUrl(`client-tasks?clientId=${clientId}`)}
            className="text-sm font-medium text-[#007bff] hover:underline"
          >
            Tarefas
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

      <ContractedServiceSetup
        open={serviceSetupOpen}
        onClose={() => {
          setServiceSetupOpen(false);
          clearSetupParam();
        }}
        agencyId={agencyId}
        clientId={clientId}
        clientName={client.name || 'Cliente'}
        onCreated={async () => {
          clearSetupParam();
          await reload?.();
        }}
      />

      <NewCampaignLauncher
        open={launcherOpen}
        onClose={() => setLauncherOpen(false)}
        clientId={clientId}
        annualPlan={annualPlan}
        mes={currentMes}
        ano={currentAno}
        onPlanUpdated={() => reload?.()}
      />
    </div>
  );
}
