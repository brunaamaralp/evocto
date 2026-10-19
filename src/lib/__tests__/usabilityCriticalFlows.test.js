/**
 * QA — Fluxos críticos de usabilidade (mapa dos 12 cenários obrigatórios).
 * Testa contratos de navegação, filtros, criação, status, deep link e permissões
 * na camada de lib (sem Appwrite / sem browser autenticado).
 */

import { describe, it, expect } from 'vitest';
import {
  applyTaskFilters,
  buildTasksManagerHref,
  getTaskFilterPreset,
  isOpenTaskStatus,
  isTaskOverdue,
  resolvePresetFromQuery,
  taskMatchesAssignee,
} from '../taskFilterPresets.js';
import {
  buildManualTaskPayload,
} from '../createManualTask.js';
import {
  applyTaskIdToSearch,
  buildTaskDeepLink,
  readTaskIdFromSearch,
} from '../openTaskDrawer.js';
import {
  buildTasksManagerFilterHref,
  clearTaskManagerFilterParams,
  readTaskManagerUrlState,
  taskMatchesClientFilter,
  writeTaskManagerFilterParams,
} from '../taskManagerUrlState.js';
import {
  buildMyTasksHref,
  buildQuickCreateTaskHref,
  getMobileBottomNavItems,
  getShellPageLabel,
} from '../shellNavigation.js';
import { buildClientTasksHref, filterTasksByScope } from '../taskScope.js';
import {
  opsKanbanColumnForTask,
  completedKanbanColumnForTask,
} from '../taskStatusTransition.js';
import {
  getKanbanBoardColumns,
  resolveTaskStatusId,
  taskStatusLabelPt,
} from '../taskStatusCanonical.js';
import { isTaskCompletedStatus } from '../completeTask.js';
import {
  buildAttachmentRecord,
  isImageAttachment,
} from '../taskAttachmentsUpload.js';
import { buildCampaignWorkspaceTasksPath } from '../campaignWorkspaceHref.js';

const USER = 'user-qa-1';
const NOW = new Date('2026-10-19T12:00:00');

describe('Cenário 1 — Localizar tarefas atribuídas ao usuário', () => {
  it('href Minhas tarefas e preset filtram por assignee', () => {
    const href = buildMyTasksHref();
    expect(href).toContain('tasks-manager');
    expect(href).toContain('preset=my_tasks');

    const filters = getTaskFilterPreset('my_tasks').apply({ userId: USER });
    expect(
      applyTaskFilters(
        { status: 'todo', assigneeId: USER, title: 'Minha' },
        filters,
        { userId: USER, now: NOW }
      )
    ).toBe(true);
    expect(
      applyTaskFilters(
        { status: 'todo', assigneeId: 'outro', title: 'Outra' },
        filters,
        { userId: USER, now: NOW }
      )
    ).toBe(false);
  });

  it('atalho mobile my-tasks aponta para o mesmo preset', () => {
    const nav = getMobileBottomNavItems({
      mode: 'global',
      currentPage: 'dashboard',
    });
    const myTasks = nav.find((i) => i.id === 'my-tasks');
    expect(myTasks?.href).toContain('preset=my_tasks');
  });
});

describe('Cenário 2 — Criar tarefa no projeto/cliente correto', () => {
  it('payload preserva clientId + serviceId e marca tags manuais', () => {
    const payload = buildManualTaskPayload({
      title: 'Entregar roteiro',
      agencyId: 'ag-1',
      userId: USER,
      clientId: 'client-acme',
      serviceId: 'svc-1',
      status: 'todo',
    });
    expect(payload.clientId).toBe('client-acme');
    expect(payload.serviceId).toBe('svc-1');
    expect(payload.agencyId).toBe('ag-1');
    expect(payload.tags).toContain('manual');
    expect(payload.clientVisible).toBe(false);
  });

  it('quick-create com clientId abre inbox do cliente', () => {
    const href = buildQuickCreateTaskHref({
      clientId: 'client-acme',
      serviceId: 'svc-1',
    });
    expect(href).toContain('client-tasks');
    expect(href).toContain('clientId=client-acme');
    expect(href).toContain('create=1');
  });

  it('escopo de campanha isola tarefas do briefing', () => {
    const tasks = [
      { id: '1', briefingId: 'camp-a', title: 'A' },
      { id: '2', briefingId: 'camp-b', title: 'B' },
      { id: '3', cycleId: 'cycle-1', title: 'C' },
    ];
    const scoped = filterTasksByScope(tasks, {
      briefingId: 'camp-a',
      cycleId: 'cycle-1',
    });
    expect(scoped.scope).toBe('campaign');
    expect(scoped.tasks.map((t) => t.id)).toEqual(['1']);
  });
});

