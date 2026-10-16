import { describe, expect, it } from 'vitest';
import {
  LEAD_STAGES,
  normalizeLeadStage,
  formatLeadValue,
} from '../agencyLeads/constants.js';
import { canConvertLead } from '../agencyLeads/convertLeadToClient.js';

describe('agencyLeads constants', () => {
  it('has five pipeline stages', () => {
    expect(LEAD_STAGES).toHaveLength(5);
    expect(LEAD_STAGES.map((s) => s.id)).toEqual([
      'lead',
      'qualificacao',
      'proposta',
      'fechado',
      'perdido',
    ]);
  });

  it('normalizes unknown stage to lead', () => {
    expect(normalizeLeadStage('PROPOSTA')).toBe('proposta');
    expect(normalizeLeadStage('')).toBe('lead');
    expect(normalizeLeadStage('x')).toBe('lead');
  });

  it('formats estimated value', () => {
    expect(formatLeadValue(0)).toBeNull();
    expect(formatLeadValue(1500)).toMatch(/1\.500|1500/);
  });
});

describe('canConvertLead', () => {
  it('allows proposta and fechado when not converted', () => {
    expect(canConvertLead({ id: '1', status: 'proposta' })).toBe(true);
    expect(canConvertLead({ id: '1', status: 'fechado' })).toBe(true);
    expect(canConvertLead({ id: '1', status: 'lead' })).toBe(false);
    expect(
      canConvertLead({ id: '1', status: 'fechado', convertedClientId: 'c1' })
    ).toBe(false);
  });
});
