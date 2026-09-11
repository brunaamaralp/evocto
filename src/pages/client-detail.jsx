import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  CheckCircle,
  Circle,
  AlertCircle,
  Loader2,
  Briefcase,
} from 'lucide-react';
import { useSession } from '@/components/auth/SessionManager';
import { createPageUrl, getUrlSearchParam } from '@/utils';
import useClientHubData from '@/hooks/useClientHubData';
import ClientAttentionPanel from '@/components/client/ClientAttentionPanel';
import InviteClientModal from '@/components/client/InviteClientModal';
import ContractedServiceSetup from '@/components/client/ContractedServiceSetup';
import NewCampaignLauncher from '@/components/campaigns/NewCampaignLauncher';
import ClientHubHeader from '@/components/client/hub/ClientHubHeader';
import ServiceLensSwitcher from '@/components/client/hub/ServiceLensSwitcher';
import ServiceOperationHeader from '@/components/client/hub/ServiceOperationHeader';
import ServiceUnitsPanel from '@/components/client/hub/ServiceUnitsPanel';
import CreateServiceUnitModal from '@/components/client/hub/CreateServiceUnitModal';
import { toast } from 'sonner';
import {
  buildAnnualPlanHref,
  buildBrainstormHref,
  deriveAnnualPlanFromBriefs,
  getPlanMonth,
} from '@/lib/planoAnualHub';
import {
  deriveServiceLensUnits,
  filterAttentionForService,
  getActiveContractedServices,
  resolveSelectedServiceId,
} from '@/lib/deriveServiceLens';
import {
  getServiceDisplayName,
  getServiceOperationProfile,
  isKnownServiceProfile,
  OPERATION_PATTERNS,
  PERIOD_MODES,
  UNIT_KINDS,
} from '@/lib/serviceOperationProfile';
import { buildClientTasksHref } from '@/lib/taskScope';
import {
  createServiceUnitTask,
  startSingleProjectOperation,
} from '@/lib/createServiceUnitTask';

function setServiceIdInUrl(serviceId) {
  const url = new URL(window.location.href);
  if (serviceId) url.searchParams.set('serviceId', String(serviceId));
  else url.searchParams.delete('serviceId');
  window.history.replaceState({}, '', url.toString());
}

