/**
 * Helpers para dashboards por persona (Bruna / Duda / Cliente / Influencer).
 * Persona ≠ user.role — filtra por responsavel / gatekeeper / assignee.
 */

import { resolveResponsavelAssignee } from '@/lib/resolveResponsavelAssignee';
import { isNarrativaPipeline } from '@/lib/pipelineNarrativa';
import { isCycleFeedbackComplete } from '@/lib/cycleFeedback';

export const PERSONAS = Object.freeze([
  {
    value: 'bruna',
    label: 'Bruna',
    description: 'Orquestração — todas as campanhas, bloqueadores e SLAs',
  },
  {
    value: 'duda',
    label: 'Duda',
    description: 'Fila de produção — subtarefas e prazos',
  },
  {
    value: 'cliente',
    label: 'Cliente',
    description: 'Calendário e aprovações pendentes',
  },
  {
    value: 'influencer',
    label: 'Influencer',
    description: 'Gates de aprovação do influencer',
  },
]);

export function normalizePersona(value) {
  const v = String(value || '').toLowerCase();
  if (v === 'influenciador') return 'influencer';
  if (PERSONAS.some((p) => p.value === v)) return v;
  return 'bruna';
}

function isOpenTask(t) {
  return !['completed', 'cancelled', 'skipped'].includes(String(t.status || '').toLowerCase());
}

function matchesResponsavel(task, persona) {
  const r = String(task.responsavel || task.assignee_role || '').toLowerCase();
  if (!r) return false;
  if (persona === 'influencer') return /influenc/.test(r);
  return r.split(',').some((p) => p.trim() === persona || p.trim().includes(persona));
}

function matchesGatekeeper(taskOrPhase, persona) {
  const g = String(taskOrPhase.gatekeeper || '').toLowerCase();
  if (!g) return false;
  if (persona === 'influencer') return g === 'influencer' || g === 'influenciador';
  return g === persona;
}

/**
 * Filtra tarefas da persona.
 */
export function filterTasksForPersona(tasks = [], persona, profiles = [], userId = null) {
  const p = normalizePersona(persona);
  const list = Array.isArray(tasks) ? tasks : [];

  if (p === 'bruna') {
    // Orquestração: abertas + bloqueadas + gates pendentes
    return list.filter((t) => isOpenTask(t));
  }

  const resolved = resolveResponsavelAssignee(profiles, p);
  const assigneeId = resolved?.assigneeId || userId;

  return list.filter((t) => {
    if (!isOpenTask(t)) return false;
    if (matchesResponsavel(t, p)) return true;
    if (matchesGatekeeper(t, p) && !['aprovado', 'approved', 'skipped'].includes(String(t.gate_status || '').toLowerCase())) {
      return true;
    }
    if (assigneeId && String(t.assigneeId || t.assignedTo || '') === String(assigneeId)) {
      return true;
    }
    return false;
  });
}

/**
 * Serviços Narrativa com fases bloqueadas / SLA para Bruna.
 */
export function buildOrchestrationRows(services = [], tasks = []) {
  const now = new Date().toISOString().slice(0, 10);
  return (services || [])
    .filter(isNarrativaPipeline)
    .map((service) => {
      const deliverables = service.deliverables || [];
      const blocked = deliverables.filter((d) => {
        const gate = String(d.gate_status || '').toLowerCase();
        return (
          d.gatekeeper &&
          !['aprovado', 'approved', 'skipped'].includes(gate) &&
          String(d.status) === 'in_progress'
        );
      });
      const active = deliverables.find((d) => String(d.status) === 'in_progress');
      const due = active?.planned_end || null;
      const daysLeft =
        due != null
          ? Math.round(
              (new Date(`${due}T12:00:00`) - new Date(`${now}T12:00:00`)) /
                (24 * 60 * 60 * 1000)
            )
          : null;
      const serviceTasks = tasks.filter((t) => String(t.serviceId) === String(service.id));
      const open = serviceTasks.filter(isOpenTask).length;

      return {
        serviceId: service.id,
        name: service.name,
        tipo_campanha: service.tipo_campanha,
        ciclo_comercial: service.ciclo_comercial,
        linha_focal: service.linha_focal,
        activePhase: active?.name || null,
        blockedPhases: blocked.map((b) => b.name),
        daysLeft,
        openTasks: open,
        shareToken: service.campaign_share_token || null,
      };
    })
    .sort((a, b) => {
      const da = a.daysLeft == null ? 999 : a.daysLeft;
      const db = b.daysLeft == null ? 999 : b.daysLeft;
      return da - db;
    });
}

