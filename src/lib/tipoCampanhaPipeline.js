/**
 * Variação do Pipeline Narrativa por tipo_campanha + ajustes de SLA por ciclo_comercial.
 */

import { CICLO_NARRATIVA_7_FASES_TEMPLATE } from '../templates/cicloNarrativa7FasesTemplate.js';
import { normalizeDeliverableTaskShapes } from '../templates/cicloMensal4SemanasTemplate.js';

export const TIPOS_CAMPANHA = Object.freeze([
  {
    value: '5_videos',
    label: '5 vídeos',
    description: 'Pipeline completo: roteiros, gravação, edição e aprovação',
  },
  {
    value: 'ugc',
    label: 'UGC',
    description: 'Curadoria de UGC — sem roteiros clássicos de gravação',
  },
  {
    value: 'influenciador',
    label: 'Influenciador',
    description: 'Produção com influencer + gate de aprovação do influencer',
  },
  {
    value: 'so_posts',
    label: 'Só posts',
    description: 'Sem produção de vídeo — planejamento, aprovação e agendamento',
  },
]);

export const CICLOS_COMERCIAIS_OPS = Object.freeze([
  { value: 'autoridade', label: 'Autoridade', slaCalendario: 5 },
  { value: 'vendas', label: 'Vendas', slaCalendario: 3 },
  { value: 'engajamento', label: 'Engajamento', slaCalendario: 4 },
  { value: 'reconhecimento', label: 'Reconhecimento', slaCalendario: 4 },
]);

/** Fases incluídas por tipo (keys de phase). */
export const PHASES_BY_TIPO = Object.freeze({
  '5_videos': [
    'planejamento',
    'roteiros',
    'foto_e_video',
    'aprovacao_interna',
    'calendario_cliente',
    'alteracoes',
    'agendamento',
  ],
  ugc: [
    'planejamento',
    'foto_e_video',
    'aprovacao_interna',
    'calendario_cliente',
    'alteracoes',
    'agendamento',
  ],
  influenciador: [
    'planejamento',
    'roteiros',
    'foto_e_video',
    'aprovacao_interna',
    'aprovacao_influencer',
    'calendario_cliente',
    'alteracoes',
    'agendamento',
  ],
  so_posts: [
    'planejamento',
    'aprovacao_interna',
    'calendario_cliente',
    'alteracoes',
    'agendamento',
  ],
});

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

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

function reindexOrders(deliverables) {
  return deliverables.map((d, idx) => ({
    ...d,
    order: idx + 1,
  }));
}

function rebuildBlockers(deliverables) {
  // Mantém bloqueadores por id de template; se o alvo sumiu, limpa.
  const ids = new Set();
  for (const d of deliverables) {
    for (const t of d.task_templates || d.tasks || []) {
      ids.add(t.id);
      for (const s of t.subtarefas || []) ids.add(s.id);
    }
  }
  return deliverables.map((d) => {
    const tasks = (d.tasks || []).map((t) => ({
      ...t,
      bloqueador: t.bloqueador && ids.has(t.bloqueador) ? t.bloqueador : null,
      subtarefas: (t.subtarefas || []).map((s) => ({
        ...s,
        bloqueador: s.bloqueador && ids.has(s.bloqueador) ? s.bloqueador : null,
      })),
    }));
    return withTaskTemplates({ ...d, tasks });
  });
}

function ugcFotoTasks() {
  return [
    {
      id: 'producao_ugc',
      title: 'Curadoria UGC',
      description: 'Curar, selecionar e ordenar conteúdos UGC',
      type: 'producao',
      priority: 'high',
      estimated_hours: 8,
      responsavel: 'duda',
      duracao_dias: 3,
      bloqueador: 'briefings_pecas',
      notificacao: 'segunda-feira',
      subtarefas: [
        {
          id: 'curar_ugc',
          title: 'Curar UGC',
          type: 'producao',
          priority: 'high',
          estimated_hours: 3,
          responsavel: 'duda',
          duracao_dias: 1,
          bloqueador: null,
        },
        {
          id: 'selecionar_ugc',
          title: 'Selecionar peças finais',
          type: 'producao',
          priority: 'high',
          estimated_hours: 2,
          responsavel: 'bruna',
          duracao_dias: 1,
          bloqueador: 'curar_ugc',
        },
        {
          id: 'ordenar_ugc',
          title: 'Ordenar sequência / calendário',
          type: 'producao',
          priority: 'medium',
          estimated_hours: 2,
          responsavel: 'bruna',
          duracao_dias: 1,
          bloqueador: 'selecionar_ugc',
        },
      ],
      checklist: [
        { text: 'UGC curado', required: true },
        { text: 'Peças selecionadas', required: true },
        { text: 'Ordem definida', required: true },
      ],
    },
  ];
}

