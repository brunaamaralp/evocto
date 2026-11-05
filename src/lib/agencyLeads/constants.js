/** Estágios do CRM leve da agência (SPEC_CONTROLE_AGENCIA P2.1 — opção A). */

export const LEAD_STAGES = [
  { id: 'lead', label: 'Lead' },
  { id: 'qualificacao', label: 'Qualificação' },
  { id: 'proposta', label: 'Proposta' },
  { id: 'fechado', label: 'Fechado' },
  { id: 'perdido', label: 'Perdido' },
];

export const LEAD_STAGE_IDS = LEAD_STAGES.map((s) => s.id);

export const LEAD_STAGE_LABELS = Object.fromEntries(
  LEAD_STAGES.map((s) => [s.id, s.label])
);

export function normalizeLeadStage(value) {
  const s = String(value || '').trim().toLowerCase();
  return LEAD_STAGE_IDS.includes(s) ? s : 'lead';
}

export function formatLeadValue(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  try {
    return n.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    });
  } catch {
    return `R$ ${Math.round(n)}`;
  }
}

/** Estágios em que o lead ainda está "em aberto" (pede acompanhamento). */
export const OPEN_LEAD_STAGES = new Set(['lead', 'qualificacao', 'proposta']);

export function isOpenLeadStage(value) {
  return OPEN_LEAD_STAGES.has(normalizeLeadStage(value));
}

/** Origem do lead. `id` é persistido; `label` é UI. */
export const LEAD_SOURCES = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'formulario', label: 'Formulário' },
  { id: 'indicacao', label: 'Indicação' },
  { id: 'site', label: 'Site' },
  { id: 'campanha', label: 'Campanha' },
  { id: 'anuncio', label: 'Anúncio' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'evento', label: 'Evento' },
  { id: 'prospeccao', label: 'Prospecção ativa' },
  { id: 'outro', label: 'Outro' },
];

/** Tipos de interação da timeline. */
export const INTERACTION_TYPES = [
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'ligacao', label: 'Ligação' },
  { id: 'email', label: 'E-mail' },
  { id: 'reuniao', label: 'Reunião online' },
  { id: 'presencial', label: 'Presencial' },
  { id: 'outro', label: 'Outro' },
];

/** Status da negociação (complementa o estágio do pipeline). */
export const NEGOTIATION_STATUSES = [
  { id: 'nao_iniciada', label: 'Não iniciada' },
  { id: 'em_conversa', label: 'Em conversa' },
  { id: 'proposta_enviada', label: 'Proposta enviada' },
  { id: 'em_negociacao', label: 'Em negociação' },
  { id: 'aguardando_cliente', label: 'Aguardando cliente' },
  { id: 'ganha', label: 'Ganha' },
  { id: 'perdida', label: 'Perdida' },
];

export const LOSS_REASONS = [
  { id: 'preco', label: 'Preço / orçamento' },
  { id: 'concorrente', label: 'Escolheu concorrente' },
  { id: 'timing', label: 'Momento / prazo' },
  { id: 'sem_resposta', label: 'Sem resposta' },
  { id: 'escopo', label: 'Escopo não atendido' },
  { id: 'desistiu', label: 'Desistiu do projeto' },
  { id: 'outro', label: 'Outro' },
];

/** Tipos de atividade (tarefas vinculadas ao lead — tabela `tasks`). */
export const LEAD_TASK_TYPES = [
  { id: 'follow_up', label: 'Próximo contato' },
  { id: 'tarefa', label: 'Tarefa' },
  { id: 'lembrete', label: 'Lembrete' },
];

function toLabelMap(list) {
  return Object.fromEntries(list.map((item) => [item.id, item.label]));
}

export const LEAD_SOURCE_LABELS = toLabelMap(LEAD_SOURCES);
export const INTERACTION_TYPE_LABELS = toLabelMap(INTERACTION_TYPES);
export const NEGOTIATION_STATUS_LABELS = toLabelMap(NEGOTIATION_STATUSES);
export const LOSS_REASON_LABELS = toLabelMap(LOSS_REASONS);
export const LEAD_TASK_TYPE_LABELS = toLabelMap(LEAD_TASK_TYPES);

/** Rótulo amigável; valores livres antigos são exibidos como vieram. */
export function labelFrom(map, value) {
  const key = String(value || '').trim();
  if (!key) return '';
  return map[key] || key;
}
