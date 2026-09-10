import { Service, Task, Profile, Notification } from '@/api/entities';
import { resolveEscalation, isNarrativaPipeline } from '@/lib/pipelineNarrativa';
import { resolveResponsavelAssignee } from '@/lib/resolveResponsavelAssignee';
import { isTerminalDeliverableStatus } from '@/lib/pipelinePhaseActions';

function daysBetween(startYmd, todayYmd) {
  if (!startYmd) return 0;
  const a = new Date(`${String(startYmd).slice(0, 10)}T12:00:00`);
  const b = new Date(`${String(todayYmd).slice(0, 10)}T12:00:00`);
  return Math.max(0, Math.round((b - a) / (24 * 60 * 60 * 1000)));
}

function defaultEscalationRules(phase) {
  if (Array.isArray(phase?.escalation) && phase.escalation.length) return phase.escalation;
  if (phase?.phase === 'calendario_cliente' || /calend[aá]rio/i.test(phase?.name || '')) {
    return [
      { day: 3, level: 'reminder', message: 'Falta 1 dia para o cliente responder' },
      { day: 4, level: 'escalation', message: 'Prazo venceu — ligar cliente' },
      { day: 5, level: 'urgent', message: 'URGENTE — campanha bloqueada no cliente' },
    ];
  }
  if (phase?.phase === 'alteracoes') {
    return [
      { day: 2, level: 'reminder', message: 'Alterações perto do prazo' },
      { day: 3, level: 'escalation', message: 'Alterações atrasadas — acionar equipe' },
    ];
  }
  return [];
}

const SEVERITY = {
  reminder: 'info',
  escalation: 'warn',
  urgent: 'critical',
};

/**
 * Escaneia fases Narrativa ativas com SLA/escalation e notifica Bruna (e assignee).
 * Idempotente via dedupKey por dia + nível.
 */
export async function scanPipelineSlaEscalations({
  agencyId,
  userId,
  todayYmd = new Date().toISOString().slice(0, 10),
} = {}) {
  if (!agencyId) return { created: 0, checked: 0 };

  const services = await Service.filter({ agencyId, is_template: false }, '-updated_date', 80).catch(
    () => []
  );
  const list = (Array.isArray(services) ? services : []).filter(isNarrativaPipeline);
  const profiles = await Profile.filter({ agencyId }).catch(() => []);
  const bruna = resolveResponsavelAssignee(profiles, 'bruna');

  let existing = [];
  try {
    existing = userId
      ? await Notification.filter({ agencyId, userId }, '-created_date', 80)
      : [];
  } catch {
    existing = [];
  }
  const existingKeys = new Set((existing || []).map((n) => n.dedupKey).filter(Boolean));

  let created = 0;
  let checked = 0;

  for (const service of list) {
    const deliverables = Array.isArray(service.deliverables) ? service.deliverables : [];
    for (const phase of deliverables) {
      if (isTerminalDeliverableStatus(phase.status)) continue;
      const rules = defaultEscalationRules(phase);
      if (!rules.length) continue;

      const active =
        String(phase.status || '') === 'in_progress' ||
        String(phase.gate_status || '') === 'pendente' ||
        phase.phase === 'calendario_cliente';

      // Só escala se a fase está em andamento ou é o gate do cliente aguardando
      const waitingClient =
        phase.gatekeeper === 'cliente' &&
        !['aprovado', 'approved', 'skipped'].includes(String(phase.gate_status || '').toLowerCase());

      if (!active && !waitingClient) continue;
      if (String(phase.status) === 'not_started' && !waitingClient) continue;

      checked += 1;
      const start =
        phase.started_at?.slice?.(0, 10) ||
        phase.planned_start ||
        service.start_date ||
        todayYmd;
      const elapsed = daysBetween(start, todayYmd);
      const hit = resolveEscalation({ escalation: rules }, elapsed);
      if (!hit) continue;

      const recipients = new Set();
      if (userId) recipients.add(String(userId));
      if (bruna?.assigneeId) recipients.add(String(bruna.assigneeId));

      // Assignees das tasks da fase (se userId não informado, ainda notifica Bruna)
      try {
        const tasks = await Task.filter({
          agencyId,
          serviceId: service.id,
          deliverableId: phase.id,
        }).catch(() => []);
        for (const t of Array.isArray(tasks) ? tasks : []) {
          const aid = t.assigneeId || t.assignedTo;
          if (aid) recipients.add(String(aid));
        }
      } catch {
        /* ignore */
      }

      for (const uid of recipients) {
        const dedupKey = `pipeline_sla_${service.id}_${phase.id}_${hit.level}_${todayYmd}_${uid}`;
        if (existingKeys.has(dedupKey)) continue;

        try {
          await Notification.create({
            agencyId,
            userId: uid,
            type: `pipeline_sla_${hit.level}`,
            subject: `service:${service.id}`,
            title:
              hit.level === 'urgent'
                ? `URGENTE: ${phase.name}`
                : hit.level === 'escalation'
                  ? `Escalation: ${phase.name}`
                  : `Lembrete SLA: ${phase.name}`,
            context: hit.message || `${phase.name} · dia ${elapsed}`,
            href: `/delivery-workspace?serviceId=${service.id}`,
            severity: SEVERITY[hit.level] || 'warn',
            dedupKey,
            metadata: {
              serviceId: service.id,
              deliverableId: phase.id,
              level: hit.level,
              daysElapsed: elapsed,
              gatekeeper: phase.gatekeeper || null,
            },
          });
          existingKeys.add(dedupKey);
          created += 1;
        } catch (err) {
          console.warn('[scanPipelineSlaEscalations]', err);
        }
      }
    }
  }

  return { created, checked };
}

export default scanPipelineSlaEscalations;
