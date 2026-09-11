import { describe, it, expect } from 'vitest';
import { buildClientUnitHref } from '../unitHref.js';
import { buildClientOperationBreadcrumbs } from '../clientOperationBreadcrumb.js';

describe('unitHref', () => {
  it('monta client-unit com taskId', () => {
    expect(
      buildClientUnitHref({
        clientId: 'c1',
        serviceId: 's1',
        taskId: 't1',
      })
    ).toBe('client-unit?clientId=c1&serviceId=s1&taskId=t1');
  });
});

describe('clientOperationBreadcrumb', () => {
  it('monta Cliente › Serviço › Período › Unidade para recurring', () => {
    const crumbs = buildClientOperationBreadcrumbs({
      client: { id: 'c1', name: 'MALU' },
      service: {
        id: 's1',
        offering_key: 'producao_conteudo',
        name: 'MALU — Produção de Conteúdo',
      },
      profile: {
        periodMode: 'monthly',
        offeringKey: 'producao_conteudo',
      },
      cycle: { startDate: '2026-09-01' },
      unitTitle: 'Reel — Produto X',
    });
    expect(crumbs.map((c) => c.label)).toEqual([
      'MALU',
      'Produção de Conteúdo',
      expect.stringMatching(/setembro/i),
      'Reel — Produto X',
    ]);
  });

  it('omite período em on_demand', () => {
    const crumbs = buildClientOperationBreadcrumbs({
      client: { id: 'c1', name: 'MALU' },
      service: {
        id: 's1',
        offering_key: 'sessao_fotos',
        name: 'MALU — Sessão de Fotos',
      },
      profile: { periodMode: 'none' },
      unitTitle: 'Ensaio Outubro Rosa',
    });
    expect(crumbs.map((c) => c.label)).toEqual([
      'MALU',
      'Sessão de Fotos',
      'Ensaio Outubro Rosa',
    ]);
  });
});
