/**
 * Factory — monta Service templates de ciclo operacional (item)
 * no mesmo formato de Produção de Conteúdo / Sessão de Fotos.
 *
 * Entrada: { key, name, description, category, steps[] }
 * Saída: objeto canônico com deliverables vazios + content_item_template.
 */

import { normalizeDeliverableTaskShapes } from './cicloMensal4SemanasTemplate.js';

function slugifyStep(text, index) {
  const base = String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  return base || `etapa_${index + 1}`;
}

function normalizeSteps(steps = []) {
  return (Array.isArray(steps) ? steps : []).map((step, index) => {
    if (typeof step === 'string') {
      const title = step.trim();
      return {
        id: slugifyStep(title, index),
        title,
        text: title,
        description: '',
        type: 'producao',
        priority: 'medium',
        estimated_hours: 1,
        duracao_dias: 1,
        bloqueador: null,
        required: true,
      };
    }
    const title = String(step.title || step.text || `Etapa ${index + 1}`).trim();
    return {
      id: step.id || slugifyStep(title, index),
      title,
      text: step.text || title,
      description: step.description || '',
      type: step.type || 'producao',
      priority: step.priority || 'medium',
      estimated_hours: step.estimated_hours ?? 1,
      duracao_dias: step.duracao_dias ?? 1,
      bloqueador: null,
      required: step.required !== false,
    };
  });
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

/**
 * @param {{
 *   key: string,
 *   name: string,
 *   description: string,
 *   category?: string,
 *   version?: string,
 *   itemLabel?: string,
 *   phaseName?: string,
 *   phaseDescription?: string,
 *   steps: Array<string|{id?:string,title?:string,text?:string,description?:string}>,
 *   pricing?: object,
 *   briefingQuestions?: object[],
 * }} preset
 */
export function buildItemCycleServiceTemplate(preset) {
  const key = String(preset.key || '').trim();
  if (!key) throw new Error('buildItemCycleServiceTemplate: key é obrigatório');
  if (!preset.name) throw new Error(`buildItemCycleServiceTemplate(${key}): name é obrigatório`);

  const steps = normalizeSteps(preset.steps);
  const version = preset.version || '1.0';
  const itemLabel = preset.itemLabel || 'item';
  const phaseName = preset.phaseName || 'Itens';
  const phaseId = `fase_${key}`;

  const contentItemTemplate = {
    id: `${key}_padrao`,
    title: preset.defaultTaskTitle || `Novo ${itemLabel}`,
    description:
      preset.defaultTaskDescription ||
      `${itemLabel} do ciclo — etapas iniciais do template ${preset.name}`,
    type: preset.defaultTaskType || 'creative',
    priority: 'medium',
    estimated_hours: preset.estimatedHours || Math.max(4, steps.length),
    responsavel: null,
    duracao_dias: preset.durationDays || Math.max(5, steps.length),
    bloqueador: null,
    notificacao: null,
    subtarefas: steps.map((s) => ({ ...s })),
    checklist: steps.map((s) => ({
      text: s.text || s.title,
      required: s.required !== false,
    })),
  };

  const phase = {
    id: phaseId,
    name: phaseName,
    description:
      preset.phaseDescription ||
      `${phaseName} do ciclo — cada peça é uma tarefa principal com etapas do template`,
    order: 1,
    phase: key,
    estimated_hours: 0,
    duration_business_days: 20,
    required: true,
    tasks: [],
  };

  return {
    id: `${key}_template`,
    slug: key,
    name: preset.name,
    description: preset.description || '',
    category: preset.category || 'conteudo',
    language: 'pt',
    offering_key: key,
    pipeline: key,
    pricing: preset.pricing || {
      type: 'fixed',
      base_price: 0,
      currency: 'BRL',
      billing_cycle: 'one_time',
      estimated_hours: contentItemTemplate.estimated_hours,
      duration_months: 1,
    },
    deliverables: normalizeDeliverableTaskShapes([withTaskTemplates(phase)]),
    content_item_template: contentItemTemplate,
    cycle_frequency: 'monthly',
    approval_policy: 'manual_approve',
    template_category: 'standard',
    template_version: version,
    briefing_template: {
      title: `Briefing — ${preset.name}`,
      description: 'Contexto mínimo para operar este ciclo',
      questions: Array.isArray(preset.briefingQuestions)
        ? preset.briefingQuestions
        : [
            {
              id: 'objetivo',
              text: 'Qual o objetivo deste trabalho?',
              type: 'long_text',
              required: true,
            },
            {
              id: 'escopo',
              text: 'Qual o escopo / entregáveis esperados?',
              type: 'long_text',
              required: true,
            },
            {
              id: 'aprovacao',
              text: 'Quem aprova e em quanto tempo (SLA)?',
              type: 'long_text',
              required: false,
            },
          ],
    },
  };
}

export function matchesItemCycleTemplate(serviceOrTemplate, key) {
  if (!serviceOrTemplate || !key) return false;
  const k = String(key).trim();
  return (
    String(serviceOrTemplate.slug || '').trim() === k ||
    String(serviceOrTemplate.offering_key || '').trim() === k ||
    String(serviceOrTemplate.pipeline || '').trim() === k
  );
}

export default buildItemCycleServiceTemplate;
