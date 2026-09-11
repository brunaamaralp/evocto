/**
 * Prompt para sugestão de temas do plano anual (passo antes da geração 9 dims).
 */
import {
  calendarYearForPlanMonth,
  normalizeMesInicio,
  planMonthWindow,
} from '@/lib/campanhaAnualSchema';

export const CAMPANHA_ANUAL_TEMAS_SYSTEM_PROMPT = `Você é um estrategista de marketing e naming de campanhas.

Sua tarefa: sugerir TEMAS de campanha para cada mês do plano (12 meses a partir do mês de início).

REGRAS:
1. Um tema PRINCIPAL e uma ALTERNATIVA por mês civil (campo "mes" 1–12).
2. Ideias humanas (nome/conceito) têm prioridade máxima — refine e expanda, não ignore.
3. Ciclo comercial do calendário é uma META (orientação), não uma camisa de força. Se a ideia humana apontar naturalmente para outro ciclo, priorize a ideia e marque o ciclo que melhor descreve o tema.
4. Use produtos/linhas da empresa (nome e descrição) quando fizer sentido.
5. Títulos curtos e memoráveis (PT-BR). Ideia central em 1–2 frases.
6. Coerência no período: elos temáticos, sazonalidade BR, variação.
7. Se o plano começa no meio do ano, meses após dezembro são do ano civil seguinte.

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

Inclua exatamente os 12 meses do período do plano.`;

export function buildCampanhaAnualTemasUserPrompt(inputIa) {
  const mesInicio = normalizeMesInicio(inputIa.mes_inicio, 1);
  const meses = planMonthWindow(mesInicio);
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

  const endMes = meses[11];
  const y0 = inputIa.ano || new Date().getFullYear();
  const y1 = calendarYearForPlanMonth(endMes, mesInicio, y0);
  const periodo =
    mesInicio === 1 ? String(y0) : `${mesInicio}/${y0}–${endMes}/${y1}`;

  return `Período do plano (12 meses a partir do mês ${mesInicio}): ${periodo}
Ordem dos meses no plano: ${meses.join(', ')} (mês civil; após dezembro continua no ano seguinte).

Empresa:
${JSON.stringify(inputIa.empresa || {}, null, 2)}

Produtos/linhas (nome e descrição):
${JSON.stringify(
  (inputIa.produtos_linhas || []).map((p) => ({
    id: p.id,
    nome: p.nome,
    descricao: p.descricao,
  })),
  null,
  2
)}

Ciclos por mês civil:
${JSON.stringify(map, null, 2)}

Ideias humanas (opcionais):
${JSON.stringify(seeds, null, 2)}

Gere temas para os meses na ordem do plano: ${meses.join(', ')}.`;
}
