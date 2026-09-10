/**
 * Financeiro no contexto do cliente — cobranças em aberto, histórico e lançamento.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Loader2,
  Plus,
  RefreshCw,
  Wallet,
  CircleDollarSign,
  History,
  ExternalLink,
} from 'lucide-react';
import LoadingState from '@/components/shared/LoadingState';
import EmptyState from '@/components/shared/EmptyState';
import { createPageUrl, getUrlSearchParam } from '@/utils';
import { getCardPastel } from '@/lib/modulePastels';
import * as api from '@/lib/agencyFinance/api';
import {
  CHARGE_TYPES,
  CHARGE_TYPE_LABELS,
  CHARGE_STATUSES,
  formatBRL,
  todayYmd,
  ymNow,
} from '@/lib/agencyFinance/constants';
import './agency-finance.css';

function StatusBadge({ status }) {
  const label = CHARGE_STATUSES[status] || status;
  const tone =
    status === 'paid'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : status === 'cancelled'
        ? 'bg-slate-50 text-slate-500 border-slate-200'
        : 'bg-amber-50 text-amber-700 border-amber-200';
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${tone}`}>
      {label}
    </span>
  );
}

function formatDate(ymd) {
  if (!ymd) return '—';
  const s = String(ymd).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

function formatPaidAt(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('pt-BR');
  } catch {
    return '—';
  }
}

export default function ClientFinanceiroPage() {
  const { agencyId } = useSession();
  const urlParams = new URLSearchParams(window.location.search);
  const clientId = getUrlSearchParam(urlParams, 'clientId', 'id');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [client, setClient] = useState(null);
  const [charges, setCharges] = useState([]);
  const [busyId, setBusyId] = useState('');
  const [chargeOpen, setChargeOpen] = useState(false);
  const [chargeForm, setChargeForm] = useState({
    type: 'recorrente',
    description: '',
    amount: '',
    dueDate: todayYmd(),
  });

  const load = useCallback(
    async (opts = {}) => {
      if (!clientId || !agencyId) {
        setLoading(false);
        return;
      }
      if (opts.soft) setRefreshing(true);
      else setLoading(true);
      try {
        const [clientData, chargeRows] = await Promise.all([
          Client.get(clientId),
          api.listCharges({ agencyId, clientId, limit: 500 }),
        ]);
        setClient(clientData);
        setCharges(Array.isArray(chargeRows) ? chargeRows : []);
      } catch (err) {
        console.error(err);
        toast.error(err?.message || 'Erro ao carregar financeiro do cliente');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [agencyId, clientId]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const openCharges = useMemo(
    () => charges.filter((c) => String(c.status || '').toLowerCase() === 'open'),
    [charges]
  );
  const paidCharges = useMemo(
    () =>
      charges
        .filter((c) => String(c.status || '').toLowerCase() === 'paid')
        .sort((a, b) => String(b.paidAt || b.dueDate || '').localeCompare(String(a.paidAt || a.dueDate || ''))),
    [charges]
  );
  const cancelledCharges = useMemo(
    () => charges.filter((c) => String(c.status || '').toLowerCase() === 'cancelled'),
    [charges]
  );

  const openAmount = openCharges.reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const paidAmount = paidCharges.reduce((s, c) => s + (Number(c.amount) || 0), 0);

  async function submitCharge() {
    try {
      const amount = Number(String(chargeForm.amount).replace(',', '.'));
      if (!amount || amount <= 0) {
        toast.error('Informe um valor válido');
        return;
      }
      await api.createCharge({
        agencyId,
        payload: {
          clientId,
          clientName: client?.name || client?.company_name || '',
          type: chargeForm.type,
          description: chargeForm.description,
          amount,
          dueDate: chargeForm.dueDate || todayYmd(),
          competenceMonth: String(chargeForm.dueDate || todayYmd()).slice(0, 7) || ymNow(),
        },
      });
      toast.success('Cobrança criada');
      setChargeOpen(false);
      setChargeForm({
        type: 'recorrente',
        description: '',
        amount: '',
        dueDate: todayYmd(),
      });
      await load({ soft: true });
    } catch (err) {
      toast.error(err?.message || 'Erro ao criar cobrança');
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

  async function cancelCharge(id) {
    setBusyId(id);
    try {
      await api.cancelCharge({ agencyId, id });
      toast.success('Cobrança cancelada');
      await load({ soft: true });
    } catch (err) {
      toast.error(err?.message || 'Erro ao cancelar');
    } finally {
      setBusyId('');
    }
  }

  if (!clientId) {
    return (
      <EmptyState
        icon="usuarios"
        title="Cliente não informado"
        description="Abra o financeiro a partir da ficha do cliente."
        primaryAction={{
          label: 'Voltar aos Clientes',
          onClick: () => {
            window.location.href = createPageUrl('clients');
          },
        }}
      />
    );
  }

  if (loading) {
    return <LoadingState message="Carregando financeiro do cliente…" />;
  }

  if (!client) {
    return (
      <EmptyState
        icon="usuarios"
        title="Cliente não encontrado"
        description="O cliente solicitado não existe."
        primaryAction={{
          label: 'Voltar aos Clientes',
          onClick: () => {
            window.location.href = createPageUrl('clients');
          },
        }}
      />
    );
  }

  const clientName = client.name || client.company_name || 'Cliente';

  return (
    <div className={`af-page max-w-6xl mx-auto ${refreshing ? 'af-page--refreshing' : ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 -ml-1.5"
            onClick={() => {
              window.location.href =
                createPageUrl('client-detail') + `?clientId=${clientId}`;
            }}
            aria-label="Voltar ao cliente"
          >
            <ArrowLeft className="w-4 h-4 text-[#7A7595]" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-[#18162A] leading-tight">
              Financeiro
            </h1>
            <p className="text-xs text-[#7A7595] truncate">
              Cobranças e pagamentos
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => load({ soft: true })} disabled={refreshing}>
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Atualizar
          </Button>
          <Button size="sm" onClick={() => setChargeOpen(true)}>
            <Plus className="h-4 w-4" /> Nova cobrança
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          {
            icon: CircleDollarSign,
            label: 'Em aberto',
            value: formatBRL(openAmount),
            hint: `${openCharges.length} cobrança${openCharges.length === 1 ? '' : 's'}`,
            idx: 0,
          },
          {
            icon: Wallet,
            label: 'Já pago',
            value: formatBRL(paidAmount),
            hint: `${paidCharges.length} no histórico`,
            idx: 2,
          },
          {
            icon: History,
            label: 'Total de lançamentos',
            value: String(charges.length),
            hint: cancelledCharges.length ? `${cancelledCharges.length} cancelada(s)` : 'Todas as cobranças',
            idx: 3,
          },
        ].map(({ icon: Icon, label, value, hint, idx }) => {
          const pastel = getCardPastel(idx);
          return (
            <Card key={label} className={`rounded-2xl border-transparent shadow-sm ${pastel.bg}`}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pastel.tag}`}>
                    <Icon className={`w-5 h-5 ${pastel.text}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xl font-bold text-[#18162A] truncate">{value}</p>
                    <p className="text-sm text-[#7A7595]">{label}</p>
                    <p className="text-xs text-[#9A95B0]">{hint}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <section className="af-section mb-8">
        <div className="af-section__head">
          <h2>Em aberto</h2>
          <Button size="sm" variant="outline" onClick={() => setChargeOpen(true)}>
            <Plus className="h-4 w-4" /> Lançar
          </Button>
        </div>
        {openCharges.length === 0 ? (
          <p className="af-empty">Nenhuma cobrança em aberto para este cliente.</p>
        ) : (
          <div className="af-table-wrap">
            <table className="af-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Descrição</th>
                  <th>Vencimento</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {openCharges.map((c) => (
                  <tr key={c.id}>
                    <td>{CHARGE_TYPE_LABELS[c.type] || c.type}</td>
                    <td>{c.description || '—'}</td>
                    <td>{formatDate(c.dueDate)}</td>
                    <td className="af-num">{formatBRL(c.amount)}</td>
                    <td>
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="af-actions">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === c.id}
                        onClick={() => payCharge(c.id)}
                      >
                        {busyId === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        Baixar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busyId === c.id}
                        onClick={() => cancelCharge(c.id)}
                      >
                        Cancelar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="af-section mb-8">
        <div className="af-section__head">
          <h2>Histórico — já pago</h2>
        </div>
        {paidCharges.length === 0 ? (
          <p className="af-empty">Ainda não há pagamentos registrados para este cliente.</p>
        ) : (
          <div className="af-table-wrap">
            <table className="af-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Descrição</th>
                  <th>Vencimento</th>
                  <th>Pago em</th>
                  <th>Valor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {paidCharges.map((c) => (
                  <tr key={c.id}>
                    <td>{CHARGE_TYPE_LABELS[c.type] || c.type}</td>
                    <td>{c.description || '—'}</td>
                    <td>{formatDate(c.dueDate)}</td>
                    <td>{formatPaidAt(c.paidAt)}</td>
                    <td className="af-num">{formatBRL(c.amount)}</td>
                    <td>
                      <StatusBadge status={c.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {cancelledCharges.length > 0 ? (
        <section className="af-section mb-8">
          <div className="af-section__head">
            <h2>Canceladas</h2>
          </div>
          <div className="af-table-wrap">
            <table className="af-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Descrição</th>
                  <th>Vencimento</th>
                  <th>Valor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {cancelledCharges.map((c) => (
                  <tr key={c.id}>
                    <td>{CHARGE_TYPE_LABELS[c.type] || c.type}</td>
                    <td>{c.description || '—'}</td>
                    <td>{formatDate(c.dueDate)}</td>
                    <td className="af-num">{formatBRL(c.amount)}</td>
                    <td>
                      <StatusBadge status={c.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <p className="text-sm text-[#7A7595] flex items-center gap-1.5">
        <ExternalLink className="w-3.5 h-3.5" />
        <Link className="underline underline-offset-2 hover:text-[#18162A]" to={`/financeiro`}>
          Abrir financeiro da agência
        </Link>
      </p>

      <Dialog open={chargeOpen} onOpenChange={setChargeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova cobrança — {clientName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select
                value={chargeForm.type}
                onValueChange={(v) => setChargeForm((f) => ({ ...f, type: v }))}
              >
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
              <Input
                value={chargeForm.description}
                onChange={(e) => setChargeForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Recorrente setembro…"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valor</Label>
                <Input
                  value={chargeForm.amount}
                  onChange={(e) => setChargeForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="3500"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Vencimento</Label>
                <Input
                  type="date"
                  value={chargeForm.dueDate}
                  onChange={(e) => setChargeForm((f) => ({ ...f, dueDate: e.target.value }))}
                />
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
    </div>
  );
}
