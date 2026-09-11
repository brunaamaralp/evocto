import { Service } from '@/api/entities';
import {
  PRODUCAO_CONTEUDO_TEMPLATE,
  PRODUCAO_CONTEUDO_TEMPLATE_SLUG,
  PRODUCAO_CONTEUDO_TEMPLATE_VERSION,
  isProducaoConteudoService,
} from '@/templates/producaoConteudoTemplate';
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
    console.warn('[ensureProducaoConteudoTemplate] filter is_template falhou:', err);
  }

  if (list.length > 0) return list;

  try {
    const all = await Service.filter({ agencyId }, '-updated_date', 100);
    return (Array.isArray(all) ? all : []).filter((s) => isTemplateFlag(s.is_template));
  } catch (err) {
    console.warn('[ensureProducaoConteudoTemplate] fallback list falhou:', err);
    return [];
  }
}

/**
 * Garante o template canônico "Produção de Conteúdo" na agência.
 * Idempotente — reutiliza por slug/nome e sincroniza versão/metadados.
 */
export async function ensureProducaoConteudoTemplate(agencyId) {
  if (!agencyId) {
    throw new Error('agencyId é obrigatório para garantir o template');
  }

  const list = await listAgencyTemplates(agencyId);
  const found = list.find(isProducaoConteudoService);
  const canonicalDeliverables = normalizeDeliverableTaskShapes(
    PRODUCAO_CONTEUDO_TEMPLATE.deliverables
  );

  if (found) {
    const needsUpdate =
      !found.deliverables?.length ||
      found.name !== PRODUCAO_CONTEUDO_TEMPLATE.name ||
      found.description !== PRODUCAO_CONTEUDO_TEMPLATE.description ||
      found.template_version !== PRODUCAO_CONTEUDO_TEMPLATE_VERSION ||
      found.offering_key !== PRODUCAO_CONTEUDO_TEMPLATE_SLUG ||
      found.slug !== PRODUCAO_CONTEUDO_TEMPLATE_SLUG ||
      found.pipeline !== 'conteudo' ||
      !found.content_item_template ||
      !isTemplateFlag(found.is_template);

    if (needsUpdate) {
      const updated = await Service.update(found.id, {
        name: PRODUCAO_CONTEUDO_TEMPLATE.name,
        deliverables: canonicalDeliverables,
        description: PRODUCAO_CONTEUDO_TEMPLATE.description,
        offering_key: PRODUCAO_CONTEUDO_TEMPLATE_SLUG,
        slug: PRODUCAO_CONTEUDO_TEMPLATE_SLUG,
        template_version: PRODUCAO_CONTEUDO_TEMPLATE_VERSION,
        pipeline: 'conteudo',
        content_item_template: PRODUCAO_CONTEUDO_TEMPLATE.content_item_template,
        category: PRODUCAO_CONTEUDO_TEMPLATE.category,
        is_template: true,
        is_active: true,
        status: found.status || 'active',
      });
      return (
        updated || {
          ...found,
          name: PRODUCAO_CONTEUDO_TEMPLATE.name,
          deliverables: canonicalDeliverables,
          pipeline: 'conteudo',
          content_item_template: PRODUCAO_CONTEUDO_TEMPLATE.content_item_template,
          template_version: PRODUCAO_CONTEUDO_TEMPLATE_VERSION,
        }
      );
    }
    return found;
  }

  const { id: _canonicalId, ...templateData } = PRODUCAO_CONTEUDO_TEMPLATE;
  const created = await Service.create({
    ...templateData,
    agencyId,
    is_template: true,
    is_active: true,
    status: 'active',
    slug: PRODUCAO_CONTEUDO_TEMPLATE_SLUG,
    offering_key: PRODUCAO_CONTEUDO_TEMPLATE_SLUG,
    template_version: PRODUCAO_CONTEUDO_TEMPLATE_VERSION,
    pipeline: 'conteudo',
    deliverables: canonicalDeliverables,
  });

  if (!created?.id) {
    throw new Error('Falha ao criar o template Produção de Conteúdo');
  }

  return created;
}

export default ensureProducaoConteudoTemplate;
