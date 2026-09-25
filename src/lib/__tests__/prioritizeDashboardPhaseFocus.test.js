import { describe, expect, it } from 'vitest';
import {
  ATTENTION_KIND_RANK,
  attentionItemDedupeKey,
  buildPhaseFocusAttentionItems,
  mergePhaseFocusIntoAttentionQueue,
} from '@/lib/prioritizeDashboardPhaseFocus';

describe('mergePhaseFocusIntoAttentionQueue', () => {
  it('coloca phase_focus depois de overdue e antes de blocked', () => {
    const merged = mergePhaseFocusIntoAttentionQueue(
      [
        { id: 'task:b', taskId: 'b', kind: 'blocked', sortAt: 2, title: 'B' },
        { id: 'task:o', taskId: 'o', kind: 'overdue', sortAt: 1, title: 'O' },
      ],
      [{ id: 'task:p', taskId: 'p', kind: 'phase_focus', sortAt: 3, title: 'P' }],
      { max: 10 }
    );
    expect(merged.map((i) => i.kind)).toEqual([
      'overdue',
      'phase_focus',
      'blocked',
    ]);
  });

  it('em conflito na mesma Task, mantém o kind mais urgente', () => {
    const merged = mergePhaseFocusIntoAttentionQueue(
      [{ id: 'task:1', taskId: '1', kind: 'overdue', sortAt: 1, title: 'Atrasada' }],
      [
        {
          id: 'task:1',
          taskId: '1',
          kind: 'phase_focus',
          sortAt: 1,
          title: 'Foco',
        },
      ]
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].kind).toBe('overdue');
  });

  it('checklist e task da mesma unit não colidem na chave', () => {
    expect(
      attentionItemDedupeKey({
        taskId: 't1',
        checklistItemId: 'edicao',
        kind: 'phase_focus',
      })
    ).toBe('checklist:t1:edicao');
    expect(
      attentionItemDedupeKey({ taskId: 't1', kind: 'phase_focus' })
    ).toBe('task:t1');
  });

  it('respeita max', () => {
    const base = Array.from({ length: 5 }, (_, i) => ({
      id: `task:${i}`,
      taskId: String(i),
      kind: 'blocked',
      sortAt: i,
      title: `T${i}`,
    }));
    const focus = Array.from({ length: 5 }, (_, i) => ({
      id: `pf:${i}`,
      taskId: `p${i}`,
      kind: 'phase_focus',
      sortAt: i,
      title: `P${i}`,
    }));
    expect(
      mergePhaseFocusIntoAttentionQueue(base, focus, { max: 4 })
    ).toHaveLength(4);
    expect(
      mergePhaseFocusIntoAttentionQueue(base, focus, { max: 4 })[0].kind
    ).toBe('phase_focus');
  });
});

describe('buildPhaseFocusAttentionItems', () => {
  it('só itens abertos; checklist não é completable', () => {
    const items = buildPhaseFocusAttentionItems(
      {
        enabled: true,
        phaseLabel: 'Edição & Calendários',
        items: [
          {
            id: 'checklist:u1:edicao',
            title: 'Edição',
            done: false,
            source: 'checklist',
            taskId: 'u1',
            checklistItemId: 'edicao',
            clientId: 'c1',
            activityKind: 'editing',
            activityKindLabel: 'Edição',
          },
          {
            id: 'task:t2',
            title: 'Calendário',
            done: true,
            source: 'task',
            taskId: 't2',
            activityKind: 'calendar',
            activityKindLabel: 'Calendário',
          },
          {
            id: 'task:t3',
            title: 'Editar vídeo',
            done: false,
            source: 'task',
            taskId: 't3',
            clientId: 'c1',
            activityKind: 'editing',
            activityKindLabel: 'Edição',
          },
        ],
      },
      {
        tasks: [
          { id: 'u1', title: 'Reel', clientId: 'c1', priority: 'high' },
          { id: 't3', title: 'Editar vídeo', clientId: 'c1', priority: 'medium' },
        ],
        clients: [{ id: 'c1', name: 'Cliente X' }],
        resolveClientName: (clients, id) =>
          clients.find((c) => c.id === id)?.name || null,
        formatDueLabel: () => null,
      }
    );

    expect(items).toHaveLength(2);
    expect(items[0].kind).toBe('phase_focus');
    expect(items[0].completable).toBe(false);
    expect(items[1].completable).toBe(true);
    expect(items[1].clientName).toBe('Cliente X');
    expect(ATTENTION_KIND_RANK.phase_focus).toBe(1);
  });
});
