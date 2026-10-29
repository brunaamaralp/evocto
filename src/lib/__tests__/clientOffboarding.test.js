import { describe, it, expect } from 'vitest';
import {
  addDaysYmd,
  buildOffboardingConfirmation,
  buildOffboardingTaskDrafts,
  isClientOnActiveRadar,
  mapPriorityToTask,
  CLIENT_OFFBOARDING_EVENT,
} from '../clientOffboarding.js';

describe('clientOffboarding helpers', () => {
  it('keeps only ativo/prospecto on active radar', () => {
    expect(isClientOnActiveRadar({ status: 'ativo' })).toBe(true);
    expect(isClientOnActiveRadar({ status: 'prospecto' })).toBe(true);
    expect(isClientOnActiveRadar({ status: 'arquivado' })).toBe(false);
    expect(isClientOnActiveRadar({ status: 'inativo' })).toBe(false);
    expect(isClientOnActiveRadar({ status: 'suspenso' })).toBe(false);
  });

  it('computes D+ offsets from anchor', () => {
    expect(addDaysYmd('2026-10-28', 0)).toBe('2026-10-28');
    expect(addDaysYmd('2026-10-28', 1)).toBe('2026-10-29');
    expect(addDaysYmd('2026-10-28', 2)).toBe('2026-10-30');
    expect(addDaysYmd('2026-10-28', 3)).toBe('2026-10-31');
  });

  it('builds five offboarding drafts with correct cargos and priorities', () => {
    const drafts = buildOffboardingTaskDrafts({
      clientName: 'Padaria Sol',
      clientId: 'c1',
      agencyId: 'a1',
      anchorYmd: '2026-10-28',
    });
    expect(drafts).toHaveLength(5);
    expect(drafts[0]).toMatchObject({
      titulo: '[OFFBOARDING] Padaria Sol — Pausar campanhas ativas no Meta Ads',
      responsavelCargo: 'gestor_trafego',
      prioridade: 'alta',
      vencimento: '2026-10-28',
    });
    expect(drafts[4]).toMatchObject({
      responsavelCargo: 'financeiro',
      prioridade: 'alta',
      vencimento: '2026-10-29',
    });
    expect(mapPriorityToTask('alta')).toBe('high');
    expect(mapPriorityToTask('media')).toBe('medium');
  });

  it('returns canonical CLIENT_OFFBOARDING_EXECUTED JSON', () => {
    const json = buildOffboardingConfirmation({
      clienteId: 'client-1',
      nomeCliente: 'Padaria Sol',
      dataExecucao: '2026-10-28T12:00:00Z',
      entregaveisArquivados: 3,
      subtarefasCanceladas: 7,
      notificacoesDesativadas: true,
      tarefasOffboardingCriadas: [
        {
          titulo: '[OFFBOARDING] Padaria Sol — Pausar campanhas ativas no Meta Ads',
          responsavelCargo: 'gestor_trafego',
          prioridade: 'alta',
          vencimento: '2026-10-28',
        },
      ],
    });

    expect(json.evento).toBe(CLIENT_OFFBOARDING_EVENT);
    expect(json.statusCliente).toBe('ARCHIVED');
    expect(json.acoesLimpeza).toEqual({
      entregaveisArquivados: 3,
      subtarefasCanceladas: 7,
      notificacoesDesativadas: true,
    });
    expect(json.tarefasOffboardingCriadas[0].prioridade).toBe('alta');
  });
});
