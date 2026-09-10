/**
 * Agent Claude — brainstorm de campanhas com contexto enriquecido.
 */
import { anthropic } from './anthropic.js';

function produtoNome(p) {
  if (p == null) return '';
  if (typeof p === 'string') return p;
  return p.nome || p.name || p.linha || '';
}

function listarCampanhas(ctx) {
  const campanhas = Array.isArray(ctx?.campanhas_anteriores) ? ctx.campanhas_anteriores : [];
  if (!campanhas.length) return 'Nenhuma campanha anterior registrada.';

  return campanhas
    .slice(0, 6)
    .map((c) => {
      const nome = c.nome_campanha || 'Sem nome';
      const ciclo = c.ciclo_comercial || '—';
      const when = `${c.mes ?? '?'}/${c.ano ?? '?'}`;
      if (!c.resultado) return `- ${when} · ${nome} (${ciclo}) — sem feedback`;
      const r = c.resultado;
      return `- ${when} · ${nome} (${ciclo}) — vendas ${r.vendas_realizado ?? '—'}%, engajamento ${r.engajamento_realizado ?? '—'}%, nota ${r.nota_geral ?? '—'}/10; funcionou: ${r.o_que_funcionou || '—'}; não funcionou: ${r.o_que_nao_funcionou || '—'}`;
    })
    .join('\n');
}

function listarPadroes(ctx) {
  const p = ctx?.padroes_performance;
  if (!p) return 'Ainda sem padrões suficientes (poucos feedbacks).';

  const linhas = [
    `Melhor ciclo VENDAS: ${p.melhor_ciclo_vendas || '—'}`,
    `Melhor ciclo ENGAJAMENTO: ${p.melhor_ciclo_engajamento || '—'}`,
  ];

  const ciclos = p.ciclos && typeof p.ciclos === 'object' ? Object.entries(p.ciclos) : [];
  for (const [ciclo, data] of ciclos) {
    linhas.push(
      `  · ${ciclo}: ${data.campanhas || 0} campanha(s), vendas avg ${Number(data.vendas_avg || 0).toFixed(1)}%, engajamento avg ${Number(data.engajamento_avg || 0).toFixed(1)}%`
    );
  }
  return linhas.join('\n');
}

function listarProdutos(ctx) {
  const produtos = Array.isArray(ctx?.empresa?.produtos) ? ctx.empresa.produtos : [];
  const nomes = produtos.map(produtoNome).filter(Boolean);
  return nomes.length ? nomes.map((n) => `- ${n}`).join('\n') : '- (não informados)';
}

/**
 * Formata contexto enriquecido (loadContext) em texto legível.
 * @param {object} ctx
 * @returns {string}
 */
export function formatarContexto(ctx) {
  const ciclos = ctx?.ciclos_comerciais_planejados || {};
  const ciclosTxt = Object.entries(ciclos)
    .map(([ciclo, meses]) => {
      const list = Array.isArray(meses) ? meses.join(', ') : String(meses ?? '');
      return `- ${ciclo}: meses ${list}`;
    })
    .join('\n');

  return `
## EMPRESA: ${ctx?.empresa?.nome || '—'}

### Últimas Campanhas:
${listarCampanhas(ctx)}

### Padrões:
${listarPadroes(ctx)}

### Ciclos Planejados:
${ciclosTxt || '—'}

Próximo ciclo: ${ctx?.ciclo_proximo || '—'}
  `.trim();
}

/**
 * System prompt do agente de brainstorm de campanhas.
 * @param {object} contextoEnriquecido - retorno de loadContext()
 * @returns {string}
 */
export function createAgentSystemPrompt(contextoEnriquecido) {
  const ctx = contextoEnriquecido || {};
  const empresaNome = ctx.empresa?.nome || 'a empresa';
  const cicloProximo = String(ctx.ciclo_proximo || 'vendas').toUpperCase();
  const mes = ctx.mesAtual ?? null;
  const ano = ctx.anoAtual ?? new Date().getFullYear();

  return `
Você é um agente criativo especializado em brainstorm de campanhas para negócios locais. Sua tarefa é ajudar Bruna a refinar ideias de campanhas mensais de forma colaborativa.

Empresa: ${empresaNome}${mes ? ` · mês ${mes}/${ano}` : ''}

Você carregou dados desta empresa:
- Últimas campanhas (com notas):
${listarCampanhas(ctx)}
- Padrões (qual ciclo funciona melhor):
${listarPadroes(ctx)}
- Próximo ciclo: ${cicloProximo}
- Produtos principais:
${listarProdutos(ctx)}

Use isso para sugerir estratégias baseadas em histórico real.

## COMPORTAMENTO

Quando Bruna disser "quero fazer X":
- Sugira 2-3 abordagens diferentes
- Cite histórico real (ex.: "Vi que VENDAS funcionou bem em jan com +15%...")
- Pergunte pra refinar
- Itere até ficar bom

Quando Bruna disser "salva isso" (ou equivalente: finalizar / gerar brief):
- Extraia as 9 dimensões: tipo, público, formato, ciclo, foco, tom, produtos, oportunidades, restrições
- Organize em JSON estruturado
- Retorne pronto pra salvar como brief

JSON ao salvar (somente quando pedir pra salvar):
\`\`\`json
{
  "mes": ${mes ?? 'null'},
  "ano": ${ano},
  "nome_campanha": "",
  "ciclo_comercial": "${String(ctx.ciclo_proximo || 'vendas')}",
  "tipo": "",
  "publico": "",
  "formato": "",
  "ciclo": "",
  "foco": "",
  "tom": "",
  "produtos": [],
  "oportunidades": "",
  "restricoes": ""
}
\`\`\`

## TOM

- Conversacional (não formal)
- Criativo mas pragmático
- Referencia dados reais
- Pergunta pra refinar (não impõe)
`.trim();
}

/**
 * Chama Claude com contexto enriquecido + histórico da conversa.
 * @param {string} conversationId
 * @param {object} contextoEnriquecido
 * @param {Array<{ role: string, content: string }>} historico
 * @param {string} userMessage
 * @returns {Promise<string>}
 */
export async function callClaudeAgent(
  conversationId,
  contextoEnriquecido,
  historico,
  userMessage
) {
  if (!userMessage || !String(userMessage).trim()) {
    throw new Error('userMessage obrigatório');
  }
  if (!contextoEnriquecido?.empresa) {
    throw new Error('contextoEnriquecido.empresa obrigatório');
  }

  const systemPrompt = createAgentSystemPrompt(contextoEnriquecido);

  const messages = [
    ...(Array.isArray(historico) ? historico : [])
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && m.content)
      .map((m) => ({
        role: m.role,
        content: String(m.content),
      })),
    { role: 'user', content: String(userMessage) },
  ];

  if (conversationId) void conversationId;

  const response = await anthropic.messages.create({
    model:
      process.env.ANTHROPIC_AGENT_MODEL ||
      process.env.ANTHROPIC_CAMPANHA_MODEL ||
      process.env.ANTHROPIC_MODEL ||
      'claude-opus-4-5',
    max_tokens: 3000,
    system: systemPrompt,
    messages,
  });

  const block = Array.isArray(response?.content) ? response.content[0] : null;
  if (!block) return '';
  if (typeof block === 'string') return block;
  return block.text || '';
}

export default {
  createAgentSystemPrompt,
  formatarContexto,
  callClaudeAgent,
};
