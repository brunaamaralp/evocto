/**
 * Template canônico — Sessão de Fotos
 *
 * Mesmo padrão técnico de Produção de Conteúdo:
 *   ciclo → sessões (tarefas) → etapas (checklist / subtarefas do content_item_template)
 *
 * Sem máquina de estados, bloqueadores ou gates entre etapas.
 */

import { normalizeDeliverableTaskShapes } from './cicloMensal4SemanasTemplate.js';

export const SESSAO_FOTOS_TEMPLATE_KEY = 'sessao_fotos';
export const SESSAO_FOTOS_TEMPLATE_SLUG = 'sessao_fotos';
export const SESSAO_FOTOS_TEMPLATE_VERSION = '1.0';

/** Etapas padrão de uma sessão (sem bloqueio entre si). */
export const DEFAULT_SESSAO_FOTOS_SUBTAREFAS = [
  {
    id: 'briefing',
    title: 'Briefing',
    text: 'Briefing',
    description: 'Alinhar objetivo, tom, entregáveis e restrições da sessão',
    type: 'briefing',
    priority: 'high',
    estimated_hours: 1,
    duracao_dias: 1,
    bloqueador: null,
    required: true,
  },
  {
    id: 'referencias_direcao_visual',
    title: 'Referências / Direção Visual',
    text: 'Referências / Direção Visual',
    description: 'Moodboard, referências e direção de arte',
    type: 'planejamento',
    priority: 'high',
    estimated_hours: 2,
    duracao_dias: 2,
    bloqueador: null,
    required: true,
  },
  {
    id: 'checklist_producao',
    title: 'Checklist de Produção',
    text: 'Checklist de Produção',
    description: 'Lista de produção: equipe, props, locação, equipamentos',
    type: 'administrativo',
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
    description: 'Data, horário e confirmações da sessão',
    type: 'administrativo',
    priority: 'high',
    estimated_hours: 0.5,
    duracao_dias: 1,
    bloqueador: null,
    required: true,
  },
  {
    id: 'captacao',
    title: 'Captação',
    text: 'Captação',
    description: 'Execução da sessão fotográfica',
    type: 'producao',
    priority: 'high',
    estimated_hours: 4,
    duracao_dias: 1,
    bloqueador: null,
    required: true,
  },
  {
    id: 'selecao',
    title: 'Seleção',
    text: 'Seleção',
    description: 'Curadoria das imagens brutas',
    type: 'revisao',
    priority: 'high',
    estimated_hours: 2,
    duracao_dias: 2,
    bloqueador: null,
    required: true,
  },
  {
    id: 'tratamento_edicao',
    title: 'Tratamento / Edição',
    text: 'Tratamento / Edição',
    description: 'Tratamento e edição das imagens selecionadas',
    type: 'producao',
    priority: 'high',
    estimated_hours: 4,
    duracao_dias: 3,
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
    duracao_dias: 2,
    bloqueador: null,
    required: true,
  },
  {
    id: 'entrega',
    title: 'Entrega',
    text: 'Entrega',
    description: 'Entrega final das imagens nos formatos acordados',
    type: 'entregavel',
    priority: 'high',
    estimated_hours: 1,
    duracao_dias: 1,
    bloqueador: null,
    required: true,
  },
];

export const SESSAO_ITEM_TASK_TEMPLATE = {
  id: 'sessao_padrao',
  title: 'Nova sessão de fotos',
  description:
    'Sessão fotográfica do ciclo (ex.: Outubro Rosa, Coleção Verão, Institucional)',
  type: 'creative',
  priority: 'medium',
  estimated_hours: 16,
  responsavel: null,
  duracao_dias: 14,
  bloqueador: null,
  notificacao: null,
  subtarefas: DEFAULT_SESSAO_FOTOS_SUBTAREFAS.map((s) => ({ ...s })),
  checklist: DEFAULT_SESSAO_FOTOS_SUBTAREFAS.map((s) => ({
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

const SESSOES = {
  id: 'fase_sessoes',
  name: 'Sessões',
  description:
    'Sessões do ciclo — cada sessão é uma tarefa principal com etapas de produção',
  order: 1,
  phase: 'sessoes',
  estimated_hours: 0,
  duration_business_days: 20,
  required: true,
  tasks: [],
};

export const SESSAO_FOTOS_TEMPLATE = {
  id: 'sessao_fotos_template',
  slug: SESSAO_FOTOS_TEMPLATE_SLUG,
  name: 'Sessão de Fotos',
  description:
    'Planejamento, produção e entrega de uma sessão fotográfica, organizando todas as etapas necessárias desde o briefing até a entrega final das imagens.',
  category: 'conteudo',
  language: 'pt',
  offering_key: SESSAO_FOTOS_TEMPLATE_KEY,
  pipeline: SESSAO_FOTOS_TEMPLATE_KEY,

  pricing: {
    type: 'fixed',
    base_price: 3500,
    currency: 'BRL',
    billing_cycle: 'one_time',
    estimated_hours: 24,
    duration_months: 1,
  },

  deliverables: normalizeDeliverableTaskShapes([withTaskTemplates(SESSOES)]),

  content_item_template: SESSAO_ITEM_TASK_TEMPLATE,

  kpis: [
    {
      id: 'sessoes_entregues',
      name: 'Sessões entregues no prazo (%)',
      description: 'Sessões concluídas dentro do prazo / total',
      category: 'operacao',
      formula: 'No prazo / Total * 100',
      target_value: 90,
      alert_thresholds: { low: 60, high: 100 },
      frequency: 'monthly',
    },
  ],

  cycle_frequency: 'monthly',
  approval_policy: 'manual_approve',
  template_category: 'standard',
  template_version: SESSAO_FOTOS_TEMPLATE_VERSION,

  briefing_template: {
    title: 'Briefing — Sessão de Fotos',
    description: 'Contexto mínimo para operar a sessão',
    questions: [
      {
        id: 'objetivo_sessao',
        text: 'Qual o objetivo da sessão (campanha, catálogo, institucional…)?',
        type: 'long_text',
        required: true,
      },
      {
        id: 'entregaveis',
        text: 'Quais entregáveis e formatos são esperados?',
        type: 'long_text',
        required: true,
      },
      {
        id: 'local_equipe',
        text: 'Local, equipe e necessidades de produção',
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

export function isSessaoFotosService(serviceOrTemplate) {
  if (!serviceOrTemplate) return false;
  const slug = String(serviceOrTemplate.slug || '').trim();
  const offering = String(serviceOrTemplate.offering_key || '').trim();
  const pipeline = String(serviceOrTemplate.pipeline || '').trim();
  const name = String(serviceOrTemplate.name || '').trim();
  return (
    slug === SESSAO_FOTOS_TEMPLATE_SLUG ||
    offering === SESSAO_FOTOS_TEMPLATE_SLUG ||
    offering === SESSAO_FOTOS_TEMPLATE_KEY ||
    pipeline === SESSAO_FOTOS_TEMPLATE_KEY ||
    name === SESSAO_FOTOS_TEMPLATE.name
  );
}

export default SESSAO_FOTOS_TEMPLATE;