function influencerFotoTasks() {
  return [
    {
      id: 'producao_influencer',
      title: 'Produção com influencer',
      description: 'Gravar/editar conteúdo com o influencer',
      type: 'producao',
      priority: 'high',
      estimated_hours: 16,
      responsavel: 'duda',
      duracao_dias: 4,
      bloqueador: 'roteiros_5_videos',
      notificacao: 'segunda-feira',
      subtarefas: [
        {
          id: 'gravar_com_influencer',
          title: 'Gravar com influencer',
          type: 'producao',
          priority: 'high',
          estimated_hours: 6,
          responsavel: 'duda',
          duracao_dias: 2,
          bloqueador: null,
          notificacao: 'segunda-feira',
        },
        {
          id: 'editar_conteudo_influencer',
          title: 'Editar conteúdo',
          type: 'producao',
          priority: 'high',
          estimated_hours: 6,
          responsavel: 'duda',
          duracao_dias: 2,
          bloqueador: 'gravar_com_influencer',
        },
      ],
      checklist: [
        { text: 'Gravação concluída', required: true },
        { text: 'Edição pronta', required: true },
      ],
    },
  ];
}

function aprovacaoInfluencerPhase() {
  return withTaskTemplates({
    id: 'fase_aprovacao_influencer',
    name: 'APROVAÇÃO INFLUENCER',
    description: 'Influencer aprova o conteúdo antes do calendário do cliente',
    order: 5,
    phase: 'aprovacao_influencer',
    estimated_hours: 2,
    duration_business_days: 2,
    required: true,
    gatekeeper: 'influencer',
    sla_dias: 2,
    sla_prometido_dias: 2,
    tasks: [
      {
        id: 'aprovacao_influencer',
        title: 'Influencer aprova conteúdo',
        description: 'Enviar pacote e registrar aprovação do influencer',
        type: 'aprovacao',
        priority: 'high',
        estimated_hours: 1,
        responsavel: 'bruna',
        gatekeeper: 'influencer',
        gate_status: 'pendente',
        duracao_dias: 2,
        bloqueador: 'qa_aprovacao_interna',
        notificacao: null,
        checklist: [
          { text: 'Pacote enviado ao influencer', required: true },
          { text: 'Aprovação registrada', required: true },
        ],
      },
    ],
  });
}

/**
 * Preview leve das fases para UI.
 */
export function previewPhasesForTipo(tipo = '5_videos') {
  const keys = PHASES_BY_TIPO[tipo] || PHASES_BY_TIPO['5_videos'];
  const labels = {
    planejamento: 'PLANEJAMENTO',
    roteiros: 'ROTEIROS',
    foto_e_video: tipo === 'ugc' ? 'CURADORIA UGC' : 'FOTO E VÍDEO',
    aprovacao_interna: 'APROVAÇÃO INTERNA',
    aprovacao_influencer: 'APROVAÇÃO INFLUENCER',
    calendario_cliente: 'CALENDÁRIO CLIENTE',
    alteracoes: 'ALTERAÇÕES',
    agendamento: 'AGENDAMENTO',
  };
  return keys.map((key, idx) => ({
    key,
    order: idx + 1,
    label: labels[key] || key,
    optional: key === 'alteracoes',
    gatekeeper:
      key === 'calendario_cliente'
        ? 'cliente'
        : key === 'aprovacao_influencer'
          ? 'influencer'
          : key === 'roteiros' || key === 'aprovacao_interna'
            ? 'bruna'
            : null,
  }));
}

/**
 * Gera deliverables do pipeline Narrativa para o tipo informado.
 */
