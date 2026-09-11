import { ensureProducaoConteudoTemplate } from './ensureProducaoConteudoTemplate';
import { ensureSessaoFotosTemplate } from './ensureSessaoFotosTemplate';
import { ensureOperationalItemCycleTemplate } from './ensureOperationalItemCycleTemplate';
import { ITEM_CYCLE_OPTIONS } from '@/templates/itemCycleTemplateHelpers';
import { OPERATIONAL_ITEM_CYCLE_TEMPLATES } from '@/templates/operationalItemCyclePresets';

const LEGACY_ENSURERS = {
  producao_conteudo: ensureProducaoConteudoTemplate,
  sessao_fotos: ensureSessaoFotosTemplate,
};

/**
 * Garante todos os templates de ciclo operacional (item) na agência.
 * Retorna mapa { offering_key → Service template }.
 */
export async function ensureItemCycleTemplates(agencyId) {
  if (!agencyId) {
    throw new Error('agencyId é obrigatório para garantir templates de ciclo operacional');
  }

  const entries = await Promise.all(
    ITEM_CYCLE_OPTIONS.map(async (opt) => {
      const legacy = LEGACY_ENSURERS[opt.key];
      if (legacy) {
        const seeded = await legacy(agencyId);
        return [opt.key, seeded];
      }
      if (OPERATIONAL_ITEM_CYCLE_TEMPLATES[opt.key]) {
        const seeded = await ensureOperationalItemCycleTemplate(agencyId, opt.key);
        return [opt.key, seeded];
      }
      return [opt.key, null];
    })
  );

  return Object.fromEntries(entries);
}

export default ensureItemCycleTemplates;
