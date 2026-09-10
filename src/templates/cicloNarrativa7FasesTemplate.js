/**
 * Template canônico — Pipeline Estúdio Narrativa (7 fases)
 * Tipo padrão: 5_videos
 *
 * Ordem operacional (gates):
 * PLANEJAMENTO → ROTEIROS (gate Bruna) → FOTO E VÍDEO (+ edição)
 * → APROVAÇÃO INTERNA → CALENDÁRIO CLIENTE (gate Cliente)
 * → ALTERAÇÕES (condicional) → AGENDAMENTO
 *
 * Convive em paralelo com cicloMensal4SemanasTemplate (legado).
 *
 * Campos por fase:
 * - gatekeeper: bruna | duda | cliente | influencer | null
 * - sla_dias: prazo real interno
 * - sla_prometido_dias: prazo comunicado (pode ser menor)
 * - required: false = fase condicional (ex.: ALTERAÇÕES)
 *
 * Campos por tarefa:
 * - subtarefas[]: granularidade (progress_pct derivado)
 * - bloqueador: id template que bloqueia
 * - gatekeeper / gate_status: aprovação formal (além do responsável)
 */

import { normalizeDeliverableTaskShapes } from './cicloMensal4SemanasTemplate.js';

export { CYCLE_ROLES } from './cicloMensal4SemanasTemplate.js';

export const TIPO_CAMPANHA_5_VIDEOS = '5_videos';

export const NARRATIVA_PHASES = [
  { key: 'planejamento', label: 'PLANEJAMENTO', order: 1 },
  { key: 'roteiros', label: 'ROTEIROS', order: 2 },
  { key: 'foto_e_video', label: 'FOTO E VÍDEO', order: 3 },
  { key: 'aprovacao_interna', label: 'APROVAÇÃO INTERNA', order: 4 },
  { key: 'calendario_cliente', label: 'CALENDÁRIO CLIENTE', order: 5 },
  { key: 'alteracoes', label: 'ALTERAÇÕES', order: 6 },
  { key: 'agendamento', label: 'AGENDAMENTO', order: 7 },
];

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

function videoSubtarefas(prefix, count, responsavel, opts = {}) {
  const list = [];
  for (let i = 1; i <= count; i += 1) {
    list.push({
      id: `${prefix}_${i}`,
      title: opts.titleFn ? opts.titleFn(i) : `${opts.label || 'Item'} ${i}`,
      description: opts.descriptionFn ? opts.descriptionFn(i) : '',
      type: opts.type || 'producao',
      priority: 'high',
      estimated_hours: opts.estimated_hours ?? 2,
      responsavel,
      duracao_dias: opts.duracao_dias ?? 1,
      bloqueador: i === 1 ? opts.firstBloqueador || null : `${prefix}_${i - 1}`,
      notificacao: i === 1 ? opts.notificacao || null : null,
    });
  }
  return list;
}

const PLANEJAMENTO = {
  id: 'fase_planejamento',
  name: 'PLANEJAMENTO',
  description: 'Validar conceito, briefs e alinhamento interno',
  order: 1,
  phase: 'planejamento',
  estimated_hours: 10,
  duration_business_days: 3,
  required: true,
  gatekeeper: null,
  sla_dias: 3,
  sla_prometido_dias: 3,
  tasks: [
    {
      id: 'revisar_conceito_cliente',
      title: 'Revisar conceito com cliente',
      description: 'Validar nome, ideia, tom e objetivos da campanha',
      type: 'reuniao',
      priority: 'high',
      estimated_hours: 2,
      responsavel: 'bruna',
      duracao_dias: 2,
      bloqueador: null,
      notificacao: 'segunda-feira',
      checklist: [
        { text: 'Nome e conceito validados', required: true },
        { text: 'Tom de voz alinhado', required: true },
        { text: 'Stakeholders de aprovação definidos', required: true },
      ],
    },
    {
      id: 'briefings_pecas',
      title: 'Briefings das peças-chave',
      description: 'Briefs de criação para os 5 vídeos e assets',
      type: 'briefing',
      priority: 'high',
      estimated_hours: 4,
      responsavel: 'bruna',
      duracao_dias: 2,
      bloqueador: 'revisar_conceito_cliente',
      notificacao: null,
      checklist: [
        { text: 'Briefs das 5 peças', required: true },
        { text: 'Referências e restrições de marca', required: true },
      ],
    },
  ],
};

