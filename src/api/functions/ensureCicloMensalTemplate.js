import { Service } from '@/api/entities';
import {
  CICLO_MENSAL_4_SEMANAS_TEMPLATE,
  CICLO_MENSAL_TEMPLATE_SLUG,
  normalizeDeliverableTaskShapes,
} from '@/templates/cicloMensal4SemanasTemplate';

/**
 * Garante que a agência tenha o template "Ciclo Mensal 4 Semanas" como Service.is_template.
 * Idempotente: reutiliza se já existir por slug ou nome.
 */
export async function ensureCicloMensalTemplate(agencyId) {
  if (!agencyId) {
    throw new Error('agencyId é obrigatório para garantir o template');
  }

  const existing = await Service.filter({ agencyId, is_template: true }).catch(() => []);
  const list = Array.isArray(existing) ? existing : [];

  const found = list.find(
    (t) =>
      t.slug === CICLO_MENSAL_TEMPLATE_SLUG ||
      t.offering_key === CICLO_MENSAL_TEMPLATE_SLUG ||
      t.name === CICLO_MENSAL_4_SEMANAS_TEMPLATE.name
  );

  if (found) {
    const hasMeetingTask = (found.deliverables || []).some((d) =>
      (d.task_templates || d.tasks || []).some(
        (t) => t.id === 'reuniao_mensal_relatorio'
      )
    );
    const deliverables = normalizeDeliverableTaskShapes(
      hasMeetingTask
        ? found.deliverables || []
        : CICLO_MENSAL_4_SEMANAS_TEMPLATE.deliverables
    );
    const needsUpdate =
      !hasMeetingTask ||
      JSON.stringify(deliverables) !== JSON.stringify(found.deliverables || []);
    if (needsUpdate) {
      const updated = await Service.update(found.id, {
        deliverables,
        description: CICLO_MENSAL_4_SEMANAS_TEMPLATE.description,
      });
      return updated || { ...found, deliverables };
    }
    return found;
  }

  const { id: _canonicalId, ...templateData } = CICLO_MENSAL_4_SEMANAS_TEMPLATE;
  const created = await Service.create({
    ...templateData,
    agencyId,
    is_template: true,
    is_active: true,
    slug: CICLO_MENSAL_TEMPLATE_SLUG,
    offering_key: CICLO_MENSAL_TEMPLATE_SLUG,
    deliverables: normalizeDeliverableTaskShapes(templateData.deliverables),
  });

  return created;
}

export default ensureCicloMensalTemplate;
