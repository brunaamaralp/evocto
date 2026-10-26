/**
 * CRM leve da ag�ncia � /comercial (SPEC_CONTROLE_AGENCIA P2.1 op��o A).
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  AlertCircle,
  ArrowRight,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
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
import {
  canGenerateProposalFromLead,
  ensureClientFromLead,
  overridesFromLead,
} from '@/lib/agencyLeads/ensureClientFromLead';
import { buildGerarMaterialHref } from '@/lib/generateMaterialApi';

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
  const [generatingLeadId, setGeneratingLeadId] = useState(null);
  const [error, setError] = useState(null);
  const [missingTable, setMissingTable] = useState(false);
  const [leads, setLeads] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [convertTarget, setConvertTarget] = useState(null);

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
        toast.error('Tabela agency_leads ainda n�o existe no Appwrite');
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
    if (!lead || !canConvertLead(lead) || convertingId) return;
    setConvertingId(lead.id);
    setConvertTarget(null);
    try {
      let working = lead;
      if (normalizeLeadStage(working.status) !== 'fechado') {
        await AgencyLead.update(working.id, { status: 'fechado' });
        working = { ...working, status: 'fechado' };
      }
      const result = await convertLeadToClient({
        lead: working,
        agencyId,
        userId: user?.id || null,
      });
      toast.success(
        result.alreadyConverted
          ? 'Lead j� convertido'
          : `Cliente criado: ${result.client?.name || 'ok'}`
      );
      await loadLeads();
      if (result.clientId && !result.alreadyConverted) {
        navigate(createPageUrl(`client-detail?clientId=${result.clientId}`));
      }
    } catch (err) {
      console.error('[comercial] convert failed:', err);
      toast.error(err?.message || 'N�o foi poss�vel criar o cliente. Tente de novo.');
    } finally {
      setConvertingId(null);
    }
  };

  const handleGenerateProposal = async (lead) => {
    if (!lead || !canGenerateProposalFromLead(lead) || generatingLeadId || !agencyId) return;
    setGeneratingLeadId(lead.id);
    try {
      let clientId = lead.convertedClientId || null;
      let working = lead;
      if (!clientId) {
        const result = await ensureClientFromLead({ lead, agencyId });
        clientId = result.clientId;
        working = result.lead || lead;
        toast.success(
          result.alreadyLinked
            ? 'Cliente j� vinculado'
            : 'Cliente vinculado para a proposta (deal continua em aberto)'
        );
        await loadLeads();
      }
      const pref = overridesFromLead(working);
      navigate(
        createPageUrl(
          buildGerarMaterialHref(clientId, {
            tipo: 'proposta',
            leadId: working.id || lead.id,
            titulo: pref.titulo || undefined,
            objetivo: pref.objetivo || undefined,
            escopo: pref.escopo || undefined,
            investimento: pref.investimento || undefined,
          })
        )
      );
    } catch (err) {
      console.error('[comercial] generate proposal failed:', err);
      toast.error(err?.message || 'N�o foi poss�vel abrir a gera��o de proposta.');
    } finally {
      setGeneratingLeadId(null);
    }
  };

  const convertLabel = convertTarget
    ? String(convertTarget.companyName || convertTarget.name || 'este lead').trim()
    : '';

  if (!agencyId) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-4">
        <p className="text-sm text-[#7A7595]">Organiza��o n�o encontrada.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-[#C02807]" />
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
            Pipeline leve da ag�ncia � lead at� cliente
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
            className="bg-[#C02807] hover:bg-[#8A1C05]"
            onClick={openCreate}
            disabled={missingTable}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Novo lead
          </Button>
        </div>
      </header>

      {missingTable ? (
        <div className="rounded-xl border border-[#E8E5F5] bg-[#EEF4FA]/60 px-4 py-5 text-sm">
          <p className="font-semibold text-[#18162A]">Comercial ainda em configura��o</p>
          <p className="mt-1.5 leading-relaxed text-[#7A7595]">
            O pipeline de leads precisa ser ativado no servidor da organiza��o. Pe�a ao
            administrador para concluir o setup (ou rode{' '}
            <span className="font-medium text-[#18162A]">npm run appwrite:setup-agency-leads</span>
            ) e atualize esta p�gina.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 border-[#E8E5F5]"
            onClick={loadLeads}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Verificar de novo
          </Button>
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
            Cadastre oportunidades e mova pelo funil at� converter em cliente.
          </p>
          <Button
            type="button"
            className="mt-4 bg-[#C02807] hover:bg-[#8A1C05]"
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
                  const generating = generatingLeadId === lead.id;
                  const canGen = canGenerateProposalFromLead(lead);
                  return (
                    <li key={lead.id}>
                      <div className="rounded-2xl border border-[#E8E5F5] bg-white p-3 shadow-none">
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
                            <p className="mt-1 text-xs font-medium text-[#C02807]">
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

                          {canGen ? (
                            <Button
                              type="button"
                              size="sm"
                              className="h-8 w-full bg-[#C02807] text-xs text-white hover:bg-[#8A1C05]"
                              disabled={generating || Boolean(generatingLeadId)}
                              onClick={() => handleGenerateProposal(lead)}
                            >
                              {generating ? (
                                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Sparkles className="mr-1 h-3.5 w-3.5" />
                              )}
                              Gerar proposta
                            </Button>
                          ) : null}

                          {lead.convertedClientId ? (
                            <Link
                              to={createPageUrl(
                                `client-detail?clientId=${lead.convertedClientId}`
                              )}
                              className="inline-flex items-center text-xs font-medium text-[#C02807] hover:underline"
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
                              onClick={() => setConvertTarget(lead)}
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

      <AlertDialog
        open={Boolean(convertTarget)}
        onOpenChange={(open) => {
          if (!open && !convertingId) setConvertTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Criar cliente a partir deste lead?</AlertDialogTitle>
            <AlertDialogDescription>
              Vamos cadastrar <strong className="text-[#18162A]">{convertLabel}</strong> como
              cliente ativo e abrir o hub dele. Tamb�m criamos uma tarefa de onboarding.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(convertingId)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#C02807] hover:bg-[#8A1C05]"
              disabled={Boolean(convertingId)}
              onClick={(e) => {
                e.preventDefault();
                if (convertTarget) handleConvert(convertTarget);
              }}
            >
              {convertingId ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando�
                </>
              ) : (
                'Criar cliente'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                placeholder="Raz�o social / marca"
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
                <Label>Est�gio</Label>
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
                placeholder="Contexto da oportunidade�"
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
              className="bg-[#C02807] hover:bg-[#8A1C05]"
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