const ROTEIROS = {
  id: 'fase_roteiros',
  name: 'ROTEIROS',
  description: 'Roteiros dos 5 vídeos — Bruna aprova antes da gravação',
  order: 2,
  phase: 'roteiros',
  estimated_hours: 12,
  duration_business_days: 3,
  required: true,
  gatekeeper: 'bruna',
  sla_dias: 3,
  sla_prometido_dias: 2,
  tasks: [
    {
      id: 'roteiros_5_videos',
      title: 'Roteiros dos 5 vídeos',
      description: 'Escrever e revisar roteiros antes da gravação',
      type: 'producao',
      priority: 'high',
      estimated_hours: 10,
      responsavel: 'bruna',
      gatekeeper: 'bruna',
      gate_status: 'pendente',
      duracao_dias: 3,
      bloqueador: 'briefings_pecas',
      notificacao: 'segunda-feira',
      subtarefas: videoSubtarefas('roteiro', 5, 'bruna', {
        label: 'Roteiro vídeo',
        type: 'producao',
        estimated_hours: 2,
        duracao_dias: 1,
        firstBloqueador: null,
      }),
      checklist: [
        { text: '5 roteiros escritos', required: true },
        { text: 'Aprovação interna (gate Bruna)', required: true },
      ],
    },
  ],
};

const FOTO_E_VIDEO = {
  id: 'fase_foto_e_video',
  name: 'FOTO E VÍDEO',
  description: 'Gravação, fotos e edição explícita por peça',
  order: 3,
  phase: 'foto_e_video',
  estimated_hours: 28,
  duration_business_days: 5,
  required: true,
  gatekeeper: null,
  sla_dias: 5,
  sla_prometido_dias: 5,
  tasks: [
    {
      id: 'producao_foto_video',
      title: 'Produção foto e vídeo',
      description: 'Gravar 5 vídeos, fotografar assets e editar',
      type: 'producao',
      priority: 'high',
      estimated_hours: 24,
      responsavel: 'duda',
      duracao_dias: 5,
      bloqueador: 'roteiros_5_videos',
      notificacao: 'segunda-feira',
      subtarefas: [
        ...videoSubtarefas('gravar_video', 5, 'duda', {
          label: 'Gravar vídeo',
          type: 'producao',
          estimated_hours: 2,
          duracao_dias: 1,
          firstBloqueador: null,
          notificacao: 'segunda-feira',
        }),
        {
          id: 'fotografar_assets',
          title: 'Fotografar assets',
          description: 'Fotos e assets estáticos do ciclo',
          type: 'producao',
          priority: 'high',
          estimated_hours: 3,
          responsavel: 'duda',
          duracao_dias: 1,
          bloqueador: 'gravar_video_5',
          notificacao: null,
        },
        ...videoSubtarefas('editar_video', 5, 'duda', {
          label: 'Editar vídeo',
          type: 'producao',
          estimated_hours: 2,
          duracao_dias: 1,
          firstBloqueador: 'fotografar_assets',
        }),
      ],
      checklist: [
        { text: '5 vídeos gravados', required: true },
        { text: '5 vídeos editados', required: true },
        { text: 'Assets fotográficos prontos', required: true },
      ],
    },
  ],
};

const APROVACAO_INTERNA = {
  id: 'fase_aprovacao_interna',
  name: 'APROVAÇÃO INTERNA',
  description: 'QA e ok interno antes de enviar ao cliente',
  order: 4,
  phase: 'aprovacao_interna',
  estimated_hours: 4,
  duration_business_days: 1,
  required: true,
  gatekeeper: 'bruna',
  sla_dias: 1,
  sla_prometido_dias: 1,
  tasks: [
    {
      id: 'qa_aprovacao_interna',
      title: 'QA e aprovação interna',
      description: 'Bruna valida pacote antes do calendário do cliente',
      type: 'revisao',
      priority: 'high',
      estimated_hours: 3,
      responsavel: 'bruna',
      gatekeeper: 'bruna',
      gate_status: 'pendente',
      duracao_dias: 1,
      bloqueador: 'producao_foto_video',
      notificacao: null,
      checklist: [
        { text: 'Ortografia e marca ok', required: true },
        { text: 'Formatos e specs ok', required: true },
        { text: 'Pacote pronto para cliente', required: true },
      ],
    },
  ],
};

