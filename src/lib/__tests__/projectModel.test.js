import { describe, expect, it } from 'vitest';
import {
  buildTaskTree,
  isLegacyClientProjectId,
  planProjectMigration,
  projectStatusFromService,
} from '../projects/projectModel.js';

function ids() {
  let n = 0;
  return () => `p${++n}`;
}

const clients = [
  { id: 'c1', name: 'Alpha' },
  { id: 'c2', name: 'Beta' },
];

describe('planProjectMigration', () => {
  it('creates one project per contracted service and links cycles, briefs and tasks', () => {
    const plan = planProjectMigration({
      agencyId: 'a1',
      clients,
      services: [
        { id: 's1', clientId: 'c1', name: 'Social Media' },
        { id: 'tpl', clientId: null, name: 'Template', is_template: true },
      ],
      cycles: [{ id: 'cy1', clientId: 'c1', serviceId: 's1' }],
      briefs: [{ id: 'b1', clientId: 'c1', projectId: 'c1', cycleId: 'cy1' }],
      tasks: [
        { id: 't1', clientId: 'c1', cyclePlanId: 'cy1' },
        { id: 't2', clientId: 'c1', briefId: 'b1' },
        { id: 't3', clientId: 'c1', serviceId: 's1' },
        { id: 't1a', clientId: 'c1', parentTaskId: 't1' },
      ],
      idFactory: ids(),
    });

    expect(plan.createProjects).toHaveLength(1);
    expect(plan.createProjects[0]).toMatchObject({
      id: 'p1',
      name: 'Social Media',
      kind: 'service',
      serviceId: 's1',
      clientId: 'c1',
      agencyId: 'a1',
    });
    expect(plan.updates.services).toEqual([{ id: 's1', projectId: 'p1' }]);
    expect(plan.updates.cycle_plans).toEqual([{ id: 'cy1', projectId: 'p1' }]);
    expect(plan.updates.briefs).toEqual([{ id: 'b1', clientId: 'c1', projectId: 'p1' }]);
    expect(plan.updates.tasks.map((t) => [t.id, t.projectId])).toEqual([
      ['t1', 'p1'],
      ['t2', 'p1'],
      ['t3', 'p1'],
      ['t1a', 'p1'],
    ]);
  });

  it('creates "Geral" per client and "Interno" only when needed', () => {
    const plan = planProjectMigration({
      agencyId: 'a1',
      clients,
      tasks: [
        { id: 't1', clientId: 'c2' },
        { id: 't2', clientId: null },
      ],
      idFactory: ids(),
    });
    expect(plan.createProjects.map((p) => [p.name, p.clientId, p.kind])).toEqual([
      ['Geral', 'c2', 'general'],
      ['Interno da agência', null, 'internal'],
    ]);
    expect(plan.updates.tasks).toEqual([
      { id: 't1', projectId: 'p1' },
      { id: 't2', projectId: 'p2' },
    ]);
  });

  it('recovers clientId from legacy brief.projectId', () => {
    const plan = planProjectMigration({
      agencyId: 'a1',
      clients,
      briefs: [{ id: 'b1', clientId: null, projectId: 'c2' }],
      idFactory: ids(),
    });
    expect(plan.updates.briefs).toEqual([{ id: 'b1', clientId: 'c2', projectId: 'p1' }]);
  });

  it('is idempotent with existing projects', () => {
    const projects = [
      { id: 'px', clientId: 'c1', serviceId: 's1', kind: 'service' },
      { id: 'pg', clientId: 'c1', isDefault: true, kind: 'general' },
    ];
    const plan = planProjectMigration({
      agencyId: 'a1',
      clients,
      projects,
      services: [{ id: 's1', clientId: 'c1', projectId: 'px' }],
      tasks: [
        { id: 't1', clientId: 'c1', serviceId: 's1', projectId: 'px' },
        { id: 't2', clientId: 'c1', projectId: 'pg' },
      ],
      idFactory: ids(),
    });
    expect(plan.createProjects).toHaveLength(0);
    expect(plan.stats).toMatchObject({ services: 0, tasks: 0 });
  });

  it('replaces unknown projectId values', () => {
    const plan = planProjectMigration({
      agencyId: 'a1',
      clients,
      tasks: [{ id: 't1', clientId: 'c1', projectId: 'ghost' }],
      idFactory: ids(),
    });
    expect(plan.updates.tasks).toEqual([{ id: 't1', projectId: 'p1' }]);
  });
});

describe('helpers', () => {
  it('detects legacy projectId', () => {
    expect(isLegacyClientProjectId({ clientId: 'c1', projectId: 'c1' })).toBe(true);
    expect(isLegacyClientProjectId({ clientId: 'c1', projectId: 'p1' })).toBe(false);
  });

  it('maps service status', () => {
    expect(projectStatusFromService({ status: 'active' })).toBe('ativo');
    expect(projectStatusFromService({ is_active: false })).toBe('pausado');
    expect(projectStatusFromService({ status: 'concluido' })).toBe('concluido');
  });

  it('builds task tree', () => {
    const tree = buildTaskTree([
      { id: 'a' },
      { id: 'b', parentTaskId: 'a' },
      { id: 'c', parentTaskId: 'missing' },
    ]);
    expect(tree.map((n) => n.id)).toEqual(['a', 'c']);
    expect(tree[0].subtasks.map((n) => n.id)).toEqual(['b']);
  });
});
