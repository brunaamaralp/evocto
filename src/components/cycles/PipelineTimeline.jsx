import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  ChevronDown,
  ChevronRight,
  Lock,
  CheckCircle2,
  Loader2,
  SkipForward,
} from 'lucide-react';
import { isNarrativaPipeline } from '@/lib/pipelineNarrativa';
import { buildPipelineActionsView } from '@/lib/pipelinePhaseActions';
import { transitionPipelinePhase } from '@/api/functions/transitionPipelinePhase';
import { createCampaignShareLink } from '@/lib/campaignShare';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useSession } from '@/components/auth/SessionManager';

const STATUS_LABEL = {
  concluida: 'Concluída',
  em_progresso: 'Em progresso',
  bloqueada: 'Bloqueada',
  nao_iniciada: 'Não iniciada',
};

const STATUS_CLASS = {
  concluida: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  em_progresso: 'bg-sky-50 text-sky-800 border-sky-200',
  bloqueada: 'bg-amber-50 text-amber-900 border-amber-200',
  nao_iniciada: 'bg-slate-50 text-slate-600 border-slate-200',
};

const SLA_CLASS = {
  success: 'text-emerald-700',
  warning: 'text-amber-700',
  danger: 'text-red-700',
  neutral: 'text-slate-500',
};