const CALENDARIO_CLIENTE = {
  id: 'fase_calendario_cliente',
  name: 'CALENDÁRIO CLIENTE',
  description: 'Cliente aprova calendário/material — gate crítico (SLA real 4 dias)',
  order: 5,
  phase: 'calendario_cliente',
  estimated_hours: 2,
  duration_business_days: 4,
  required: true,
  gatekeeper: 'cliente',
  sla_dias: 4,
  sla_prometido_dias: 3,
  escalation: [
    { day: 3, level: 'reminder', message: 'Falta 1 dia para o cliente responder' },
    { day: 4, level: 'escalation', message: 'Prazo venceu — ligar cliente' },
    { day: 5, level: 'urgent', message: 'URGENTE — campanha bloqueada no cliente' },
  ],
  tasks: [
    {
      id: 'enviar_calendario_cliente',
      title: 'Enviar calendário ao cliente',
      description: 'Disparar material e aguardar aprovação formal',
      type: 'aprovacao',
      priority: 'high',
      estimated_hours: 1,
      responsavel: 'bruna',
      gatekeeper: 'cliente',
      gate_status: 'pendente',
      duracao_dias: 4,
      bloqueador: 'qa_aprovacao_interna',
      notificacao: 'segunda-feira',
      checklist: [
        { text: 'Pacote enviado (portal/WhatsApp)', required: true },
        { text: 'Prazo de resposta combinado', required: true },
        { text: 'Aprovação do cliente registrada', required: true },
      ],
    },
  ],
};

const ALTERACOES = {
  id: 'fase_alteracoes',
  name: 'ALTERAÇÕES',
  description: 'Ajustes pedidos pelo cliente (condicional — pula se aprovado limpo)',
  order: 6,
  phase: 'alteracoes',
  estimated_hours: 8,
  duration_business_days: 2,
  required: false,
  gatekeeper: 'cliente',
  sla_dias: 2,
  sla_prometido_dias: 2,
  tasks: [
    {
      id: 'aplicar_alteracoes',
      title: 'Aplicar alterações do cliente',
      description: 'Implementar feedback e reenviar para validação',
      type: 'producao',
      priority: 'high',
      estimated_hours: 6,
      responsavel: 'duda',
      duracao_dias: 2,
      bloqueador: 'enviar_calendario_cliente',
      notificacao: null,
      checklist: [
        { text: 'Ajustes aplicados', required: true },
        { text: 'Versão revisada pronta', required: true },
      ],
    },
    {
      id: 'validar_alteracoes_cliente',
      title: 'Cliente valida alterações',
      description: 'Gate de validação pós-ajustes',
      type: 'aprovacao',
      priority: 'high',
      estimated_hours: 1,
      responsavel: 'bruna',
      gatekeeper: 'cliente',
      gate_status: 'pendente',
      duracao_dias: 2,
      bloqueador: 'aplicar_alteracoes',
      notificacao: null,
      checklist: [
        { text: 'Validação do cliente registrada', required: true },
      ],
    },
  ],
};

const AGENDAMENTO = {
  id: 'fase_agendamento',
  name: 'AGENDAMENTO',
  description: 'Agendar publicação e fechar ciclo',
  order: 7,
  phase: 'agendamento',
  estimated_hours: 6,
  duration_business_days: 2,
  required: true,
  gatekeeper: null,
  sla_dias: 2,
  sla_prometido_dias: 2,
  tasks: [
    {
      id: 'agendar_publicacao',
      title: 'Agendar publicação',
      description: 'Agendar posts/vídeos nos canais acordados',
      type: 'midia',
      priority: 'high',
      estimated_hours: 3,
      responsavel: 'bruna,duda',
      duracao_dias: 1,
      bloqueador: 'validar_alteracoes_cliente',
      notificacao: 'segunda-feira',
      checklist: [
        { text: 'Posts agendados', required: true },
        { text: 'Links/UTMs conferidos', required: false },
      ],
    },
    {
      id: 'fechar_ciclo',
      title: 'Fechar ciclo e registrar resultado',
      description: 'Consolidar status e preparar feedback de resultado',
      type: 'relatorio',
      priority: 'high',
      estimated_hours: 2,
      responsavel: 'bruna',
      duracao_dias: 1,
      bloqueador: 'agendar_publicacao',
      notificacao: null,
      checklist: [
        { text: 'Publicação confirmada', required: true },
        { text: 'Pendências do próximo ciclo listadas', required: true },
      ],
    },
  ],
};

