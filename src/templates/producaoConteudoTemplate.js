/**
 * Template canônico — Produção de Conteúdo
 *
 * Serviço operacional simplificado:
 *   ciclo → conteúdos (tarefas) → etapas de produção (checklist / subtarefas)
 *
 * Reutiliza a mesma infraestrutura de Service / CyclePlan / Task.
 * Não define máquina de estados, bloqueadores nem gates entre etapas.
 *
 * As etapas padrão (Roteiro → … → Agendamento) são apenas um ponto de partida
 * aplicado ao criar um conteúdo; o usuário pode renomear, excluir, adicionar
 * e reordenar pelo mecanismo já existente de checklist da tarefa.
 */

import { normalizeDeliverableTaskShapes } from './cicloMensal4SemanasTemplate.js';

export const PRODUCAO_CONTEUDO_TEMPLATE_KEY = 'producao_conteudo';
export const PRODUCAO_CONTEUDO_TEMPLATE_SLUG = 'producao_conteudo';
export const PRODUCAO_CONTEUDO_TEMPLATE_VERSION = '1.0';

/** Etapas padrão de um conteúdo (sem bloqueio entre si). */
export const DEFAULT_CONTENT_SUBTAREFAS = [
  {
    id: 'roteiro',
    title: 'Roteiro',
    text: 'Roteiro',
    description: 'Definir roteiro, copy e estrutura do conteúdo',
    type: 'producao',
    priority: 'high',
    estimated_hours: 1,
    duracao_dias: 1,
    bloqueador: null,
    required: true,
  },
  {
    id: 'producao',
    title: 'Produção',
    text: 'Produção',
    description: 'Captação / gravação / criação dos assets',
    type: 'producao',
    priority: 'high',
    estimated_hours: 2,
    duracao_dias: 2,
    bloqueador: null,
    required: true,
  },
  {
    id: 'edicao',
    title: 'Edição',
    text: 'Edição',
    description: 'Edição e finalização da peça',
    type: 'producao',
    priority: 'high',
    estimated_hours: 2,
    duracao_dias: 1,
    bloqueador: null,
    required: true,
  },
  {
    id: 'aprovacao',
    title: 'Aprovação',
    text: 'Aprovação',
    description: 'Revisão interna e/ou do cliente',
    type: 'revisao',
    priority: 'high',
    estimated_hours: 1,
    duracao_dias: 1,
    bloqueador: null,
    required: true,
  },
  {
    id: 'agendamento',
    title: 'Agendamento',
    text: 'Agendamento',
    description: 'Agendar ou publicar nos canais',
    type: 'midia',
    priority: 'medium',
    estimated_hours: 0.5,
    duracao_dias: 1,
    bloqueador: null,
    required: true,
  },
];

/**
 * Converte as etapas padrão no formato de checklist usado por Task / TaskDrawer.
 */
export function buildDefaultContentChecklist(prefix = 'pc') {
  const stamp = Date.now();
  return DEFAULT_CONTENT_SUBTAREFAS.map((step, index) => ({
    id: `${prefix}_${step.id}_${stamp}_${index}`,
    text: step.text || step.title,
    completed: false,
    required: step.required !== false,
    order: index,
    assignedTo: null,
    dueDate: null,
    evidenceRequired: false,
    evidenceUrls: [],
  }));
}

/**
 * Template de tarefa “conteúdo” — usado como referência ao criar peças no ciclo.
 * subtarefas espelham o padrão narrativa; na criação ad-hoc viram checklist.
 */
export const CONTENT_ITEM_TASK_TEMPLATE = {
  id: 'conteudo_padrao',
  title: 'Novo conteúdo',
  description: 'Peça de conteúdo do ciclo (ex.: Reel, Carrossel, Story, Foto)',
  type: 'creative',
  priority: 'medium',
  estimated_hours: 6,
  responsavel: null,
  duracao_dias: 5,
  bloqueador: null,
  notificacao: null,
  subtarefas: DEFAULT_CONTENT_SUBTAREFAS.map((s) => ({ ...s })),
  checklist: DEFAULT_CONTENT_SUBTAREFAS.map((s) => ({
    text: s.text || s.title,
    required: s.required !== false,
  })),
};

function withTaskTemplates(deliverable) {
  const tasks = Array.isArray(deliverable.tasks) ? deliverable.tasks : [];
  return {
    ...deliverable,
    task_templates: tasks.map((t) => ({
      ...t,
      subtarefas: Array.isArray(t.subtarefas) ? t.subtarefas.map((s) => ({ ...s })) : [],
    })),
  };
}

