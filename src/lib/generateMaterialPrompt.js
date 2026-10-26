/**
 * Prompts para geração de proposta (DOCX/PDF) ou apresentação (PPTX) via Claude Skills.
 * O JSON de contexto segue src/lib/generateMaterialSchema.js.
 */
import {
  buildFieldLegendForPrompt,
  buildGenerateMaterialContext,
  validateGenerateMaterialContext,
} from './generateMaterialSchema.js';
import { narrativaBrandPromptBlock } from './narrativaBrandKit.js';

const BRAND_BLOCK = narrativaBrandPromptBlock();

export const GENERATE_MATERIAL_SYSTEM_PROPOSTA = `Você é um estrategista do Estúdio Narrativa (agência de marketing) e redator comercial.
Gere uma proposta comercial profissional em português do Brasil, usando a skill de documento disponível e o kit de marca Narrativa.
Estrutura obrigatória:
1. Capa (agência Narrativa, cliente, data, título)
2. Contexto e desafio do cliente
3. Entendimento / diagnóstico
4. Solução proposta (escopo e entregáveis)
5. Como trabalhamos (metodologia breve)
6. Investimento e condições (use os valores fornecidos; se faltarem, use placeholders claros como [INVESTIMENTO])
7. Prazo e próximos passos
8. Contato

Regras: tom profissional e claro; sem jargão vazio; não invente números de resultados; respeite tom de marca e restrições do briefing.
Prioridade de dados: overrides.* > dna.* > inferência mínima.
Use apenas campos do contrato (schema); ignore chaves desconhecidas.

${BRAND_BLOCK}`;

export const GENERATE_MATERIAL_SYSTEM_APRESENTACAO = `Você é um estrategista do Estúdio Narrativa.
Gere uma apresentação (PowerPoint) profissional em português do Brasil, usando a skill pptx e o kit de marca Narrativa.
Slides sugeridos (6–10):
1. Capa
2. Agenda
3. Desafio do cliente
4. Oportunidade
5. Proposta de valor / solução
6. Escopo e entregáveis
7. Cronograma / prazo
8. Investimento (placeholders se necessário)
9. Próximos passos
10. Encerramento / contato

Regras: títulos curtos; bullets objetivos; visual alinhado ao kit Narrativa; sem inventar métricas; respeite tom de marca e restrições.
Prioridade de dados: overrides.* > dna.* > inferência mínima.
Use apenas campos do contrato (schema); ignore chaves desconhecidas.

${BRAND_BLOCK}`;

/**
 * @param {'proposta'|'apresentacao'} tipo
 * @param {{
 *   client?: object,
 *   empresa?: object,
 *   briefing?: object,
 *   overrides?: object,
 *   agencyName?: string,
 *   clientId?: string,
 * }} ctx
 * @returns {{ userContent: string, canonical: object, validation: object }}
 */
export function buildGenerateMaterialUserPrompt(tipo, ctx = {}) {
  const canonical = buildGenerateMaterialContext(tipo, ctx);
  const validation = validateGenerateMaterialContext(canonical);

  const kindLabel =
    canonical.tipo === 'apresentacao'
      ? 'apresentação (PPTX)'
      : 'proposta comercial (DOCX)';

  const legend = buildFieldLegendForPrompt();
  const warningsBlock =
    canonical.qualidade?.warnings?.length > 0
      ? [
          '',
          'Avisos de qualidade (complete mentalmente com placeholders quando necessário):',
          ...canonical.qualidade.warnings.map((w) => `- ${w.path}: ${w.message}`),
        ]
      : [];

  const userContent = [
    `Crie uma ${kindLabel} com base no JSON de contexto (schema v${canonical.schema_version}).`,
    'Overrides têm prioridade sobre DNA. Campos null/vazios → placeholders claros ([INVESTIMENTO], [PRAZO], etc.).',
    'Aplique o kit de marca Narrativa (cores, tipografia, logos/isotipo da skill narrativa-marca quando disponível).',
    '',
    'Dicionário de campos do contrato:',
    legend,
    ...warningsBlock,
    '',
    '```json',
    JSON.stringify(canonical, null, 2),
    '```',
  ].join('\n');

  return { userContent, canonical, validation };
}

/** Compat: retorna só a string do user prompt. */
export function buildGenerateMaterialUserPromptText(tipo, ctx = {}) {
  return buildGenerateMaterialUserPrompt(tipo, ctx).userContent;
}

export function systemPromptForTipo(tipo) {
  return tipo === 'apresentacao'
    ? GENERATE_MATERIAL_SYSTEM_APRESENTACAO
    : GENERATE_MATERIAL_SYSTEM_PROPOSTA;
}
