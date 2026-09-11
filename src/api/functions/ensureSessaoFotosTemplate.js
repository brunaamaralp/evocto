import { Service } from '@/api/entities';
import {
  SESSAO_FOTOS_TEMPLATE,
  SESSAO_FOTOS_TEMPLATE_SLUG,
  SESSAO_FOTOS_TEMPLATE_VERSION,
  isSessaoFotosService,
} from '@/templates/sessaoFotosTemplate';
import { normalizeDeliverableTaskShapes } from '@/templates/cicloMensal4SemanasTemplate';

function isTemplateFlag(value) {
  return value === true || value === 'true' || value === 1;
}

async function listAgencyTemplates(agencyId) {
  let list = [];
  try {
    const byFlag = await Service.filter({ agencyId, is_template: true }, '-updated_date', 100);
    list = Array.isArray(byFlag) ? byFlag : [];
  } catch (err) {
    console.warn('[ensureSessaoFotosTemplate] filter is_template falhou:', err);
  }

  if (list.length > 0) return list;

  try {
    const all = await Service.filter({ agencyId }, '-updated_date', 100);
    return (Array.isArray(all) ? all : []).filter((s) => isTemplateFlag(s.is_template));
  } catch (err) {
    console.warn('[ensureSessaoFotosTemplate] fallback list falhou:', err);
    return [];
  }
}

/**
 * Garante o template canônico "Sessão de Fotos" na agência.
 * Idempotente — mesmo padrão de ensureProducaoConteudoTemplate.
 */
export async function ensureSessaoFotosTemplate(agencyId) {
  if (!agencyId) {
    throw new Error('agencyId é obrigatório para garantir o template');
  }

  const list = await listAgencyTemplates(agencyId);
  const found = list.find(isSessaoFotosService);
  const canonicalDeliverables = normalizeDeliverableTaskShapes(
    SESSAO_FOTOS_TEMPLATE.deliverables
  );

  if (found) {
    const needsUpdate =
      !found.deliverables?.length ||
      found.name !== SESSAO_FOTOS_TEMPLATE.name ||
      found.description !== SESSAO_FOTOS_TEMPLATE.description ||
      found.template_version !== SESSAO_FOTOS_TEMPLATE_VERSION ||
      found.offering_key !== SESSAO_FOTOS_TEMPLATE_SLUG ||
      found.slug !== SESSAO_FOTOS_TEMPLATE_SLUG ||
      found.pipeline !== SESSAO_FOTOS_TEMPLATE_SLUG ||
      !found.content_item_template ||
      !isTemplateFlag(found.is_template);

    if (needsUpdate) {
      const updated = await Service.update(found.id, {
        name: SESSAO_FOTOS_TEMPLATE.name,
        deliverables: canonicalDeliverables,
        description: SESSAO_FOTOS_TEMPLATE.description,
        offering_key: SESSAO_FOTOS_TEMPLATE_SLUG,
        slug: SESSAO_FOTOS_TEMPLATE_SLUG,
        template_version: SESSAO_FOTOS_TEMPLATE_VERSION,
        pipeline: SESSAO_FOTOS_TEMPLATE_SLUG,
        content_item_template: SESSAO_FOTOS_TEMPLATE.content_item_template,
        category: SESSAO_FOTOS_TEMPLATE.category,
        is_template: true,
        is_active: true,
        status: found.status || 'active',
      });
      return (
        updated || {
          ...found,
          name: SESSAO_FOTOS_TEMPLATE.name,
          deliverables: canonicalDeliverables,
          pipeline: SESSAO_FOTOS_TEMPLATE_SLUG,
          content_item_template: SESSAO_FOTOS_TEMPLATE.content_item_template,
          template_version: SESSAO_FOTOS_TEMPLATE_VERSION,
        }
      );
    }
    return found;
  }

  const { id: _canonicalId, ...templateData } = SESSAO_FOTOS_TEMPLATE;
  const created = await Service.create({
    ...templateData,
    agencyId,
    is_template: true,
    is_active: true,
    status: 'active',
    slug: SESSAO_FOTOS_TEMPLATE_SLUG,
    offering_key: SESSAO_FOTOS_TEMPLATE_SLUG,
    template_version: SESSAO_FOTOS_TEMPLATE_VERSION,
    pipeline: SESSAO_FOTOS_TEMPLATE_SLUG,
    deliverables: canonicalDeliverables,
  });

  if (!created?.id) {
    throw new Error('Falha ao criar o template Sessão de Fotos');
  }

  return created;
}

export default ensureSessaoFotosTemplate;
