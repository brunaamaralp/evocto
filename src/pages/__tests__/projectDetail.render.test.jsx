import { describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/components/auth/SessionManager', () => ({
  useSession: () => ({ agencyId: 'a1', loading: false }),
}));
vi.mock('@/components/tasks/TaskCreateModal', () => ({ default: () => null }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/projects/projectsApi', () => ({
  updateProject: vi.fn(),
  loadProjectBundle: vi.fn(async () => ({
    project: { id: 'p1', name: 'Social Media', status: 'ativo', clientId: 'c1' },
    client: { id: 'c1', name: 'Alpha' },
    tasks: [
      { id: 't1', title: 'Calendário editorial', status: 'todo' },
      { id: 't1a', title: 'Levantar datas', status: 'done', parentTaskId: 't1' },
      { id: 't1b', title: 'Rascunhar pautas', status: 'todo', parentTaskId: 't1' },
      { id: 't2', title: 'Relatório', status: 'done' },
    ],
    services: [{ id: 's1', name: 'Social Media' }],
    cycles: [],
    briefs: [{ id: 'b1', title: 'Campanha de verão', status: 'READY' }],
  })),
}));

const { default: ProjectDetailPage } = await import('../project-detail.jsx');

describe('ProjectDetailPage', () => {
  it('renders project, task tree with subtasks and linked records', async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const el = document.createElement('div');
    document.body.appendChild(el);
    const root = createRoot(el);
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/project-detail?projectId=p1']}>
          <ProjectDetailPage />
        </MemoryRouter>
      );
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    const text = el.textContent;
    expect(text).toContain('Social Media');
    expect(text).toContain('Alpha');
    expect(text).toContain('2/4 tarefas concluídas');
    expect(text).toContain('Calendário editorial');
    expect(text).toContain('1/2 subtarefas');
    expect(text).toContain('Levantar datas');
    expect(text).not.toContain('Relatório'); // concluída sem mãe fica oculta por padrão
    expect(text).toContain('Campanha de verão');

    act(() => root.unmount());
    el.remove();
  });
});
