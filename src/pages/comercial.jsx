/**
 * CRM da agência — /comercial (SPEC_CONTROLE_AGENCIA P2.1 opção A).
 *
 * Pipeline + perfil completo do lead em painel lateral (?lead=<id>):
 * dados de contato, timeline de interações, atividades/follow-ups (tasks),
 * negócio, notas internas e anexos.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSession } from '@/components/auth/SessionManager';
import { AgencyLead, User } from '@/api/entities';
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
  DialogDescription,
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
import { AlertCircle, Loader2, Plus, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { createPageUrl } from '@/utils';
import {
  LEAD_SOURCES,
  LEAD_STAGES,
  formatLeadValue,
  isOpenLeadStage,
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
import {
  buildLeadPatch,
  leadPrimaryValue,
  validateLeadPatch,
  weightedLeadValue,
  withStageHistory,
} from '@/lib/agencyLeads/leadFields';
import { computeLeadFollowUp, groupTasksByLead } from '@/lib/agencyLeads/followUp';
import { listOpenLeadTasksForAgency } from '@/lib/agencyLeads/leadCrmApi';
import { buildGerarMaterialHref } from '@/lib/generateMaterialApi';
import LeadCard from '@/components/comercial/LeadCard';
import LeadDetailSheet from '@/components/comercial/LeadDetailSheet';
import { MemberSelect } from '@/components/comercial/LeadShared';
import { memberLabel } from '@/components/comercial/leadUi';

const NONE = '__none__';

function emptyForm(userId) {
  return {
    name: '',
    companyName: '',
    phone: '',
    email: '',
    source: '',
    serviceInterest: '',
    estimatedValue: '',
    ownerId: userId || '',
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

const FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'attention', label: 'Precisam de atenção' },
  { id: 'overdue', label: 'Atrasados' },
  { id: 'stale', label: 'Sem acompanhamento' },
  { id: 'mine', label: 'Meus leads' },
];

function matchesFilter(filter, lead, followUp, userId) {
  switch (filter) {
    case 'attention':
      return ['overdue', 'due_soon', 'stale', 'no_next_step'].includes(followUp?.state);
    case 'overdue':
      return followUp?.state === 'overdue';
    case 'stale':
      return followUp?.state === 'stale' || followUp?.state === 'no_next_step';
    case 'mine':
      return String(lead.ownerId || '') === String(userId || '');
    default:
      return true;
  }
}

function matchesSearch(lead, q) {
  if (!q) return true;
  const hay = [lead.name, lead.companyName, lead.email, lead.phone, lead.whatsapp, lead.serviceInterest, lead.campaign]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(q);
}

function Metric({ label, value, tone }) {
  return (
    <div className="min-w-0 rounded-2xl border border-[#E4DDD4] bg-white px-3 py-2.5">
      <p className="truncate text-[11px] font-medium uppercase tracking-wide text-[#9A9088]">{label}</p>
      <p className={cn('mt-0.5 truncate text-base font-semibold tabular-nums text-[#1A1210]', tone === 'danger' && 'text-[#B80015]', tone === 'warning' && 'text-[#8A5A00]')}>
        {value}
      </p>
    </div>
  );
}

export default function ComercialPage() {
  const { agencyId, user, isAdmin } = useSession();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [convertingId, setConvertingId] = useState(null);
  const [generatingLeadId, setGeneratingLeadId] = useState(null);
  const [error, setError] = useState(null);
  const [missingTable, setMissingTable] = useState(false);
  const [leads, setLeads] = useState([]);
  const [members, setMembers] = useState([]);
  const [tasksByLead, setTasksByLead] = useState(() => new Map());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(() => emptyForm(user?.id));
  const [convertTarget, setConvertTarget] = useState(null);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');

  const selectedLeadId = searchParams.get('lead');
  const selectedLead = useMemo(
    () => leads.find((l) => l.id === selectedLeadId) || null,
    [leads, selectedLeadId]
  );
  const userIsAdmin = typeof isAdmin === 'function' ? isAdmin() : false;

  const loadLeads = useCallback(async () => {
    if (!agencyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setMissingTable(false);
    try {
      const [rows, team, openTasks] = await Promise.all([
        AgencyLead.filter({ agencyId }, '-updated_date', 500),
        User.filter({ agencyId, role: { $in: ['owner', 'admin', 'team'] } }).catch(() => []),
        // Coluna tasks.leadId pode não existir ainda: indicadores ficam só com dados do lead.
        listOpenLeadTasksForAgency(agencyId).catch((err) => {
          console.warn('[comercial] lead tasks unavailable:', err?.message || err);
          return [];
        }),
      ]);
      setLeads(Array.isArray(rows) ? rows : []);
      setMembers(
        (Array.isArray(team) ? team : []).sort((a, b) => memberLabel(a).localeCompare(memberLabel(b), 'pt-BR'))
      );
      setTasksByLead(groupTasksByLead(openTasks));
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

  const followUps = useMemo(() => {
    const now = new Date();
    const map = new Map();
    for (const lead of leads) {
      map.set(lead.id, computeLeadFollowUp(lead, tasksByLead.get(lead.id) || [], now));
    }
    return map;
  }, [leads, tasksByLead]);

  const q = query.trim().toLowerCase();
  const visibleLeads = useMemo(
    () =>
      leads.filter(
        (lead) => matchesSearch(lead, q) && matchesFilter(filter, lead, followUps.get(lead.id), user?.id)
      ),
    [leads, q, filter, followUps, user?.id]
  );

  const byStage = useMemo(() => {
    const map = Object.fromEntries(LEAD_STAGES.map((s) => [s.id, []]));
    for (const lead of visibleLeads) {
      map[normalizeLeadStage(lead.status)].push(lead);
    }
    return map;
  }, [visibleLeads]);

  const metrics = useMemo(() => {
    let openValue = 0;
    let weighted = 0;
    let overdue = 0;
    let stale = 0;
    let openCount = 0;
    for (const lead of leads) {
      if (!isOpenLeadStage(lead.status)) continue;
      openCount += 1;
      openValue += leadPrimaryValue(lead);
      weighted += weightedLeadValue(lead);
      const f = followUps.get(lead.id);
      if (f?.state === 'overdue') overdue += 1;
      if (f?.state === 'stale' || f?.state === 'no_next_step') stale += 1;
    }
    return { openValue, weighted, overdue, stale, openCount };
  }, [leads, followUps]);

  const openLead = useCallback(
    (lead) => {
      const next = new URLSearchParams(searchParams);
      next.set('lead', lead.id);
      setSearchParams(next, { replace: false });
    },
    [searchParams, setSearchParams]
  );

  const closeLead = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete('lead');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const replaceLead = useCallback((updated) => {
    if (!updated?.id) return;
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)));
  }, []);

  const handleTasksChanged = useCallback((leadId, tasks) => {
    setTasksByLead((prev) => {
      const next = new Map(prev);
      next.set(leadId, tasks);
      return next;
    });
  }, []);

  /** Salva patch do perfil (edição inline por seção). */
  const saveLeadPatch = useCallback(
    async (lead, rawPatch) => {
      const patch = withStageHistory(lead, buildLeadPatch(rawPatch), user);
      const err = validateLeadPatch(patch);
      if (err) throw new Error(err);
      try {
        const saved = await AgencyLead.update(lead.id, patch);
        replaceLead(saved || { ...lead, ...patch });
        return saved;
      } catch (e) {
        console.error('[comercial] lead update failed:', e);
        throw new Error(e?.message || 'Erro ao salvar lead');
      }
    },
    [replaceLead, user]
  );

  const openCreate = () => {
    setForm(emptyForm(user?.id));
    setDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!agencyId) return;
    const patch = buildLeadPatch(form);
    const err = validateLeadPatch(patch);
    if (err) {
      toast.error(err);
      return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const created = await AgencyLead.create({
        agencyId,
        ...patch,
        status: normalizeLeadStage(patch.status),
        enteredAt: now,
        stageHistory: [{ from: null, to: normalizeLeadStage(patch.status), at: now, by: user?.id || null }],
      });
      toast.success('Lead criado');
      setDialogOpen(false);
      setLeads((prev) => [created, ...prev]);
      if (created?.id) openLead(created);
    } catch (e) {
      console.error('[comercial] save failed:', e);
      if (isMissingTableError(e)) {
        setMissingTable(true);
        toast.error('Tabela agency_leads ainda não existe no Appwrite');
      } else {
        toast.error(e?.message || 'Erro ao salvar lead');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleMoveStage = useCallback(
    async (lead, nextStatus) => {
      const stage = normalizeLeadStage(nextStatus);
      if (normalizeLeadStage(lead.status) === stage) return;
      try {
        await saveLeadPatch(lead, { status: stage });
      } catch (e) {
        toast.error(e?.message || 'Erro ao mover lead');
      }
    },
    [saveLeadPatch]
  );

  const handleConvert = async (lead) => {
    if (!lead || !canConvertLead(lead) || convertingId) return;
    setConvertingId(lead.id);
    setConvertTarget(null);
    try {
      let working = lead;
      if (normalizeLeadStage(working.status) !== 'fechado') {
        const patch = withStageHistory(working, { status: 'fechado' }, user);
        await AgencyLead.update(working.id, patch);
        working = { ...working, ...patch };
      }
      const result = await convertLeadToClient({
        lead: working,
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
    } catch (e) {
      console.error('[comercial] convert failed:', e);
      toast.error(e?.message || 'Não foi possível criar o cliente. Tente de novo.');
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
            ? 'Cliente já vinculado'
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
    } catch (e) {
      console.error('[comercial] generate proposal failed:', e);
      toast.error(e?.message || 'Não foi possível abrir a geração de proposta.');
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
        <p className="text-sm text-[#6B635C]">Organização não encontrada.</p>
      </div>
    );
  }

  if (loading && leads.length === 0) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-label="Carregando leads">
        <Loader2 className="h-7 w-7 animate-spin text-[#B80015]" />
      </div>
    );
  }

  const hasLeads = !missingTable && leads.length > 0;

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-1 sm:px-0">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-[1.375rem] font-bold tracking-tight text-[#1A1210] sm:text-[1.5rem]">
            Comercial
          </h1>
          <p className="text-sm text-[#6B635C]">
            Pipeline da agência — do primeiro contato ao cliente
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadLeads}
            className="border-[#E4DDD4]"
            disabled={loading}
          >
            <RefreshCw className={cn('mr-1.5 h-4 w-4', loading && 'animate-spin')} />
            Atualizar
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-[#B80015] hover:bg-[#8A0010]"
            onClick={openCreate}
            disabled={missingTable}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Novo lead
          </Button>
        </div>
      </header>

      {missingTable ? (
        <div className="rounded-xl border border-[#E4DDD4] bg-[#F1EDE7]/60 px-4 py-5 text-sm">
          <p className="font-semibold text-[#1A1210]">Comercial ainda em configuração</p>
          <p className="mt-1.5 leading-relaxed text-[#6B635C]">
            O pipeline de leads precisa ser ativado no servidor da organização. Peça ao
            administrador para concluir o setup (ou rode{' '}
            <span className="font-medium text-[#1A1210]">npm run appwrite:setup-agency-leads</span>
            ) e atualize esta página.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 border-[#E4DDD4]"
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
            <p className="text-[#1A1210]">{error}</p>
            <Button type="button" variant="link" className="h-auto p-0" onClick={loadLeads}>
              Tentar novamente
            </Button>
          </div>
        </div>
      ) : null}

      {!missingTable && !error && leads.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#E4DDD4] bg-white px-6 py-10 text-center">
          <p className="text-base font-semibold text-[#1A1210]">Nenhum lead ainda</p>
          <p className="mt-1 text-sm text-[#6B635C]">
            Cadastre oportunidades e mova pelo funil até converter em cliente.
          </p>
          <Button
            type="button"
            className="mt-4 bg-[#B80015] hover:bg-[#8A0010]"
            onClick={openCreate}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Criar primeiro lead
          </Button>
        </div>
      ) : null}

      {hasLeads ? (
        <>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <Metric label={`Em aberto (${metrics.openCount})`} value={formatLeadValue(metrics.openValue) || 'R$ 0'} />
            <Metric label="Valor ponderado" value={formatLeadValue(metrics.weighted) || 'R$ 0'} />
            <Metric label="Follow-ups atrasados" value={metrics.overdue} tone={metrics.overdue ? 'danger' : undefined} />
            <Metric label="Sem próximo passo" value={metrics.stale} tone={metrics.stale ? 'warning' : undefined} />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]" role="tablist" aria-label="Filtrar leads">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={filter === f.id}
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    'shrink-0 rounded-full border px-3 py-1 text-xs transition-colors',
                    filter === f.id
                      ? 'border-[#B80015] bg-[#B80015] font-medium text-white'
                      : 'border-[#E4DDD4] bg-white text-[#6B635C] hover:border-[#C9BFB4]'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="relative sm:w-64">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9A9088]" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar lead, empresa, e-mail…"
                className="h-9 pl-8 text-sm"
                aria-label="Buscar leads"
              />
            </div>
          </div>

          {visibleLeads.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#E4DDD4] bg-white px-6 py-8 text-center text-sm text-[#6B635C]">
              Nenhum lead encontrado com esses filtros.
              <Button type="button" variant="link" className="ml-1 h-auto p-0" onClick={() => { setFilter('all'); setQuery(''); }}>
                Limpar filtros
              </Button>
            </div>
          ) : (
            <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
              {LEAD_STAGES.map((stage) => {
                const list = byStage[stage.id] || [];
                const total = list.reduce((sum, l) => sum + leadPrimaryValue(l), 0);
                return (
                  <section
                    key={stage.id}
                    className="flex w-[85vw] max-w-[18rem] shrink-0 snap-start flex-col rounded-xl border border-[#E4DDD4] bg-[#F8F7FB]/80 sm:w-72"
                    aria-label={stage.label}
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-[#E4DDD4] px-3 py-2.5">
                      <div className="min-w-0">
                        <h2 className="text-sm font-semibold text-[#1A1210]">{stage.label}</h2>
                        {total > 0 ? (
                          <p className="text-[11px] tabular-nums text-[#6B635C]">{formatLeadValue(total)}</p>
                        ) : null}
                      </div>
                      <span className="rounded-full bg-white px-2 py-0.5 text-xs tabular-nums text-[#6B635C]">
                        {list.length}
                      </span>
                    </div>
                    <ul className="flex max-h-[68vh] flex-col gap-2 overflow-y-auto p-2">
                      {list.length === 0 ? (
                        <li className="px-2 py-4 text-center text-xs text-[#B5ACA3]">Nenhum lead</li>
                      ) : null}
                      {list.map((lead) => (
                        <li key={lead.id}>
                          <LeadCard
                            lead={lead}
                            followUp={followUps.get(lead.id)}
                            members={members}
                            onOpen={openLead}
                            onMoveStage={handleMoveStage}
                            canGenerate={canGenerateProposalFromLead(lead)}
                            generating={generatingLeadId === lead.id}
                            generateDisabled={Boolean(generatingLeadId)}
                            onGenerateProposal={handleGenerateProposal}
                            canConvert={canConvertLead(lead)}
                            converting={convertingId === lead.id}
                            onConvert={setConvertTarget}
                          />
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
        </>
      ) : null}

      <LeadDetailSheet
        lead={selectedLead}
        open={Boolean(selectedLead)}
        onOpenChange={(open) => {
          if (!open) closeLead();
        }}
        members={members}
        agencyId={agencyId}
        user={user}
        isAdmin={userIsAdmin}
        onSaveLead={(patch) => (selectedLead ? saveLeadPatch(selectedLead, patch) : Promise.resolve())}
        onLeadPatched={replaceLead}
        onTasksChanged={handleTasksChanged}
        pipelineTasks={selectedLead ? tasksByLead.get(selectedLead.id) : undefined}
        onGenerateProposal={() => selectedLead && handleGenerateProposal(selectedLead)}
        onConvert={() => selectedLead && setConvertTarget(selectedLead)}
        canGenerateProposal={selectedLead ? canGenerateProposalFromLead(selectedLead) : false}
        canConvert={selectedLead ? canConvertLead(selectedLead) : false}
        generating={Boolean(selectedLead && generatingLeadId === selectedLead.id)}
        converting={Boolean(selectedLead && convertingId === selectedLead.id)}
      />

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
              Vamos cadastrar <strong className="text-[#1A1210]">{convertLabel}</strong> como
              cliente ativo e abrir o hub dele. Também criamos uma tarefa de onboarding e
              vinculamos as atividades do lead ao cliente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(convertingId)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#B80015] hover:bg-[#8A0010]"
              disabled={Boolean(convertingId)}
              onClick={(e) => {
                e.preventDefault();
                if (convertTarget) handleConvert(convertTarget);
              }}
            >
              {convertingId ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando…
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
            <DialogTitle>Novo lead</DialogTitle>
            <DialogDescription>
              O essencial para começar. O restante você completa no perfil do lead.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3 py-1"
            onSubmit={(e) => {
              e.preventDefault();
              handleCreate();
            }}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="lead-name">Contato *</Label>
                <Input
                  id="lead-name"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="mt-1.5"
                  placeholder="Nome da pessoa"
                  autoFocus
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
              <div>
                <Label htmlFor="lead-phone">Telefone / WhatsApp</Label>
                <Input
                  id="lead-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
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
                <Label htmlFor="lead-source">Origem</Label>
                <Select
                  value={form.source || NONE}
                  onValueChange={(v) => setForm((p) => ({ ...p, source: v === NONE ? '' : v }))}
                >
                  <SelectTrigger id="lead-source" className="mt-1.5">
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>—</SelectItem>
                    {LEAD_SOURCES.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="lead-value">Valor estimado (R$)</Label>
                <Input
                  id="lead-value"
                  inputMode="decimal"
                  value={form.estimatedValue}
                  onChange={(e) => setForm((p) => ({ ...p, estimatedValue: e.target.value }))}
                  className="mt-1.5"
                  placeholder="0"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="lead-service">Serviço de interesse</Label>
                <Input
                  id="lead-service"
                  value={form.serviceInterest}
                  onChange={(e) => setForm((p) => ({ ...p, serviceInterest: e.target.value }))}
                  className="mt-1.5"
                  placeholder="Ex.: gestão de redes sociais"
                />
              </div>
              <div>
                <Label htmlFor="lead-owner">Responsável</Label>
                <MemberSelect
                  id="lead-owner"
                  members={members}
                  value={form.ownerId}
                  onChange={(v) => setForm((p) => ({ ...p, ownerId: v }))}
                />
              </div>
              <div>
                <Label htmlFor="lead-stage">Estágio</Label>
                <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                  <SelectTrigger id="lead-stage" className="mt-1.5">
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
            <DialogFooter className="gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-[#B80015] hover:bg-[#8A0010]" disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Criar e abrir perfil
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
