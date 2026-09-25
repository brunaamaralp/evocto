/**
 * Presets operacionais — ciclo → item (tarefa) → subtarefas (checklist).
 *
 * Produção de Conteúdo e Sessão de Fotos permanecem nos arquivos canônicos
 * dedicados (compatibilidade). Os demais entram aqui via factory.
 *
 * `group` é apenas organização conceitual/UI — não cria campo novo no Appwrite.
 * `activityKind` nos passos: natureza do trabalho (registry V2.1); null = ambíguo.
 */

import { buildItemCycleServiceTemplate } from './buildItemCycleServiceTemplate.js';

/** @typedef {{ key: string, group: string, label: string, selectLabel: string, hint: string, emptyCycleMessage: string, aliases?: string[] }} ItemCycleOptionMeta */

/** @param {string} title @param {string|null} activityKind */
function step(title, activityKind = null) {
  return { title, text: title, activityKind };
}

export const OPERATIONAL_ITEM_CYCLE_PRESETS = [
  {
    key: 'campanha_pontual',
    group: 'campanhas',
    name: 'Campanha Pontual',
    description:
      'Planejamento e execução de uma campanha específica, com objetivo, escopo e período definidos.',
    category: 'marketing_digital',
    itemLabel: 'campanha',
    phaseName: 'Campanhas',
    defaultTaskTitle: 'Nova campanha pontual',
    steps: [
      step('Briefing', 'briefing'),
      step('Objetivo', 'planning'),
      step('Conceito / Ideia', 'planning'),
      step('Planejamento', 'planning'),
      step('Produção', null), // bundle heterogêneo
      step('Aprovação', 'approval'),
      step('Publicação / Execução', 'publishing'),
      step('Encerramento', 'reporting'),
    ],
  },
  {
    key: 'producao_video',
    group: 'conteudo',
    name: 'Produção de Vídeo',
    description:
      'Planejamento, captação, edição e entrega de uma produção audiovisual.',
    category: 'conteudo',
    itemLabel: 'produção de vídeo',
    phaseName: 'Produções',
    defaultTaskTitle: 'Nova produção de vídeo',
    steps: [
      step('Briefing', 'briefing'),
      step('Roteiro', 'script'),
      step('Referências', 'planning'),
      step('Checklist de Produção', 'admin'),
      step('Agendamento', 'scheduling'),
      step('Captação', 'capture'),
      step('Edição', 'editing'),
      step('Revisão', 'revision'),
      step('Aprovação', 'approval'),
      step('Entrega', 'delivery'),
    ],
  },
  {
    key: 'cobertura_evento',
    group: 'eventos',
    name: 'Cobertura de Evento',
    description:
      'Planejamento, registro e entrega de conteúdo fotográfico e/ou audiovisual de um evento.',
    category: 'conteudo',
    itemLabel: 'cobertura',
    phaseName: 'Coberturas',
    defaultTaskTitle: 'Nova cobertura de evento',
    steps: [
      step('Briefing', 'briefing'),
      step('Alinhamento do Evento', 'planning'),
      step('Checklist de Cobertura', 'admin'),
      step('Agendamento', 'scheduling'),
      // foto e/ou vídeo — natureza mista
      step('Cobertura / Captação', null),
      step('Seleção de Material', 'curation'),
      step('Edição', 'editing'),
      step('Aprovação', 'approval'),
      step('Entrega', 'delivery'),
    ],
  },
  {
    key: 'storymaker',
    group: 'eventos',
    name: 'Storymaker',
    description:
      'Planejamento e produção de conteúdo em tempo real para stories durante eventos ou ações.',
    category: 'conteudo',
    itemLabel: 'ação storymaker',
    phaseName: 'Ações',
    defaultTaskTitle: 'Nova ação Storymaker',
    steps: [
      step('Briefing', 'briefing'),
      step('Alinhamento da Programação', 'planning'),
      step('Referências / Direção', 'planning'),
      step('Checklist', 'admin'),
      step('Cobertura em Tempo Real', 'capture'),
      step('Organização dos Materiais', 'admin'),
      step('Entrega / Arquivamento', 'delivery'),
    ],
  },
  {
    key: 'posicionamento_marca',
    group: 'marca',
    name: 'Posicionamento de Marca',
    description:
      'Processo estratégico para definição do posicionamento, público e direção de comunicação da marca.',
    category: 'branding',
    itemLabel: 'projeto de posicionamento',
    phaseName: 'Projetos',
    defaultTaskTitle: 'Novo posicionamento de marca',
    steps: [
      step('Briefing', 'briefing'),
      step('Diagnóstico', 'analysis'),
      step('Pesquisa', 'research'),
      step('Público', 'research'),
      step('Posicionamento', 'strategy'),
      step('Territórios de Comunicação', 'strategy'),
      step('Tom de Voz', 'strategy'),
      step('Direção Visual', 'planning'),
      step('Apresentação', 'meeting'),
      step('Ajustes', 'revision'),
      step('Aprovação', 'approval'),
      step('Entrega', 'delivery'),
    ],
  },
  {
    key: 'identidade_papelaria_eventos',
    group: 'eventos',
    name: 'Identidade / Papelaria para Eventos',
    description:
      'Criação e preparação das peças visuais e materiais gráficos necessários para um evento.',
    category: 'design',
    itemLabel: 'projeto de papelaria',
    phaseName: 'Projetos',
    defaultTaskTitle: 'Nova identidade / papelaria de evento',
    steps: [
      step('Briefing', 'briefing'),
      step('Levantamento de Materiais', 'research'),
      step('Referências', 'planning'),
      step('Direção Visual', 'planning'),
      // criação gráfica — sem kind de design dedicado
      step('Criação', null),
      step('Revisão', 'revision'),
      step('Aprovação', 'approval'),
      step('Fechamento de Arquivos', 'delivery'),
      step('Entrega', 'delivery'),
    ],
  },
];

/** Templates canônicos gerados (mapa key → Service template shape) */
export const OPERATIONAL_ITEM_CYCLE_TEMPLATES = Object.fromEntries(
  OPERATIONAL_ITEM_CYCLE_PRESETS.map((preset) => [
    preset.key,
    buildItemCycleServiceTemplate(preset),
  ])
);

/** Metadados de UI/registry para os presets deste arquivo */
export const OPERATIONAL_ITEM_CYCLE_OPTION_METAS = OPERATIONAL_ITEM_CYCLE_PRESETS.map(
  (preset) => ({
    key: preset.key,
    aliases: [],
    group: preset.group,
    label: preset.name,
    selectLabel: `${preset.name} — mês + ${preset.itemLabel || 'itens'}`,
    hint: `Ao criar cada ${preset.itemLabel || 'item'}, as etapas do template são aplicadas como checklist editável.`,
    emptyCycleMessage: `Mês iniciado — adicione ${preset.itemLabel || 'itens'} (etapas do template aplicadas automaticamente).`,
  })
);

export function getOperationalItemCycleTemplate(key) {
  return OPERATIONAL_ITEM_CYCLE_TEMPLATES[String(key || '').trim()] || null;
}

export default OPERATIONAL_ITEM_CYCLE_TEMPLATES;