describe('Cenário 3 — Atribuir responsável e prazo', () => {
  it('payload grava assigneeId e dueDate ISO', () => {
    const payload = buildManualTaskPayload({
      title: 'Com prazo',
      agencyId: 'ag-1',
      assignedTo: USER,
      dueDate: '2026-10-25T15:00:00.000Z',
    });
    expect(payload.assignedTo).toBe(USER);
    expect(payload.assigneeId).toBe(USER);
    expect(payload.dueDate).toBe('2026-10-25T15:00:00.000Z');
  });

  it('sentinela unassigned não persiste como id', () => {
    const payload = buildManualTaskPayload({
      title: 'Sem dono',
      agencyId: 'ag-1',
      assignedTo: 'unassigned',
    });
    expect(payload.assignedTo).toBe(null);
    expect(payload.assigneeId).toBe(null);
  });

  it('taskMatchesAssignee cobre unassigned', () => {
    expect(taskMatchesAssignee({ assigneeId: null }, 'unassigned')).toBe(true);
    expect(taskMatchesAssignee({ assigneeId: USER }, 'unassigned')).toBe(false);
  });
});

describe('Cenário 4 — Alterar status e persistência canônica', () => {
  it('mapeia aliases de campanha para colunas do board', () => {
    expect(
      opsKanbanColumnForTask({ status: 'roteiro', kanbanColumn: 'roteiros' })
    ).toBe('todo');
    expect(
      opsKanbanColumnForTask({ status: 'in_progress', kanbanColumn: 'producao' })
    ).toBe('in_progress');
    expect(resolveTaskStatusId('awaiting_client')).toBe('waiting_client');
    expect(taskStatusLabelPt('in_review')).toMatch(/revis/i);
  });

  it('conclusão usa coluna publicacao em campanha e completed no ops', () => {
    expect(
      completedKanbanColumnForTask({ briefingId: 'c1', kanbanColumn: 'revisao' })
    ).toBe('publicacao');
    expect(completedKanbanColumnForTask({ status: 'todo' })).toBe('completed');
    expect(isTaskCompletedStatus('completed')).toBe(true);
    expect(isTaskCompletedStatus('todo')).toBe(false);
  });

  it('board tem colunas estáveis para kanban', () => {
    const cols = getKanbanBoardColumns();
    expect(cols.map((c) => c.id)).toEqual(
      expect.arrayContaining(['todo', 'in_progress', 'in_review', 'completed'])
    );
  });
});

