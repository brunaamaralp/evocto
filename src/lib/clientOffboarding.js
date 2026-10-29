/**
 * Motor de desligamento / trancamento de clientes — Estúdio Narrativa.
 * Limpa operação ativa, gera checklist de saída e retorna evento JSON canônico.
 */

import { Client, Task, Service, CyclePlan, PublicBriefingToken } from '@/api/entities';

export const CLIENT_STATUS_ARCHIVED = 'arquivado';
export const CLIENT_OFFBOARDING_EVENT = 'CLIENT_OFFBOARDING_EXECUTED';

/** Status de tarefa considerados backlog operacional a cancelar/arquivar. */
export const OPEN_OPERATIONAL_TASK_STATUSES = new Set([
  'todo',
  'pending',
  'planned',
  'in_progress',
  'doing',
  'in_review',
  'pending_approval',
  'blocked',
  'ready_for_approval',
  'awaiting_approval',
]);

const ACTIVE_CYCLE_STATUSES = new Set([
  'planned',
  'draft',
  'approved',
  'in_execution',
  'active',
]);

export const DEFAULT_OFFBOARDING_TASK_SPECS = [
  {
    key: 'pause_ads',
    tituloSuffix: 'Pausar campanhas ativas no Meta Ads',
    responsavelCargo: 'gestor_trafego',
    prioridade: 'alta',
    offsetDays: 0,
    description:
      'Pausar imediatamente todas as campanhas ativas no Meta Ads/Google Ads para evitar cobranças indevidas.',
  },
  {
    key: 'export_report',
    tituloSuffix: 'Exportar relatório final de performance',
    responsavelCargo: 'gestor_trafego',
    prioridade: 'media',
    offsetDays: 2,
    description: 'Exportar e salvar relatório final de performance do período contratado.',
  },
  {
    key: 'archive_media',
    tituloSuffix: 'Consolidar e arquivar mídias no Drive',
    responsavelCargo: 'videomaker',
    prioridade: 'media',
    offsetDays: 3,
    description:
      'Consolidar e arquivar arquivos brutos, projetos e masters nas pastas de arquivo morto do Drive.',
  },
  {
    key: 'revoke_access',
    tituloSuffix: 'Revogar acessos da agência',
    responsavelCargo: 'gestor_projeto',
    prioridade: 'alta',
    offsetDays: 2,
    description:
      'Revogar acessos da agência em gerenciadores de anúncios, redes sociais e ferramentas do cliente.',
  },
  {
    key: 'finance_close',
    tituloSuffix: 'Baixa financeira e acerto contratual',
    responsavelCargo: 'financeiro',
    prioridade: 'alta',
    offsetDays: 1,
    description:
      'Verificar pendências de faturamento, emissão proporcional ou baixa contratual.',
  },
];

/** Clientes que ainda aparecem no radar operacional (painel/board). */
export function isClientOnActiveRadar(clientOrStatus) {
  const status =
    typeof clientOrStatus === 'string'
      ? clientOrStatus
      : clientOrStatus?.status;
  const s = String(status || '')
    .trim()
    .toLowerCase();
  if (!s) return true;
  if (s === 'ativo' || s === 'active') return true;
  if (s === 'prospecto' || s === 'prospect') return true;
  return false;
}

export function normalizeClientArchivedStatus(status) {
  const s = String(status || '')
    .trim()
    .toLowerCase();
  if (s === 'archived' || s === 'arquivado' || s === CLIENT_STATUS_ARCHIVED) {
    return CLIENT_STATUS_ARCHIVED;
  }
  return status;
}

export function addDaysYmd(anchorYmd, offsetDays = 0) {
  const base = String(anchorYmd || '').slice(0, 10);
  const d = base
    ? new Date(`${base}T12:00:00`)
    : new Date();
  if (Number.isNaN(d.getTime())) {
    const now = new Date();
    now.setDate(now.getDate() + Number(offsetDays || 0));
    return toYmd(now);
  }
  d.setDate(d.getDate() + Number(offsetDays || 0));
  return toYmd(d);
}

