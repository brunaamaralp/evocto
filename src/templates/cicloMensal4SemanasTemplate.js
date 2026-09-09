/**
 * Template canônico — Ciclo Mensal 4 Semanas
 * Fases: ROTEIROS → PRODUÇÃO → REVISÃO → PUBLICAÇÃO
 *
 * Cada deliverable expõe `tasks` e `task_templates` (mesmo conteúdo)
 * para compatibilidade com viewers legados e useTaskGeneration.
 */

function withTaskTemplates(deliverable) {
  const tasks = Array.isArray(deliverable.tasks) ? deliverable.tasks : [];
  return {
    ...deliverable,
    task_templates: tasks.map((t) => ({ ...t })),
  };
}

const ROTEIROS = {
  id: 'fase_roteiros',
  name: 'ROTEIROS',
  description: 'Semana 1 — planejamento, briefs e roteiros das peças do ciclo',
  order: 1,
  phase: 'roteiros',
  estimated_hours: 16,
  duration_business_days: 5,
  required: true,
  tasks: [
    {
      id: 'kickoff_ciclo',
      title: 'Kick-off do ciclo com o cliente',
      description: 'Alinhar objetivos, prioridades e restrições do mês',
      type: 'reuniao',
      priority: 'high',
      estimated_hours: 2,
      checklist: [
        { text: 'Agenda confirmada', required: true },
        { text: 'Objetivos do mês registrados', required: true },
        { text: 'Stakeholders de aprovação definidos', required: true },
      ],
    },
    {
      id: 'briefings_pecas',
      title: 'Briefings das peças-chave',
      description: 'Briefs de criação para vídeos, posts e designs do ciclo',
      type: 'briefing',
      priority: 'high',
      estimated_hours: 4,
      checklist: [
        { text: 'Briefs das peças prioritárias', required: true },
        { text: 'Referências e restrições de marca', required: true },
      ],
    },
    {
      id: 'roteiros_conteudo',
      title: 'Roteiros e copy base',
      description: 'Roteiros de vídeo, legendas e estrutura de conteúdo',
      type: 'producao',
      priority: 'high',
      estimated_hours: 6,
      checklist: [
        { text: 'Roteiros aprovados internamente', required: true },
        { text: 'Tom de voz revisado', required: true },
      ],
    },
    {
      id: 'lembrete_segunda_s1',
      title: 'Lembrete segunda — Semana 1 (Planejamento)',
      description: 'Enviar lembrete de produção para o cliente: fase de planejamento/roteiros',
      type: 'administrativo',
      priority: 'medium',
      estimated_hours: 0.5,
      checklist: [
        { text: 'Mensagem enviada ao cliente', required: true },
        { text: 'Pendências do cliente listadas', required: false },
      ],
    },
  ],
};

const PRODUCAO = {
  id: 'fase_producao',
  name: 'PRODUÇÃO',
  description: 'Semana 2 — criação de peças, vídeos e assets',
  order: 2,
  phase: 'producao',
  estimated_hours: 28,
  duration_business_days: 5,
  required: true,
  tasks: [
    {
      id: 'producao_visual',
      title: 'Produção visual / design',
      description: 'Criar peças gráficas e assets do ciclo',
      type: 'producao',
      priority: 'high',
      estimated_hours: 12,
      checklist: [
        { text: 'Peças no prazo de revisão interna', required: true },
        { text: 'Checklist de marca aplicado', required: true },
      ],
    },
    {
      id: 'producao_video',
      title: 'Produção de vídeos',
      description: 'Gravação/edição dos vídeos planejados',
      type: 'producao',
      priority: 'high',
      estimated_hours: 12,
      checklist: [
        { text: 'Takes/edições concluídas', required: true },
        { text: 'Versões por canal exportadas', required: true },
      ],
    },
    {
      id: 'qa_interno',
      title: 'QA interno de produção',
      description: 'Revisão interna antes de enviar ao cliente',
      type: 'revisao',
      priority: 'high',
      estimated_hours: 3,
      checklist: [
        { text: 'Ortografia e marca ok', required: true },
        { text: 'Formatos e specs ok', required: true },
      ],
    },
    {
      id: 'lembrete_segunda_s2',
      title: 'Lembrete segunda — Semana 2 (Produção)',
      description: 'Enviar lembrete de produção para o cliente: fase de produção',
      type: 'administrativo',
      priority: 'medium',
      estimated_hours: 0.5,
      checklist: [
        { text: 'Mensagem enviada ao cliente', required: true },
        { text: 'Status de produção compartilhado', required: false },
      ],
    },
  ],
};

