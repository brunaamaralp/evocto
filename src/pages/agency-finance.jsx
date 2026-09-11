/**
 * Financeiro Agência — UI enxuta (opção B).
 * Abas: Visão geral · Cobranças · A pagar · Caixa · DRE
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { Client } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  RefreshCw,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Pencil,
} from 'lucide-react';
import {
  CHARGE_TYPES,
  CHARGE_TYPE_LABELS,
  CHARGE_STATUSES,
  PAYABLE_STATUSES,
  PAYABLE_CATEGORIES,
  CASH_CATEGORIES_IN,
  CASH_CATEGORIES_OUT,
  PAYMENT_METHODS,
  RECURRING_STATUSES,
  ymNow,
  todayYmd,
  formatBRL,
  formatMonthTitle,
  shiftMonth,
  buildPayableInstallments,
  MAX_PAYABLE_INSTALLMENTS,
} from '@/lib/agencyFinance/constants';
import * as api from '@/lib/agencyFinance/api';
import './agency-finance.css';

const TABS = [
  { id: 'overview', label: 'Visão geral' },
  { id: 'recurring', label: 'Recorrentes' },
  { id: 'charges', label: 'Cobranças' },
  { id: 'payables', label: 'A pagar' },
  { id: 'cash', label: 'Caixa' },
  { id: 'dre', label: 'DRE' },
];

function payableInstallmentLabel(p) {
  const n = Number(p?.installmentNumber) || 0;
  const total = Number(p?.installmentTotal) || 0;
  if (n > 0 && total > 1) return `${n}/${total}`;
  return '';
}

function StatusBadge({ status, map }) {
  const label = map[status] || status;
  const tone =
    status === 'paid' || status === 'active'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : status === 'cancelled' || status === 'ended'
        ? 'bg-slate-50 text-slate-500 border-slate-200'
        : 'bg-amber-50 text-amber-700 border-amber-200';
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${tone}`}>
      {label}
    </span>
  );
}

function Kpi({ label, value, hint, tone }) {
  const color =
    tone === 'pos'
      ? 'text-emerald-700'
      : tone === 'neg'
        ? 'text-rose-700'
        : 'text-slate-900';
  return (
    <div className="af-kpi">
      <div className="af-kpi__label">{label}</div>
      <div className={`af-kpi__value ${color}`}>{value}</div>
      {hint ? <div className="af-kpi__hint">{hint}</div> : null}
    </div>
  );
}

export default function AgencyFinancePage() {
  const session = useSession();
  const agencyId = session?.agencyId || session?.agency?.id || null;

  const [tab, setTab] = useState('overview');
  const [month, setMonth] = useState(() => ymNow());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [overview, setOverview] = useState(null);
  const [charges, setCharges] = useState([]);
  const [payables, setPayables] = useState([]);
  const [cash, setCash] = useState([]);
  const [dre, setDre] = useState(null);
  const [clients, setClients] = useState([]);
  const [recurring, setRecurring] = useState([]);

  const [chargeOpen, setChargeOpen] = useState(false);
  const [payableOpen, setPayableOpen] = useState(false);
  const [editingPayableId, setEditingPayableId] = useState('');
  const [cashOpen, setCashOpen] = useState(false);
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [editingRecurringId, setEditingRecurringId] = useState('');
  const [busyId, setBusyId] = useState('');

  const emptyPayableForm = () => ({
    vendorName: '',
    category: 'freela',
    description: '',
    amount: '',
    dueDate: todayYmd(),
    installments: '1',
  });

  const emptyRecurringForm = () => ({
    clientId: '',
    description: '',
    amount: '',
    dueDay: '10',
    startMonth: ymNow(),
    endMonth: '',
  });

  const [chargeForm, setChargeForm] = useState({
    clientId: '',
    type: 'one_off',
    description: '',
    amount: '',
    dueDate: todayYmd(),
  });
  const [payableForm, setPayableForm] = useState(emptyPayableForm);
  const [recurringForm, setRecurringForm] = useState(emptyRecurringForm);
  const [cashForm, setCashForm] = useState({
    direction: 'in',
    category: 'servicos',
    description: '',
    amount: '',
    date: todayYmd(),
    method: 'pix',
  });

  const load = useCallback(
    async (opts = {}) => {
      if (!agencyId) {
        setLoading(false);
        return;
      }
      if (opts.soft) setRefreshing(true);
      else setLoading(true);
      try {
        // Gera cobranças do mês a partir dos contratos recorrentes (idempotente)
        try {
          await api.materializeRecurringCharges({ agencyId, month });
        } catch (matErr) {
          console.warn('[agency-finance] materialize', matErr);
        }

        const [ov, ch, py, cx, dr, cls, rec] = await Promise.all([
          api.getOverview({ agencyId, month }),
          api.listCharges({ agencyId, month }),
          api.listPayables({ agencyId, month }),
          api.listCash({ agencyId, month }),
          api.getDre({ agencyId, month }),
          Client.filter({ agencyId }, '-updated_date', 200).catch(() => []),
          api.listRecurring({ agencyId }).catch(() => []),
        ]);
        setOverview(ov);
        setCharges(ch);
        setPayables(py);
        setCash(cx);
        setDre(dr);
        setClients(Array.isArray(cls) ? cls : []);
        setRecurring(Array.isArray(rec) ? rec : []);
      } catch (err) {
        console.error(err);
        toast.error(err?.message || 'Falha ao carregar financeiro');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [agencyId, month]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const clientName = useMemo(() => {
    const map = {};
    for (const c of clients) map[c.id] = c.name || c.company_name || 'Cliente';
    return map;
  }, [clients]);

  async function submitCharge() {
    try {
      const client = clients.find((c) => c.id === chargeForm.clientId);
      await api.createCharge({
        agencyId,
        payload: {
          ...chargeForm,
          clientName: client?.name || client?.company_name || '',
          amount: Number(String(chargeForm.amount).replace(',', '.')),
          competenceMonth: month,
        },
      });
      toast.success('Cobrança criada');
      setChargeOpen(false);
      setChargeForm({
        clientId: '',
        type: 'one_off',
        description: '',
        amount: '',
        dueDate: todayYmd(),
      });
      await load({ soft: true });
    } catch (err) {
      toast.error(err?.message || 'Erro ao criar cobrança');
    }
  }

  function openNewRecurring() {
    setEditingRecurringId('');
    setRecurringForm(emptyRecurringForm());
    setRecurringOpen(true);
  }

  function openEditRecurring(r) {
    setEditingRecurringId(r.id);
    setRecurringForm({
      clientId: r.clientId || '',
      description: r.description || '',
      amount: String(r.amount ?? ''),
      dueDay: String(r.dueDay || 10),
      startMonth: r.startMonth || ymNow(),
      endMonth: r.endMonth || '',
    });
    setRecurringOpen(true);
  }

  async function submitRecurring() {
    try {
      const client = clients.find((c) => c.id === recurringForm.clientId);
      const payload = {
        clientId: recurringForm.clientId,
        clientName: client?.name || client?.company_name || '',
        description: recurringForm.description,
        amount: Number(String(recurringForm.amount).replace(',', '.')),
        dueDay: Number(recurringForm.dueDay) || 10,
        startMonth: recurringForm.startMonth || ymNow(),
        endMonth: recurringForm.endMonth || '',
      };
      if (editingRecurringId) {
        await api.updateRecurring({ agencyId, id: editingRecurringId, payload });
        toast.success('Recorrência atualizada');
      } else {
        await api.createRecurring({ agencyId, payload });
        toast.success('Recorrência criada — cobranças serão geradas nos meses');
      }
      setRecurringOpen(false);
      setEditingRecurringId('');
      setRecurringForm(emptyRecurringForm());
      await load({ soft: true });
    } catch (err) {
      toast.error(err?.message || 'Erro ao salvar recorrência');
    }
  }

  async function toggleRecurringStatus(r, status) {
    setBusyId(r.id);
    try {
      await api.setRecurringStatus({ agencyId, id: r.id, status });
      toast.success(status === 'active' ? 'Recorrência reativada' : status === 'paused' ? 'Recorrência pausada' : 'Recorrência encerrada');
      await load({ soft: true });
    } catch (err) {
      toast.error(err?.message || 'Erro ao atualizar status');
    } finally {
      setBusyId('');
    }
  }

  async function submitPayable() {
    try {
      const amount = Number(String(payableForm.amount).replace(',', '.'));
      if (!amount || amount <= 0) {
        toast.error('Informe um valor válido');
        return;
      }

      if (editingPayableId) {
        await api.updatePayable({
          agencyId,
          id: editingPayableId,
          payload: {
            vendorName: payableForm.vendorName,
            category: payableForm.category,
            description: payableForm.description,
            amount,
            dueDate: payableForm.dueDate || todayYmd(),
          },
        });
        toast.success('Conta atualizada');
      } else {
        const installments = Math.min(
          MAX_PAYABLE_INSTALLMENTS,
          Math.max(1, Math.trunc(Number(payableForm.installments) || 1))
        );
        await api.createPayable({
          agencyId,
          payload: {
            vendorName: payableForm.vendorName,
            category: payableForm.category,
            description: payableForm.description,
            amount,
            dueDate: payableForm.dueDate || todayYmd(),
            installments,
          },
        });
        toast.success(
          installments > 1
            ? `${installments} parcelas criadas — aparecem nos meses respectivos`
            : 'Conta a pagar criada'
        );
      }

      setPayableOpen(false);
      setEditingPayableId('');
      setPayableForm(emptyPayableForm());
      await load({ soft: true });
    } catch (err) {
      const msg = err?.message || '';
      if (msg === 'conta_paga') toast.error('Conta já paga não pode ser editada');
      else if (msg === 'conta_cancelada') toast.error('Conta cancelada não pode ser editada');
      else toast.error(msg || 'Erro ao salvar conta');
    }
  }

  function openNewPayable() {
    setEditingPayableId('');
    setPayableForm(emptyPayableForm());
    setPayableOpen(true);
  }

  function openEditPayable(p) {
    if (p.status !== 'open') {
      toast.error('Só é possível editar contas em aberto');
      return;
    }
    setEditingPayableId(p.id);
    setPayableForm({
      vendorName: p.vendorName || '',
      category: p.category || 'outro',
      description: p.description || '',
      amount: String(p.amount ?? ''),
      dueDate: p.dueDate || todayYmd(),
      installments: '1',
    });
    setPayableOpen(true);
  }

  async function cancelPayable(id) {
    setBusyId(id);
    try {
      await api.cancelPayable({ agencyId, id });
      toast.success('Conta cancelada');
      if (editingPayableId === id) {
        setPayableOpen(false);
        setEditingPayableId('');
        setPayableForm(emptyPayableForm());
      }
      await load({ soft: true });
    } catch (err) {
      const msg = err?.message || '';
      if (msg === 'conta_paga') toast.error('Conta já paga não pode ser cancelada');
      else toast.error(msg || 'Erro ao cancelar');
    } finally {
      setBusyId('');
    }
  }

  async function submitCash() {
    try {
      await api.createCash({
        agencyId,
        payload: {
          ...cashForm,
          amount: Number(String(cashForm.amount).replace(',', '.')),
          competenceMonth: month,
        },
      });
      toast.success('Lançamento registrado');
      setCashOpen(false);
      setCashForm({
        direction: 'in',
        category: 'servicos',
        description: '',
        amount: '',
        date: todayYmd(),
        method: 'pix',
      });
      await load({ soft: true });
    } catch (err) {
      toast.error(err?.message || 'Erro ao lançar');
    }
  }

  async function payCharge(id) {
    setBusyId(id);
    try {
      await api.markChargePaid({ agencyId, id });
      toast.success('Cobrança marcada como paga');
      await load({ soft: true });
    } catch (err) {
      toast.error(err?.message || 'Erro ao baixar cobrança');
    } finally {
      setBusyId('');
    }
  }

  async function payPayable(id) {
    setBusyId(id);
    try {
      await api.markPayablePaid({ agencyId, id });
      toast.success('Conta paga e lançada no caixa');
      await load({ soft: true });
    } catch (err) {
      toast.error(err?.message || 'Erro ao pagar');
    } finally {
      setBusyId('');
    }
  }

  if (!agencyId) {
    return (
      <div className="af-page">
        <h1 className="af-title">Financeiro</h1>
        <p className="af-muted">Selecione ou entre em uma agência para usar o financeiro.</p>
      </div>
    );
  }

  return (
    <div className={`af-page ${refreshing ? 'af-page--refreshing' : ''}`}>
      <header className="af-header">
        <div>
          <h1 className="af-title">Financeiro</h1>
          <p className="af-muted">Cobranças, contas a pagar e caixa da agência.</p>
        </div>
        <div className="af-header__actions">
          <div className="af-month">
            <button type="button" className="af-icon-btn" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mês anterior">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span>{formatMonthTitle(month)}</span>
            <button type="button" className="af-icon-btn" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Próximo mês">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={() => load({ soft: true })} disabled={refreshing}>
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Atualizar
          </Button>
        </div>
      </header>

      <div className="af-tabs" role="tablist" aria-label="Financeiro">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`af-tab ${tab === t.id ? 'af-tab--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="af-loading">
          <Loader2 className="h-5 w-5 animate-spin" />
          Carregando…
        </div>
      ) : (
        <>
          {tab === 'overview' && overview ? (
            <section className="af-section">
              <div className="af-kpi-grid">
                <Kpi label="Saldo do mês" value={formatBRL(overview.cash.balance)} tone={overview.cash.balance >= 0 ? 'pos' : 'neg'} hint={`${overview.cash.count} lançamentos`} />
                <Kpi label="Entradas" value={formatBRL(overview.cash.inflow)} tone="pos" />
                <Kpi label="Saídas" value={formatBRL(overview.cash.outflow)} tone="neg" />
                <Kpi label="A receber (mês)" value={formatBRL(overview.forecast?.thisMonthExpected ?? overview.charges.openAmount)} hint={`${overview.charges.openCount} em aberto`} />
                <Kpi
                  label="Run rate mensal"
                  value={formatBRL(overview.forecast?.monthlyRunRate || 0)}
                  tone="pos"
                  hint={`${overview.forecast?.activeRecurringCount || 0} recorrências ativas`}
                />
                <Kpi label="Projeção 6 meses" value={formatBRL(overview.forecast?.next6Expected || 0)} hint="A receber + a gerar" />
              </div>
              {overview.forecast?.months?.length ? (
                <div className="af-table-wrap" style={{ marginTop: '1rem' }}>
                  <table className="af-table">
                    <thead>
                      <tr>
                        <th>Mês</th>
                        <th>A gerar</th>
                        <th>Em aberto</th>
                        <th>Recebido</th>
                        <th>Esperado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.forecast.months.map((m) => (
                        <tr key={m.month}>
                          <td>{formatMonthTitle(m.month)}</td>
                          <td className="af-num">{formatBRL(m.projected)}</td>
                          <td className="af-num">{formatBRL(m.open)}</td>
                          <td className="af-num text-emerald-700">{formatBRL(m.paid)}</td>
                          <td className="af-num">{formatBRL(m.expected)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
              <div className="af-quick" style={{ marginTop: '1rem' }}>
                <Button size="sm" onClick={() => { setTab('recurring'); openNewRecurring(); }}>
                  <Plus className="h-4 w-4" /> Nova recorrência
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setTab('charges'); setChargeOpen(true); }}>
                  <Plus className="h-4 w-4" /> Cobrança avulsa
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setTab('payables'); openNewPayable(); }}>
                  <Plus className="h-4 w-4" /> Conta a pagar
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setTab('cash'); setCashOpen(true); }}>
                  <Wallet className="h-4 w-4" /> Lançamento
                </Button>
              </div>
            </section>
          ) : null}

          {tab === 'recurring' ? (
            <section className="af-section">
              <div className="af-section__head">
                <div>
                  <h2>Receitas recorrentes</h2>
                  <p className="af-muted">Contratos mensais (fee). Ao abrir um mês, as cobranças são geradas automaticamente.</p>
                </div>
                <Button size="sm" onClick={openNewRecurring}>
                  <Plus className="h-4 w-4" /> Nova
                </Button>
              </div>
              {recurring.length === 0 ? (
                <p className="af-empty">Nenhuma recorrência cadastrada. Crie um fee mensal por cliente.</p>
              ) : (
                <div className="af-table-wrap">
                  <table className="af-table">
                    <thead>
                      <tr>
                        <th>Cliente</th>
                        <th>Descrição</th>
                        <th>Dia</th>
                        <th>Início</th>
                        <th>Fim</th>
                        <th>Valor</th>
                        <th>Status</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {recurring.map((r) => (
                        <tr key={r.id}>
                          <td>{r.clientName || clientName[r.clientId] || '—'}</td>
                          <td>{r.description || '—'}</td>
                          <td>dia {r.dueDay || '—'}</td>
                          <td>{r.startMonth || '—'}</td>
                          <td>{r.endMonth || '—'}</td>
                          <td className="af-num">{formatBRL(r.amount)}</td>
                          <td>
                            <StatusBadge status={r.status} map={RECURRING_STATUSES} />
                          </td>
                          <td className="af-actions">
                            <Button size="sm" variant="ghost" onClick={() => openEditRecurring(r)} aria-label="Editar">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            {r.status === 'active' ? (
                              <Button size="sm" variant="outline" disabled={busyId === r.id} onClick={() => toggleRecurringStatus(r, 'paused')}>
                                Pausar
                              </Button>
                            ) : null}
                            {r.status === 'paused' ? (
                              <Button size="sm" variant="outline" disabled={busyId === r.id} onClick={() => toggleRecurringStatus(r, 'active')}>
                                Ativar
                              </Button>
                            ) : null}
                            {r.status !== 'ended' ? (
                              <Button size="sm" variant="ghost" disabled={busyId === r.id} onClick={() => toggleRecurringStatus(r, 'ended')}>
                                Encerrar
                              </Button>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ) : null}

          {tab === 'charges' ? (
            <section className="af-section">
              <div className="af-section__head">
                <h2>Cobranças</h2>
                <Button size="sm" onClick={() => setChargeOpen(true)}>
                  <Plus className="h-4 w-4" /> Nova
                </Button>
              </div>
              {charges.length === 0 ? (
                <p className="af-empty">Nenhuma cobrança neste mês.</p>
              ) : (
                <div className="af-table-wrap">
                  <table className="af-table">
                    <thead>
                      <tr>
                        <th>Cliente</th>
                        <th>Tipo</th>
                        <th>Descrição</th>
                        <th>Vencimento</th>
                        <th>Valor</th>
                        <th>Status</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {charges.map((c) => (
                        <tr key={c.id}>
                          <td>{c.clientName || clientName[c.clientId] || '—'}</td>
                          <td>{CHARGE_TYPE_LABELS[c.type] || c.type}</td>
                          <td>{c.description || '—'}</td>
                          <td>{c.dueDate || '—'}</td>
                          <td className="af-num">{formatBRL(c.amount)}</td>
                          <td>
                            <StatusBadge status={c.status} map={CHARGE_STATUSES} />
                          </td>
                          <td className="af-actions">
                            {c.status === 'open' ? (
                              <Button size="sm" variant="outline" disabled={busyId === c.id} onClick={() => payCharge(c.id)}>
                                {busyId === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                                Baixar
                              </Button>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ) : null}

          {tab === 'payables' ? (
            <section className="af-section">
              <div className="af-section__head">
                <h2>A pagar</h2>
                <Button size="sm" onClick={openNewPayable}>
                  <Plus className="h-4 w-4" /> Nova
                </Button>
              </div>
              {payables.length === 0 ? (
                <p className="af-empty">Nenhuma conta a pagar neste mês.</p>
              ) : (
                <div className="af-table-wrap">
                  <table className="af-table">
                    <thead>
                      <tr>
                        <th>Fornecedor</th>
                        <th>Categoria</th>
                        <th>Descrição</th>
                        <th>Parcela</th>
                        <th>Vencimento</th>
                        <th>Valor</th>
                        <th>Status</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {payables.map((p) => (
                        <tr key={p.id}>
                          <td>{p.vendorName}</td>
                          <td>{PAYABLE_CATEGORIES[p.category] || p.category}</td>
                          <td>{p.description || '—'}</td>
                          <td>{payableInstallmentLabel(p) || '—'}</td>
                          <td>{p.dueDate || '—'}</td>
                          <td className="af-num">{formatBRL(p.amount)}</td>
                          <td>
                            <StatusBadge status={p.status} map={PAYABLE_STATUSES} />
                          </td>
                          <td className="af-actions">
                            {p.status === 'open' ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={busyId === p.id}
                                  onClick={() => openEditPayable(p)}
                                  aria-label="Editar"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="sm" variant="outline" disabled={busyId === p.id} onClick={() => payPayable(p.id)}>
                                  {busyId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                                  Pagar
                                </Button>
                              </>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ) : null}

          {tab === 'cash' ? (
            <section className="af-section">
              <div className="af-section__head">
                <h2>Caixa</h2>
                <Button size="sm" onClick={() => setCashOpen(true)}>
                  <Plus className="h-4 w-4" /> Lançamento
                </Button>
              </div>
              {cash.length === 0 ? (
                <p className="af-empty">Sem movimentos neste mês.</p>
              ) : (
                <div className="af-table-wrap">
                  <table className="af-table">
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Tipo</th>
                        <th>Categoria</th>
                        <th>Descrição</th>
                        <th>Método</th>
                        <th>Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cash.map((t) => (
                        <tr key={t.id}>
                          <td>{t.date}</td>
                          <td>
                            <span className="inline-flex items-center gap-1 text-xs font-medium">
                              {t.direction === 'out' ? (
                                <ArrowUpRight className="h-3.5 w-3.5 text-rose-600" />
                              ) : (
                                <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600" />
                              )}
                              {t.direction === 'out' ? 'Saída' : 'Entrada'}
                            </span>
                          </td>
                          <td>
                            {(t.direction === 'out' ? CASH_CATEGORIES_OUT : CASH_CATEGORIES_IN)[t.category] ||
                              t.category}
                          </td>
                          <td>{t.description || '—'}</td>
                          <td>{PAYMENT_METHODS[t.method] || t.method || '—'}</td>
                          <td className={`af-num ${t.direction === 'out' ? 'text-rose-700' : 'text-emerald-700'}`}>
                            {t.direction === 'out' ? '−' : '+'}
                            {formatBRL(t.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ) : null}

          {tab === 'dre' && dre ? (
            <section className="af-section">
              <div className="af-section__head">
                <h2>DRE simplificado</h2>
              </div>
              <div className="af-kpi-grid af-kpi-grid--3">
                <Kpi label="Receitas" value={formatBRL(dre.receita)} tone="pos" />
                <Kpi label="Despesas" value={formatBRL(dre.despesa)} tone="neg" />
                <Kpi label="Resultado" value={formatBRL(dre.resultado)} tone={dre.resultado >= 0 ? 'pos' : 'neg'} />
              </div>
              <div className="af-dre-cols">
                <div>
                  <h3 className="af-subtitle">Receitas por categoria</h3>
                  <ul className="af-list">
                    {Object.entries(dre.byCategory.in).length === 0 ? (
                      <li className="af-muted">—</li>
                    ) : (
                      Object.entries(dre.byCategory.in).map(([k, v]) => (
                        <li key={k}>
                          <span>{CASH_CATEGORIES_IN[k] || k}</span>
                          <strong>{formatBRL(v)}</strong>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
                <div>
                  <h3 className="af-subtitle">Despesas por categoria</h3>
                  <ul className="af-list">
                    {Object.entries(dre.byCategory.out).length === 0 ? (
                      <li className="af-muted">—</li>
                    ) : (
                      Object.entries(dre.byCategory.out).map(([k, v]) => (
                        <li key={k}>
                          <span>{CASH_CATEGORIES_OUT[k] || k}</span>
                          <strong>{formatBRL(v)}</strong>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </div>
            </section>
          ) : null}
        </>
      )}

      {/* Dialogs */}
      <Dialog open={recurringOpen} onOpenChange={setRecurringOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRecurringId ? 'Editar recorrência' : 'Nova receita recorrente'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <Select
                value={recurringForm.clientId}
                onValueChange={(v) => setRecurringForm((f) => ({ ...f, clientId: v }))}
                disabled={Boolean(editingRecurringId)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name || c.company_name || c.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input
                value={recurringForm.description}
                onChange={(e) => setRecurringForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Fee mensal — redes sociais"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valor mensal</Label>
                <Input
                  value={recurringForm.amount}
                  onChange={(e) => setRecurringForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="3500"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Dia do vencimento</Label>
                <Input
                  type="number"
                  min={1}
                  max={28}
                  value={recurringForm.dueDay}
                  onChange={(e) => setRecurringForm((f) => ({ ...f, dueDay: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Início (mês)</Label>
                <Input
                  type="month"
                  value={recurringForm.startMonth}
                  onChange={(e) => setRecurringForm((f) => ({ ...f, startMonth: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Fim (opcional)</Label>
                <Input
                  type="month"
                  value={recurringForm.endMonth}
                  onChange={(e) => setRecurringForm((f) => ({ ...f, endMonth: e.target.value }))}
                />
              </div>
            </div>
            <p className="af-muted">
              Cada mês no intervalo gera uma cobrança em aberto automaticamente (sem duplicar se já existir).
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecurringOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submitRecurring}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={chargeOpen} onOpenChange={setChargeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova cobrança</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <Select value={chargeForm.clientId} onValueChange={(v) => setChargeForm((f) => ({ ...f, clientId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name || c.company_name || c.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={chargeForm.type} onValueChange={(v) => setChargeForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CHARGE_TYPES).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input value={chargeForm.description} onChange={(e) => setChargeForm((f) => ({ ...f, description: e.target.value }))} placeholder="Projeto / avulso…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valor</Label>
                <Input value={chargeForm.amount} onChange={(e) => setChargeForm((f) => ({ ...f, amount: e.target.value }))} placeholder="3500" />
              </div>
              <div className="space-y-1.5">
                <Label>Vencimento</Label>
                <Input type="date" value={chargeForm.dueDate} onChange={(e) => setChargeForm((f) => ({ ...f, dueDate: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChargeOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submitCharge}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={payableOpen}
        onOpenChange={(open) => {
          setPayableOpen(open);
          if (!open) {
            setEditingPayableId('');
            setPayableForm(emptyPayableForm());
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPayableId ? 'Editar conta a pagar' : 'Nova conta a pagar'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Fornecedor / freela</Label>
              <Input value={payableForm.vendorName} onChange={(e) => setPayableForm((f) => ({ ...f, vendorName: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={payableForm.category} onValueChange={(v) => setPayableForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYABLE_CATEGORIES).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input value={payableForm.description} onChange={(e) => setPayableForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>
                  {editingPayableId
                    ? 'Valor'
                    : Number(payableForm.installments) > 1
                      ? 'Valor total'
                      : 'Valor'}
                </Label>
                <Input value={payableForm.amount} onChange={(e) => setPayableForm((f) => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>{editingPayableId ? 'Vencimento' : '1º vencimento'}</Label>
                <Input type="date" value={payableForm.dueDate} onChange={(e) => setPayableForm((f) => ({ ...f, dueDate: e.target.value }))} />
              </div>
            </div>
            {!editingPayableId ? (
              <div className="space-y-1.5">
                <Label>Parcelas</Label>
                <Input
                  type="number"
                  min={1}
                  max={MAX_PAYABLE_INSTALLMENTS}
                  value={payableForm.installments}
                  onChange={(e) => setPayableForm((f) => ({ ...f, installments: e.target.value }))}
                />
                {(() => {
                  const amount = Number(String(payableForm.amount).replace(',', '.')) || 0;
                  const n = Math.min(
                    MAX_PAYABLE_INSTALLMENTS,
                    Math.max(1, Math.trunc(Number(payableForm.installments) || 1))
                  );
                  if (n <= 1 || amount <= 0) {
                    return (
                      <p className="text-xs af-muted">
                        1 = conta única. Com 2 ou mais, o valor é dividido e cada parcela aparece no mês do vencimento.
                      </p>
                    );
                  }
                  const schedule = buildPayableInstallments(amount, n, payableForm.dueDate || todayYmd());
                  const first = schedule[0];
                  const last = schedule[schedule.length - 1];
                  if (!first || !last) return null;
                  return (
                    <p className="text-xs af-muted">
                      {n}× de {formatBRL(first.amount)} — de {first.dueDate} até {last.dueDate}. Cada parcela entra em A
                      pagar no mês correspondente.
                    </p>
                  );
                })()}
              </div>
            ) : (
              <p className="text-xs af-muted">
                A edição altera só esta parcela/conta. Contas já pagas não podem ser editadas.
              </p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            {editingPayableId ? (
              <Button
                variant="ghost"
                className="text-rose-700 sm:mr-auto"
                disabled={busyId === editingPayableId}
                onClick={() => cancelPayable(editingPayableId)}
              >
                Cancelar conta
              </Button>
            ) : null}
            <Button
              variant="outline"
              onClick={() => {
                setPayableOpen(false);
                setEditingPayableId('');
                setPayableForm(emptyPayableForm());
              }}
            >
              Fechar
            </Button>
            <Button onClick={submitPayable}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cashOpen} onOpenChange={setCashOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lançamento de caixa</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Direção</Label>
              <Select
                value={cashForm.direction}
                onValueChange={(v) =>
                  setCashForm((f) => ({
                    ...f,
                    direction: v,
                    category: v === 'out' ? 'freela' : 'servicos',
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">Entrada</SelectItem>
                  <SelectItem value="out">Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={cashForm.category} onValueChange={(v) => setCashForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(cashForm.direction === 'out' ? CASH_CATEGORIES_OUT : CASH_CATEGORIES_IN).map(
                    ([k, label]) => (
                      <SelectItem key={k} value={k}>
                        {label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input value={cashForm.description} onChange={(e) => setCashForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valor</Label>
                <Input value={cashForm.amount} onChange={(e) => setCashForm((f) => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Data</Label>
                <Input type="date" value={cashForm.date} onChange={(e) => setCashForm((f) => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCashOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submitCash}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
