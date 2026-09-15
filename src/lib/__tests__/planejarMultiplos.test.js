import { describe, it, expect, vi } from 'vitest';
import {
  MULTIPLOS_MIN,
  MULTIPLOS_MAX,
  validateMultiplosSelection,
  validateMultiplosDrafts,
  buildPlanejadoBatchPayload,
  savePlanejarMultiplosBatch,
  listEligibleEmptyMonths,
} from '../planejarMultiplos.js';
import { statusFromCampaignBrief } from '../panoramaAnual.js';

describe('validateMultiplosSelection', () => {
  it('exige 3–5 meses', () => {
    expect(validateMultiplosSelection([1, 2]).valid).toBe(false);
    expect(validateMultiplosSelection([1, 2, 3]).valid).toBe(true);
    expect(validateMultiplosSelection([1, 2, 3, 4, 5]).valid).toBe(true);
    expect(validateMultiplosSelection([1, 2, 3, 4, 5, 6]).valid).toBe(false);
    expect(MULTIPLOS_MIN).toBe(3);
    expect(MULTIPLOS_MAX).toBe(5);
  });
});

describe('validateMultiplosDrafts', () => {
  it('exige título', () => {
    expect(
      validateMultiplosDrafts([
        { mes: 1, titulo: 'A' },
        { mes: 2, titulo: '' },
      ]).valid
    ).toBe(false);
    expect(
      validateMultiplosDrafts([
        { mes: 1, titulo: 'A' },
        { mes: 2, titulo: 'B' },
      ]).valid
    ).toBe(true);
  });
});

describe('buildPlanejadoBatchPayload', () => {
  it('marca planejada + linkedToBatch', () => {
    const payload = buildPlanejadoBatchPayload({
      agencyId: 'ag',
      clientId: 'cli',
      mes: 9,
      ano: 2026,
      linkedToBatch: 'batch-1',
      titulo: 'Setembro',
      conceito: 'Conceito',
      ciclo: 'atração',
    });
    expect(payload.status_campanha).toBe('planejada');
    expect(payload.linkedToBatch).toBe('batch-1');
    expect(payload.mes).toBe(9);
    expect(payload.ano).toBe(2026);
    expect(payload.nome_campanha).toBe('Setembro');
    expect(payload.ideia.titulo).toBe('Setembro');
    expect(statusFromCampaignBrief(payload)).toBe('planned');
  });
});

describe('savePlanejarMultiplosBatch', () => {
  it('cria N briefs com o mesmo linkedToBatch', async () => {
    const createFn = vi.fn(async (payload) => ({ id: `id-${payload.mes}`, ...payload }));
    const result = await savePlanejarMultiplosBatch({
      agencyId: 'ag',
      clientId: 'cli',
      ano: 2026,
      drafts: [
        { mes: 3, titulo: 'Mar' },
        { mes: 4, titulo: 'Abr' },
        { mes: 5, titulo: 'Mai' },
      ],
      createFn,
    });
    expect(createFn).toHaveBeenCalledTimes(3);
    expect(result.created).toHaveLength(3);
    expect(result.linkedToBatch).toBeTruthy();
    expect(result.created.every((b) => b.linkedToBatch === result.linkedToBatch)).toBe(
      true
    );
  });
});

describe('listEligibleEmptyMonths', () => {
  it('filtra só empty', () => {
    expect(
      listEligibleEmptyMonths([
        { mes: 1, status: 'empty' },
        { mes: 2, status: 'planned' },
        { mes: 3, status: 'empty' },
      ]).map((m) => m.mes)
    ).toEqual([1, 3]);
  });
});
