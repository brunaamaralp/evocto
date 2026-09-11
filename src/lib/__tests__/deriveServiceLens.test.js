import { describe, it, expect } from 'vitest';
import {
  deriveAttentionCountsByService,
  deriveServiceLensUnits,
  filterAttentionForService,
  getActiveContractedServices,
  resolveSelectedServiceId,
  selectServiceUnitTasks,
  summarizeChecklistProgress,
} from '../deriveServiceLens.js';
import { OPERATION_PATTERNS, PERIOD_MODES, UNIT_KINDS } from '../serviceOperationProfile.js';

describe('deriveServiceLens', () => {
  const clientId = 'client-1';

  const contentService = {
    id: 'svc-content',
    name: 'MALU — Produção de Conteúdo',
    offering_key: 'producao_conteudo',
    is_template: false,
    is_active: true,
  };

  const campaignService = {
    id: 'svc-campaign',
    name: 'MALU — Ciclo Mensal',
    offering_key: 'ciclo_mensal_4_semanas',
    is_template: false,
    is_active: true,
  };

  const sessionService = {
    id: 'svc-session',
    name: 'MALU — Sessão de Fotos',
    offering_key: 'sessao_fotos',
    is_template: false,
    is_active: true,
  };

  const positionService = {
    id: 'svc-pos',
    name: 'MALU — Posicionamento',
    offering_key: 'posicionamento_marca',
    is_template: false,
    is_active: true,
  };

  it('filtra serviços ativos contratados', () => {
    const list = getActiveContractedServices([
      contentService,
      { ...campaignService, is_template: true },
      { ...sessionService, service_status: 'cancelled' },
      { ...positionService, is_active: false },
    ]);
    expect(list.map((s) => s.id)).toEqual(['svc-content']);
  });

  it('conteúdo recurring agrupa por mês e exclui tasks de campanha', () => {
    const cycles = [
      {
        id: 'cycle-sep',
        serviceId: 'svc-content',
        status: 'in_execution',
        startDate: '2026-09-01',
        title: 'Setembro de 2026',
      },
    ];
    const tasks = [
      {
        id: 't1',
        serviceId: 'svc-content',
        cyclePlanId: 'cycle-sep',
        title: 'Reel — Produto X',
        status: 'in_progress',
        checklist: [
          { text: 'Roteiro', completed: true },
          { text: 'Produção', completed: true },
          { text: 'Edição', completed: false },
          { text: 'Aprovação', completed: false },
          { text: 'Agendamento', completed: false },
        ],
      },
      {
        id: 't-campaign',
        serviceId: 'svc-content',
        briefingId: 'brief-1',
        title: 'Não deve aparecer',
        status: 'todo',
      },
      {
        id: 't-other',
        serviceId: 'svc-session',
        title: 'Ensaio outro serviço',
        status: 'todo',
      },
    ];

    const lens = deriveServiceLensUnits({
      service: contentService,
      cycles,
      tasks,
      clientId,
    });

    expect(lens.operationPattern).toBe(OPERATION_PATTERNS.RECURRING);
    expect(lens.periodMode).toBe(PERIOD_MODES.MONTHLY);
    expect(lens.unitsCount).toBe(1);
    expect(lens.groups).toHaveLength(1);
    expect(lens.groups[0].periodLabel).toMatch(/setembro/i);
    expect(lens.groups[0].units[0].title).toBe('Reel — Produto X');
    expect(lens.groups[0].units[0].progress.completed).toBe(2);
    expect(lens.groups[0].units[0].progress.total).toBe(5);
  });

  it('sessão on_demand é lista plana (sem período)', () => {
    const tasks = [
      {
        id: 's1',
        serviceId: 'svc-session',
        title: 'Ensaio — Outubro Rosa',
        status: 'in_progress',
        checklist: [{ text: 'Briefing', completed: true }, { text: 'Captação', completed: false }],
      },
      {
        id: 's2',
        serviceId: 'svc-session',
        title: 'Ensaio — Dia das Crianças',
        status: 'completed',
        checklist: [
          { text: 'A', completed: true },
          { text: 'B', completed: true },
        ],
      },
    ];

    const lens = deriveServiceLensUnits({
      service: sessionService,
      tasks,
      clientId,
    });

    expect(lens.operationPattern).toBe(OPERATION_PATTERNS.ON_DEMAND);
    expect(lens.periodMode).toBe(PERIOD_MODES.NONE);
    expect(lens.groups).toHaveLength(1);
    expect(lens.groups[0].periodKey).toBeNull();
    expect(lens.groups[0].periodLabel).toBeNull();
    expect(lens.unitsCount).toBe(2);
  });

  it('campanhas ficam só na lente do serviço correspondente', () => {
    const cycles = [
      {
        id: 'cycle-c',
        serviceId: 'svc-campaign',
        status: 'in_execution',
        startDate: '2026-09-01',
      },
    ];
    const briefs = [
      {
        id: 'b1',
        brief_kind: 'campanha_mensal',
        nome_campanha: 'Outubro Rosa',
        serviceId: 'svc-campaign',
        ciclo_id: 'cycle-c',
        status: 'em_execucao',
      },
      {
        id: 'b2',
        brief_kind: 'campanha_mensal',
        nome_campanha: 'Outra',
        serviceId: 'svc-content',
        ciclo_id: 'cycle-c',
        status: 'em_execucao',
      },
    ];

    const lensCampaign = deriveServiceLensUnits({
      service: campaignService,
      cycles,
      briefs,
      tasks: [],
      clientId,
    });
    expect(lensCampaign.unitKind).toBe(UNIT_KINDS.CAMPAIGN_BRIEF);
    expect(lensCampaign.unitsCount).toBe(1);
    expect(lensCampaign.groups[0].units[0].title).toBe('Outubro Rosa');

    const lensContent = deriveServiceLensUnits({
      service: contentService,
      cycles,
      briefs,
      tasks: [],
      clientId,
    });
    expect(lensContent.unitsCount).toBe(0);
  });

  it('single_project expõe etapas da task principal', () => {
    const tasks = [
      {
        id: 'proj-1',
        serviceId: 'svc-pos',
        title: 'Posicionamento MALU',
        status: 'in_progress',
        checklist: [
          { text: 'Briefing', completed: true },
          { text: 'Diagnóstico', completed: true },
          { text: 'Público', completed: false },
        ],
      },
    ];

    const lens = deriveServiceLensUnits({
      service: positionService,
      tasks,
      clientId,
    });

    expect(lens.operationPattern).toBe(OPERATION_PATTERNS.SINGLE_PROJECT);
    expect(lens.singleProject.ready).toBe(true);
    expect(lens.singleProject.steps).toHaveLength(3);
    expect(lens.singleProject.progress.completed).toBe(2);
    expect(lens.profile.showCreateCta).toBe(false);
  });

  it('single_project sem task fica ready=false', () => {
    const lens = deriveServiceLensUnits({
      service: positionService,
      tasks: [],
      clientId,
    });
    expect(lens.singleProject.ready).toBe(false);
    expect(lens.unitsCount).toBe(0);
  });

  it('selectServiceUnitTasks ignora subtarefas e tasks com briefing', () => {
    const tasks = [
      { id: 'a', serviceId: 'svc-content', title: 'Root' },
      { id: 'b', serviceId: 'svc-content', parentTaskId: 'a', title: 'Child' },
      { id: 'c', serviceId: 'svc-content', briefingId: 'x', title: 'Campanha task' },
    ];
    expect(selectServiceUnitTasks(tasks, 'svc-content').map((t) => t.id)).toEqual([
      'a',
    ]);
  });

  it('summarizeChecklistProgress conta etapas', () => {
    const progress = summarizeChecklistProgress({
      checklist: [{ completed: true }, { completed: false }, { completed: false }],
    });
    expect(progress.total).toBe(3);
    expect(progress.completed).toBe(1);
    expect(progress.percentComplete).toBe(33);
  });

  it('atenção: filtro e contagem por serviço', () => {
    const items = [
      { id: '1', serviceId: 'svc-content', type: 'task_overdue' },
      { id: '2', serviceId: 'svc-session', type: 'approval_pending' },
      { id: '3', serviceId: null, type: 'task_urgent' },
      { id: '4', serviceId: 'svc-session', type: 'task_overdue' },
    ];

    expect(filterAttentionForService(items, 'svc-session')).toHaveLength(2);
    expect(filterAttentionForService(items, 'svc-content')).toHaveLength(1);

    const counts = deriveAttentionCountsByService(items, [
      'svc-content',
      'svc-session',
      'svc-campaign',
    ]);
    expect(counts['svc-content']).toBe(1);
    expect(counts['svc-session']).toBe(2);
    expect(counts['svc-campaign']).toBe(0);
  });

  it('resolveSelectedServiceId respeita preferência válida', () => {
    const services = [contentService, sessionService];
    expect(resolveSelectedServiceId(services, 'svc-session')).toBe('svc-session');
    expect(resolveSelectedServiceId(services, 'missing')).toBe('svc-content');
    expect(resolveSelectedServiceId([], null)).toBeNull();
  });
});
