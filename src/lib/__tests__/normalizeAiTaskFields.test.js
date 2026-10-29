import { describe, it, expect } from 'vitest';
import {
  normalizeAiTaskFields,
  resolveAddTaskPayload,
} from '../normalizeAiTaskFields.js';
import { TaskAdjustment } from '@/models/TaskAdjustment.js';

describe('normalizeAiTaskFields', () => {
  it('maps EN camelCase fields', () => {
    const n = normalizeAiTaskFields({
      title: 'Auditar marca',
      description: 'Revisar posicionamento e comunicação',
      priority: 'high',
      phase: 'Diagnóstico',
      estimatedHours: 6,
    });
    expect(n.title).toBe('Auditar marca');
    expect(n.estimatedHours).toBe(6);
    expect(n.priority).toBe('high');
  });

  it('maps PT and snake_case aliases', () => {
    const n = normalizeAiTaskFields({
      titulo: 'Mapear funil',
      descricao: 'Entender etapas de conversão do cliente',
      prioridade: 'alta',
      fase: 'Estratégia',
      estimated_hours: 3,
    });
    expect(n.title).toBe('Mapear funil');
    expect(n.description).toContain('conversão');
    expect(n.priority).toBe('high');
    expect(n.phase).toBe('Estratégia');
    expect(n.estimatedHours).toBe(3);
  });
});

describe('resolveAddTaskPayload / TaskAdjustment', () => {
  it('accepts nested payload.task', () => {
    const n = resolveAddTaskPayload({
      task: { title: 'Nova entrega', description: 'Detalhe suficiente' },
    });
    expect(n.title).toBe('Nova entrega');
  });

  it('accepts flat legacy payload', () => {
    const n = resolveAddTaskPayload({
      titulo: 'Tarefa flat',
      descricao: 'Veio sem envelope task',
    });
    expect(n.title).toBe('Tarefa flat');
  });

  it('createNewTask works for nested and flat ADD_TASK', () => {
    const nested = new TaskAdjustment({
      servico_instancia_id: 's1',
      briefing_id: 'b1',
      action: 'ADD_TASK',
      payload: { task: { title: 'Nested OK', description: 'Desc' } },
      reason: 'test',
    });
    expect(nested.validate().isValid).toBe(true);
    expect(nested.createNewTask().title).toBe('Nested OK');

    const flat = new TaskAdjustment({
      servico_instancia_id: 's1',
      briefing_id: 'b1',
      action: 'ADD_TASK',
      payload: { titulo: 'Flat OK', descricao: 'Desc' },
      reason: 'test',
    });
    expect(flat.validate().isValid).toBe(true);
    expect(flat.createNewTask().title).toBe('Flat OK');
  });
});
