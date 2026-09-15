import { describe, it, expect } from 'vitest';
import {
  CAMPAIGN_KANBAN_COLUMNS,
  CAMPAIGN_COLUMN_ADVANCE,
  CAMPAIGN_DONE_PATCH,
  columnForTask,
} from '../../components/deliveryWorkspace/CampaignWorkspaceTasks.jsx';

describe('CAMPAIGN_KANBAN_COLUMNS', () => {
  it('tem as 5 colunas da spec', () => {
    expect(CAMPAIGN_KANBAN_COLUMNS.map((c) => c.id)).toEqual([
      'planejamento',
      'roteiros',
      'producao',
      'revisao',
      'publicacao',
    ]);
  });
});

describe('columnForTask / advance', () => {
  it('todo cai em planejamento', () => {
    expect(columnForTask({ status: 'todo' })).toBe('planejamento');
  });

  it('completed cai em publicacao', () => {
    expect(columnForTask({ status: 'completed' })).toBe('publicacao');
  });

  it('kanbanColumn tem prioridade', () => {
    expect(columnForTask({ status: 'todo', kanbanColumn: 'producao' })).toBe(
      'producao'
    );
  });

  it('avançar de planejamento → roteiros; concluir → publicacao', () => {
    expect(CAMPAIGN_COLUMN_ADVANCE.planejamento).toEqual({
      kanbanColumn: 'roteiros',
      status: 'roteiro',
    });
    expect(CAMPAIGN_DONE_PATCH).toEqual({
      kanbanColumn: 'publicacao',
      status: 'completed',
    });
  });
});
