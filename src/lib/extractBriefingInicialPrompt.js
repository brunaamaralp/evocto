/**
 * Prompts para extrair DNA de empresa (briefing inicial) a partir de documento.
 * Objetivo: ler o briefing livre e responder às perguntas do formulário do sistema.
 */

export const EXTRACT_BRIEFING_INICIAL_SYSTEM_PROMPT = `Você é um analista de briefing. Sua tarefa é LER o documento do cliente e RESPONDER às perguntas do formulário de briefing inicial da agência.

O documento pode ser desorganizado (notas, proposal, brand book, e-mail). Você deve resumir e mapear o conteúdo para os campos do sistema — não copiar o arquivo inteiro.

Responda APENAS com um único objeto JSON válido (sem markdown, sem comentários):

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
  "campos_preenchidos": ["nome", "publico_alvo", "tom_brand", "orcamento_padrao_mensal", "formato_padrao", "restricoes_criativas", "produtos_linhas"],
  "avisos": ["string"]
}

Perguntas do formulário (responda cada uma com o que o documento permitir):

1) nome — Qual é o nome da empresa/marca?
2) publico_alvo — Quem é o público-alvo? Resuma em 1–3 frases em português.
3) tom_brand — Qual é o tom de voz / personalidade da marca? Frase curta.
4) orcamento_padrao_mensal — Qual o orçamento mensal de marketing/conteúdo em reais? Só número (ex.: 5000). null se não houver.
5) formato_padrao — Volume mensal típico: quantos vídeos, quantos designs, duração dos vídeos (ex.: "30-45s"). null nos números se não houver.
6) restricoes_criativas — O que a marca NÃO pode / não quer fazer? Resumo curto.
7) produtos_linhas — Quais produtos, linhas ou serviços principais? Uma entrada por item (máx. 12), com descrição quando existir.

Regras de qualidade:
- Inferir com cuidado a partir do contexto é permitido (ex.: descrever público a partir de personas).
- NÃO invente orçamento, preços, margem ou volumes se o documento não der base.
- Se um campo não tiver base no documento, use "" ou null e liste em avisos.
- campos_preenchidos: liste só os campos que você realmente preencheu com base no documento.
- Não inclua chaves fora do schema.`;

/**
 * @param {{ filename?: string, clientName?: string, textExcerpt?: string }} opts
 */
export function buildExtractBriefingInicialUserPrompt({
  filename = '',
  clientName = '',
  textExcerpt = '',
} = {}) {
  const parts = [
    'Leia o documento e preencha o JSON do briefing inicial (respostas às perguntas do formulário).',
    filename ? `Arquivo: ${filename}` : '',
    clientName
      ? `Nome do cliente já cadastrado no sistema (use só se o documento não tiver nome melhor): ${clientName}`
      : '',
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
      'O documento PDF está anexado. Leia o conteúdo completo e responda só com o JSON.'
    );
  }

  return parts.join('\n');
}