describe('Cenário 5 — Abrir tarefa, editar e voltar sem perder contexto', () => {
  it('deep link preserva clientId ao abrir task', () => {
    expect(buildTaskDeepLink('t9', '/client-tasks?clientId=c1')).toBe(
      '/client-tasks?clientId=c1&taskId=t9'
    );
    expect(applyTaskIdToSearch('?clientId=c1&preset=my_tasks', 't9')).toBe(
      '?clientId=c1&preset=my_tasks&taskId=t9'
    );
    expect(applyTaskIdToSearch('?clientId=c1&taskId=t9', null)).toBe(
      '?clientId=c1'
    );
  });

  it('filtros livres sobrevivem na URL (round-trip)', () => {
    const written = writeTaskManagerFilterParams('?view=week', {
      q: 'roteiro',
      client: 'c1',
      assignee: USER,
      status: 'in_progress',
    });
    const state = readTaskManagerUrlState(written);
    expect(state).toMatchObject({
      q: 'roteiro',
      client: 'c1',
      assignee: USER,
      status: 'in_progress',
      view: 'week',
    });
    const cleared = clearTaskManagerFilterParams(written);
    const after = readTaskManagerUrlState(cleared);
    expect(after.q).toBe('');
    expect(after.client).toBe('all');
    expect(after.view).toBe('week');
  });

  it('taskId é lido de taskId ou task legado', () => {
    expect(readTaskIdFromSearch('?taskId=abc')).toBe('abc');
    expect(readTaskIdFromSearch('?task=legacy')).toBe('legacy');
  });
});

describe('Cenário 6 — Encontrar tarefas atrasadas', () => {
  it('preset my_overdue isola atrasadas do usuário', () => {
    const filters = getTaskFilterPreset('my_overdue').apply({ userId: USER });
    const overdue = {
      status: 'todo',
      assigneeId: USER,
      dueDate: '2026-10-10',
    };
    const onTime = {
      status: 'todo',
      assigneeId: USER,
      dueDate: '2026-10-25',
    };
    expect(isTaskOverdue(overdue, NOW)).toBe(true);
    expect(applyTaskFilters(overdue, filters, { userId: USER, now: NOW })).toBe(
      true
    );
    expect(applyTaskFilters(onTime, filters, { userId: USER, now: NOW })).toBe(
      false
    );
  });

  it('dueRange overdue na UI bate com isTaskOverdue', () => {
    expect(
      applyTaskFilters(
        { status: 'todo', dueDate: '2026-10-01' },
        { dueRange: 'overdue' },
        { now: NOW }
      )
    ).toBe(true);
    expect(
      applyTaskFilters(
        { status: 'completed', dueDate: '2026-10-01' },
        { dueRange: 'overdue' },
        { now: NOW }
      )
    ).toBe(false);
  });
});

describe('Cenário 7 — Filtrar por responsável, status e prazo', () => {
  const catalog = [
    {
      id: '1',
      title: 'A',
      status: 'todo',
      assigneeId: USER,
      dueDate: '2026-10-20',
      clientId: 'c1',
    },
    {
      id: '2',
      title: 'B',
      status: 'in_progress',
      assigneeId: 'other',
      dueDate: '2026-10-10',
      clientId: 'c2',
    },
    {
      id: '3',
      title: 'C interna',
      status: 'todo',
      assigneeId: USER,
      dueDate: '2026-10-22',
      clientId: null,
    },
  ];

  it('combina assignee + status + dueRange', () => {
    const filters = {
      assignee: USER,
      status: 'todo',
      dueRange: 'this_week',
    };
    const matched = catalog.filter((t) =>
      applyTaskFilters(t, filters, { userId: USER, now: NOW })
    );
    expect(matched.map((t) => t.id)).toEqual(['1', '3']);
  });

  it('filtro de cliente inclui internas', () => {
    expect(taskMatchesClientFilter(catalog[0], 'c1')).toBe(true);
    expect(taskMatchesClientFilter(catalog[2], 'internal')).toBe(true);
    expect(taskMatchesClientFilter(catalog[0], 'internal')).toBe(false);
  });

  it('href com filtros livres é estável', () => {
    const href = buildTasksManagerFilterHref({
      assignee: USER,
      status: 'in_progress',
      client: 'c1',
    });
    expect(href).toContain('assignee=');
    expect(href).toContain('status=in_progress');
    expect(href).toContain('client=c1');
  });
});

describe('Cenário 8 — Alternar visualizações', () => {
  it('view=week e kanban são mutuamente exclusivos na URL', () => {
    const week = writeTaskManagerFilterParams('', { view: 'week' });
    expect(readTaskManagerUrlState(week).view).toBe('week');
    const kanban = writeTaskManagerFilterParams(week, { view: 'kanban' });
    expect(readTaskManagerUrlState(kanban).view).toBe('kanban');
    expect(buildTasksManagerHref({ view: 'week' })).toContain('view=week');
  });
});

