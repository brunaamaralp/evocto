import { describe, it, expect } from 'vitest';
import { deriveClientInfoCenter } from '../clientInfoCenter.js';

describe('deriveClientInfoCenter', () => {
  it('counts documents, accesses and learnings without leaking secrets', () => {
    const summary = deriveClientInfoCenter({
      documents: [
        { id: 'd1', title: 'Contrato', created_date: '2026-01-02' },
        { id: 'd2', title: 'Proposta', created_date: '2026-02-01' },
      ],
      accesses: [
        { id: 'a1', platform: 'Meta', hasPassword: true },
        { id: 'a2', platform: 'Drive', hasPassword: false },
      ],
      learnings: [{ id: 'l1' }],
      generalNotes: 'Contato VIP e senha wifi: secret',
    });

    expect(summary.documentsCount).toBe(2);
    expect(summary.accessesCount).toBe(2);
    expect(summary.accessesWithPassword).toBe(1);
    expect(summary.learningsCount).toBe(1);
    expect(summary.hasNotes).toBe(true);
    expect(JSON.stringify(summary)).not.toContain('secret');
    expect(summary.recentDocuments[0].title).toBe('Proposta');
  });

  it('falls back to client.acessos_info_geral for notes flag only', () => {
    const summary = deriveClientInfoCenter({
      client: { acessos_info_geral: 'tom de voz formal' },
    });
    expect(summary.hasNotes).toBe(true);
    expect(summary).not.toHaveProperty('notesPreview');
    expect(JSON.stringify(summary)).not.toContain('tom de voz');
  });

  it('handles empty inputs', () => {
    expect(deriveClientInfoCenter()).toEqual({
      documentsCount: 0,
      accessesCount: 0,
      accessesWithPassword: 0,
      learningsCount: 0,
      hasNotes: false,
      recentDocuments: [],
    });
  });
});
