import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = {
  Task: new Map(),
  CyclePlan: new Map(),
  Brief: new Map(),
  Service: new Map(),
  Project: new Map(),
};
let seq = 0;

function entity(name) {
  return {
    get: vi.fn(async (id) => {
      if (!store[name].has(id)) throw new Error('not found');
      return store[name].get(id);
    }),
    filter: vi.fn(async (filters) =>
      [...store[name].values()].filter((row) =>
        Object.entries(filters).every(([k, v]) => row[k] === v)
      )
    ),
    create: vi.fn(async (data) => {
      const row = { id: `${name.toLowerCase()}-${++seq}`, ...data };
      store[name].set(row.id, row);
      return row;
    }),
    update: vi.fn(async (id, data) => {
      const row = { ...store[name].get(id), ...data };
      store[name].set(id, row);
      return row;
    }),
  };
}

const entities = {
  Task: entity('Task'),
  CyclePlan: entity('CyclePlan'),
  Brief: entity('Brief'),
  Service: entity('Service'),
  Project: entity('Project'),
};

vi.mock('@/api/entities', () => entities);

const { projectWriteHooks, clearProjectAssignmentCache } = await import(
  '../projects/projectAssignment.js'
);

beforeEach(() => {
  for (const m of Object.values(store)) m.clear();
  clearProjectAssignmentCache();
  seq = 0;
});

describe('projectWriteHooks.beforeCreate', () => {
  it('task inherits project from parent task', async () => {
    store.Task.set('t1', { id: 't1', projectId: 'pA' });
    const { payload } = await projectWriteHooks.beforeCreate('tasks', {
      agencyId: 'a1',
      clientId: 'c1',
      parentTaskId: 't1',
    });
    expect(payload.projectId).toBe('pA');
  });

  it('task inherits from service, else falls back to client default project (created once)', async () => {
    store.Service.set('s1', { id: 's1', projectId: 'pS' });
    const viaService = await projectWriteHooks.beforeCreate('tasks', {
      agencyId: 'a1',
      clientId: 'c1',
      serviceId: 's1',
    });
    expect(viaService.payload.projectId).toBe('pS');

    const [a, b] = await Promise.all([
      projectWriteHooks.beforeCreate('tasks', { agencyId: 'a1', clientId: 'c2' }),
      projectWriteHooks.beforeCreate('tasks', { agencyId: 'a1', clientId: 'c2' }),
    ]);
    expect(a.payload.projectId).toBe(b.payload.projectId);
    const defaults = [...store.Project.values()].filter((p) => p.isDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0]).toMatchObject({ name: 'Geral', clientId: 'c2' });
  });

  it('brief with legacy projectId (= clientId) gets a real project', async () => {
    const { payload } = await projectWriteHooks.beforeCreate('briefs', {
      agencyId: 'a1',
      clientId: 'c1',
      projectId: 'c1',
    });
    expect(payload.projectId).not.toBe('c1');
    expect(store.Project.get(payload.projectId)).toMatchObject({ clientId: 'c1' });
  });

  it('new contracted service creates its own project and links it after create', async () => {
    const hooked = await projectWriteHooks.beforeCreate('services', {
      agencyId: 'a1',
      clientId: 'c1',
      name: 'Tráfego pago',
    });
    const project = store.Project.get(hooked.payload.projectId);
    expect(project).toMatchObject({ name: 'Tráfego pago', kind: 'service' });
    await hooked.after({ id: 'svc-9' });
    expect(store.Project.get(project.id).serviceId).toBe('svc-9');
  });

  it('template services are left alone', async () => {
    const hooked = await projectWriteHooks.beforeCreate('services', {
      is_template: true,
      name: 'Tpl',
    });
    expect(hooked.payload.projectId).toBeUndefined();
    expect(store.Project.size).toBe(0);
  });
});

describe('projectWriteHooks.beforeUpdate', () => {
  it('keeps existing real project when a legacy writer sends projectId = clientId', async () => {
    const merged = await projectWriteHooks.beforeUpdate(
      'briefs',
      { id: 'b1', clientId: 'c1', projectId: 'c1' },
      { id: 'b1', clientId: 'c1', projectId: 'pReal' }
    );
    expect(merged.projectId).toBe('pReal');
  });
});
