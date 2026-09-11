/**
 * Template canônico — Ciclo de Campanhas (Mensal, 4 Semanas)
 * Fases: PLANEJAMENTO → PRODUÇÃO → REVISÃO → PUBLICAÇÃO
 *
 * Editável via Service Template Editor (Service.is_template).
 * Cada deliverable expõe `tasks` e `task_templates` (mesmo conteúdo)
 * para compatibilidade com viewers legados e useTaskGeneration.
 *
 * Campos por tarefa:
 * - responsavel: bruna | duda | cliente
 * - bloqueador: id da tarefa template que bloqueia (null = aberta)
 * - duracao_dias: duração estimada em dias corridos
 * - notificacao: 'segunda-feira' | null
 */

export const CYCLE_ROLES = [
  { value: 'bruna', label: 'Bruna' },
  { value: 'duda', label: 'Duda' },
  { value: 'cliente', label: 'Cliente' },
];

export const CYCLE_PHASES = [
  { key: 'planejamento', label: 'PLANEJAMENTO', week: 1 },
  { key: 'producao', label: 'PRODUÇÃO', week: 2 },
  { key: 'revisao', label: 'REVISÃO', week: 3 },
  { key: 'publicacao', label: 'PUBLICAÇÃO', week: 4 },
];

function withTaskTemplates(deliverable) {
  const tasks = Array.isArray(deliverable.tasks) ? deliverable.tasks : [];
  return {
    ...deliverable,
    task_templates: tasks.map((t) => ({ ...t })),
  };
}

