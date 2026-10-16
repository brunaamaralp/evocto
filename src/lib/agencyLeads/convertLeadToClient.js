/**
 * Converte lead fechado em Client + marca lead + tarefa interna de onboarding.
 */
import { Client, Task, AgencyLead } from '@/api/entities';
import { normalizeLeadStage } from './constants.js';

/**
 * @param {object} opts
 * @param {object} opts.lead
 * @param {string} opts.agencyId
 * @param {string} [opts.userId]
 * @param {boolean} [opts.createOnboardingTask=true]
 */
export async function convertLeadToClient({
  lead,
  agencyId,
  userId = null,
  createOnboardingTask = true,
} = {}) {
  if (!lead?.id) throw new Error('lead_obrigatorio');
  if (!agencyId) throw new Error('agencyId_obrigatorio');

  if (lead.convertedClientId) {
    return {
      clientId: lead.convertedClientId,
      alreadyConverted: true,
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

  const updatedLead = await AgencyLead.update(lead.id, {
    status: 'fechado',
    convertedClientId: client.id,
  });

  let onboardingTask = null;
  if (createOnboardingTask) {
    try {
      onboardingTask = await Task.create({
        agencyId,
        clientId: client.id,
        title: `Onboarding: ${name}`,
        description: 'Tarefa criada automaticamente ao converter lead do Comercial.',
        status: 'todo',
        priority: 'medium',
        type: 'administrativo',
        clientVisible: false,
        tags: ['interno', 'onboarding', 'comercial'],
        assignedBy: userId || null,
        assigneeId: userId || null,
        assignedTo: userId || null,
      });
    } catch (err) {
      console.warn('[comercial] onboarding task failed:', err?.message || err);
    }
  }

  return {
    clientId: client.id,
    client,
    lead: updatedLead,
    onboardingTask,
    alreadyConverted: false,
  };
}

export function canConvertLead(lead) {
  if (!lead || lead.convertedClientId) return false;
  const stage = normalizeLeadStage(lead.status);
  return stage === 'fechado' || stage === 'proposta';
}