function SubtarefaList({ subtarefas = [] }) {
  if (!subtarefas.length) return null;
  return (
    <ul className="mt-2 space-y-1 border-l border-slate-200 pl-3">
      {subtarefas.map((s) => {
        const done = ['completed', 'concluida', 'approved', 'skipped'].includes(
          String(s.status || '').toLowerCase()
        );
        return (
          <li key={s.id} className="flex items-center gap-2 text-xs text-slate-700">
            {done ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
            ) : (
              <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-slate-300" />
            )}
            <span className={cn('truncate', done && 'line-through text-slate-400')}>
              {s.title}
            </span>
            {s.assigneeName || s.responsavel ? (
              <span className="ml-auto shrink-0 text-[10px] uppercase text-slate-400">
                {s.assigneeName || s.responsavel}
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function FaseCard({
  fase,
  expanded,
  onToggle,
  busyKey,
  onTransition,
  onApproveGate,
  onSkip,
  onShare,
}) {
  const hasSubs = (fase.subtarefas || []).length > 0;
  const busy = busyKey === fase.id;
  const canShare =
    (fase.gatekeeper === 'cliente' || fase.gatekeeper === 'influencer') &&
    !['aprovado', 'approved', 'skipped'].includes(String(fase.gate_status || '').toLowerCase());

  return (
    <div className="rounded-md border border-slate-200 bg-white">
      <button
        type="button"
        className="flex w-full items-start gap-2 px-3 py-2.5 text-left"
        onClick={() => hasSubs && onToggle?.(fase.id)}
      >
        <span className="mt-0.5 text-slate-400">
          {hasSubs ? (
            expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )
          ) : (
            <span className="inline-block w-4" />
          )}
        </span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold text-slate-400">{fase.order}</span>
            <span className="text-sm font-medium text-slate-900 truncate">{fase.label}</span>
            {!fase.required ? (
              <Badge variant="outline" className="text-[10px]">
                opcional
              </Badge>
            ) : null}
            {fase.gatekeeper ? (
              <Badge variant="outline" className="text-[10px] gap-1">
                <Lock className="h-3 w-3" />
                {fase.gatekeeper}
                {fase.gate_status ? ` · ${fase.gate_status}` : ''}
              </Badge>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={cn('text-[10px]', STATUS_CLASS[fase.status] || STATUS_CLASS.nao_iniciada)}
            >
              {STATUS_LABEL[fase.status] || fase.status}
            </Badge>
            <span className="text-xs text-slate-600">
              {fase.progress_label} · {fase.progress_pct}%
            </span>
            {fase.sla?.label ? (
              <span
                className={cn(
                  'text-xs font-medium',
                  SLA_CLASS[fase.sla.tone] || SLA_CLASS.neutral
                )}
              >
                {fase.sla.label}
              </span>
            ) : null}
          </div>
          <Progress value={fase.progress_pct} className="h-1.5" />
          {expanded ? <SubtarefaList subtarefas={fase.subtarefas} /> : null}
        </div>
      </button>

      {(fase.can_transition || fase.can_approve_gate || fase.can_skip || canShare) && (
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-3 py-2">
          {canShare ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={busy}
              onClick={() => onShare?.(fase)}
            >
              {busy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
              Enviar link ({fase.gatekeeper})
            </Button>
          ) : null}
          {fase.can_approve_gate ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={busy}
              onClick={() => onApproveGate?.(fase)}
            >
              {busy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
              Aprovar gate ({fase.gatekeeper})
            </Button>
          ) : null}
          {fase.can_transition ? (
            <Button
              type="button"
              size="sm"
              className="h-7 text-xs"
              disabled={busy}
              onClick={() => onTransition?.(fase)}
            >
              {busy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
              Passar para {fase.next_phase_label || 'próxima'}
            </Button>
          ) : null}
          {fase.can_skip ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-slate-600"
              disabled={busy}
              onClick={() => onSkip?.(fase)}
            >
              {busy ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <SkipForward className="mr-1 h-3 w-3" />
              )}
              Pular fase
            </Button>
          ) : null}
          {fase.transition_block_reason === 'gate_pending' && !fase.can_approve_gate ? (
            <span className="text-[10px] text-amber-700">
              Aguardando gate ({fase.gatekeeper})
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}

/**
 * Timeline das 7 fases do Pipeline Narrativa.
 */
export default function PipelineTimeline({
  service,
  tasks = [],
  onServiceUpdated,
  onTasksNeedReload,
}) {
  const { user } = useSession();
  const phases = useMemo(
    () => buildPipelineActionsView(service?.deliverables || [], tasks),
    [service?.deliverables, tasks]
  );
  const [expandedId, setExpandedId] = useState(() => {
    const first = phases.find(
      (p) => p.status === 'em_progresso' || (p.subtarefas || []).length
    );
    return first?.id || null;
  });
  const [busyKey, setBusyKey] = useState(null);

  const narrativa = isNarrativaPipeline(service) || phases.length >= 7;

  const runAction = async (fase, action) => {
    if (!service?.id || !fase?.id) return;
    setBusyKey(fase.id);
    try {
      if (action === 'share') {
        const result = await createCampaignShareLink({
          serviceId: service.id,
          deliverableId: fase.id,
          gatekeeper: fase.gatekeeper || 'cliente',
          actorId: user?.id || user?.data?.id,
        });
        if (result.service) onServiceUpdated?.(result.service);
        await navigator.clipboard?.writeText?.(result.url).catch(() => {});
        toast.success('Link copiado — envie ao cliente/WhatsApp', {
          description: result.url,
        });
        return;
      }

      const result = await transitionPipelinePhase({
        serviceId: service.id,
        deliverableId: fase.id,
        action,
      });
      if (result.service) onServiceUpdated?.(result.service);
      onTasksNeedReload?.();
      if (action === 'skip') toast.success(`${fase.label} pulada`);
      else if (action === 'approve_gate') toast.success(`Gate aprovado: ${fase.label}`);
      else if (action === 'transition') {
        toast.success(
          result.transitions?.[0]?.to
            ? `Avançou para próxima fase`
            : `${fase.label} concluída`
        );
      }
    } catch (err) {
      console.error(err);
      toast.error(err?.message || 'Falha na ação do pipeline');
    } finally {
      setBusyKey(null);
    }
  };

  if (!phases.length) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Pipeline</h3>
          <p className="text-xs text-slate-500">
            {narrativa
              ? '7 fases · subtarefas · gates, SLA e transição'
              : `${phases.length} etapas do serviço`}
          </p>
        </div>
        {narrativa ? (
          <Badge variant="outline" className="text-[10px]">
            Narrativa · {service?.tipo_campanha || '5_videos'}
          </Badge>
        ) : null}
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {phases.map((fase) => (
          <button
            key={`rail-${fase.id}`}
            type="button"
            title={fase.label}
            onClick={() => setExpandedId(fase.id)}
            className={cn(
              'h-2 min-w-[2.5rem] flex-1 rounded-full border',
              fase.status === 'concluida' && 'bg-emerald-500 border-emerald-500',
              fase.status === 'em_progresso' && 'bg-sky-500 border-sky-500',
              fase.status === 'bloqueada' && 'bg-amber-400 border-amber-400',
              fase.status === 'nao_iniciada' && 'bg-slate-200 border-slate-200',
              expandedId === fase.id && 'ring-2 ring-offset-1 ring-slate-400'
            )}
          />
        ))}
      </div>

      <div className="space-y-2">
        {phases.map((fase) => (
          <FaseCard
            key={fase.id}
            fase={fase}
            expanded={expandedId === fase.id}
            busyKey={busyKey}
            onToggle={(id) => setExpandedId((cur) => (cur === id ? null : id))}
            onTransition={(f) => runAction(f, 'transition')}
            onApproveGate={(f) => runAction(f, 'approve_gate')}
            onSkip={(f) => runAction(f, 'skip')}
            onShare={(f) => runAction(f, 'share')}
          />
        ))}
      </div>
    </div>
  );
}
