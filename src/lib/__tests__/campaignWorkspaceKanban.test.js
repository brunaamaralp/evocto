import { describe, it, expect } from 'vitest';
import { CAMPAIGN_KANBAN_COLUMNS } from '../../components/deliveryWorkspace/CampaignWorkspaceTasks.jsx';

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
