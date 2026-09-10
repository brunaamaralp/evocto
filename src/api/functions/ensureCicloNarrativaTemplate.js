import { Service } from '@/api/entities';
import {
  CICLO_NARRATIVA_7_FASES_TEMPLATE,
  CICLO_NARRATIVA_TEMPLATE_SLUG,
  CICLO_NARRATIVA_TEMPLATE_VERSION,
} from '@/templates/cicloNarrativa7FasesTemplate';
import { normalizeDeliverableTaskShapes } from '@/templates/cicloMensal4SemanasTemplate';

function isTemplateFlag(value) {
  return value === true || value === 'true' || value === 1;
}

function isNarrativaTemplate(t) {
  if (!t) return false;
  return (
    t.slug === CICLO_NARRATIVA_TEMPLATE_SLUG ||
    t.offering_key === CICLO_NARRATIVA_TEMPLATE_SLUG ||
    t.pipeline === 'narrativa' ||
    t.name === CICLO_NARRATIVA_7_FASES_TEMPLATE.name
  );
}

async function listAgencyTemplates(agencyId) {
  let list = [];
  try {
    const byFlag = await Service.filter({ agencyId, is_template: true }, '-updated_date', 100);
    list = Array.isArray(byFlag) ? byFlag : [];
  } catch (err) {
    console.warn('[ensureCicloNarrativaTemplate] filter is_template falhou:', err);
  }

  if (list.length > 0) return list;

  try {
    const all = await Service.filter({ agencyId }, '-updated_date', 100);
    return (Array.isArray(all) ? all : []).filter((s) => isTemplateFlag(s.is_template));
  } catch (err) {
    console.warn('[ensureCicloNarrativaTemplate] fallback list falhou:', err);
    return [];
  }
}

/**
 * Garante template Pipeline Narrativa (7 fases) na agência.
 * Paralelo ao ciclo mensal 4 semanas — não substitui o legado.
 */
export async function ensureCicloNarrativaTemplate(agencyId) {
  if (!agencyId) {
    throw new Error('agencyId é obrigatório para garantir o template Narrativa');
  }

  const list = await listAgencyTemplates(agencyId);
  const found = list.find(isNarrativaTemplate);
  const canonicalDeliverables = normalizeDeliverableTaskShapes(
    CICLO_NARRATIVA_7_FASES_TEMPLATE.deliverables
  );

  if (found) {
    const needsUpdate =
      !found.deliverables?.length ||
      found.name !== CICLO_NARRATIVA_7_FASES_TEMPLATE.name ||
      found.description !== CICLO_NARRATIVA_7_FASES_TEMPLATE.description ||
      found.template_version !== CICLO_NARRATIVA_TEMPLATE_VERSION ||
      found.offering_key !== CICLO_NARRATIVA_TEMPLATE_SLUG ||
      found.slug !== CICLO_NARRATIVA_TEMPLATE_SLUG ||
      found.pipeline !== 'narrativa' ||
      !isTemplateFlag(found.is_template);

    if (needsUpdate) {
      const updated = await Service.update(found.id, {
        name: CICLO_NARRATIVA_7_FASES_TEMPLATE.name,
        deliverables: canonicalDeliverables,
        description: CICLO_NARRATIVA_7_FASES_TEMPLATE.description,
        offering_key: CICLO_NARRATIVA_TEMPLATE_SLUG,
        slug: CICLO_NARRATIVA_TEMPLATE_SLUG,
        template_version: CICLO_NARRATIVA_TEMPLATE_VERSION,
        pipeline: 'narrativa',
        tipo_campanha: CICLO_NARRATIVA_7_FASES_TEMPLATE.tipo_campanha,
        is_template: true,
        is_active: true,
        category: CICLO_NARRATIVA_7_FASES_TEMPLATE.category,
        status: found.status || 'active',
      });
      return (
        updated || {
          ...found,
          name: CICLO_NARRATIVA_7_FASES_TEMPLATE.name,
          deliverables: canonicalDeliverables,
          pipeline: 'narrativa',
          template_version: CICLO_NARRATIVA_TEMPLATE_VERSION,
        }
      );
    }
    return found;
  }

  const { id: _canonicalId, ...templateData } = CICLO_NARRATIVA_7_FASES_TEMPLATE;
  const created = await Service.create({
    ...templateData,
    agencyId,
    is_template: true,
    is_active: true,
    status: 'active',
    slug: CICLO_NARRATIVA_TEMPLATE_SLUG,
    offering_key: CICLO_NARRATIVA_TEMPLATE_SLUG,
    template_version: CICLO_NARRATIVA_TEMPLATE_VERSION,
    pipeline: 'narrativa',
    deliverables: canonicalDeliverables,
  });

  if (!created?.id) {
    throw new Error('Falha ao criar o template Pipeline Narrativa (7 fases)');
  }

  return created;
}

export default ensureCicloNarrativaTemplate;
