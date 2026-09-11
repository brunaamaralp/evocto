import { describe, it, expect } from 'vitest';
import {
  buildCampaignWorkspacePath,
  buildCampaignWorkspaceTasksPath,
  buildCampaignWorkspaceIdeiaPath,
  buildPlanningCreateCampaignPath,
  getCampaignIdFromSearchParams,
  resolveCampaignWorkspaceTab,
  resolveLegacyCampaignRedirect,
  CAMPAIGN_WORKSPACE_DEFAULT_TAB,
  buildPlanningCreateCampaignPath,
} from '../campaignWorkspaceHref.js';
import { buildClientCampaignHref } from '../campaignHref.js';

describe('getCampaignIdFromSearchParams', () => {
  it('prioriza campaignId e aceita aliases', () => {
    expect(
      getCampaignIdFromSearchParams(new URLSearchParams('campaignId=a&briefingId=b'))
    ).toBe('a');
    expect(getCampaignIdFromSearchParams(new URLSearchParams('briefingId=b'))).toBe(
      'b'
    );
    expect(getCampaignIdFromSearchParams(new URLSearchParams('campanhaId=c'))).toBe(
      'c'
    );
    expect(getCampaignIdFromSearchParams(new URLSearchParams('clientId=x'))).toBe(
      null
    );
  });
});

describe('resolveCampaignWorkspaceTab', () => {
  it('retorna null sem campaignId (modo serviço legado)', () => {
    expect(
      resolveCampaignWorkspaceTab(new URLSearchParams('serviceId=s1&section=tasks'))
    ).toBe(null);
  });

  it('default tasks com campaignId', () => {
    expect(
      resolveCampaignWorkspaceTab(
        new URLSearchParams('serviceId=s1&campaignId=c1')
      )
    ).toBe(CAMPAIGN_WORKSPACE_DEFAULT_TAB);
  });

  it('resolve aliases de ficha → ideia e tarefas → tasks', () => {
    expect(
      resolveCampaignWorkspaceTab(
        new URLSearchParams('campaignId=c1&section=ficha')
      )
    ).toBe('ideia');
    expect(
      resolveCampaignWorkspaceTab(
        new URLSearchParams('campaignId=c1&tab=tarefas')
      )
    ).toBe('tasks');
    expect(
      resolveCampaignWorkspaceTab(
        new URLSearchParams('campaignId=c1&section=contexto')
      )
    ).toBe('contexto');
  });

  it('desconhecido cai no default', () => {
    expect(
      resolveCampaignWorkspaceTab(
        new URLSearchParams('campaignId=c1&section=foobar')
      )
    ).toBe('tasks');
  });
});

describe('buildCampaignWorkspacePath', () => {
  it('monta URL canônica com campaignId=briefingId e section', () => {
    expect(
      buildCampaignWorkspacePath({
        serviceId: 's1',
        clientId: 'cli',
        campaignId: 'br1',
        tab: 'tasks',
      })
    ).toBe(
      '/delivery-workspace?serviceId=s1&clientId=cli&campaignId=br1&briefingId=br1&section=tasks'
    );
  });

  it('landing D1 e R2 ideia', () => {
    const base = { serviceId: 's1', clientId: 'cli', briefingId: 'br1' };
    expect(buildCampaignWorkspaceTasksPath(base)).toContain('section=tasks');
    expect(buildCampaignWorkspaceIdeiaPath(base)).toContain('section=ideia');
  });

  it('sem serviceId ou campaignId → /clients', () => {
    expect(buildCampaignWorkspacePath({ serviceId: 's1' })).toBe('/clients');
    expect(buildCampaignWorkspacePath({ campaignId: 'c1' })).toBe('/clients');
  });
});

describe('resolveLegacyCampaignRedirect', () => {
  it('client-campaign → ideia (R2)', () => {
    const r = resolveLegacyCampaignRedirect({
      pageName: 'client-campaign',
      params: new URLSearchParams(
        'clientId=cli&campaignId=br1&serviceId=s1'
      ),
    });
    expect(r.path).toContain('/delivery-workspace');
    expect(r.tab).toBe('ideia');
    expect(r.path).toContain('section=ideia');
  });

  it('client-tasks com briefingId → tasks', () => {
    const r = resolveLegacyCampaignRedirect({
      pageName: 'client-tasks',
      params: new URLSearchParams('clientId=cli&briefingId=br1&serviceId=s1'),
    });
    expect(r.tab).toBe('tasks');
  });

  it('client-tasks sem briefingId → null (inbox T2)', () => {
    expect(
      resolveLegacyCampaignRedirect({
        pageName: 'client-tasks',
        params: new URLSearchParams('clientId=cli'),
      })
    ).toBe(null);
  });

  it('sem serviceId sinaliza needsServiceId', () => {
    const r = resolveLegacyCampaignRedirect({
      pageName: 'client-campaign',
      params: new URLSearchParams('clientId=cli&campaignId=br1'),
    });
    expect(r).toEqual({
      needsServiceId: true,
      tab: 'ideia',
      campaignId: 'br1',
      clientId: 'cli',
    });
  });
});

describe('buildPlanningCreateCampaignPath', () => {
  it('aponta para Planejamento & briefs (A2)', () => {
    expect(buildPlanningCreateCampaignPath('cli', { serviceId: 's1' })).toBe(
      '/client-briefing?clientId=cli&serviceId=s1'
    );
  });
});

describe('buildClientCampaignHref (Fase 4–5)', () => {
  it('com serviceId aponta para Workspace', () => {
    expect(
      buildClientCampaignHref({
        clientId: 'cli',
        briefingId: 'br1',
        serviceId: 's1',
        tab: 'tasks',
      })
    ).toContain('delivery-workspace');
    expect(
      buildClientCampaignHref({
        clientId: 'cli',
        briefingId: 'br1',
        serviceId: 's1',
      })
    ).toContain('section=tasks');
  });

  it('sem serviceId mantém client-campaign (redirect page)', () => {
    expect(
      buildClientCampaignHref({ clientId: 'cli', briefingId: 'br1' })
    ).toMatch(/^client-campaign\?/);
  });
});
