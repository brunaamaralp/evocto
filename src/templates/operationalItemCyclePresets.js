/**
 * Presets operacionais — ciclo → item (tarefa) → subtarefas (checklist).
 *
 * Produção de Conteúdo e Sessão de Fotos permanecem nos arquivos canônicos
 * dedicados (compatibilidade). Os demais entram aqui via factory.
 *
 * `group` é apenas organização conceitual/UI — não cria campo novo no Appwrite.
 */

import { buildItemCycleServiceTemplate } from './buildItemCycleServiceTemplate.js';

/** @typedef {{ key: string, group: string, label: string, selectLabel: string, hint: string, emptyCycleMessage: string, aliases?: string[] }} ItemCycleOptionMeta */

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
      'Briefing',
      'Objetivo',
      'Conceito / Ideia',
      'Planejamento',
      'Produção',
      'Aprovação',
      'Publicação / Execução',
      'Encerramento',
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
      'Briefing',
      'Roteiro',
      'Referências',
      'Checklist de Produção',
      'Agendamento',
      'Captação',
      'Edição',
      'Revisão',
      'Aprovação',
      'Entrega',
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
      'Briefing',
      'Alinhamento do Evento',
      'Checklist de Cobertura',
      'Agendamento',
      'Cobertura / Captação',
      'Seleção de Material',
      'Edição',
      'Aprovação',
      'Entrega',
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
      'Briefing',
      'Alinhamento da Programação',
      'Referências / Direção',
      'Checklist',
      'Cobertura em Tempo Real',
      'Organização dos Materiais',
      'Entrega / Arquivamento',
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
      'Briefing',
      'Diagnóstico',
      'Pesquisa',
      'Público',
      'Posicionamento',
      'Territórios de Comunicação',
      'Tom de Voz',
      'Direção Visual',
      'Apresentação',
      'Ajustes',
      'Aprovação',
      'Entrega',
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
      'Briefing',
      'Levantamento de Materiais',
      'Referências',
      'Direção Visual',
      'Criação',
      'Revisão',
      'Aprovação',
      'Fechamento de Arquivos',
      'Entrega',
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
    selectLabel: `${preset.name} — ciclo + itens`,
    hint: `Ao criar cada ${preset.itemLabel || 'item'} (tarefa), as etapas do template são aplicadas como checklist editável.`,
    emptyCycleMessage: `Ciclo criado — adicione ${preset.itemLabel || 'itens'} como tarefas (checklist do template aplicado automaticamente).`,
  })
);

export function getOperationalItemCycleTemplate(key) {
  return OPERATIONAL_ITEM_CYCLE_TEMPLATES[String(key || '').trim()] || null;
}

export default OPERATIONAL_ITEM_CYCLE_TEMPLATES;
