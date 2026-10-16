/**
 * CRM leve da agência — /comercial (SPEC_CONTROLE_AGENCIA P2.1 opção A).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSession } from '@/components/auth/SessionManager';
import { AgencyLead } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import {
  AlertCircle,
  ArrowRight,
  Loader2,
  Plus,
  RefreshCw,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';
import {
  LEAD_STAGES,
  formatLeadValue,
  normalizeLeadStage,
} from '@/lib/agencyLeads/constants';
import {
  canConvertLead,
  convertLeadToClient,
} from '@/lib/agencyLeads/convertLeadToClient';

function emptyForm() {
  return {
    name: '',
    companyName: '',
    email: '',
    phone: '',
    estimatedValue: '',
    notes: '',
    status: 'lead',
  };
}

function isMissingTableError(err) {
  const msg = String(err?.message || err || '').toLowerCase();
  return (
    msg.includes('not found') ||
    msg.includes('collection') ||
    msg.includes('table') ||
    msg.includes('404') ||
    msg.includes('unknown')
  );
}

export default function ComercialPage() {
  const { agencyId, user } = useSession();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [convertingId, setConvertingId] = useState(null);
  const [error, setError] = useState(null);
  const [missingTable, setMissingTable] = useState(false);
  const [leads, setLeads] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const loadLeads = useCallback(async () => {
    if (!agencyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setMissingTable(false);
    try {
      const rows = await AgencyLead.filter({ agencyId }, '-updated_date', 200);
      setLeads(Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.error('[comercial] load failed:', err);
      if (isMissingTableError(err)) {
        setMissingTable(true);
        setLeads([]);
      } else {
        setError(err?.message || 'Erro ao carregar leads');
      }
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const byStage = useMemo(() => {
    const map = Object.fromEntries(LEAD_STAGES.map((s) => [s.id, []]));
    for (const lead of leads) {
      const stage = normalizeLeadStage(lead.status);
      map[stage].push(lead);
    }
    return map;
  }, [leads]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (lead) => {
    setEditing(lead);
    setForm({
      name: lead.name || '',
      companyName: lead.companyName || '',
      email: lead.email || '',
      phone: lead.phone || '',
      estimatedValue:
        lead.estimatedValue != null && lead.estimatedValue !== ''
          ? String(lead.estimatedValue)
          : '',
      notes: lead.notes || '',
      status: normalizeLeadStage(lead.status),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!agencyId) return;
    const name = form.name.trim();
    if (!name) {
      toast.error('Informe o nome do contato');
      return;
    }

    setSaving(true);
    try {
      const estimated = Number(String(form.estimatedValue).replace(',', '.'));
      const payload = {
        agencyId,
        name,
        companyName: form.companyName.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        estimatedValue: Number.isFinite(estimated) && estimated > 0 ? estimated : null,
        notes: form.notes.trim() || null,
        status: normalizeLeadStage(form.status),
      };

      if (editing?.id) {
        await AgencyLead.update(editing.id, payload);
        toast.success('Lead atualizado');
      } else {
        await AgencyLead.create(payload);
        toast.success('Lead criado');
      }
      setDialogOpen(false);
      await loadLeads();
    } catch (err) {
      console.error('[comercial] save failed:', err);
      if (isMissingTableError(err)) {
        setMissingTable(true);
        toast.error('Tabela agency_leads ainda não existe no Appwrite');
      } else {
        toast.error(err?.message || 'Erro ao salvar lead');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleMoveStage = async (lead, nextStatus) => {
    const stage = normalizeLeadStage(nextStatus);
    if (normalizeLeadStage(lead.status) === stage) return;
    try {
      await AgencyLead.update(lead.id, { status: stage });
      setLeads((prev) =>
        prev.map((l) => (l.id === lead.id ? { ...l, status: stage } : l))
      );
    } catch (err) {
      toast.error(err?.message || 'Erro ao mover lead');
    }
  };

  const handleConvert = async (lead) => {
    if (!canConvertLead(lead) || convertingId) return;
    setConvertingId(lead.id);
    try {
      // Garante estágio fechado antes de converter
      if (normalizeLeadStage(lead.status) !== 'fechado') {
        await AgencyLead.update(lead.id, { status: 'fechado' });
        lead = { ...lead, status: 'fechado' };
      }
      const result = await convertLeadToClient({
        lead,
        agencyId,
        userId: user?.id || null,
      });
      toast.success(
        result.alreadyConverted
          ? 'Lead já convertido'
          : `Cliente criado: ${result.client?.name || 'ok'}`
      );
      await loadLeads();
      if (result.clientId && !result.alreadyConverted) {
        navigate(createPageUrl(`client-detail?clientId=${result.clientId}`));
      }
    } catch (err) {
      console.error('[comercial] convert failed:', err);
      toast.error(err?.message || 'Erro ao converter em cliente');
    } finally {
      setConvertingId(null);
    }
  };

  if (!agencyId) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-4">
        <p className="text-sm text-[#7A7595]">Organização não encontrada.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-[#6C47D8]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-1 sm:px-0">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-[1.375rem] font-bold tracking-tight text-[#18162A] sm:text-[1.5rem]">
            Comercial
          </h1>
          <p className="text-sm text-[#7A7595]">
            Pipeline leve da agência — lead até cliente
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadLeads}
            className="border-[#E8E5F5]"
          >
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Atualizar
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-[#6C47D8] hover:bg-[#5A3BC0]"
            onClick={openCreate}
            disabled={missingTable}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Novo lead
          </Button>
        </div>
      </header>

      {missingTable ? (
        <div className="rounded-xl border border-[#F0B8BC] bg-[#FFF5F5] px-4 py-4 text-sm text-[#18162A]">
          <p className="font-semibold">Tabela `agency_leads` ainda não provisionada</p>
          <p className="mt-1 text-[#7A7595]">
            Crie a tabela no Appwrite (database do Evocto) com colunas tipadas:{' '}
            <code className="text-xs">agencyId</code>, <code className="text-xs">name</code>,{' '}
            <code className="text-xs">email</code>, <code className="text-xs">phone</code>,{' '}
            <code className="text-xs">status</code>,{' '}
            <code className="text-xs">convertedClientId</code> e{' '}
            <code className="text-xs">payload</code> (string JSON). Detalhes em{' '}
            <code className="text-xs">docs/SPEC_CONTROLE_AGENCIA.md</code>.
          </p>
        </div>
      ) : null}

      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-[#F0B8BC] bg-[#FFF5F5] px-4 py-3 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#c0392b]" />
          <div>
            <p className="text-[#18162A]">{error}</p>
            <Button type="button" variant="link" className="h-auto p-0" onClick={loadLeads}>
              Tentar novamente
            </Button>
          </div>
        </div>
      ) : null}

      {!missingTable && !error && leads.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#E8E5F5] bg-white px-6 py-10 text-center">
          <p className="text-base font-semibold text-[#18162A]">Nenhum lead ainda</p>
          <p className="mt-1 text-sm text-[#7A7595]">
            Cadastre oportunidades e mova pelo funil até converter em cliente.
          </p>
          <Button
            type="button"
            className="mt-4 bg-[#6C47D8] hover:bg-[#5A3BC0]"
            onClick={openCreate}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Criar primeiro lead
          </Button>
        </div>
      ) : null}

      {!missingTable && leads.length > 0 ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {LEAD_STAGES.map((stage) => (
            <section
              key={stage.id}
              className="flex w-72 shrink-0 flex-col rounded-xl border border-[#E8E5F5] bg-[#F8F7FB]/80"
              aria-label={stage.label}
            >
              <div className="flex items-center justify-between border-b border-[#E8E5F5] px-3 py-2.5">
                <h2 className="text-sm font-semibold text-[#18162A]">{stage.label}</h2>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs tabular-nums text-[#7A7595]">
                  {byStage[stage.id]?.length || 0}
                </span>
              </div>
              <ul className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto p-2">
                {(byStage[stage.id] || []).map((lead) => {
                  const valueLabel = formatLeadValue(lead.estimatedValue);
                  const converting = convertingId === lead.id;
                  return (
                    <li key={lead.id}>
                      <div className="rounded-lg border border-[#E8E5F5] bg-white p-3 shadow-none">
                        <button
                          type="button"
                          className="w-full text-left"
                          onClick={() => openEdit(lead)}
                        >
                          <p className="truncate text-sm font-semibold text-[#18162A]">
                            {lead.companyName || lead.name}
                          </p>
                          {lead.companyName ? (
                            <p className="truncate text-xs text-[#7A7595]">{lead.name}</p>
                          ) : null}
                          {valueLabel ? (
                            <p className="mt-1 text-xs font-medium text-[#6C47D8]">
                              {valueLabel}
                            </p>
                          ) : null}
                        </button>

                        <div className="mt-2 space-y-2">
                          <Select
                            value={normalizeLeadStage(lead.status)}
                            onValueChange={(v) => handleMoveStage(lead, v)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {LEAD_STAGES.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {lead.convertedClientId ? (
                            <Link
                              to={createPageUrl(
                                `client-detail?clientId=${lead.convertedClientId}`
                              )}
                              className="inline-flex items-center text-xs font-medium text-[#6C47D8] hover:underline"
                            >
                              Abrir cliente
                              <ArrowRight className="ml-1 h-3 w-3" />
                            </Link>
                          ) : canConvertLead(lead) ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 w-full border-[#E8E5F5] text-xs"
                              disabled={converting}
                              onClick={() => handleConvert(lead)}
                            >
                              {converting ? (
                                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <UserPlus className="mr-1 h-3.5 w-3.5" />
                              )}
                              Converter em cliente
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar lead' : 'Novo lead'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <Label htmlFor="lead-name">Contato *</Label>
              <Input
                id="lead-name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="mt-1.5"
                placeholder="Nome da pessoa"
              />
            </div>
            <div>
              <Label htmlFor="lead-company">Empresa</Label>
              <Input
                id="lead-company"
                value={form.companyName}
                onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))}
                className="mt-1.5"
                placeholder="Razão social / marca"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="lead-email">E-mail</Label>
                <Input
                  id="lead-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="lead-phone">Telefone</Label>
                <Input
                  id="lead-phone"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="lead-value">Valor estimado (R$)</Label>
                <Input
                  id="lead-value"
                  inputMode="decimal"
                  value={form.estimatedValue}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, estimatedValue: e.target.value }))
                  }
                  className="mt-1.5"
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Estágio</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_STAGES.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="lead-notes">Notas</Label>
              <Textarea
                id="lead-notes"
                rows={3}
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                className="mt-1.5"
                placeholder="Contexto da oportunidade…"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-[#6C47D8] hover:bg-[#5A3BC0]"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
