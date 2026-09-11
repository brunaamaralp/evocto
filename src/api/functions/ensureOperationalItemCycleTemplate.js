import { Service } from '@/api/entities';
import { normalizeDeliverableTaskShapes } from '@/templates/cicloMensal4SemanasTemplate';
import {
  getOperationalItemCycleTemplate,
} from '@/templates/operationalItemCyclePresets';
import { matchesItemCycleTemplate } from '@/templates/buildItemCycleServiceTemplate';

function isTemplateFlag(value) {
  return value === true || value === 'true' || value === 1;
}

async function listAgencyTemplates(agencyId) {
  let list = [];
  try {
    const byFlag = await Service.filter({ agencyId, is_template: true }, '-updated_date', 150);
    list = Array.isArray(byFlag) ? byFlag : [];
  } catch (err) {
    console.warn('[ensureOperationalItemCycleTemplate] filter is_template falhou:', err);
  }

  if (list.length > 0) return list;

  try {
    const all = await Service.filter({ agencyId }, '-updated_date', 150);
    return (Array.isArray(all) ? all : []).filter((s) => isTemplateFlag(s.is_template));
  } catch (err) {
    console.warn('[ensureOperationalItemCycleTemplate] fallback list falhou:', err);
    return [];
  }
}

/**
 * Garante um template operacional (item-cycle) na agência, por offering_key.
 * Idempotente — mesmo padrão de ensureSessaoFotosTemplate / ensureProducaoConteudoTemplate.
 */
export async function ensureOperationalItemCycleTemplate(agencyId, key) {
  if (!agencyId) {
    throw new Error('agencyId é obrigatório para garantir o template');
  }

  const canonical = getOperationalItemCycleTemplate(key);
  if (!canonical) {
    throw new Error(`Template operacional desconhecido: ${key}`);
  }

  const list = await listAgencyTemplates(agencyId);
  const found = list.find((t) => matchesItemCycleTemplate(t, key));
  const canonicalDeliverables = normalizeDeliverableTaskShapes(canonical.deliverables);

  if (found) {
    const needsUpdate =
      !found.deliverables?.length ||
      found.name !== canonical.name ||
      found.description !== canonical.description ||
      found.template_version !== canonical.template_version ||
      found.offering_key !== canonical.slug ||
      found.slug !== canonical.slug ||
      found.pipeline !== canonical.pipeline ||
      !found.content_item_template ||
      !isTemplateFlag(found.is_template);

    if (needsUpdate) {
      const updated = await Service.update(found.id, {
        name: canonical.name,
        deliverables: canonicalDeliverables,
        description: canonical.description,
        offering_key: canonical.slug,
        slug: canonical.slug,
        template_version: canonical.template_version,
        pipeline: canonical.pipeline,
        content_item_template: canonical.content_item_template,
        category: canonical.category,
        is_template: true,
        is_active: true,
        status: found.status || 'active',
      });
      return (
        updated || {
          ...found,
          name: canonical.name,
          deliverables: canonicalDeliverables,
          pipeline: canonical.pipeline,
          content_item_template: canonical.content_item_template,
          template_version: canonical.template_version,
        }
      );
    }
    return found;
  }

  const { id: _canonicalId, ...templateData } = canonical;
  const created = await Service.create({
    ...templateData,
    agencyId,
    is_template: true,
    is_active: true,
    status: 'active',
    slug: canonical.slug,
    offering_key: canonical.slug,
    template_version: canonical.template_version,
    pipeline: canonical.pipeline,
    deliverables: canonicalDeliverables,
  });

  if (!created?.id) {
    throw new Error(`Falha ao criar o template ${canonical.name}`);
  }

  return created;
}

export default ensureOperationalItemCycleTemplate;
