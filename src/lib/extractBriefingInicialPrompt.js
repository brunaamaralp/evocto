/**
 * Prompts para extrair DNA de empresa (briefing inicial) a partir de documento.
 */

export const EXTRACT_BRIEFING_INICIAL_SYSTEM_PROMPT = `Você extrai o DNA de uma empresa a partir de um briefing/documento de marca.

Responda APENAS com um único objeto JSON válido (sem markdown, sem comentários) neste formato:

{
  "empresa": {
    "nome": "string",
    "publico_alvo": "string",
    "tom_brand": "string",
    "orcamento_padrao_mensal": number | null,
    "formato_padrao": {
      "num_videos": number | null,
      "num_designs": number | null,
      "duracao_videos": "string"
    },
    "restricoes_criativas": "string",
    "produtos_linhas": [
      {
        "nome": "string",
        "descricao": "string",
        "preco_faixa": { "min": number, "max": number },
        "margem": number,
        "sazonalidade": "string",
        "story": "string",
        "skus": ["string"]
      }
    ]
  },
  "avisos": ["string"]
}

Regras:
- Preencha só o que estiver explícito ou claramente inferível no documento.
- Use null ou "" quando não souber; não invente orçamento, preços ou volumes.
- publico_alvo e tom_brand: resuma em 1–3 frases/frases curtas em português.
- produtos_linhas: uma entrada por linha/produto/serviço relevante (máx. 12).
- orcamento_padrao_mensal: número em reais (sem R$, sem ponto de milhar).
- formato_padrao: volume mensal típico de conteúdo se o briefing mencionar.
- avisos: lacunas importantes (ex.: "orçamento não informado").
- Não inclua campos extras fora do schema.`;

/**
 * @param {{ filename?: string, clientName?: string, textExcerpt?: string }} opts
 */
export function buildExtractBriefingInicialUserPrompt({
  filename = '',
  clientName = '',
  textExcerpt = '',
} = {}) {
  const parts = [
    'Extraia o DNA da empresa para o formulário de briefing inicial.',
    filename ? `Arquivo: ${filename}` : '',
    clientName ? `Cliente no sistema (pode confirmar o nome): ${clientName}` : '',
  ].filter(Boolean);

  if (textExcerpt) {
    parts.push('');
    parts.push('Conteúdo do documento:');
    parts.push('---');
    parts.push(String(textExcerpt).slice(0, 120_000));
    parts.push('---');
  } else {
    parts.push('');
    parts.push(
      'O documento PDF está anexado. Leia o conteúdo e responda só com o JSON.'
    );
  }

  return parts.join('\n');
}
