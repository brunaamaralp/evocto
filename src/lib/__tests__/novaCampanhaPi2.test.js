import { describe, it, expect } from 'vitest';
import { buildNovaCampanhaHref, buildBrainstormHref } from '../planoAnualHub.js';
import { clientCampaignIdeiaPageUrl } from '../campaignHref.js';

describe('PI-2 Nova Campanha', () => {
  it('buildNovaCampanhaHref força modo avulso com mês/ano', () => {
    const href = buildNovaCampanhaHref('cli1', { mes: 9, ano: 2026 });
    expect(href).toContain('/client-brainstorm');
    expect(href).toContain('clientId=cli1');
    expect(href).toContain('modo=avulso');
    expect(href).toContain('mes=9');
    expect(href).toContain('ano=2026');
    expect(href).not.toContain('modo=plano');
  });

  it('buildNovaCampanhaHref ignora modo plano passado por engano', () => {
    expect(buildNovaCampanhaHref('cli1', { mes: 3, ano: 2026, modo: 'plano' })).toBe(
      buildBrainstormHref('cli1', { mes: 3, ano: 2026, modo: 'avulso' })
    );
  });

  it('landing pós-create aponta Workspace Ideia quando há serviceId', () => {
    const url = clientCampaignIdeiaPageUrl({
      clientId: 'cli',
      briefingId: 'br1',
      serviceId: 's1',
    });
    expect(url).toContain('/delivery-workspace');
    expect(url).toContain('section=ideia');
    expect(url).toContain('campaignId=br1');
  });
});
