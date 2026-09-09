/**
 * Gera estrutura de tarefas para um ciclo de 4 semanas a partir do template canônico.
 * Padrão: PLANEJAMENTO → PRODUÇÃO → REVISÃO → PUBLICAÇÃO com bloqueadores.
 */

import {
  CICLO_MENSAL_4_SEMANAS_TEMPLATE,
  normalizeDeliverableTaskShapes,
} from '@/templates/cicloMensal4SemanasTemplate';

function addDays(ymd, days) {
  const d = new Date(`${String(ymd).slice(0, 10)}T12:00:00`);
  d.setDate(d.getDate() + Number(days || 0));
  return d.toISOString().slice(0, 10);
}

function weekStart(dataInicio, weekNumber) {
  return addDays(dataInicio, (Number(weekNumber) - 1) * 7);
}

/**
 * @param {object} [briefData] - dados do brief (descricao, campanha_nome, etc.)
 * @param {string} dataInicio - YYYY-MM-DD
 * @param {object} [template] - Service template com deliverables (opcional)
 * @returns {object[]} tarefas no formato CyclePlan embutido
 */
export function generateCycleTasks(briefData = {}, dataInicio, template = null) {
  const source = template || CICLO_MENSAL_4_SEMANAS_TEMPLATE;
  const deliverables = normalizeDeliverableTaskShapes(source.deliverables || []);
  const descricao = briefData.descricao || briefData.objetivo_mes || '';
  const tarefas = [];

  deliverables.forEach((fase, faseIdx) => {
    const semana = fase.order || faseIdx + 1;
    const dataInicioSemana = weekStart(dataInicio, semana);
    const templates = fase.task_templates || fase.tasks || [];

    templates.forEach((tarefa) => {
      const duracao = Number(tarefa.duracao_dias ?? 1);
      const dataVencimento = addDays(dataInicioSemana, Math.max(0, duracao));
      const hasBlocker = Boolean(tarefa.bloqueador);

      tarefas.push({
        id: tarefa.id || `task_s${semana}_${tarefas.length + 1}`,
        semana,
        tipo: String(fase.name || fase.phase || '').toUpperCase() || `SEMANA_${semana}`,
        phase: fase.phase || null,
        deliverableId: fase.id,
        titulo: tarefa.title || tarefa.titulo,
        descricao:
          tarefa.id === 'revisar_conceito_cliente' && descricao
            ? descricao
            : tarefa.description || tarefa.descricao || '',
        responsavel: tarefa.responsavel || 'bruna',
        data_inicio: dataInicioSemana,
        data_vencimento: dataVencimento,
        status: hasBlocker ? 'bloqueada' : 'aberta',
        bloqueador: tarefa.bloqueador || null,
        notificacao: tarefa.notificacao || null,
        resultado: null,
        estimated_hours: tarefa.estimated_hours,
        type: tarefa.type,
        checklist: Array.isArray(tarefa.checklist) ? tarefa.checklist.map((c) => ({ ...c })) : [],
      });
    });
  });

  return tarefas;
}

/**
 * Desbloqueia tarefas cujo bloqueador foi concluído.
 * @param {object[]} tarefas
 * @param {string} taskIdConcluida
 */
export function unlockDependents(tarefas, taskIdConcluida) {
  return (Array.isArray(tarefas) ? tarefas : []).map((t) => {
    if (t.bloqueador === taskIdConcluida && t.status === 'bloqueada') {
      return { ...t, status: 'aberta' };
    }
    return t;
  });
}

/**
 * Status agregado do ciclo a partir das tarefas por semana.
 */
export function calcularStatusCiclo(tarefas) {
  const list = Array.isArray(tarefas) ? tarefas : [];
  const porSemana = {};
  list.forEach((t) => {
    const s = t.semana;
    if (!porSemana[s]) porSemana[s] = { total: 0, concluidas: 0 };
    porSemana[s].total += 1;
    if (t.status === 'concluida' || t.status === 'completed') {
      porSemana[s].concluidas += 1;
    }
  });

  const done = (n) =>
    porSemana[n] && porSemana[n].total > 0 && porSemana[n].concluidas === porSemana[n].total;

  if (done(4)) return 'publicação';
  if (done(3)) return 'publicação';
  if (done(2)) return 'revisão';
  if (done(1)) return 'produção';
  if (list.some((t) => t.semana === 4 && t.status !== 'bloqueada')) return 'publicação';
  return 'planejamento';
}

export default generateCycleTasks;
