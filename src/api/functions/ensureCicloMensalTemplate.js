import { Service } from '@/api/entities';
import {
  CICLO_MENSAL_4_SEMANAS_TEMPLATE,
  CICLO_MENSAL_TEMPLATE_SLUG,
  CICLO_MENSAL_TEMPLATE_VERSION,
  normalizeDeliverableTaskShapes,
} from '@/templates/cicloMensal4SemanasTemplate';

function isTemplateFlag(value) {
  return value === true || value === 'true' || value === 1;
}

function isCicloMensalTemplate(t) {
  if (!t) return false;
  return (
    t.slug === CICLO_MENSAL_TEMPLATE_SLUG ||
    t.offering_key === CICLO_MENSAL_TEMPLATE_SLUG ||
    t.name === CICLO_MENSAL_4_SEMANAS_TEMPLATE.name ||
    t.name === 'Ciclo Mensal 4 Semanas' ||
    t.offering_key === 'ciclo_mensal_4_semanas'
  );
}

async function listAgencyTemplates(agencyId) {
  let list = [];
  try {
    const byFlag = await Service.filter({ agencyId, is_template: true }, '-updated_date', 100);
    list = Array.isArray(byFlag) ? byFlag : [];
  } catch (err) {
    console.warn('[ensureCicloMensalTemplate] filter is_template falhou:', err);
  }

  if (list.length > 0) return list;

  // Fallback: boolean index/query pode falhar — lista por agency e filtra no cliente
  try {
    const all = await Service.filter({ agencyId }, '-updated_date', 100);
    return (Array.isArray(all) ? all : []).filter((s) => isTemplateFlag(s.is_template));
  } catch (err) {
    console.warn('[ensureCicloMensalTemplate] fallback list falhou:', err);
    return [];
  }
}

/**
 * Garante que a agência tenha o template canônico do ciclo mensal de campanhas.
 * Idempotente: reutiliza o template existente por slug/nome e sincroniza a versão
 * canônica, para que o ciclo continue sendo editável sem criar um fluxo paralelo.
 */
export async function ensureCicloMensalTemplate(agencyId) {
  if (!agencyId) {
    throw new Error('agencyId é obrigatório para garantir o template');
  }

  const list = await listAgencyTemplates(agencyId);
  const found = list.find(isCicloMensalTemplate);

  if (found) {
    const deliverables = normalizeDeliverableTaskShapes(
      found.deliverables?.length
        ? found.deliverables
        : CICLO_MENSAL_4_SEMANAS_TEMPLATE.deliverables
    );
    const needsUpdate =
      !found.deliverables?.length ||
      found.name !== CICLO_MENSAL_4_SEMANAS_TEMPLATE.name ||
      found.description !== CICLO_MENSAL_4_SEMANAS_TEMPLATE.description ||
      found.template_version !== CICLO_MENSAL_TEMPLATE_VERSION ||
      found.offering_key !== CICLO_MENSAL_TEMPLATE_SLUG ||
      found.slug !== CICLO_MENSAL_TEMPLATE_SLUG ||
      !isTemplateFlag(found.is_template);

    if (needsUpdate) {
      const updated = await Service.update(found.id, {
        name: CICLO_MENSAL_4_SEMANAS_TEMPLATE.name,
        deliverables,
        description: CICLO_MENSAL_4_SEMANAS_TEMPLATE.description,
        offering_key: CICLO_MENSAL_TEMPLATE_SLUG,
        slug: CICLO_MENSAL_TEMPLATE_SLUG,
        template_version: CICLO_MENSAL_TEMPLATE_VERSION,
        pricing: CICLO_MENSAL_4_SEMANAS_TEMPLATE.pricing,
        is_template: true,
        is_active: true,
        category: CICLO_MENSAL_4_SEMANAS_TEMPLATE.category,
        status: found.status || 'active',
      });
      return updated || {
        ...found,
        name: CICLO_MENSAL_4_SEMANAS_TEMPLATE.name,
        deliverables,
        description: CICLO_MENSAL_4_SEMANAS_TEMPLATE.description,
        offering_key: CICLO_MENSAL_TEMPLATE_SLUG,
        slug: CICLO_MENSAL_TEMPLATE_SLUG,
        template_version: CICLO_MENSAL_TEMPLATE_VERSION,
        is_template: true,
      };
    }
    return found;
  }

  const { id: _canonicalId, ...templateData } = CICLO_MENSAL_4_SEMANAS_TEMPLATE;
  const created = await Service.create({
    ...templateData,
    agencyId,
    is_template: true,
    is_active: true,
    status: 'active',
    slug: CICLO_MENSAL_TEMPLATE_SLUG,
    offering_key: CICLO_MENSAL_TEMPLATE_SLUG,
    template_version: CICLO_MENSAL_TEMPLATE_VERSION,
    deliverables: normalizeDeliverableTaskShapes(templateData.deliverables),
  });

  if (!created?.id) {
    throw new Error('Falha ao criar o template Ciclo Mensal de Campanhas');
  }

  return created;
}

export default ensureCicloMensalTemplate;