const REVISAO = {
  id: 'fase_revisao',
  name: 'REVISÃO',
  description: 'Semana 3 — 1ª rodada de feedback e ajustes',
  order: 3,
  phase: 'revisao',
  estimated_hours: 16,
  duration_business_days: 5,
  required: true,
  tasks: [
    {
      id: 'enviar_1a_revisao',
      title: '1ª Revisão — enviar ao cliente',
      description: 'Enviar pacote de peças para feedback do cliente',
      type: 'aprovacao',
      priority: 'high',
      estimated_hours: 2,
      checklist: [
        { text: 'Pacote enviado no portal/WhatsApp', required: true },
        { text: 'Prazo de feedback combinado', required: true },
      ],
    },
    {
      id: 'consolidar_feedback',
      title: 'Consolidar feedback do cliente',
      description: 'Registrar decisões e mudanças pedidas',
      type: 'revisao',
      priority: 'high',
      estimated_hours: 4,
      checklist: [
        { text: 'Feedback consolidado por peça', required: true },
        { text: 'Decisões documentadas na tarefa', required: true },
      ],
    },
    {
      id: 'aplicar_ajustes',
      title: 'Aplicar ajustes da 1ª revisão',
      description: 'Implementar mudanças aprovadas',
      type: 'producao',
      priority: 'high',
      estimated_hours: 8,
      checklist: [
        { text: 'Ajustes aplicados', required: true },
        { text: 'Versão revisada pronta', required: true },
      ],
    },
    {
      id: 'lembrete_segunda_s3',
      title: 'Lembrete segunda — Semana 3 (Revisão)',
      description: 'Enviar lembrete de produção para o cliente: fase de revisão/feedback',
      type: 'administrativo',
      priority: 'medium',
      estimated_hours: 0.5,
      checklist: [
        { text: 'Mensagem enviada ao cliente', required: true },
        { text: 'Lembrete de prazo de feedback', required: false },
      ],
    },
  ],
};

const PUBLICACAO = {
  id: 'fase_publicacao',
  name: 'PUBLICAÇÃO',
  description: 'Semana 4 — finalização, publicação e fechamento do ciclo',
  order: 4,
  phase: 'publicacao',
  estimated_hours: 14,
  duration_business_days: 5,
  required: true,
  tasks: [
    {
      id: 'aprovacao_final',
      title: 'Aprovação final das peças',
      description: 'Garantir ok final do cliente antes de publicar',
      type: 'aprovacao',
      priority: 'high',
      estimated_hours: 2,
      checklist: [
        { text: 'Aprovação registrada', required: true },
        { text: 'Versões finais arquivadas', required: true },
      ],
    },
    {
      id: 'reuniao_mensal_relatorio',
      title: 'Reunião mensal — gerar relatório do ciclo',
      description:
        'Lembrete: reunião com o cliente em até 2 dias. Gerar o relatório mensal e enviar antes da call.',
      type: 'reuniao',
      priority: 'high',
      estimated_hours: 2,
      checklist: [
        { text: 'Relatório PDF gerado no cycle-report', required: true },
        { text: 'Agenda da reunião confirmada', required: true },
        { text: 'Status enviado ao cliente', required: false },
      ],
    },
    {
      id: 'agendar_publicar',
      title: 'Agendar / publicar conteúdos',
      description: 'Publicação nos canais acordados',
      type: 'midia',
      priority: 'high',
      estimated_hours: 6,
      checklist: [
        { text: 'Posts agendados ou no ar', required: true },
        { text: 'Links/UTMs conferidos', required: false },
      ],
    },
    {
      id: 'relatorio_ciclo',
      title: 'Relatório e review do ciclo',
      description: 'Sumário do mês + próximos passos para o cliente',
      type: 'relatorio',
      priority: 'high',
      estimated_hours: 4,
      checklist: [
        { text: 'Status do mês consolidado', required: true },
        { text: 'Pendências do próximo ciclo', required: true },
      ],
    },
    {
      id: 'lembrete_segunda_s4',
      title: 'Lembrete segunda — Semana 4 (Publicação)',
      description: 'Enviar lembrete de produção para o cliente: fase de publicação/fechamento',
      type: 'administrativo',
      priority: 'medium',
      estimated_hours: 0.5,
      checklist: [
        { text: 'Mensagem enviada ao cliente', required: true },
        { text: 'Lembrete de reunião mensal (se houver)', required: false },
      ],
    },
  ],
};

