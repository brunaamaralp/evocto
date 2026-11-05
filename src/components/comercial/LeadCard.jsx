/**
 * Card do lead no pipeline: informação essencial + sinal de acompanhamento.
 * Clique (ou Enter) abre o perfil completo.
 */
import { memo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarClock, Loader2, Sparkles, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { createPageUrl } from '@/utils';
import {
  LEAD_SOURCE_LABELS,
  LEAD_STAGES,
  formatLeadValue,
  labelFrom,
  normalizeLeadStage,
} from '@/lib/agencyLeads/constants';
import { leadPrimaryValue } from '@/lib/agencyLeads/leadFields';
import { contactInitials } from '@/lib/contactInitials';
import { FollowUpBadge } from './LeadShared';
import { formatRelativeDay, leadDisplayName, memberName } from './leadUi';

const ACCENT = {
  danger: 'before:bg-[#B80015]',
  warning: 'before:bg-[#D99A00]',
};

function stop(e) {
  e.stopPropagation();
}

function LeadCard({
  lead,
  followUp,
  members,
  onOpen,
  onMoveStage,
  canGenerate,
  generating,
  generateDisabled,
  onGenerateProposal,
  canConvert,
  converting,
  onConvert,
}) {
  const value = formatLeadValue(leadPrimaryValue(lead));
  const owner = memberName(members, lead.ownerId);
  const secondary = [lead.companyName ? lead.name : null, lead.serviceInterest].filter(Boolean).join(' · ');
  const nextTask = followUp?.nextTask;
  const showBadge = followUp && ['overdue', 'due_soon', 'stale', 'no_next_step'].includes(followUp.state);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(lead)}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(lead);
        }
      }}
      aria-label={`Abrir perfil de ${leadDisplayName(lead)}`}
      className={cn(
        'group relative cursor-pointer overflow-hidden rounded-2xl border border-[#E4DDD4] bg-white p-3 text-left transition-shadow hover:border-[#D6CCC1] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B80015]/40',
        ACCENT[followUp?.tone] && `before:absolute before:inset-y-0 before:left-0 before:w-1 ${ACCENT[followUp.tone]}`
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#1A1210] group-hover:text-[#B80015]">
            {leadDisplayName(lead)}
          </p>
          {secondary ? <p className="truncate text-xs text-[#6B635C]">{secondary}</p> : null}
        </div>
        {owner ? (
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F1EDE7] text-[10px] font-semibold text-[#6B635C]"
            title={`Responsável: ${owner}`}
          >
            {contactInitials(owner)}
          </span>
        ) : null}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {value ? <span className="text-xs font-semibold text-[#B80015]">{value}</span> : null}
        {lead.source ? (
          <span className="rounded-full border border-[#EDE7E0] px-1.5 py-px text-[10px] text-[#6B635C]">
            {labelFrom(LEAD_SOURCE_LABELS, lead.source)}
          </span>
        ) : null}
      </div>

      {nextTask && followUp.state !== 'closed' ? (
        <p
          className={cn(
            'mt-2 flex items-center gap-1 truncate text-[11px]',
            followUp.state === 'overdue' ? 'text-[#B80015]' : followUp.state === 'due_soon' ? 'text-[#8A5A00]' : 'text-[#6B635C]'
          )}
          title={nextTask.title}
        >
          <CalendarClock className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {nextTask.dueDate ? `${formatRelativeDay(nextTask.dueDate)} · ` : ''}
            {nextTask.title}
          </span>
        </p>
      ) : null}

      {showBadge && !(nextTask && followUp.state === 'due_soon') ? (
        <FollowUpBadge followUp={followUp} compact className="mt-2" />
      ) : null}

      <div className="mt-2.5 space-y-2" onClick={stop} onKeyDown={stop}>
        <Select value={normalizeLeadStage(lead.status)} onValueChange={(v) => onMoveStage(lead, v)}>
          <SelectTrigger className="h-8 text-xs" aria-label="Mover estágio">
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

        {canGenerate ? (
          <Button
            type="button"
            size="sm"
            className="h-8 w-full bg-[#B80015] text-xs text-white hover:bg-[#8A0010]"
            disabled={generating || generateDisabled}
            onClick={() => onGenerateProposal(lead)}
          >
            {generating ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1 h-3.5 w-3.5" />}
            Gerar proposta
          </Button>
        ) : null}

        {lead.convertedClientId ? (
          <Link
            to={createPageUrl(`client-detail?clientId=${lead.convertedClientId}`)}
            className="inline-flex items-center text-xs font-medium text-[#B80015] hover:underline"
          >
            Abrir cliente
            <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        ) : canConvert ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 w-full border-[#E4DDD4] text-xs"
            disabled={converting}
            onClick={() => onConvert(lead)}
          >
            {converting ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <UserPlus className="mr-1 h-3.5 w-3.5" />}
            Converter em cliente
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export default memo(LeadCard);
