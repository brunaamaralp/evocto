import { describe, expect, it } from 'vitest';
import {
  isOperationalWorkUnitDone,
  resolveOperationalPhaseWork,
} from '@/lib/resolveOperationalPhaseWork';

const AGENCY = 'ag-1';

function task(partial) {
  return { agencyId: AGENCY, clientId: 'c1', serviceId: 's1', status: 'todo', ...partial };
}

const phaseThird = {
  slot: 'third',
  phaseKey: 'edicao_calendarios',
  label: 'Edição & Calendários',
  activityKinds: ['editing', 'calendar'],
};

describe('resolveOperationalPhaseWork', () => {
  it('inclui só classified no foco da fase', () => {
    const tasks = [
      task({
        id: 'e1',
        title: 'Editar 1',
        created_from_template: true,
        template_id: 'editar_video_1',
        activityKind: 'editing',
        status: 'todo',
      }),
      task({
        id: 'cal',
        title: 'Calendário',
        created_from_template: true,
        template_id: 'enviar_calendario_cliente',
        activityKind: 'calendar',
        status: 'completed',
      }),
      task({
        id: 'cap',
        title: 'Gravar',
        created_from_template: true,
        template_id: 'gravar_video_1',
        activityKind: 'capture',
        status: 'todo',
      }),
      task({
        id: 'nullish',
        title: 'Sem kind',
        created_from_template: true,
        template_id: 'x',
        activityKind: null,
      }),
    ];

    const result = resolveOperationalPhaseWork(tasks, {
      agencyId: AGENCY,
      currentPhase: phaseThird,
    });

    expect(result.total).toBe(2);
    expect(result.open).toBe(1);
    expect(result.done).toBe(1);
    expect(result.items.map((i) => i.activityKind).sort()).toEqual([
      'calendar',
      'editing',
    ]);
    expect(result.byKind.find((k) => k.key === 'editing')).toMatchObject({
      total: 1,
      open: 1,
      done: 0,
    });
    expect(result.byKind.find((k) => k.key === 'calendar')).toMatchObject({
      total: 1,
      open: 0,
      done: 1,
    });
  });

  it('ignora parent container e conta checklist classificado', () => {
    const tasks = [
      task({
        id: 'unit',
        title: 'Reel',
        pipeline: 'producao_conteudo',
        activityKind: null,
        checklist: [
          {
            id: 'edicao',
            templateStepId: 'edicao',
            text: 'Edição',
            activityKind: 'editing',
            completed: false,
          },
          {
            id: 'aprovacao',
            templateStepId: 'aprovacao',
            text: 'Aprovação',
            activityKind: 'approval',
            completed: false,
          },
          {
            id: 'producao',
            templateStepId: 'producao',
            text: 'Produção',
            activityKind: null,
            completed: false,
          },
        ],
      }),
    ];

    const result = resolveOperationalPhaseWork(tasks, {
      agencyId: AGENCY,
      currentPhase: phaseThird,
    });

    expect(result.total).toBe(1);
    expect(result.open).toBe(1);
    expect(result.items[0].title).toBe('Edição');
    expect(result.items[0].source).toBe('checklist');
  });

  it('checklist completed conta como done', () => {
    const tasks = [
      task({
        id: 'unit',
        title: 'Reel',
        pipeline: 'conteudo',
        activityKind: null,
        checklist: [
          {
            id: 'edicao',
            templateStepId: 'edicao',
            text: 'Edição',
            activityKind: 'editing',
            completed: true,
          },
        ],
      }),
    ];
    const result = resolveOperationalPhaseWork(tasks, {
      agencyId: AGENCY,
      currentPhase: phaseThird,
    });
    expect(result.done).toBe(1);
    expect(result.open).toBe(0);
  });

  it('fase sem kinds → emptyReason no_focus_kinds', () => {
    const result = resolveOperationalPhaseWork(
      [task({ id: '1', activityKind: 'editing', created_from_template: true, template_id: 'e' })],
      {
        agencyId: AGENCY,
        currentPhase: { ...phaseThird, activityKinds: [] },
      }
    );
    expect(result.total).toBe(0);
    expect(result.emptyReason).toBe('no_focus_kinds');
  });

  it('sem trabalho classificado no foco → no_classified_work', () => {
    const result = resolveOperationalPhaseWork(
      [
        task({
          id: '1',
          activityKind: 'capture',
          created_from_template: true,
          template_id: 'g',
        }),
      ],
      { agencyId: AGENCY, currentPhase: phaseThird }
    );
    expect(result.emptyReason).toBe('no_classified_work');
  });

  it('exclui cancelled', () => {
    const result = resolveOperationalPhaseWork(
      [
        task({
          id: '1',
          title: 'Editar',
          activityKind: 'editing',
          created_from_template: true,
          template_id: 'e',
          status: 'cancelled',
        }),
      ],
      { agencyId: AGENCY, currentPhase: phaseThird }
    );
    expect(result.total).toBe(0);
  });

  it('isola agencyId', () => {
    const result = resolveOperationalPhaseWork(
      [
        task({
          id: '1',
          agencyId: 'other',
          activityKind: 'editing',
          created_from_template: true,
          template_id: 'e',
        }),
      ],
      { agencyId: AGENCY, currentPhase: phaseThird }
    );
    expect(result.total).toBe(0);
  });

  it('isOperationalWorkUnitDone', () => {
    const taskById = new Map([
      [
        't1',
        {
          id: 't1',
          status: 'completed',
          checklist: [{ id: 'a', templateStepId: 'edicao', completed: true }],
        },
      ],
    ]);
    expect(
      isOperationalWorkUnitDone(
        { source: 'task', taskId: 't1' },
        taskById
      )
    ).toBe(true);
    expect(
      isOperationalWorkUnitDone(
        {
          source: 'checklist',
          taskId: 't1',
          checklistItemId: 'a',
          templateStepId: 'edicao',
        },
        taskById
      )
    ).toBe(true);
  });
});
