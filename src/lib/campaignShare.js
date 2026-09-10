/**
 * Share link público para gate CALENDÁRIO CLIENTE / INFLUENCER.
 */

import { Service, Client, Notification, Profile } from '@/api/entities';
import { transitionPipelinePhase } from '@/api/functions/transitionPipelinePhase';
import { resolveResponsavelAssignee } from '@/lib/resolveResponsavelAssignee';
import { isNarrativaPipeline } from '@/lib/pipelineNarrativa';

const TOKEN_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function generateShareToken(length = 32) {
  let out = '';
  const cryptoObj = typeof crypto !== 'undefined' ? crypto : null;
  if (cryptoObj?.getRandomValues) {
    const bytes = new Uint8Array(length);
    cryptoObj.getRandomValues(bytes);
    for (let i = 0; i < length; i += 1) {
      out += TOKEN_CHARS[bytes[i] % TOKEN_CHARS.length];
    }
    return out;
  }
  for (let i = 0; i < length; i += 1) {
    out += TOKEN_CHARS[Math.floor(Math.random() * TOKEN_CHARS.length)];
  }
  return out;
}

export function buildCampaignShareUrl(token, origin = typeof window !== 'undefined' ? window.location.origin : '') {
  const base = String(origin || '').replace(/\/$/, '');
  return `${base}/campaigns/${encodeURIComponent(token)}`;
}

export function findCalendarioPhase(deliverables = []) {
  return (deliverables || []).find(
    (d) =>
      d.phase === 'calendario_cliente' ||
      d.phase === 'aprovacao_influencer' ||
      /calend[aá]rio/i.test(d.name || '')
  );
}

/**
 * Cria/renova token de share e notifica Bruna (e-mail formal fica para integração).
 */
export async function createCampaignShareLink({
  serviceId,
  deliverableId = null,
  gatekeeper = 'cliente',
  daysValid = 7,
  actorId = null,
} = {}) {
  if (!serviceId) throw new Error('serviceId é obrigatório');

  const service = await Service.get(serviceId);
  if (!service) throw new Error('Serviço não encontrado');
  if (!isNarrativaPipeline(service)) {
    throw new Error('Share de calendário é para Pipeline Narrativa');
  }

  const deliverables = Array.isArray(service.deliverables) ? [...service.deliverables] : [];
  const phase =
    (deliverableId && deliverables.find((d) => String(d.id) === String(deliverableId))) ||
    findCalendarioPhase(deliverables);

  if (!phase) throw new Error('Fase de calendário/aprovação não encontrada');

  const token = generateShareToken(36);
  const now = new Date();
  const expires = new Date(now.getTime() + daysValid * 24 * 60 * 60 * 1000);
  const share = {
    token,
    deliverableId: phase.id,
    phase: phase.phase || null,
    gatekeeper: gatekeeper || phase.gatekeeper || 'cliente',
    status: 'pending',
    created_at: now.toISOString(),
    expires_at: expires.toISOString(),
    created_by: actorId,
  };

  const nextDeliverables = deliverables.map((d) =>
    String(d.id) === String(phase.id)
      ? {
          ...d,
          status: d.status === 'not_started' ? 'in_progress' : d.status,
          started_at: d.started_at || now.toISOString(),
          share_token: token,
          share_expires_at: share.expires_at,
          gate_status: d.gate_status || 'pendente',
        }
      : d
  );

  const updated = await Service.update(serviceId, {
    deliverables: nextDeliverables,
    campaign_share_token: token,
    campaign_share: share,
  });

  const url = buildCampaignShareUrl(token);

  // Notifica Bruna que o link foi gerado
  try {
    const profiles = await Profile.filter({ agencyId: service.agencyId }).catch(() => []);
    const bruna = resolveResponsavelAssignee(profiles, 'bruna');
    if (bruna?.assigneeId) {
      await Notification.create({
        agencyId: service.agencyId,
        userId: bruna.assigneeId,
        type: 'campaign_share_created',
        subject: `service:${serviceId}`,
        title: 'Link do calendário gerado',
        context: `Envie ao ${share.gatekeeper}: ${url}`,
        href: `/delivery-workspace?serviceId=${serviceId}`,
        severity: 'info',
        dedupKey: `campaign_share_${serviceId}_${token}`,
        metadata: { serviceId, token, url, gatekeeper: share.gatekeeper },
      });
    }
  } catch (err) {
    console.warn('[createCampaignShareLink] notif', err);
  }

  return {
    success: true,
    token,
    url,
    share,
    service: updated || { ...service, campaign_share: share, deliverables: nextDeliverables },
  };
}

/**
 * Resolve serviço público pelo token.
 */
