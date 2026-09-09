import { Task } from '@/api/entities';

/**
 * Cria dependencies reais (Task.dependencies) a partir do template de tarefas.
 *
 * - Usa `taskTemplate.bloqueador` (id da task template bloqueadora) para montar
 *   `dependencies` com tipo `finish_to_start`.
 * - Idempotente: não duplica dependencies existentes.
 *
 * @param {object[]} createdTasks - tarefas já criadas (com `template_id`)
 * @param {object[]} deliverablesOrdered - deliverables na ordem das fases (com task_templates)
 */
export async function wireTaskTemplateDependencies(
  createdTasks = [],
  deliverablesOrdered = []
) {
  const tasksList = Array.isArray(createdTasks) ? createdTasks : [];
  const phases = Array.isArray(deliverablesOrdered) ? deliverablesOrdered : [];
  if (tasksList.length === 0 || phases.length === 0) return { wired: 0 };

  const byTemplateId = new Map();
  for (const t of tasksList) {
    const templateId = t?.template_id;
    if (templateId) byTemplateId.set(String(templateId), t);
  }

  let wired = 0;

  for (const deliverable of phases) {
    const templates = deliverable?.task_templates || deliverable?.tasks || [];
    for (const taskTemplate of templates) {
      const thisTemplateId = taskTemplate?.id;
      if (!thisTemplateId) continue;

      const thisTask = byTemplateId.get(String(thisTemplateId));
      if (!thisTask?.id) continue;

      const blockerTemplateId = taskTemplate?.bloqueador;
      if (!blockerTemplateId) continue;

      const blockerTask = byTemplateId.get(String(blockerTemplateId));
      if (!blockerTask?.id) continue;

      const existing = Array.isArray(thisTask.dependencies)
        ? thisTask.dependencies
        : [];

      if (existing.some((d) => String(d.taskId) === String(blockerTask.id))) {
        continue;
      }

      const dependencies = [
        ...existing,
        {
          taskId: blockerTask.id,
          type: 'finish_to_start',
          description: `Bloqueador: ${blockerTask.title || blockerTask.id}`,
          isResolved: false,
        },
      ];

      await Task.update(thisTask.id, { dependencies });
      thisTask.dependencies = dependencies;
      wired += 1;
    }
  }

  return { wired };
}

export default wireTaskTemplateDependencies;