/**
 * Gates pendentes para cliente/influencer (fases).
 */
export function buildPendingGates(services = [], persona = 'cliente') {
  const p = normalizePersona(persona);
  return (services || [])
    .filter(isNarrativaPipeline)
    .flatMap((service) =>
      (service.deliverables || [])
        .filter((d) => matchesGatekeeper(d, p))
        .filter(
          (d) =>
            !['aprovado', 'approved', 'skipped'].includes(
              String(d.gate_status || 'pendente').toLowerCase()
            )
        )
        .filter((d) => ['in_progress', 'ready_for_approval'].includes(String(d.status || '')) || d.share_token)
        .map((d) => ({
          serviceId: service.id,
          serviceName: service.name,
          deliverableId: d.id,
          phaseName: d.name,
          gatekeeper: d.gatekeeper,
          due: d.planned_end,
          shareUrl: service.campaign_share_token
            ? `/campaigns/${service.campaign_share_token}`
            : d.share_token
              ? `/campaigns/${d.share_token}`
              : null,
        }))
    );
}

/**
 * Rollup das últimas N campanhas com feedback.
 */
export function buildCampaignsPerformanceReport(cyclePlans = [], limit = 12) {
  const list = (Array.isArray(cyclePlans) ? cyclePlans : [])
    .slice()
    .sort((a, b) => {
      const da = new Date(a.end_date || a.start_date || a.updated_date || 0).getTime();
      const db = new Date(b.end_date || b.start_date || b.updated_date || 0).getTime();
      return db - da;
    })
    .slice(0, limit);

  const rows = list.map((cp) => {
    const feedback = cp.planData?.feedback || cp.feedback || null;
    return {
      id: cp.id,
      title: cp.cyclePeriod || cp.title || cp.serviceId,
      serviceId: cp.serviceId,
      clientId: cp.clientId,
      status: cp.status,
      tipo_campanha: cp.tipo_campanha || cp.planData?.tipo_campanha,
      ciclo_comercial: cp.ciclo_comercial || cp.planData?.ciclo_comercial,
      linha_focal: cp.linha_focal || cp.planData?.linha_focal,
      start_date: cp.start_date || cp.startDate,
      end_date: cp.end_date,
      hasFeedback: isCycleFeedbackComplete(feedback),
      feedback,
      vendas_realizado: feedback?.vendas_realizado || '',
      engagement_realizado: feedback?.engagement_realizado || '',
      aprendizados: feedback?.aprendizados || '',
    };
  });

  const withFeedback = rows.filter((r) => r.hasFeedback);
  const byCiclo = {};
  for (const r of rows) {
    const k = r.ciclo_comercial || '—';
    byCiclo[k] = (byCiclo[k] || 0) + 1;
  }

  return {
    rows,
    summary: {
      total: rows.length,
      withFeedback: withFeedback.length,
      byCiclo,
      byTipo: rows.reduce((acc, r) => {
        const k = r.tipo_campanha || '—';
        acc[k] = (acc[k] || 0) + 1;
        return acc;
      }, {}),
    },
  };
}

export default {
  PERSONAS,
  normalizePersona,
  filterTasksForPersona,
  buildOrchestrationRows,
  buildPendingGates,
  buildCampaignsPerformanceReport,
};