export async function resolveCampaignShare(token) {
  const t = String(token || '').trim();
  if (!t) throw new Error('Token inválido');

  let services = await Service.filter({ campaign_share_token: t }, '-updated_date', 5).catch(
    () => []
  );

  if (!Array.isArray(services) || services.length === 0) {
    // Fallback: listagem limitada (payload JSON)
    const all = await Service.filter({ is_template: false }, '-updated_date', 100).catch(() => []);
    services = (Array.isArray(all) ? all : []).filter(
      (s) =>
        s.campaign_share_token === t ||
        s.campaign_share?.token === t ||
        (s.deliverables || []).some((d) => d.share_token === t)
    );
  }

  const service = services[0];
  if (!service) throw new Error('Link não encontrado');

  const share = service.campaign_share || {};
  if (share.token && share.token !== t && service.campaign_share_token !== t) {
    throw new Error('Link inválido');
  }

  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    const err = new Error('Link expirado');
    err.code = 'expired';
    throw err;
  }

  const phase =
    (service.deliverables || []).find((d) => d.share_token === t) ||
    (service.deliverables || []).find((d) => String(d.id) === String(share.deliverableId)) ||
    findCalendarioPhase(service.deliverables || []);

  const client = service.clientId
    ? await Client.get(service.clientId).catch(() => null)
    : null;

  const gateDone = ['aprovado', 'approved', 'skipped'].includes(
    String(phase?.gate_status || share.status || '').toLowerCase()
  );

  return {
    service: {
      id: service.id,
      name: service.name,
      agencyId: service.agencyId,
      tipo_campanha: service.tipo_campanha,
      ciclo_comercial: service.ciclo_comercial,
      linha_focal: service.linha_focal,
      start_date: service.start_date,
      end_date: service.end_date,
    },
    client: client
      ? { id: client.id, name: client.name || client.company_name }
      : null,
    phase: phase
      ? {
          id: phase.id,
          name: phase.name,
          phase: phase.phase,
          gatekeeper: phase.gatekeeper || share.gatekeeper || 'cliente',
          gate_status: phase.gate_status || (gateDone ? 'aprovado' : 'pendente'),
          planned_end: phase.planned_end,
          sla_dias: phase.sla_dias,
          description: phase.description,
        }
      : null,
    share: {
      token: t,
      expires_at: share.expires_at || phase?.share_expires_at || null,
      status: gateDone ? 'approved' : share.status || 'pending',
      gatekeeper: share.gatekeeper || phase?.gatekeeper || 'cliente',
    },
    alreadyApproved: gateDone,
  };
}

/**
 * Aprova ou pede alterações via token público.
 */
export async function processCampaignShareDecision({
  token,
  decision, // approve | changes
  reviewerName = '',
  note = '',
} = {}) {
  const resolved = await resolveCampaignShare(token);
  if (resolved.alreadyApproved && decision === 'approve') {
    return { success: true, alreadyApproved: true, ...resolved };
  }
  if (!resolved.phase?.id) throw new Error('Fase não encontrada');

  const serviceId = resolved.service.id;
  const action = decision === 'approve' ? 'approve_gate' : 'reject_gate';

  const result = await transitionPipelinePhase({
    serviceId,
    deliverableId: resolved.phase.id,
    action,
    note: note || (decision === 'approve' ? `Aprovado por ${reviewerName || 'cliente'}` : note),
    auto: true,
  });

  // Atualiza meta do share
  const service = await Service.get(serviceId);
  const share = {
    ...(service.campaign_share || {}),
    status: decision === 'approve' ? 'approved' : 'changes_requested',
    decided_at: new Date().toISOString(),
    reviewer_name: reviewerName || null,
    note: note || null,
  };
  await Service.update(serviceId, { campaign_share: share });

  // Notifica Bruna
  try {
    const profiles = await Profile.filter({ agencyId: service.agencyId }).catch(() => []);
    const bruna = resolveResponsavelAssignee(profiles, 'bruna');
    if (bruna?.assigneeId) {
      await Notification.create({
        agencyId: service.agencyId,
        userId: bruna.assigneeId,
        type:
          decision === 'approve' ? 'campaign_share_approved' : 'campaign_share_changes',
        subject: `service:${serviceId}`,
        title:
          decision === 'approve'
            ? 'Cliente aprovou o calendário'
            : 'Cliente pediu alterações no calendário',
        context: note || reviewerName || resolved.phase.name,
        href: `/delivery-workspace?serviceId=${serviceId}`,
        severity: decision === 'approve' ? 'info' : 'warn',
        dedupKey: `campaign_share_decision_${serviceId}_${share.status}_${Date.now()}`,
        metadata: { serviceId, decision, reviewerName },
      });
    }
  } catch (err) {
    console.warn('[processCampaignShareDecision] notif', err);
  }

  return {
    success: true,
    decision,
    transitions: result.transitions || [],
    service: result.service,
  };
}

export default {
  generateShareToken,
  buildCampaignShareUrl,
  createCampaignShareLink,
  resolveCampaignShare,
  processCampaignShareDecision,
  findCalendarioPhase,
};
