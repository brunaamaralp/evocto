import { Check, CircleDollarSign, History, Loader2, Sparkles, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  LEAD_STAGES,
  LEAD_STAGE_LABELS,
  LOSS_REASONS,
  LOSS_REASON_LABELS,
  NEGOTIATION_STATUSES,
  NEGOTIATION_STATUS_LABELS,
  formatLeadValue,
  labelFrom,
  normalizeLeadStage,
} from '@/lib/agencyLeads/constants';
import { parseProbability, weightedLeadValue } from '@/lib/agencyLeads/leadFields';
import { EditableSection, SectionCard } from '../LeadShared';
import { formatDate, formatDateTime, memberName } from '../leadUi';

const FUNNEL = LEAD_STAGES.filter((s) => s.id !== 'perdido');

function Stat({ label, value, hint, accent = false }) {
  return (
    <div className="rounded-2xl border border-[#E4DDD4] bg-white px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-[#9A9088]">{label}</p>
      <p className={cn('mt-0.5 text-base font-semibold tabular-nums', accent ? 'text-[#B80015]' : 'text-[#1A1210]', !value && 'text-[#B5ACA3]')}>
        {value || '—'}
      </p>
      {hint ? <p className="text-[11px] text-[#9A9088]">{hint}</p> : null}
    </div>
  );
}

function StageProgress({ status }) {
  const stage = normalizeLeadStage(status);
  const lost = stage === 'perdido';
  const idx = FUNNEL.findIndex((s) => s.id === stage);
  return (
    <ol className="flex items-center gap-1" aria-label="Evolução no funil">
      {FUNNEL.map((s, i) => {
        const done = !lost && i < idx;
        const current = !lost && i === idx;
        return (
          <li key={s.id} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <span
              className={cn(
                'h-1.5 w-full rounded-full',
                done || current ? 'bg-[#B80015]' : 'bg-[#EDE7E0]',
                lost && 'bg-[#EDE7E0]'
              )}
            />
            <span
              className={cn(
                'truncate text-[11px]',
                current ? 'font-semibold text-[#1A1210]' : 'text-[#9A9088]'
              )}
            >
              {done ? <Check className="mr-0.5 inline h-3 w-3 text-[#B80015]" /> : null}
              {s.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default function LeadDealTab({
  lead,
  members,
  onSave,
  canEdit,
  onGenerateProposal,
  onConvert,
  canGenerateProposal,
  canConvert,
  generating,
  converting,
}) {
  const stage = normalizeLeadStage(lead.status);
  const probability = parseProbability(lead.probability);
  const weighted = weightedLeadValue(lead);
  const history = Array.isArray(lead.stageHistory) ? [...lead.stageHistory].reverse() : [];
  const isLost = stage === 'perdido' || lead.negotiationStatus === 'perdida';

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Valor estimado" value={formatLeadValue(lead.estimatedValue)} />
        <Stat label="Orçamento" value={formatLeadValue(lead.quotedValue)} accent />
        <Stat label="Probabilidade" value={probability !== null ? `${probability}%` : ''} />
        <Stat
          label="Valor ponderado"
          value={formatLeadValue(weighted)}
          hint={probability !== null ? 'valor × probabilidade' : 'defina a probabilidade'}
        />
      </div>

      <SectionCard>
        <StageProgress status={lead.status} />
        {stage === 'perdido' ? (
          <p className="mt-2 text-xs font-medium text-[#B80015]">
            Oportunidade perdida{lead.lossReason ? ` — ${labelFrom(LOSS_REASON_LABELS, lead.lossReason)}` : ''}
          </p>
        ) : null}
        {(canGenerateProposal || canConvert || lead.convertedClientId) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {canGenerateProposal ? (
              <Button
                type="button"
                size="sm"
                className="bg-[#B80015] hover:bg-[#8A0010]"
                onClick={onGenerateProposal}
                disabled={generating}
              >
                {generating ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
                Gerar proposta
              </Button>
            ) : null}
            {canConvert ? (
              <Button type="button" size="sm" variant="outline" className="border-[#E4DDD4]" onClick={onConvert} disabled={converting}>
                {converting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <UserPlus className="mr-1.5 h-3.5 w-3.5" />}
                Converter em cliente
              </Button>
            ) : null}
          </div>
        )}
      </SectionCard>

      <EditableSection
        title="Negociação"
        icon={CircleDollarSign}
        lead={lead}
        members={members}
        onSave={onSave}
        canEdit={canEdit}
        fields={[
          { key: 'estimatedValue', label: 'Valor estimado (R$)', type: 'money', render: (l) => formatLeadValue(l.estimatedValue) },
          { key: 'quotedValue', label: 'Orçamento apresentado (R$)', type: 'money', render: (l) => formatLeadValue(l.quotedValue) },
          { key: 'serviceInterest', label: 'Serviço de interesse', full: true },
          { key: 'proposalSentAt', label: 'Envio da proposta', type: 'date', render: (l) => formatDate(l.proposalSentAt) },
          {
            key: 'negotiationStatus',
            label: 'Status da negociação',
            type: 'select',
            options: NEGOTIATION_STATUSES,
            render: (l) => labelFrom(NEGOTIATION_STATUS_LABELS, l.negotiationStatus),
          },
          {
            key: 'probability',
            label: 'Probabilidade de conversão (%)',
            type: 'percent',
            placeholder: '0–100',
            render: (l) => (parseProbability(l.probability) !== null ? `${parseProbability(l.probability)}%` : ''),
          },
          { key: 'competitor', label: 'Concorrente / solução considerada' },
          {
            key: 'lossReason',
            label: 'Motivo de perda',
            type: 'select',
            options: LOSS_REASONS,
            render: (l) => labelFrom(LOSS_REASON_LABELS, l.lossReason),
            hidden: (l) => !(normalizeLeadStage(l.status) === 'perdido' || l.negotiationStatus === 'perdida'),
          },
          {
            key: 'lossDetails',
            label: 'Detalhes da perda',
            type: 'textarea',
            hidden: (l) => !(normalizeLeadStage(l.status) === 'perdido' || l.negotiationStatus === 'perdida'),
          },
        ]}
      />
      {isLost && !lead.lossReason && canEdit ? (
        <p className="px-1 text-xs text-[#8A5A00]">Registre o motivo de perda em “Negociação → Editar” para alimentar a análise comercial.</p>
      ) : null}

      <SectionCard title="Evolução" icon={History}>
        {history.length === 0 ? (
          <p className="text-sm text-[#9A9088]">
            As mudanças de estágio passam a ser registradas aqui a partir de agora.
          </p>
        ) : (
          <ol className="space-y-2">
            {history.map((h, i) => (
              <li key={`${h.at}-${i}`} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-[#1A1210]">
                  {h.from ? `${LEAD_STAGE_LABELS[h.from] || h.from} → ` : ''}
                  <strong className="font-semibold">{LEAD_STAGE_LABELS[h.to] || h.to}</strong>
                  {h.by ? <span className="text-[#9A9088]"> · {memberName(members, h.by) || h.byName || ''}</span> : null}
                </span>
                <span className="shrink-0 text-xs text-[#9A9088]">{formatDateTime(h.at)}</span>
              </li>
            ))}
          </ol>
        )}
      </SectionCard>
    </div>
  );
}
