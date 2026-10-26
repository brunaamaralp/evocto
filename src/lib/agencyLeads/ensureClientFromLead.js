/**
 * Garante Client a partir de um lead do Comercial, sem fechar o deal.
 * Usado antes de /gerar-material (proposta). Conversão “fechado” continua em convertLeadToClient.
 */
import { Client, AgencyLead } from '@/api/entities';
import { formatLeadValue, normalizeLeadStage } from './constants.js';

const GENERATABLE_STAGES = new Set(['qualificacao', 'proposta', 'fechado']);

/**
 * Lead elegível para CTA “Gerar proposta”.
 * Não inclui lead cru nem perdido.
 */
export function canGenerateProposalFromLead(lead) {
  if (!lead?.id) return false;
  const stage = normalizeLeadStage(lead.status);
  if (stage === 'perdido' || stage === 'lead') return false;
  return GENERATABLE_STAGES.has(stage);
}

/**
 * Prefill de overrides a partir do lead (UI / query / API).
 */
export function overridesFromLead(lead = {}) {
  const company = String(lead.companyName || lead.name || '').trim();
  const contact = String(lead.name || '').trim();
  const notes = String(lead.notes || '').trim();
  const valueLabel = formatLeadValue(lead.estimatedValue);

  return {
    titulo: company ? `Proposta — ${company}` : '',
    objetivo: notes || '',
    escopo: notes || '',
    investimento: valueLabel || '',
    tom: '',
    prazo: '',
    // extras úteis (não são overrides do schema; só para UI)
    _contactName: contact && company && contact !== company ? contact : '',
  };
}

/**
 * @param {object} opts
 * @param {object} opts.lead
 * @param {string} opts.agencyId
 * @returns {Promise<{ clientId: string, client?: object, lead: object, alreadyLinked: boolean }>}
 */
export async function ensureClientFromLead({ lead, agencyId } = {}) {
  if (!lead?.id) throw new Error('lead_obrigatorio');
  if (!agencyId) throw new Error('agencyId_obrigatorio');

  if (lead.convertedClientId) {
    return {
      clientId: lead.convertedClientId,
      alreadyLinked: true,
      lead,
    };
  }

  const name = String(lead.companyName || lead.name || '').trim();
  if (!name) throw new Error('nome_obrigatorio');

  const client = await Client.create({
    agencyId,
    name,
    email: String(lead.email || '').trim() || undefined,
    phone: String(lead.phone || '').trim() || undefined,
    status: 'ativo',
    contactName: String(lead.name || '').trim() || undefined,
    source: 'comercial',
    notes: lead.notes ? String(lead.notes) : undefined,
  });

  const stage = normalizeLeadStage(lead.status);
  const nextStatus = stage === 'fechado' ? 'fechado' : 'proposta';

  const updatedLead = await AgencyLead.update(lead.id, {
    status: nextStatus,
    convertedClientId: client.id,
  });

  return {
    clientId: client.id,
    client,
    lead: updatedLead,
    alreadyLinked: false,
  };
}