export const CICLO_NARRATIVA_TEMPLATE_KEY = 'ciclo_narrativa_7_fases';
export const CICLO_NARRATIVA_TEMPLATE_SLUG = 'ciclo_narrativa_7_fases';
export const CICLO_NARRATIVA_TEMPLATE_VERSION = '1.0';

export const CICLO_NARRATIVA_7_FASES_TEMPLATE = {
  id: 'ciclo_narrativa_7_fases_template',
  slug: CICLO_NARRATIVA_TEMPLATE_SLUG,
  name: 'Pipeline Narrativa (7 fases)',
  description:
    'Pipeline operacional Estúdio Narrativa: 7 fases com subtarefas, gatekeepers e SLA real (tipo 5_videos)',
  category: 'marketing_digital',
  language: 'pt',
  offering_key: CICLO_NARRATIVA_TEMPLATE_KEY,
  pipeline: 'narrativa',
  tipo_campanha: TIPO_CAMPANHA_5_VIDEOS,

  pricing: {
    type: 'recorrente',
    base_price: 8000,
    currency: 'BRL',
    billing_cycle: 'monthly',
    estimated_hours: 70,
    duration_months: 1,
  },

  deliverables: [
    PLANEJAMENTO,
    ROTEIROS,
    FOTO_E_VIDEO,
    APROVACAO_INTERNA,
    CALENDARIO_CLIENTE,
    ALTERACOES,
    AGENDAMENTO,
  ].map(withTaskTemplates),

  cycle_frequency: 'monthly',
  approval_policy: 'manual_approve',
  template_category: 'standard',
  template_version: CICLO_NARRATIVA_TEMPLATE_VERSION,

  briefing_template: {
    title: 'Briefing — Pipeline Narrativa',
    description: 'Campos mínimos para operar o ciclo 5 vídeos',
    questions: [
      {
        id: 'campanha_nome',
        text: 'Nome da campanha',
        type: 'short_text',
        required: true,
      },
      {
        id: 'objetivo_mes',
        text: 'Objetivo principal',
        type: 'long_text',
        required: true,
      },
      {
        id: 'tipo_campanha',
        text: 'Tipo (hoje: 5_videos)',
        type: 'short_text',
        required: true,
      },
    ],
  },
};

/**
 * Achata tarefas + subtarefas em lista linear para materialização.
 * Subtarefas recebem parent_template_id apontando para a tarefa pai.
 */
export function flattenTaskTemplates(deliverables = []) {
  const phases = normalizeDeliverableTaskShapes(deliverables);
  const flat = [];

  for (const fase of phases) {
    const templates = fase.task_templates || fase.tasks || [];
    for (const tarefa of templates) {
      const subtarefas = Array.isArray(tarefa.subtarefas) ? tarefa.subtarefas : [];
      flat.push({
        ...tarefa,
        deliverableId: fase.id,
        phase: fase.phase,
        phaseMeta: {
          gatekeeper: fase.gatekeeper ?? null,
          sla_dias: fase.sla_dias ?? null,
          sla_prometido_dias: fase.sla_prometido_dias ?? null,
          required: fase.required !== false,
          escalation: fase.escalation || null,
        },
        is_parent: subtarefas.length > 0,
        parent_template_id: null,
      });
      for (const sub of subtarefas) {
        flat.push({
          ...sub,
          deliverableId: fase.id,
          phase: fase.phase,
          phaseMeta: {
            gatekeeper: fase.gatekeeper ?? null,
            sla_dias: fase.sla_dias ?? null,
            sla_prometido_dias: fase.sla_prometido_dias ?? null,
            required: fase.required !== false,
          },
          is_parent: false,
          parent_template_id: tarefa.id,
        });
      }
    }
  }

  return flat;
}

export default CICLO_NARRATIVA_7_FASES_TEMPLATE;