describe('Cenário 9 — Localizar cliente e acessar projetos', () => {
  it('breadcrumb e rotas de cliente têm labels amigáveis', () => {
    expect(getShellPageLabel('client-tasks')).toBe('Tarefas');
    expect(getShellPageLabel('planejamento')).toBe('Panorama');
    expect(getShellPageLabel('delivery-workspace')).toBe('Workspace');
  });

  it('inbox e workspace de campanha carregam clientId', () => {
    const inbox = buildClientTasksHref({
      clientId: 'c1',
      serviceId: 's1',
      briefingId: 'b1',
    });
    expect(inbox).toContain('clientId=c1');
    expect(inbox).toContain('briefingId=b1');

    const workspace = buildCampaignWorkspaceTasksPath({
      serviceId: 's1',
      clientId: 'c1',
      campaignId: 'b1',
    });
    expect(workspace).toContain('clientId=c1');
    expect(String(workspace)).toMatch(/campaignId|briefingId|unitId/i);
  });
});

describe('Cenário 10 — Arquivos/entregas e permissões', () => {
  it('nova tarefa nasce clientVisible=false (não vaza ao portal)', () => {
    const payload = buildManualTaskPayload({
      title: 'Interna',
      agencyId: 'ag-1',
      clientId: 'c1',
    });
    expect(payload.clientVisible).toBe(false);
  });

  it('anexos tipam imagem vs documento', () => {
    const rec = buildAttachmentRecord(
      { name: 'brief.pdf', type: 'application/pdf', size: 12 },
      'https://cdn.example/brief.pdf',
      { uploadedBy: USER }
    );
    expect(rec.type).not.toBe('image');
    expect(isImageAttachment(rec)).toBe(false);
    expect(isImageAttachment({ mimeType: 'image/png' })).toBe(true);
  });

  it('waiting_client permanece status aberto operacional', () => {
    expect(isOpenTaskStatus({ status: 'waiting_client' })).toBe(true);
  });
});

describe('Cenário 11 — Falha de rede / persistência', () => {
  it('payload rejeita título vazio e agency ausente com mensagem clara', () => {
    expect(() => buildManualTaskPayload({ title: '  ', agencyId: 'ag' })).toThrow(
      /Título/
    );
    expect(() =>
      buildManualTaskPayload({ title: 'Ok', agencyId: null })
    ).toThrow(/Agência/);
  });

  it('status terminal completed não é forçado em quick-add', () => {
    const payload = buildManualTaskPayload({
      title: 'Quick',
      agencyId: 'ag-1',
      status: 'completed',
      quickAdd: true,
    });
    expect(payload.status).toBe('todo');
  });

  it('preset inválido na URL é rejeitado (não injeta filtro)', () => {
    expect(resolvePresetFromQuery('hack;drop')).toBe(null);
    expect(resolvePresetFromQuery('my_overdue')?.id).toBe('my_overdue');
  });
});

describe('Cenário 12 — Mobile e teclado (contratos de shell)', () => {
  it('bottom nav mobile tem Home, Clientes, Minhas tarefas, Aprovações', () => {
    const agency = getMobileBottomNavItems({
      mode: 'global',
      currentPage: 'tasks-manager',
    });
    expect(agency.map((i) => i.id)).toEqual([
      'home',
      'clients',
      'my-tasks',
      'approvals',
      'more',
    ]);
    expect(agency.find((i) => i.id === 'my-tasks').isActive).toBe(true);
  });

  it('nav do cliente inclui tarefas com clientId', () => {
    const client = getMobileBottomNavItems({
      mode: 'client',
      clientId: 'c1',
      currentPage: 'client-detail',
    });
    expect(client.find((i) => i.id === 'tasks').href).toContain('clientId=c1');
  });
});
