import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import BoardColumnsEditor from '../BoardColumnsEditor.jsx';
import { DEFAULT_BOARD_COLUMNS } from '@/lib/boardColumns';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function makeBoard(overrides = {}) {
  return {
    columns: DEFAULT_BOARD_COLUMNS.map((c) => ({ ...c })),
    agencyColumns: DEFAULT_BOARD_COLUMNS.map((c) => ({ ...c })),
    source: 'default',
    canUseClientScope: false,
    saveColumns: vi.fn().mockResolvedValue([]),
    resetClientColumns: vi.fn().mockResolvedValue(),
    ...overrides,
  };
}

let container;
let root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.body.innerHTML = '';
});

function render(ui) {
  act(() => root.render(ui));
}

const byText = (text) =>
  [...document.querySelectorAll('button')].find((b) => b.textContent.includes(text));

describe('BoardColumnsEditor', () => {
  it('adiciona, renomeia e salva no padrão da agência', async () => {
    const board = makeBoard();
    const onOpenChange = vi.fn();
    render(<BoardColumnsEditor open onOpenChange={onOpenChange} board={board} />);

    expect(document.querySelectorAll('input[aria-label="Nome da coluna"]')).toHaveLength(6);

    act(() => byText('Adicionar coluna').click());
    const inputs = document.querySelectorAll('input[aria-label="Nome da coluna"]');
    expect(inputs).toHaveLength(7);

    await act(async () => byText('Salvar colunas').click());
    expect(board.saveColumns).toHaveBeenCalledTimes(1);
    const [saved, scope] = board.saveColumns.mock.calls[0];
    expect(scope).toBe('agency');
    expect(saved).toHaveLength(7);
    expect(saved[6].name).toBe('Nova coluna');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('remove e reordena colunas', async () => {
    const board = makeBoard();
    render(<BoardColumnsEditor open onOpenChange={() => {}} board={board} />);

    act(() => document.querySelector('button[aria-label=\'Remover "Fila"\']').click());
    act(() =>
      document.querySelector('button[aria-label=\'Mover "Concluído" para a esquerda\']').click()
    );
    await act(async () => byText('Salvar colunas').click());
    const [saved] = board.saveColumns.mock.calls[0];
    expect(saved.map((c) => c.id)).toEqual(['todo', 'in_progress', 'in_review', 'completed', 'blocked']);
  });

  it('no quadro do cliente salva como colunas próprias quando escolhido', async () => {
    const board = makeBoard({ canUseClientScope: true });
    render(<BoardColumnsEditor open onOpenChange={() => {}} board={board} clientName="Acme" />);

    act(() => byText('Só Acme').click());
    await act(async () => byText('Salvar colunas').click());
    expect(board.saveColumns.mock.calls[0][1]).toBe('client');
  });

  it('voltar ao padrão da agência limpa as colunas do cliente', async () => {
    const board = makeBoard({ canUseClientScope: true, source: 'client' });
    render(<BoardColumnsEditor open onOpenChange={() => {}} board={board} clientName="Acme" />);

    act(() => byText('Padrão da agência').click());
    await act(async () => byText('Salvar colunas').click());
    expect(board.resetClientColumns).toHaveBeenCalledTimes(1);
    expect(board.saveColumns.mock.calls[0][1]).toBe('agency');
  });
});
