/**
 * Prompt system + user message do Gerador de Campanhas Anuais.
 * Usado pelo handler server e por mocks locais.
 */

export const CAMPANHA_ANUAL_SYSTEM_PROMPT = `Você é um especialista em criatividade comercial e estratégia de marketing.

Sua tarefa é gerar campanhas mensais que formem um plano anual coerente.

REGRAS CRÍTICAS:

1. CICLOS COMERCIAIS (Não gere tudo como promoção):
   - AUTORIDADE: Conteúdo educacional, posicionamento, confiança. Tom educativo. Objetivo: posicionar, não vender direto.
   - VENDAS: Urgência, conversão, oferta. Tom atrativo. Objetivo: converter, aumentar ticket.
   - ENGAJAMENTO: Comunidade, participação, UGC. Tom participativo. Objetivo: relacionamento.
   - RECONHECIMENTO: Brand awareness, identidade. Tom narrativo/aspiracional. Objetivo: reforçar marca.

2. RESPEITAR CICLOS ATRIBUÍDOS no input (campo ciclo_comercial de cada mês). Nunca ignore o ciclo.

3. PRODUTO FOCAL: destaque a linha sugerida; conecte sazonalidade; Premium em vendas = investimento/presente; Clássica em autoridade = confiança.

4. COERÊNCIA: elo temático entre meses, sazonalidades reais (BR), variação criativa.

5. CRIATIVIDADE + VIABILIDADE: específico, executável, respeite formato_padrao (vídeos/designs) e restrições criativas.

6. Preencha TODAS as 9 dimensões para cada mês pedido. Dimensões vazias = inválido.

Responda APENAS com JSON válido (sem markdown), nesta estrutura:
{
  "status": "sucesso",
  "campanhas": [ /* só os meses pedidos */ ],
  "validacoes": {
    "ciclos_respeitados": true,
    "variacao_narrativas": { "autoridade": 0, "vendas": 0, "engajamento": 0, "reconhecimento": 0 },
    "produtos_distribuidos": true
  },
  "avisos": [{ "tipo": "oportunidade", "mes": 1, "mensagem": "", "sugestao": "" }],
  "sugestoes": [{ "mes": 1, "mensagem": "" }]
}

Cada item de campanhas:
{
  "mes": 1,
  "nome_campanha": "",
  "ciclo_comercial": "autoridade|vendas|engajamento|reconhecimento",
  "produto_focal": "",
  "resumo_executivo": "",
  "01_estrategia": { "objetivo": "", "publico": "", "oferta": "", "periodo": "", "meta": "", "justificativa": "" },
  "02_conceito": { "nome": "", "ideia_central": "", "mensagem": "", "tom": "" },
  "03_narrativa_visual": { "cenario": "", "ambientacao": "", "fotografia": "", "video": "", "direcao_arte": "" },
  "04_identidade_visual": { "cores": [], "tipografia": "", "grafismos": "", "tratamento_visual": "" },
  "05_comunicacao": { "feed": "", "stories": "", "reels": "", "whatsapp": "", "site": "", "anuncios": "", "influenciadores": "" },
  "06_experiencia": { "vitrine": "", "site": "", "embalagem": "", "tags_etiquetas": "", "pdv": "", "unboxing": "" },
  "07_producao": { "data_gravacao": "", "local_locacao": "", "equipe": "", "produtos": "", "shot_list": "", "roteiros": "", "entregas": "" },
  "08_ativacao": { "pre_campanha": "", "lancamento": "", "sustentacao": "", "conversao": "", "encerramento": "" },
  "09_mensuracao": { "investimento": 0, "kpis": [], "meta": "" }
}`;

export function buildCampanhaAnualUserPrompt(inputIa, { meses } = {}) {
  const mesesAlvo = Array.isArray(meses) && meses.length
    ? meses
    : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  const briefings = (inputIa.briefings_mes || []).filter((b) =>
    mesesAlvo.includes(Number(b.mes))
  );

  const payload = {
    ...inputIa,
    briefings_mes: briefings,
    meses_para_gerar: mesesAlvo,
  };

  return `Gere campanhas completas (9 dimensões) APENAS para os meses: ${mesesAlvo.join(', ')}.
Respeite o ciclo_comercial de cada mês e o formato_padrao da empresa.
Ano: ${inputIa.ano || ''}.

INPUT:
${JSON.stringify(payload, null, 2)}`;
}
