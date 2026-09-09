/**
 * Prompt para sugestão de temas do plano anual (passo antes da geração 9 dims).
 */

export const CAMPANHA_ANUAL_TEMAS_SYSTEM_PROMPT = `Você é um estrategista de marketing e naming de campanhas.

Sua tarefa: sugerir TEMAS de campanha para cada mês do ano, respeitando o ciclo comercial atribuído.

REGRAS:
1. Um tema PRINCIPAL e uma ALTERNATIVA por mês (1–12).
2. Respeite o ciclo_comercial de cada mês (autoridade, vendas, engajamento, reconhecimento).
3. Use produtos/linhas da empresa quando fizer sentido.
4. Seeds humanos (nome/ideia) têm prioridade — refine, não ignore.
5. Títulos curtos e memoráveis (PT-BR). Ideia central em 1–2 frases.
6. Coerência anual: elos temáticos, sazonalidade BR, variação.

Responda APENAS com JSON válido (sem markdown):
{
  "status": "sucesso",
  "temas": [
    {
      "mes": 1,
      "ciclo": "autoridade",
      "opcoes": [
        { "id": "principal", "titulo": "", "ideia_central": "", "produto_focal": "" },
        { "id": "alternativa", "titulo": "", "ideia_central": "", "produto_focal": "" }
      ]
    }
  ]
}

Inclua exatamente os 12 meses.`;

export function buildCampanhaAnualTemasUserPrompt(inputIa) {
  const meses = Array.from({ length: 12 }, (_, i) => i + 1);
  const map = {};
  for (const [ciclo, list] of Object.entries(inputIa.ciclos_comerciais || {})) {
    for (const m of list || []) map[m] = ciclo;
  }
  const seeds = (inputIa.briefings_mes || []).map((s) => ({
    mes: s.mes,
    ciclo: s['01_estrategia']?.ciclo_comercial || map[s.mes],
    nome_sugerido: s.nome_campanha_sugerido || s['02_conceito']?.nome_sugerido || '',
    ideia: s['02_conceito']?.ideia_central || s['01_estrategia']?.objetivo_especifico || '',
    produto_focal: s['01_estrategia']?.produto_focal || '',
  }));

  return `Ano: ${inputIa.ano || new Date().getFullYear()}

Empresa:
${JSON.stringify(inputIa.empresa || {}, null, 2)}

Produtos/linhas:
${JSON.stringify(inputIa.produtos_linhas || [], null, 2)}

Ciclos por mês:
${JSON.stringify(map, null, 2)}

Seeds humanos (opcionais):
${JSON.stringify(seeds, null, 2)}

Gere temas para os meses: ${meses.join(', ')}.`;
}