/** Fase-contêiner: o ciclo começa sem peças; conteúdos são criados sob demanda. */
const CONTEUDOS = {
  id: 'fase_conteudos',
  name: 'Conteúdos',
  description:
    'Conteúdos do ciclo — cada peça é uma tarefa principal com etapas de produção',
  order: 1,
  phase: 'conteudos',
  estimated_hours: 0,
  duration_business_days: 20,
  required: true,
  tasks: [],
};

export const PRODUCAO_CONTEUDO_TEMPLATE = {
  id: 'producao_conteudo_template',
  slug: PRODUCAO_CONTEUDO_TEMPLATE_SLUG,
  name: 'Produção de Conteúdo',
  description:
    'Produção recorrente de conteúdos para os canais da marca, organizada em ciclos. Cada conteúdo percorre um fluxo simplificado de planejamento, produção, aprovação e publicação.',
  category: 'conteudo',
  language: 'pt',
  offering_key: PRODUCAO_CONTEUDO_TEMPLATE_KEY,
  /** Pipeline operacional leve — não usa narrativa nem o legado 4 semanas. */
  pipeline: 'conteudo',

  pricing: {
    type: 'recorrente',
    base_price: 5000,
    currency: 'BRL',
    billing_cycle: 'monthly',
    estimated_hours: 40,
    duration_months: 1,
  },

  deliverables: normalizeDeliverableTaskShapes([withTaskTemplates(CONTEUDOS)]),

  /** Referência para seed de checklist ao criar um conteúdo no ciclo. */
  content_item_template: CONTENT_ITEM_TASK_TEMPLATE,

  kpis: [
    {
      id: 'conteudos_publicados',
      name: 'Conteúdos publicados no ciclo',
      description: 'Peças concluídas / planejadas no ciclo',
      category: 'operacao',
      formula: 'Publicados / Planejados * 100',
      target_value: 90,
      alert_thresholds: { low: 60, high: 100 },
      frequency: 'monthly',
    },
  ],

  cycle_frequency: 'monthly',
  approval_policy: 'manual_approve',
  template_category: 'standard',
  template_version: PRODUCAO_CONTEUDO_TEMPLATE_VERSION,

  briefing_template: {
    title: 'Briefing — Produção de Conteúdo',
    description: 'Contexto mínimo para operar o ciclo de conteúdos',
    questions: [
      {
        id: 'canais',
        text: 'Quais canais entram neste ciclo?',
        type: 'long_text',
        required: true,
      },
      {
        id: 'volume',
        text: 'Volume esperado (reels, carrosséis, stories, fotos…)?',
        type: 'short_text',
        required: true,
      },
      {
        id: 'tom',
        text: 'Tom de voz e restrições de marca',
        type: 'long_text',
        required: false,
      },
      {
        id: 'aprovacao',
        text: 'Quem aprova e em quanto tempo (SLA)?',
        type: 'long_text',
        required: true,
      },
    ],
  },
};

export function isProducaoConteudoService(serviceOrTemplate) {
  if (!serviceOrTemplate) return false;
  const slug = String(serviceOrTemplate.slug || '').trim();
  const offering = String(serviceOrTemplate.offering_key || '').trim();
  const pipeline = String(serviceOrTemplate.pipeline || '').trim();
  const name = String(serviceOrTemplate.name || '').trim();
  return (
    slug === PRODUCAO_CONTEUDO_TEMPLATE_SLUG ||
    offering === PRODUCAO_CONTEUDO_TEMPLATE_SLUG ||
    offering === PRODUCAO_CONTEUDO_TEMPLATE_KEY ||
    pipeline === 'conteudo' ||
    name === PRODUCAO_CONTEUDO_TEMPLATE.name
  );
}

/**
 * Título padrão do ciclo: "Produção de Conteúdo — Setembro/2026"
 */
export function formatProducaoConteudoCycleTitle(startDate) {
  try {
    const d = new Date(`${String(startDate).slice(0, 10)}T12:00:00`);
    const month = d.toLocaleDateString('pt-BR', { month: 'long' });
    const year = d.getFullYear();
    const monthLabel = month.charAt(0).toUpperCase() + month.slice(1);
    return `${PRODUCAO_CONTEUDO_TEMPLATE.name} — ${monthLabel}/${year}`;
  } catch {
    return `${PRODUCAO_CONTEUDO_TEMPLATE.name} — ${String(startDate || '').slice(0, 7)}`;
  }
}

export default PRODUCAO_CONTEUDO_TEMPLATE;