export const CICLO_MENSAL_TEMPLATE_KEY = 'ciclo_mensal_4_semanas';
export const CICLO_MENSAL_TEMPLATE_SLUG = 'ciclo_mensal_4_semanas';

export const CICLO_MENSAL_4_SEMANAS_TEMPLATE = {
  id: 'ciclo_mensal_4_semanas_template',
  slug: CICLO_MENSAL_TEMPLATE_SLUG,
  name: 'Ciclo Mensal 4 Semanas',
  description:
    'Pipeline mensal padrão: ROTEIROS → PRODUÇÃO → REVISÃO → PUBLICAÇÃO, com lembretes semanais',
  category: 'marketing_digital',
  language: 'pt',
  offering_key: CICLO_MENSAL_TEMPLATE_KEY,

  pricing: {
    type: 'retainer',
    base_price: 8000,
    currency: 'BRL',
    billing_cycle: 'monthly',
    estimated_hours: 74,
    duration_months: 1,
  },

  deliverables: [ROTEIROS, PRODUCAO, REVISAO, PUBLICACAO].map(withTaskTemplates),

  kpis: [
    {
      id: 'on_time_delivery',
      name: 'Entregas no prazo (%)',
      description: 'Peças publicadas dentro do ciclo / total planejado',
      category: 'operacao',
      formula: 'No prazo / Total * 100',
      target_value: 90,
      alert_thresholds: { low: 70, high: 100 },
      frequency: 'monthly',
    },
    {
      id: 'aprovacao_1a_rodada',
      name: 'Aprovação na 1ª rodada (%)',
      description: 'Peças aprovadas sem 2ª revisão / total',
      category: 'operacao',
      formula: 'Aprovadas na 1ª / Total * 100',
      target_value: 70,
      alert_thresholds: { low: 40, high: 100 },
      frequency: 'monthly',
    },
  ],

  cycle_frequency: 'monthly',
  approval_policy: 'manual_approve',
  template_category: 'standard',
  template_version: '1.0',

  briefing_template: {
    title: 'Briefing — Ciclo Mensal 4 Semanas',
    description: 'Contexto para operar o ciclo mensal de conteúdo/produção',
    questions: [
      {
        id: 'objetivo_mes',
        text: 'Qual o objetivo principal deste mês (awareness, conversão, lançamento)?',
        type: 'long_text',
        required: true,
      },
      {
        id: 'volume_pecas',
        text: 'Qual o volume esperado (vídeos, posts, designs)?',
        type: 'short_text',
        required: true,
      },
      {
        id: 'sla_aprovacao',
        text: 'Quem aprova e em quanto tempo (SLA)?',
        type: 'long_text',
        required: true,
      },
    ],
  },
};

/**
 * Garante task_templates a partir de tasks (e vice-versa) em deliverables.
 */
export function normalizeDeliverableTaskShapes(deliverables = []) {
  return (Array.isArray(deliverables) ? deliverables : []).map((d) => {
    const tasks = Array.isArray(d.tasks) ? d.tasks : [];
    const templates = Array.isArray(d.task_templates) ? d.task_templates : [];
    if (templates.length === 0 && tasks.length > 0) {
      return { ...d, task_templates: tasks.map((t) => ({ ...t })) };
    }
    if (tasks.length === 0 && templates.length > 0) {
      return { ...d, tasks: templates.map((t) => ({ ...t })) };
    }
    return d;
  });
}

export default CICLO_MENSAL_4_SEMANAS_TEMPLATE;
