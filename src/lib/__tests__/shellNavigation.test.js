import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  buildMyTasksHref,
  buildQuickCreateTaskHref,
  buildQuickCreateClientHref,
  buildShellClientBreadcrumbs,
  getShellPageLabel,
  getMobileBottomNavItems,
  readSidebarCollapsed,
  writeSidebarCollapsed,
} from '../shellNavigation';

describe('shellNavigation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('labels known pages', () => {
    expect(getShellPageLabel('client-tasks')).toBe('Tarefas');
    expect(getShellPageLabel('planejamento')).toBe('Panorama');
    expect(getShellPageLabel('unknown-page')).toBeNull();
  });

  it('builds my tasks and create hrefs', () => {
    expect(buildMyTasksHref()).toContain('tasks-manager');
    expect(buildMyTasksHref()).toContain('preset=my_tasks');
    expect(buildQuickCreateClientHref()).toContain('clients?create=1');
    expect(buildQuickCreateTaskHref()).toContain('tasks-manager?create=1');
    expect(buildQuickCreateTaskHref({ clientId: 'c1' })).toContain('client-tasks');
    expect(buildQuickCreateTaskHref({ clientId: 'c1' })).toContain('create=1');
  });

  it('builds client breadcrumbs with page or campaign', () => {
    const pageTrail = buildShellClientBreadcrumbs({
      clientId: 'c1',
      clientName: 'Acme',
      pageKey: 'client-tasks',
    });
    expect(pageTrail.map((c) => c.label)).toEqual(['Clientes', 'Acme', 'Tarefas']);

    const campaignTrail = buildShellClientBreadcrumbs({
      clientId: 'c1',
      clientName: 'Acme',
      campaignName: 'Lançamento',
      campaignHref: '/client-campaign?clientId=c1',
      pageKey: 'delivery-workspace',
    });
    expect(campaignTrail.map((c) => c.label)).toEqual([
      'Clientes',
      'Acme',
      'Lançamento',
    ]);
  });

  it('persists sidebar collapsed flag', () => {
    expect(readSidebarCollapsed()).toBe(false);
    writeSidebarCollapsed(true);
    expect(readSidebarCollapsed()).toBe(true);
    writeSidebarCollapsed(false);
    expect(readSidebarCollapsed()).toBe(false);
  });

  it('builds agency and client mobile bottom nav', () => {
    const agency = getMobileBottomNavItems({
      mode: 'global',
      currentPage: 'dashboard',
    });
    expect(agency.map((i) => i.id)).toEqual([
      'home',
      'clients',
      'my-tasks',
      'approvals',
      'more',
    ]);
    expect(agency.find((i) => i.id === 'home').isActive).toBe(true);
    expect(agency.find((i) => i.id === 'more').action).toBe('more');

    const onTasksBoard = getMobileBottomNavItems({
      mode: 'global',
      currentPage: 'tasks-manager',
    });
    expect(onTasksBoard.find((i) => i.id === 'my-tasks').isActive).toBe(true);

    const client = getMobileBottomNavItems({
      mode: 'client',
      clientId: 'c1',
      currentPage: 'client-tasks',
    });
    expect(client.map((i) => i.id)).toEqual(['hub', 'tasks', 'plan', 'more']);
    expect(client.find((i) => i.id === 'tasks').isActive).toBe(true);
    expect(client.find((i) => i.id === 'tasks').href).toContain('clientId=c1');
  });
});