export function toYmd(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function mapPriorityToTask(prioridade) {
  const p = String(prioridade || '').toLowerCase();
  if (p === 'alta' || p === 'high') return 'high';
  if (p === 'baixa' || p === 'low') return 'low';
  return 'medium';
}

export function mapPriorityLabel(priority) {
  const p = String(priority || '').toLowerCase();
  if (p === 'high' || p === 'alta') return 'alta';
  if (p === 'low' || p === 'baixa') return 'baixa';
  return 'media';
}

function countOpenChecklistItems(task) {
  const list = Array.isArray(task?.checklist) ? task.checklist : [];
  return list.filter((item) => item && item.completed !== true && item.status !== 'done').length;
}

function isOffboardingTask(task) {
  const tags = Array.isArray(task?.tags) ? task.tags : [];
  if (tags.some((t) => String(t).toLowerCase() === 'offboarding')) return true;
  return String(task?.title || '').includes('[OFFBOARDING]');
}

/**
 * Monta o payload das 5 tarefas padrão de saída (sem persistir).
 */
export function buildOffboardingTaskDrafts({
  clientName,
  clientId,
  agencyId,
  anchorYmd,
  specs = DEFAULT_OFFBOARDING_TASK_SPECS,
} = {}) {
  const name = String(clientName || 'Cliente').trim() || 'Cliente';
  const anchor = String(anchorYmd || toYmd()).slice(0, 10);

  return specs.map((spec) => {
    const vencimento = addDaysYmd(anchor, spec.offsetDays);
    const titulo = `[OFFBOARDING] ${name} — ${spec.tituloSuffix}`;
    return {
      titulo,
      responsavelCargo: spec.responsavelCargo,
      prioridade: spec.prioridade,
      vencimento,
      // payload de criação
      createPayload: {
        agencyId,
        clientId,
        customerId: clientId,
        title: titulo,
        description: spec.description || '',
        type: 'ops',
        status: 'todo',
        kanbanColumn: 'todo',
        priority: mapPriorityToTask(spec.prioridade),
        dueDate: new Date(`${vencimento}T12:00:00`).toISOString(),
        tags: ['offboarding', spec.key, spec.responsavelCargo],
        responsavelCargo: spec.responsavelCargo,
        notificationsEnabled: true,
        clientVisible: false,
        progress: 0,
        checklist: [],
      },
    };
  });
}

/**
 * Confirmação canônica exigida pelo motor Narrativa.
 */
export function buildOffboardingConfirmation({
  clienteId,
  nomeCliente,
  dataExecucao,
  entregaveisArquivados = 0,
  subtarefasCanceladas = 0,
  notificacoesDesativadas = true,
  tarefasOffboardingCriadas = [],
} = {}) {
  return {
    evento: CLIENT_OFFBOARDING_EVENT,
    clienteId: String(clienteId || ''),
    nomeCliente: String(nomeCliente || ''),
    dataExecucao:
      dataExecucao ||
      new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    statusCliente: 'ARCHIVED',
    acoesLimpeza: {
      entregaveisArquivados: Number(entregaveisArquivados) || 0,
      subtarefasCanceladas: Number(subtarefasCanceladas) || 0,
      notificacoesDesativadas: Boolean(notificacoesDesativadas),
    },
    tarefasOffboardingCriadas: (tarefasOffboardingCriadas || []).map((t) => ({
      titulo: t.titulo,
      responsavelCargo: t.responsavelCargo,
      prioridade: mapPriorityLabel(t.prioridade),
      vencimento: String(t.vencimento || '').slice(0, 10),
    })),
  };
}

async function safeUpdate(entity, id, patch) {
  if (!id) return null;
  try {
    return await entity.update(id, patch);
  } catch (err) {
    console.warn('[clientOffboarding] update failed', id, err?.message || err);
    return null;
  }
}

/**
 * Executa desligamento/trancamento: limpeza + tarefas padrão + JSON de confirmação.
 *
 * @param {object} opts
 * @param {object} opts.client — documento do cliente (id, name, agencyId)
 * @param {string} [opts.agencyId]
 * @param {Date|string} [opts.executedAt]
 * @param {'desligamento'|'trancamento'} [opts.motivo]
 */
export async function executeClientOffboarding({
  client,
  agencyId: agencyIdOpt,
  executedAt = new Date(),
  motivo = 'desligamento',
} = {}) {
  if (!client?.id) {
    throw new Error('client_required');
  }

  const agencyId = agencyIdOpt || client.agencyId;
  if (!agencyId) {
    throw new Error('agencyId_required');
  }

  const executedDate =
    executedAt instanceof Date ? executedAt : new Date(executedAt || Date.now());
  const dataExecucao = executedDate.toISOString().replace(/\.\d{3}Z$/, 'Z');
  const anchorYmd = toYmd(executedDate);
  const nomeCliente = String(client.name || client.legal_name || 'Cliente').trim();

  let entregaveisArquivados = 0;
  let subtarefasCanceladas = 0;

  const [tasks, services, cycles, tokens] = await Promise.all([
    Task.filter({ agencyId, clientId: client.id }).catch(() => []),
    Service.filter({ agencyId, clientId: client.id }).catch(() => []),
    CyclePlan.filter({ agencyId, clientId: client.id }).catch(() => []),
    PublicBriefingToken.filter({ agencyId, clientId: client.id }).catch(() => []),
  ]);

  // 1) Cancelar/arquivar entregáveis e checklists abertos
  for (const task of tasks || []) {
    if (!task?.id || isOffboardingTask(task)) continue;
    const status = String(task.status || '').toLowerCase();
    if (!OPEN_OPERATIONAL_TASK_STATUSES.has(status)) continue;

    const openChecks = countOpenChecklistItems(task);
    const checklist = Array.isArray(task.checklist)
      ? task.checklist.map((item) =>
          item?.completed === true
            ? item
            : { ...item, completed: false, cancelled: true, status: 'cancelled' }
        )
      : task.checklist;

    const updated = await safeUpdate(Task, task.id, {
      status: 'cancelled',
      kanbanColumn: 'cancelled',
      notificationsEnabled: false,
      checklist,
      offboardingCancelledAt: dataExecucao,
      offboardingMotivo: motivo,
    });
    if (updated !== null) {
      entregaveisArquivados += 1;
      subtarefasCanceladas += openChecks;
    }
  }

  // Ciclos ativos → arquivados
  for (const cycle of cycles || []) {
    if (!cycle?.id) continue;
    const status = String(cycle.status || '').toLowerCase();
    if (!ACTIVE_CYCLE_STATUSES.has(status)) continue;
    await safeUpdate(CyclePlan, cycle.id, {
      status: 'archived',
      notificationsEnabled: false,
      offboardingArchivedAt: dataExecucao,
    });
  }

  // Serviços → pausados / inativos
  for (const service of services || []) {
    if (!service?.id) continue;
    const st = String(service.service_status || service.status || '').toLowerCase();
    if (['cancelled', 'archived', 'completed'].includes(st)) continue;
    await safeUpdate(Service, service.id, {
      service_status: 'paused',
      is_active: false,
      notificationsEnabled: false,
      offboardingPausedAt: dataExecucao,
    });
  }

  // Tokens de briefing público
  for (const token of tokens || []) {
    if (!token?.id) continue;
    if (String(token.status || '').toLowerCase() !== 'active') continue;
    await safeUpdate(PublicBriefingToken, token.id, {
      status: 'revoked',
      notificationsEnabled: false,
    });
  }

  // Status do cliente + mute global de notificações
  await Client.update(client.id, {
    status: CLIENT_STATUS_ARCHIVED,
    notificationsEnabled: false,
    offboardedAt: dataExecucao,
    offboardingMotivo: motivo,
    archivedAt: dataExecucao,
  });

  // 2) Instanciar checklist padrão de offboarding
  const drafts = buildOffboardingTaskDrafts({
    clientName: nomeCliente,
    clientId: client.id,
    agencyId,
    anchorYmd,
  });

  const createdSummaries = [];
  for (const draft of drafts) {
    try {
      const created = await Task.create(draft.createPayload);
      if (created?.id) {
        createdSummaries.push({
          titulo: draft.titulo,
          responsavelCargo: draft.responsavelCargo,
          prioridade: draft.prioridade,
          vencimento: draft.vencimento,
        });
      }
    } catch (err) {
      console.warn(
        '[clientOffboarding] failed to create task',
        draft.titulo,
        err?.message || err
      );
    }
  }

  // 3) JSON canônico
  return buildOffboardingConfirmation({
    clienteId: client.id,
    nomeCliente,
    dataExecucao,
    entregaveisArquivados,
    subtarefasCanceladas,
    notificacoesDesativadas: true,
    tarefasOffboardingCriadas: createdSummaries,
  });
}