const PLANEJAMENTO = {
  id: 'fase_planejamento',
  name: 'PLANEJAMENTO',
  description: 'Semana 1 — validar conceito, briefs e roteiros com o cliente',
  order: 1,
  phase: 'planejamento',
  /** Alias legado (templates antigos usavam roteiros) */
  phase_aliases: ['roteiros'],
  estimated_hours: 16,
  duration_business_days: 5,
  required: true,
  tasks: [
    {
      id: 'revisar_conceito_cliente',
      title: 'Revisar conceito com cliente',
      description: 'Validar nome, ideia, tom e objetivos da campanha',
      type: 'reuniao',
      priority: 'high',
      estimated_hours: 2,
      responsavel: 'bruna',
      duracao_dias: 5,
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
      description: 'Briefs de criação para vídeos, posts e designs do ciclo',
      type: 'briefing',
      priority: 'high',
      estimated_hours: 4,
      responsavel: 'bruna',
      duracao_dias: 3,
      bloqueador: 'revisar_conceito_cliente',
      notificacao: null,
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
      responsavel: 'bruna',
      duracao_dias: 4,
      bloqueador: 'briefings_pecas',
      notificacao: null,
      checklist: [
        { text: 'Roteiros aprovados internamente', required: true },
        { text: 'Tom de voz revisado', required: true },
      ],
    },
    {
      id: 'lembrete_segunda_s1',
      title: 'Lembrete segunda — Semana 1 (Planejamento)',
      description: 'Enviar lembrete de produção: fase de planejamento',
      type: 'administrativo',
      priority: 'medium',
      estimated_hours: 0.5,
      responsavel: 'bruna',
      duracao_dias: 0,
      bloqueador: null,
      notificacao: 'segunda-feira',
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
  description: 'Semana 2 — gravação, design e assets',
  order: 2,
  phase: 'producao',
  estimated_hours: 28,
  duration_business_days: 5,
  required: true,
  tasks: [
    {
      id: 'gravar_conteudo',
      title: 'Gravar conteúdo',
      description: 'Gravação/edição dos vídeos planejados',
      type: 'producao',
      priority: 'high',
      estimated_hours: 12,
      responsavel: 'duda',
      duracao_dias: 7,
      bloqueador: 'roteiros_conteudo',
      notificacao: 'segunda-feira',
      checklist: [
        { text: 'Takes/edições concluídas', required: true },
        { text: 'Versões por canal exportadas', required: true },
      ],
    },
    {
      id: 'fotografar_assets',
      title: 'Fotografar / design de assets',
      description: 'Criar peças gráficas e assets do ciclo',
      type: 'producao',
      priority: 'high',
      estimated_hours: 12,
      responsavel: 'duda',
      duracao_dias: 3,
      bloqueador: 'roteiros_conteudo',
      notificacao: null,
      checklist: [
        { text: 'Peças no prazo de revisão interna', required: true },
        { text: 'Checklist de marca aplicado', required: true },
      ],
    },
    {
      id: 'qa_interno',
      title: 'QA interno de produção',
      description: 'Revisão interna antes de enviar ao cliente',
      type: 'revisao',
      priority: 'high',
      estimated_hours: 3,
      responsavel: 'duda',
      duracao_dias: 1,
      bloqueador: 'gravar_conteudo',
      notificacao: null,
      checklist: [
        { text: 'Ortografia e marca ok', required: true },
        { text: 'Formatos e specs ok', required: true },
      ],
    },
    {
      id: 'lembrete_segunda_s2',
      title: 'Lembrete segunda — Semana 2 (Produção)',
      description: 'Enviar lembrete de produção: fase de produção',
      type: 'administrativo',
      priority: 'medium',
      estimated_hours: 0.5,
      responsavel: 'bruna',
      duracao_dias: 0,
      bloqueador: null,
      notificacao: 'segunda-feira',
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
  description: 'Semana 3 — rodadas de feedback e ajustes',
  order: 3,
  phase: 'revisao',
  estimated_hours: 16,
  duration_business_days: 5,
  required: true,
  tasks: [
    {
      id: 'primeira_rodada_feedback',
      title: '1ª rodada feedback',
      description: 'Enviar pacote de peças para feedback do cliente',
      type: 'aprovacao',
      priority: 'high',
      estimated_hours: 2,
      responsavel: 'bruna',
      duracao_dias: 2,
      bloqueador: 'qa_interno',
      notificacao: 'segunda-feira',
      checklist: [
        { text: 'Pacote enviado no portal/WhatsApp', required: true },
        { text: 'Prazo de feedback combinado', required: true },
      ],
    },
    {
      id: 'ajustes_refinamento',
      title: 'Ajustes e refinamento',
      description: 'Implementar mudanças aprovadas da 1ª revisão',
      type: 'producao',
      priority: 'high',
      estimated_hours: 8,
      responsavel: 'duda',
      duracao_dias: 3,
      bloqueador: 'primeira_rodada_feedback',
      notificacao: null,
      checklist: [
        { text: 'Ajustes aplicados', required: true },
        { text: 'Versão revisada pronta', required: true },
      ],
    },
    {
      id: 'segunda_rodada_aprovacao',
      title: '2ª rodada aprovação',
      description: 'Garantir ok final do cliente antes de publicar',
      type: 'aprovacao',
      priority: 'high',
      estimated_hours: 2,
      responsavel: 'bruna',
      duracao_dias: 1,
      bloqueador: 'ajustes_refinamento',
      notificacao: null,
      checklist: [
        { text: 'Aprovação registrada', required: true },
        { text: 'Versões finais arquivadas', required: true },
      ],
    },
    {
      id: 'lembrete_segunda_s3',
      title: 'Lembrete segunda — Semana 3 (Revisão)',
      description: 'Enviar lembrete: fase de revisão/feedback',
      type: 'administrativo',
      priority: 'medium',
      estimated_hours: 0.5,
      responsavel: 'bruna',
      duracao_dias: 0,
      bloqueador: null,
      notificacao: 'segunda-feira',
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
  description: 'Semana 4 — publicação, anúncios e fechamento',
  order: 4,
  phase: 'publicacao',
  estimated_hours: 14,
  duration_business_days: 5,
  required: true,
  tasks: [
    {
      id: 'publicar_feed_stories',
      title: 'Publicar feed/stories',
      description: 'Publicação nos canais acordados',
      type: 'midia',
      priority: 'high',
      estimated_hours: 4,
      responsavel: 'bruna,duda',
      duracao_dias: 1,
      bloqueador: 'segunda_rodada_aprovacao',
      notificacao: 'segunda-feira',
      checklist: [
        { text: 'Posts agendados ou no ar', required: true },
        { text: 'Links/UTMs conferidos', required: false },
      ],
    },
    {
      id: 'ativar_anuncios',
      title: 'Ativar anúncios',
      description: 'Setup e ativação de mídia paga do ciclo',
      type: 'midia',
      priority: 'high',
      estimated_hours: 3,
      responsavel: 'bruna',
      duracao_dias: 1,
      bloqueador: 'publicar_feed_stories',
      notificacao: null,
      checklist: [
        { text: 'Campanhas no ar', required: true },
        { text: 'Budget e tracking conferidos', required: true },
      ],
    },
    {
      id: 'comunicado_whatsapp',
      title: 'Comunicado WhatsApp',
      description: 'Aviso ao cliente/base sobre o conteúdo no ar',
      type: 'administrativo',
      priority: 'medium',
      estimated_hours: 0.5,
      responsavel: 'bruna',
      duracao_dias: 0,
      bloqueador: 'publicar_feed_stories',
      notificacao: null,
      checklist: [
        { text: 'Mensagem enviada', required: true },
      ],
    },
    {
      id: 'reuniao_mensal_relatorio',
      title: 'Reunião mensal — relatório do ciclo',
      description:
        'Reunião com o cliente em até 2 dias. Gerar o relatório mensal e enviar antes da call.',
      type: 'reuniao',
      priority: 'high',
      estimated_hours: 2,
      responsavel: 'bruna',
      duracao_dias: 2,
      bloqueador: 'ativar_anuncios',
      notificacao: null,
      checklist: [
        { text: 'Relatório PDF gerado no cycle-report', required: true },
        { text: 'Agenda da reunião confirmada', required: true },
        { text: 'Status enviado ao cliente', required: false },
      ],
    },
    {
      id: 'relatorio_ciclo',
      title: 'Relatório e review do ciclo',
      description: 'Sumário do mês + aprendizados + próximos passos',
      type: 'relatorio',
      priority: 'high',
      estimated_hours: 4,
      responsavel: 'bruna',
      duracao_dias: 2,
      bloqueador: 'reuniao_mensal_relatorio',
      notificacao: null,
      checklist: [
        { text: 'Status do mês consolidado', required: true },
        { text: 'Pendências do próximo ciclo', required: true },
        { text: 'Feedback de vendas/engagement registrado', required: false },
      ],
    },
    {
      id: 'lembrete_segunda_s4',
      title: 'Lembrete segunda — Semana 4 (Publicação)',
      description: 'Enviar lembrete: fase de publicação/fechamento',
      type: 'administrativo',
      priority: 'medium',
      estimated_hours: 0.5,
      responsavel: 'bruna',
      duracao_dias: 0,
      bloqueador: null,
      notificacao: 'segunda-feira',
      checklist: [
        { text: 'Mensagem enviada ao cliente', required: true },
        { text: 'Lembrete de reunião mensal (se houver)', required: false },
      ],
    },
  ],
};

export const CICLO_MENSAL_TEMPLATE_KEY = 'ciclo_mensal_4_semanas';
export const CICLO_MENSAL_TEMPLATE_SLUG = 'ciclo_mensal_4_semanas';
export const CICLO_MENSAL_TEMPLATE_VERSION = '2.1';

export const CICLO_MENSAL_4_SEMANAS_TEMPLATE = {
  id: 'ciclo_mensal_4_semanas_template',
  slug: CICLO_MENSAL_TEMPLATE_SLUG,
  name: 'Ciclo Mensal de Campanhas',
  description:
    'Pipeline mensal padrão: PLANEJAMENTO → PRODUÇÃO → REVISÃO → PUBLICAÇÃO, com responsáveis, dependências e lembretes de segunda',
  category: 'marketing_digital',
  language: 'pt',
  offering_key: CICLO_MENSAL_TEMPLATE_KEY,

  pricing: {
    type: 'recorrente',
    base_price: 5000,
    currency: 'BRL',
    billing_cycle: 'monthly',
    estimated_hours: 74,
    duration_months: 1,
  },

  deliverables: [PLANEJAMENTO, PRODUCAO, REVISAO, PUBLICACAO].map(withTaskTemplates),

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
  template_version: CICLO_MENSAL_TEMPLATE_VERSION,

  briefing_template: {
    title: 'Briefing — Ciclo Mensal de Campanhas',
    description: '6 campos mínimos para operar o ciclo (editável no template)',
    questions: [
      {
        id: 'campanha_nome',
        text: 'Nome da campanha',
        type: 'short_text',
        required: true,
      },
      {
        id: 'objetivo_mes',
        text: 'Objetivo principal (awareness, conversão, lançamento)?',
        type: 'long_text',
        required: true,
      },
      {
        id: 'empresa_contexto',
        text: 'Contexto da empresa / produto em destaque',
        type: 'long_text',
        required: true,
      },
      {
        id: 'produtos',
        text: 'Produtos ou ofertas envolvidas',
        type: 'long_text',
        required: true,
      },
      {
        id: 'volume_pecas',
        text: 'Volume esperado (vídeos, posts, designs)',
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

/** @deprecated use PLANEJAMENTO phase — kept for import safety */
export const ROTEIROS = PLANEJAMENTO;

export default CICLO_MENSAL_4_SEMANAS_TEMPLATE;