export default function ClientDetailPage() {
  const { agencyId, isAuthenticated, userId, user } = useSession();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [serviceSetupOpen, setServiceSetupOpen] = useState(false);
  const [unitModalOpen, setUnitModalOpen] = useState(false);
  const [unitSaving, setUnitSaving] = useState(false);
  const [unitError, setUnitError] = useState('');
  const [startingProject, setStartingProject] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState(null);

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
    const fromUrl = params.get('serviceId');
    if (fromUrl) setSelectedServiceId(fromUrl);
  }, []);

  const {
    client,
    services,
    cycles,
    briefs,
    tasks,
    loading,
    error,
    reload,
    attentionItems,
    attentionCountsByService,
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
    () => getActiveContractedServices(services),
    [services]
  );
  const hasService = activeServices.length > 0;

  useEffect(() => {
    if (loading) return;
    const resolved = resolveSelectedServiceId(activeServices, selectedServiceId);
    if (resolved !== selectedServiceId) {
      setSelectedServiceId(resolved);
    }
    if (resolved) setServiceIdInUrl(resolved);
  }, [loading, activeServices, selectedServiceId]);

  const selectedService = useMemo(
    () =>
      activeServices.find((s) => String(s.id) === String(selectedServiceId)) ||
      null,
    [activeServices, selectedServiceId]
  );

  const selectedProfile = useMemo(
    () => (selectedService ? getServiceOperationProfile(selectedService) : null),
    [selectedService]
  );

  const lens = useMemo(() => {
    if (!selectedService) return null;
    return deriveServiceLensUnits({
      service: selectedService,
      cycles,
      briefs,
      tasks,
      clientId,
      now: new Date(),
    });
  }, [selectedService, cycles, briefs, tasks, clientId]);

  const primaryPeriodLabel = useMemo(() => {
    if (!lens || lens.periodMode !== PERIOD_MODES.MONTHLY) return null;
    const withPeriod = (lens.groups || []).find((g) => g.periodLabel);
    return withPeriod?.periodLabel || null;
  }, [lens]);

  const lensForPanel = useMemo(() => {
    if (!lens || !primaryPeriodLabel) return lens;
    if ((lens.groups || []).length <= 1) {
      return {
        ...lens,
        groups: (lens.groups || []).map((g) => ({
          ...g,
          periodLabel: null,
        })),
      };
    }
    // Vários meses: o mais recente já está no header; ocultar só o primeiro rótulo
    const [first, ...rest] = lens.groups;
    return {
      ...lens,
      groups: [{ ...first, periodLabel: null }, ...rest],
    };
  }, [lens, primaryPeriodLabel]);

  const lensAttention = useMemo(
    () => filterAttentionForService(attentionItems, selectedServiceId),
    [attentionItems, selectedServiceId]
  );

  const isCampaignLens =
    selectedProfile?.unitKind === UNIT_KINDS.CAMPAIGN_BRIEF;

  useEffect(() => {
    if (loading) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('open') !== 'nova-campanha') return;
    if (!hasService) {
      toast.info('Defina o serviço contratado antes de operar.');
      setServiceSetupOpen(true);
      return;
    }
    if (isCampaignLens) setLauncherOpen(true);
  }, [loading, hasService, isCampaignLens]);

  useEffect(() => {
    if (loading) return;
    if (window.location.hash !== '#campanhas' && window.location.hash !== '#operacao') {
      return;
    }
    const el = document.getElementById('operacao');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [loading, selectedServiceId]);

  const clearSetupParam = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('setup');
    window.history.replaceState({}, '', url.toString());
  };

  const selectService = useCallback((serviceId) => {
    setSelectedServiceId(serviceId);
    setServiceIdInUrl(serviceId);
  }, []);

  const handleStartSingleProject = useCallback(async () => {
    if (!selectedService || !agencyId || !clientId) return;
    setStartingProject(true);
    try {
      const result = await startSingleProjectOperation({
        agencyId,
        clientId,
        service: selectedService,
        ownerId: userId || user?.id || user?.$id || null,
      });
      if (result.alreadyStarted) {
        toast.message('Operação já iniciada');
      } else {
        toast.success('Operação iniciada');
      }
      await reload?.();
    } catch (err) {
      console.error('[client-detail] startSingleProject', err);
      toast.error(err?.message || 'Não foi possível iniciar a operação');
    } finally {
      setStartingProject(false);
    }
  }, [selectedService, agencyId, clientId, userId, user, reload]);

  const handleCreateUnit = useCallback(() => {
    if (!selectedService || !selectedProfile) {
      toast.info('Defina o serviço contratado antes de operar.');
      setServiceSetupOpen(true);
      return;
    }

    if (!isKnownServiceProfile(selectedProfile)) {
      toast.info('Configure o template do serviço no Backstage antes de operar.');
      return;
    }

    if (selectedProfile.unitKind === UNIT_KINDS.CAMPAIGN_BRIEF) {
      setLauncherOpen(true);
      return;
    }

    if (selectedProfile.unitKind === UNIT_KINDS.TASK) {
      setUnitError('');
      setUnitModalOpen(true);
      return;
    }

    if (selectedProfile.operationPattern === OPERATION_PATTERNS.SINGLE_PROJECT) {
      handleStartSingleProject();
    }
  }, [selectedService, selectedProfile, handleStartSingleProject]);

  const handleSubmitUnit = useCallback(
    async (title) => {
      if (!selectedService || !agencyId || !clientId) return;
      setUnitSaving(true);
      setUnitError('');
      try {
        await createServiceUnitTask({
          agencyId,
          clientId,
          service: selectedService,
          title,
          ownerId: userId || user?.id || user?.$id || null,
        });
        toast.success(unitCreatedToast(selectedProfile, title));
        setUnitModalOpen(false);
        await reload?.();
      } catch (err) {
        console.error('[client-detail] createUnit', err);
        setUnitError(err?.message || 'Erro ao criar');
      } finally {
        setUnitSaving(false);
      }
    },
    [selectedService, selectedProfile, agencyId, clientId, userId, user, reload]
  );

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

  const hasOperation = Boolean(lens?.unitsCount > 0 || lens?.singleProject?.ready);
  const hasInvite = Boolean(client.portal_enabled || client.has_portal_access);

  const setupChecklist = [
    {
      id: 'service',
      title: 'Definir serviço contratado',
      description: hasService
        ? selectedService
          ? getServiceDisplayName(selectedService)
          : 'Serviço ativo neste cliente'
        : 'Escolha o template e o nome do contrato com o cliente',
      completed: hasService,
      action: 'Definir serviço',
      onClick: () => setServiceSetupOpen(true),
    },
    {
      id: 'operate',
      title: hasService
        ? selectedProfile?.operationPattern === OPERATION_PATTERNS.SINGLE_PROJECT
          ? 'Iniciar operação do serviço'
          : `Criar primeiro ${selectedProfile?.itemLabel || 'item'}`
        : 'Iniciar operação',
      description: hasService
        ? 'Comece o trabalho neste serviço'
        : 'Disponível depois de definir o serviço',
      completed: hasOperation,
      action:
        selectedProfile?.operationPattern === OPERATION_PATTERNS.SINGLE_PROJECT
          ? 'Iniciar operação'
          : selectedProfile
            ? String(getCreateCtaLabelSafe(selectedProfile)).replace(/^\+\s*/, '') ||
              'Criar'
            : 'Criar',
      onClick: hasService ? handleCreateUnit : () => setServiceSetupOpen(true),
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
  const needsOnboarding = !hasService || !hasOperation;
  const onlyInvitePending = hasService && hasOperation && !hasInvite;

  const statusLabel = client.status
    ? String(client.status).charAt(0).toUpperCase() + String(client.status).slice(1)
    : null;

  const showPlanBanner =
    isCampaignLens && planMonth?.actionable;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-1 pb-8 sm:px-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <ClientHubHeader
          clientName={client.name}
          statusLabel={statusLabel}
          serviceCount={activeServices.length}
        />
        {!hasService ? (
          <Button
            className="w-full shrink-0 bg-[#007bff] hover:bg-[#0056b3] sm:w-auto"
            onClick={() => setServiceSetupOpen(true)}
          >
            <Briefcase className="mr-1.5 h-4 w-4" />
            Definir serviço
          </Button>
        ) : null}
      </div>

      {!hasService ? (
        <section className="rounded-lg border border-[#e8eef5] bg-[#f7fafc] px-4 py-4">
          <p className="text-sm font-medium text-[#111]">
            Qual serviço {client.name} contratou?
          </p>
          <p className="mt-0.5 text-sm text-[#666]">
            Sem serviço, não há operação para executar.
          </p>
        </section>
      ) : null}

      {hasService ? (
        <ServiceLensSwitcher
          services={activeServices}
          selectedServiceId={selectedServiceId}
          attentionCounts={attentionCountsByService || {}}
          onSelect={selectService}
          onAddService={() => setServiceSetupOpen(true)}
        />
      ) : null}

      {hasService && selectedService ? (
        <section id="operacao" className="space-y-4">
          <ServiceOperationHeader
            service={selectedService}
            profile={selectedProfile}
            periodLabel={primaryPeriodLabel}
            onCreate={handleCreateUnit}
            hasUnits={Boolean(lens?.unitsCount > 0)}
          />

          {selectedService && !isKnownServiceProfile(selectedProfile) ? (
            <div className="rounded-lg border border-[#eee] px-3 py-3 text-sm text-[#555]">
              <p className="font-medium text-[#111]">Configuração do serviço incompleta</p>
              <p className="mt-0.5">
                Template operacional não reconhecido.{' '}
                <Link
                  to={createPageUrl(`client-services?clientId=${clientId}`)}
                  className="font-medium text-[#007bff] hover:underline"
                >
                  Abrir Backstage
                </Link>
              </p>
            </div>
          ) : null}

          {showPlanBanner ? (
            <div className="flex flex-col gap-2 border-l-2 border-[#d0d7e2] pl-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm text-[#666]">
                  Planejamento · {planMonth.mesLabel}
                </p>
                <p className="truncate text-sm text-[#333]">
                  {planMonth.campanha?.nome_campanha ||
                    planMonth.tema?.titulo ||
                    'Campanha planejada'}
                </p>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <Link
                  to={buildBrainstormHref(clientId, {
                    mes: currentMes,
                    ano: annualPlan?.ano || currentAno,
                    planId: annualPlan?.id,
                    modo: 'plano',
                  })}
                  className="font-medium text-[#007bff] hover:underline"
                >
                  Brainstorm
                </Link>
                <Link
                  to={buildAnnualPlanHref(clientId, annualPlan?.id)}
                  className="font-medium text-[#666] hover:text-[#111] hover:underline"
                >
                  Plano anual
                </Link>
              </div>
            </div>
          ) : null}

          <ServiceUnitsPanel
            lens={lensForPanel}
            onCreate={handleCreateUnit}
            onStartSingleProject={handleStartSingleProject}
            startingSingleProject={startingProject}
          />
        </section>
      ) : null}

      {needsOnboarding ? (
        <section
          aria-labelledby="setup-heading"
          className="rounded-lg border border-[#eee] bg-[#fafafa] p-4 sm:p-5"
        >
          <h2 id="setup-heading" className="text-sm font-medium text-[#111]">
            Configuração inicial ({completedSteps}/{setupChecklist.length})
          </h2>
          <ul className="mt-3 space-y-2">
            {setupChecklist.map((step) => (
              <li
                key={step.id}
                className="flex flex-col gap-2 rounded-lg border border-[#eee] bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-2.5">
                  {step.completed ? (
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#27ae60]" aria-hidden />
                  ) : (
                    <Circle className="mt-0.5 h-4 w-4 shrink-0 text-[#bbb]" aria-hidden />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#111]">{step.title}</p>
                    <p className="text-xs text-[#666]">{step.description}</p>
                  </div>
                </div>
                {!step.completed ? (
                  <Button
                    size="sm"
                    variant={step.id === 'invite' ? 'outline' : 'default'}
                    className={
                      step.id === 'invite'
                        ? 'w-full shrink-0 sm:w-auto'
                        : 'w-full shrink-0 bg-[#007bff] hover:bg-[#0056b3] sm:w-auto'
                    }
                    onClick={step.onClick}
                  >
                    {step.action}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : onlyInvitePending ? (
        <div className="flex flex-col gap-2 border-t border-[#eee] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[#666]">
            Portal ainda não convidado
          </p>
          <button
            type="button"
            onClick={() => setInviteModalOpen(true)}
            className="text-sm font-medium text-[#007bff] hover:underline"
          >
            Convidar cliente
          </button>
        </div>
      ) : null}

      {lensAttention.length > 0 ? (
        <ClientAttentionPanel items={lensAttention} />
      ) : null}

      <section
        aria-labelledby="more-heading"
        className="border-t border-[#eee] pt-6"
      >
        <h2 id="more-heading" className="mb-2 text-sm text-[#666]">
          Mais neste cliente
        </h2>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {hasService ? (
            <button
              type="button"
              onClick={() => setServiceSetupOpen(true)}
              className="text-sm text-[#555] hover:text-[#007bff] hover:underline"
            >
              Adicionar serviço
            </button>
          ) : null}
          <Link
            to={buildAnnualPlanHref(clientId, annualPlan?.id)}
            className="text-sm text-[#555] hover:text-[#007bff] hover:underline"
          >
            Plano anual
          </Link>
          <Link
            to={createPageUrl(`client-brainstorm?clientId=${clientId}`)}
            className="text-sm text-[#555] hover:text-[#007bff] hover:underline"
          >
            Brainstorm
          </Link>
          <Link
            to={createPageUrl(`client-briefing?clientId=${clientId}`)}
            className="text-sm text-[#555] hover:text-[#007bff] hover:underline"
          >
            Campanhas & plano
          </Link>
          <Link
            to={createPageUrl(
              selectedServiceId
                ? buildClientTasksHref({
                    clientId,
                    serviceId: selectedServiceId,
                  })
                : `client-tasks?clientId=${clientId}`
            )}
            className="text-sm text-[#555] hover:text-[#007bff] hover:underline"
          >
            Tarefas
          </Link>
          <Link
            to={createPageUrl(`client-financeiro?clientId=${clientId}`)}
            className="text-sm text-[#555] hover:text-[#007bff] hover:underline"
          >
            Financeiro
          </Link>
          <Link
            to={createPageUrl(`performance-kpis?clientId=${clientId}`)}
            className="text-sm text-[#555] hover:text-[#007bff] hover:underline"
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
        onCreated={async (instance) => {
          clearSetupParam();
          if (instance?.id) {
            selectService(instance.id);
          }
          await reload?.();
        }}
      />

      <NewCampaignLauncher
        open={launcherOpen}
        onClose={() => setLauncherOpen(false)}
        clientId={clientId}
        serviceId={selectedServiceId}
        annualPlan={annualPlan}
        mes={currentMes}
        ano={currentAno}
        onPlanUpdated={() => reload?.()}
      />

      <CreateServiceUnitModal
        open={unitModalOpen}
        onClose={() => {
          if (!unitSaving) {
            setUnitModalOpen(false);
            setUnitError('');
          }
        }}
        service={selectedService}
        profile={selectedProfile}
        saving={unitSaving}
        error={unitError}
        onSubmit={handleSubmitUnit}
      />
    </div>
  );
}

function getCreateCtaLabelSafe(profile) {
  if (!profile?.showCreateCta) return 'Criar';
  if (!isKnownServiceProfile(profile)) return 'Criar';
  return profile.createCta || 'Criar';
}

const FEMININE_ITEM_LABELS = new Set([
  'sessão',
  'campanha',
  'cobertura',
  'ação',
]);

function unitCreatedToast(profile, title) {
  const noun = String(profile?.itemLabel || '').trim();
  if (!noun) return `${title} criado`;
  const cap = noun.charAt(0).toUpperCase() + noun.slice(1);
  const feminine = FEMININE_ITEM_LABELS.has(noun.toLowerCase());
  return feminine ? `${cap} criada` : `${cap} criado`;
}