export function buildNarrativaDeliverablesByTipo(tipo = '5_videos') {
  const safeTipo = PHASES_BY_TIPO[tipo] ? tipo : '5_videos';
  const base = deepClone(CICLO_NARRATIVA_7_FASES_TEMPLATE.deliverables || []);
  const byPhase = new Map(base.map((d) => [d.phase, d]));

  const wanted = PHASES_BY_TIPO[safeTipo];
  const out = [];

  for (const phaseKey of wanted) {
    if (phaseKey === 'aprovacao_influencer') {
      out.push(aprovacaoInfluencerPhase());
      continue;
    }

    let fase = byPhase.get(phaseKey);
    if (!fase) continue;
    fase = deepClone(fase);

    if (phaseKey === 'foto_e_video' && safeTipo === 'ugc') {
      fase.name = 'CURADORIA UGC';
      fase.description = 'Curar, selecionar e ordenar UGC (sem roteiros clássicos)';
      fase.tasks = ugcFotoTasks();
      fase = withTaskTemplates(fase);
    }

    if (phaseKey === 'foto_e_video' && safeTipo === 'influenciador') {
      fase.name = 'FOTO E VÍDEO (INFLUENCER)';
      fase.description = 'Gravação e edição com influencer';
      fase.tasks = influencerFotoTasks();
      fase = withTaskTemplates(fase);
    }

    out.push(fase);
  }

  // Reencadear bloqueadores entre fases (primeiro task da fase → última da anterior)
  const chained = reindexOrders(out).map((fase, idx, arr) => {
    if (idx === 0) return fase;
    const prev = arr[idx - 1];
    const prevTasks = prev.task_templates || prev.tasks || [];
    const lastPrev = [...prevTasks].reverse().find((t) => t.type !== 'administrativo') || prevTasks[prevTasks.length - 1];
    if (!lastPrev?.id) return fase;

    const tasks = (fase.tasks || []).map((t, tIdx) => {
      if (tIdx !== 0) return t;
      // só sobrescreve se bloqueador apontava para fase removida ou está vazio no 1º item
      const keep = t.bloqueador && out.some((d) =>
        (d.task_templates || d.tasks || []).some(
          (x) => x.id === t.bloqueador || (x.subtarefas || []).some((s) => s.id === t.bloqueador)
        )
      );
      return keep ? t : { ...t, bloqueador: lastPrev.id };
    });
    return withTaskTemplates({ ...fase, tasks });
  });

  return rebuildBlockers(normalizeDeliverableTaskShapes(chained));
}

/**
 * Ajusta SLA do calendário cliente conforme ciclo comercial.
 */
export function applyCicloComercialSla(deliverables = [], ciclo_comercial = null) {
  const ciclo = CICLOS_COMERCIAIS_OPS.find((c) => c.value === ciclo_comercial);
  if (!ciclo) return deliverables;

  return (deliverables || []).map((d) => {
    if (d.phase !== 'calendario_cliente') return d;
    const sla = ciclo.slaCalendario;
    return {
      ...d,
      sla_dias: sla,
      sla_prometido_dias: Math.max(1, sla - 1),
      duration_business_days: sla,
      escalation: [
        { day: Math.max(1, sla - 1), level: 'reminder', message: 'Falta 1 dia para o cliente responder' },
        { day: sla, level: 'escalation', message: 'Prazo venceu — ligar cliente' },
        { day: sla + 1, level: 'urgent', message: 'URGENTE — campanha bloqueada no cliente' },
      ],
    };
  });
}

export function normalizeTipoCampanha(value) {
  const v = String(value || '').trim().toLowerCase();
  if (PHASES_BY_TIPO[v]) return v;
  if (/ugc/.test(v)) return 'ugc';
  if (/influenc/.test(v)) return 'influenciador';
  if (/post|só post|so_post|feed/.test(v)) return 'so_posts';
  return '5_videos';
}

export function normalizeCicloComercialOps(value) {
  const v = String(value || '').trim().toLowerCase();
  return CICLOS_COMERCIAIS_OPS.some((c) => c.value === v) ? v : '';
}

/**
 * Infere tipo a partir de texto de produção / objetivo (anual → mensal).
 */
export function inferTipoCampanhaFromText(...parts) {
  const blob = parts.filter(Boolean).join(' ').toLowerCase();
  if (/ugc|user.?generated|comunidade/.test(blob)) return 'ugc';
  if (/influenc|creator|embaixador/.test(blob)) return 'influenciador';
  if (/s[oó]\s*posts|apenas posts|feed est[aá]tico|carrossel/.test(blob) && !/v[ií]deo/.test(blob)) {
    return 'so_posts';
  }
  return '5_videos';
}

export default {
  TIPOS_CAMPANHA,
  CICLOS_COMERCIAIS_OPS,
  PHASES_BY_TIPO,
  previewPhasesForTipo,
  buildNarrativaDeliverablesByTipo,
  applyCicloComercialSla,
  normalizeTipoCampanha,
  normalizeCicloComercialOps,
  inferTipoCampanhaFromText,
};
