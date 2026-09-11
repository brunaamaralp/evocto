import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/api/entities', () => ({
  CyclePlan: {
    filter: vi.fn(),
    get: vi.fn(),
    update: vi.fn(),
  },
  Service: {
    get: vi.fn(),
  },
  Task: {
    create: vi.fn(),
    filter: vi.fn(),
  },
}));

vi.mock('@/api/functions/createMonthCycle', () => ({
  createMonthCycle: vi.fn(),
}));

import { CyclePlan, Service, Task } from '@/api/entities';
import { createMonthCycle } from '@/api/functions/createMonthCycle';
import {
  createServiceUnitTask,
  ensureServiceOperationalCycle,
  startSingleProjectOperation,
} from '../createServiceUnitTask.js';

const contentService = {
  id: 'svc-1',
  name: 'MALU — Produção de Conteúdo',
  offering_key: 'producao_conteudo',
  content_item_template: {
    title: 'Novo conteúdo',
    type: 'creative',
    checklist: [{ text: 'Roteiro' }, { text: 'Edição' }],
  },
};

describe('createServiceUnitTask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Service.get.mockResolvedValue(contentService);
  });

  it('reutiliza ciclo do mês do serviço e cria task com checklist', async () => {
    CyclePlan.filter.mockResolvedValue([
      {
        id: 'cycle-1',
        serviceId: 'svc-1',
        status: 'in_execution',
        startDate: '2026-09-01',
        title: 'Setembro de 2026',
      },
    ]);
    Task.create.mockResolvedValue({
      id: 'task-1',
      title: 'Reel X',
      serviceId: 'svc-1',
    });

    const result = await createServiceUnitTask({
      agencyId: 'ag-1',
      clientId: 'cli-1',
      service: contentService,
      title: 'Reel X',
      startDate: '2026-09-10',
    });

    expect(createMonthCycle).not.toHaveBeenCalled();
    expect(Task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Reel X',
        serviceId: 'svc-1',
        cyclePlanId: 'cycle-1',
        checklist: expect.arrayContaining([
          expect.objectContaining({ text: 'Roteiro' }),
        ]),
      })
    );
    expect(result.task.id).toBe('task-1');
    expect(result.cycleCreated).toBe(false);
  });

  it('cria ciclo quando não há ciclo do mês para o serviço', async () => {
    CyclePlan.filter.mockResolvedValue([]);
    createMonthCycle.mockResolvedValue({
      cyclePlan: {
        id: 'cycle-new',
        serviceId: 'svc-1',
        startDate: '2026-09-01',
      },
      service: contentService,
    });
    CyclePlan.update.mockResolvedValue({
      id: 'cycle-new',
      title: 'Setembro de 2026',
      startDate: '2026-09-01',
    });
    Task.create.mockResolvedValue({ id: 'task-2', title: 'Carrossel' });

    const result = await createServiceUnitTask({
      agencyId: 'ag-1',
      clientId: 'cli-1',
      service: contentService,
      title: 'Carrossel',
      startDate: '2026-09-01',
    });

    expect(createMonthCycle).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceId: 'svc-1',
        generateTasks: false,
        pipeline: 'producao_conteudo',
      })
    );
    expect(result.cycleCreated).toBe(true);
  });

  it('startSingleProjectOperation reutiliza task existente', async () => {
    const posService = {
      id: 'svc-pos',
      offering_key: 'posicionamento_marca',
      name: 'Posicionamento',
      content_item_template: {
        checklist: [{ text: 'Diagnóstico' }],
      },
    };
    Task.filter.mockResolvedValue([
      {
        id: 'existing',
        serviceId: 'svc-pos',
        title: 'Posicionamento',
        status: 'in_progress',
        created_date: '2026-01-01',
      },
    ]);

    const result = await startSingleProjectOperation({
      agencyId: 'ag-1',
      clientId: 'cli-1',
      service: posService,
    });

    expect(result.alreadyStarted).toBe(true);
    expect(result.task.id).toBe('existing');
    expect(Task.create).not.toHaveBeenCalled();
  });
});

describe('ensureServiceOperationalCycle on_demand', () => {
  it('reutiliza qualquer ciclo ativo do serviço (sem exigir mês)', async () => {
    const sessionService = {
      id: 'svc-s',
      offering_key: 'sessao_fotos',
      name: 'Sessão',
      content_item_template: { checklist: [{ text: 'Briefing' }] },
    };
    CyclePlan.filter.mockResolvedValue([
      {
        id: 'cycle-old',
        serviceId: 'svc-s',
        status: 'approved',
        startDate: '2026-01-01',
      },
    ]);

    const result = await ensureServiceOperationalCycle({
      agencyId: 'ag-1',
      clientId: 'cli-1',
      service: sessionService,
      startDate: '2026-09-01',
    });

    expect(result.created).toBe(false);
    expect(result.cyclePlan.id).toBe('cycle-old');
    expect(createMonthCycle).not.toHaveBeenCalled();
  });
});
