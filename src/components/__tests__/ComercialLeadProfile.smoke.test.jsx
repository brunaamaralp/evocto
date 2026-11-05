import { describe, it, expect, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let container;
function render(ui) { container = document.createElement('div'); document.body.appendChild(container); act(() => { createRoot(container).render(ui); }); }
const text = () => document.body.textContent;
const screen = {
  getByText: (t) => { const ok = typeof t === 'string' ? text().includes(t) : t.test(text()); if (!ok) throw new Error('missing ' + t); return true; },
  getAllByText: (t) => { const m = text().match(new RegExp(typeof t === 'string' ? t : t.source, 'g')); return m || []; },
  getAllByRole: (r) => Array.from(document.body.querySelectorAll(`[role="${r}"]`)),
};
const fireEvent = {
  mouseDown: (el) => act(() => { el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 })); }),
  click: (el) => act(() => { el.click(); }),
};
async function waitFor(fn) { for (let i = 0; i < 50; i++) { try { await act(async () => { await new Promise((r) => setTimeout(r, 20)); }); return fn(); } catch (e) { if (i === 49) throw e; } } }
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/agencyLeads/leadCrmApi', async (orig) => {
  const real = await orig();
  return {
    ...real,
    listLeadActivities: vi.fn(async () => [
      { id: 'a1', kind: 'interaction', channel: 'whatsapp', description: 'Conversamos', nextStep: 'Enviar proposta', occurredAt: new Date().toISOString(), createdBy: 'u1' },
      { id: 'n1', kind: 'note', body: 'Nota interna', createdBy: 'u1', authorName: 'Bruna', occurredAt: new Date().toISOString() },
      { id: 'f1', kind: 'attachment', fileName: 'proposta.pdf', mimeType: 'application/pdf', fileSize: 2048, category: 'proposta', createdBy: 'u2' },
    ]),
    listLeadTasks: vi.fn(async () => [
      { id: 't1', leadId: 'l1', title: 'Ligar', status: 'todo', dueDate: new Date(Date.now() - 3600000).toISOString(), leadTaskType: 'follow_up', assigneeId: 'u1' },
    ]),
    attachmentViewUrl: () => 'https://x/view',
    attachmentDownloadUrl: () => 'https://x/download',
  };
});

import LeadDetailSheet from '../comercial/LeadDetailSheet';
import LeadCard from '../comercial/LeadCard';

const lead = { id: 'l1', name: 'Ana Souza', companyName: 'Padaria Sol', phone: '11988887777', email: 'ana@sol.com', status: 'proposta', estimatedValue: 5000, probability: 40, source: 'instagram', ownerId: 'u1', created_date: new Date().toISOString() };
const members = [{ id: 'u1', full_name: 'Bruna Amaral' }];

describe('comercial smoke', () => {
  it('renders card', () => {
    render(<MemoryRouter><LeadCard lead={lead} followUp={{ state: 'overdue', tone: 'danger', label: 'Follow-up atrasado', nextTask: { title: 'Ligar', dueDate: new Date().toISOString() } }} members={members} onOpen={() => {}} onMoveStage={() => {}} onGenerateProposal={() => {}} onConvert={() => {}} canGenerate canConvert /></MemoryRouter>);
    expect(screen.getByText('Padaria Sol')).toBeTruthy();
    expect(screen.getByText(/Ligar/)).toBeTruthy();
  });

  it('renders sheet and all tabs', async () => {
    render(
      <MemoryRouter>
        <LeadDetailSheet lead={lead} open onOpenChange={() => {}} members={members} agencyId="ag" user={{ id: 'u1' }} isAdmin={false} onSaveLead={async () => {}} onTasksChanged={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getAllByText('Padaria Sol').length).toBeGreaterThan(0);
    expect(screen.getByText('Follow-up atrasado')).toBeTruthy();
    const tabs = ['Histórico', 'Atividades', 'Negócio', 'Notas', 'Arquivos', 'Visão geral'];
    for (const t of tabs) {
      const trigger = screen.getAllByRole('tab').find((el) => el.textContent.startsWith(t));
      fireEvent.mouseDown(trigger);
      fireEvent.click(trigger);
    }
    await waitFor(() => expect(screen.getByText('Contato')).toBeTruthy());
    const hist = screen.getAllByRole('tab').find((el) => el.textContent.startsWith('Histórico'));
    fireEvent.mouseDown(hist);
    await waitFor(() => expect(screen.getByText('Conversamos')).toBeTruthy());
    const files = screen.getAllByRole('tab').find((el) => el.textContent.startsWith('Arquivos'));
    fireEvent.mouseDown(files);
    await waitFor(() => expect(screen.getByText('proposta.pdf')).toBeTruthy());
    const deal = screen.getAllByRole('tab').find((el) => el.textContent.startsWith('Negócio'));
    fireEvent.mouseDown(deal);
    await waitFor(() => expect(screen.getByText('Valor ponderado')).toBeTruthy());
    expect(screen.getAllByText(/2\.000/).length).toBeGreaterThan(0);
  });
});
