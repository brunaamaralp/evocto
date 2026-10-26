import { describe, expect, it } from 'vitest';
import {
  canGenerateProposalFromLead,
  overridesFromLead,
} from '../agencyLeads/ensureClientFromLead.js';

describe('ensureClientFromLead helpers', () => {
  it('canGenerateProposalFromLead stages', () => {
    expect(canGenerateProposalFromLead({ id: '1', status: 'lead' })).toBe(false);
    expect(canGenerateProposalFromLead({ id: '1', status: 'perdido' })).toBe(false);
    expect(canGenerateProposalFromLead({ id: '1', status: 'qualificacao' })).toBe(true);
    expect(canGenerateProposalFromLead({ id: '1', status: 'proposta' })).toBe(true);
    expect(canGenerateProposalFromLead({ id: '1', status: 'fechado' })).toBe(true);
    expect(canGenerateProposalFromLead(null)).toBe(false);
  });

  it('overridesFromLead maps value and notes', () => {
    const o = overridesFromLead({
      name: 'Ana',
      companyName: 'Padaria Sol',
      notes: 'Quer conteúdo mensal',
      estimatedValue: 8500,
    });
    expect(o.titulo).toContain('Padaria Sol');
    expect(o.objetivo).toBe('Quer conteúdo mensal');
    expect(o.investimento).toMatch(/8\.?500|8500/);
  });
});
