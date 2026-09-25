import { describe, expect, it } from 'vitest';
import {
  ACTIVITY_KIND_DEFINITIONS,
  ACTIVITY_KIND_KEYS,
  ACTIVITY_KINDS,
  getActivityKindDefinition,
  getActivityKindLabel,
  isValidActivityKind,
  normalizeActivityKind,
} from '@/constants/activityKinds';
import { buildTaskPayloadFromTemplate } from '@/lib/startDeliverableStage';

const EXPECTED_KEYS = [
  'briefing',
  'script',
  'capture',
  'photography',
  'editing',
  'calendar',
  'approval',
  'revision',
  'meeting',
  'planning',
  'scheduling',
  'publishing',
  'reporting',
  'admin',
  'curation',
  'delivery',
  'research',
  'analysis',
  'strategy',
];

const service = { id: 'svc-1', clientId: 'cli-1' };
const deliverable = {
  id: 'fase_foto',
  name: 'FOTO E VÍDEO',
  phase: 'foto_e_video',
};

describe('activityKinds registry', () => {
  it('contém todos os kinds definidos', () => {
    expect(ACTIVITY_KIND_KEYS).toEqual(EXPECTED_KEYS);
    expect(ACTIVITY_KIND_DEFINITIONS).toHaveLength(EXPECTED_KEYS.length);
  });

  it('keys são únicas', () => {
    expect(new Set(ACTIVITY_KIND_KEYS).size).toBe(ACTIVITY_KIND_KEYS.length);
  });

  it('cada kind tem key e label pt-BR', () => {
    for (const def of ACTIVITY_KIND_DEFINITIONS) {
      expect(def.key).toBeTruthy();
      expect(def.label).toBeTruthy();
      expect(typeof def.label).toBe('string');
      expect(ACTIVITY_KINDS[def.key]).toEqual(def);
    }
  });

  it('isValidActivityKind reconhece válidos', () => {
    expect(isValidActivityKind('editing')).toBe(true);
    expect(isValidActivityKind('script')).toBe(true);
    expect(isValidActivityKind('meeting')).toBe(true);
  });

  it('valor desconhecido é rejeitado / normalizado para null', () => {
    expect(isValidActivityKind('edicao')).toBe(false);
    expect(isValidActivityKind('video_editing')).toBe(false);
    expect(normalizeActivityKind('edicao')).toBeNull();
    expect(normalizeActivityKind('EDITING')).toBeNull();
    expect(getActivityKindDefinition('nope')).toBeNull();
    expect(getActivityKindLabel('nope')).toBe('');
  });

  it('null / undefined / vazio → null', () => {
    expect(normalizeActivityKind(null)).toBeNull();
    expect(normalizeActivityKind(undefined)).toBeNull();
    expect(normalizeActivityKind('')).toBeNull();
    expect(normalizeActivityKind('   ')).toBeNull();
    expect(isValidActivityKind(null)).toBe(false);
  });
});

describe('buildTaskPayloadFromTemplate — activityKind contract', () => {
  it('template sem activityKind → Task null', () => {
    const payload = buildTaskPayloadFromTemplate(
      { id: 't1', title: 'Sem kind', type: 'producao' },
      deliverable,
      service,
      { agencyId: 'ag-1' }
    );
    expect(payload.activityKind).toBeNull();
  });

  it('template com editing → Task editing', () => {
    const payload = buildTaskPayloadFromTemplate(
      { id: 'editar_video_1', title: 'Editar vídeo 1', type: 'producao', activityKind: 'editing' },
      deliverable,
      service,
      { agencyId: 'ag-1' }
    );
    expect(payload.activityKind).toBe('editing');
  });

  it('template com script → Task script', () => {
    const payload = buildTaskPayloadFromTemplate(
      { id: 'roteiro_1', title: 'Roteiro vídeo 1', type: 'producao', activityKind: 'script' },
      deliverable,
      service,
      { agencyId: 'ag-1' }
    );
    expect(payload.activityKind).toBe('script');
  });

  it('parent sem kind → null', () => {
    const payload = buildTaskPayloadFromTemplate(
      {
        id: 'producao_foto_video',
        title: 'Produção foto e vídeo',
        type: 'producao',
        subtarefas: [{ id: 'gravar_video_1', activityKind: 'capture' }],
      },
      deliverable,
      service,
      { agencyId: 'ag-1' }
    );
    expect(payload.activityKind).toBeNull();
  });

  it('child com capture → capture', () => {
    const payload = buildTaskPayloadFromTemplate(
      { id: 'gravar_video_1', title: 'Gravar vídeo 1', type: 'producao', activityKind: 'capture' },
      deliverable,
      service,
      { agencyId: 'ag-1' }
    );
    expect(payload.activityKind).toBe('capture');
  });

  it('child com editing → editing', () => {
    const payload = buildTaskPayloadFromTemplate(
      { id: 'editar_video_1', title: 'Editar vídeo 1', type: 'producao', activityKind: 'editing' },
      deliverable,
      service,
      { agencyId: 'ag-1' }
    );
    expect(payload.activityKind).toBe('editing');
  });

  it('children com kinds diferentes preservam valores próprios', () => {
    const capture = buildTaskPayloadFromTemplate(
      { id: 'gravar_video_1', title: 'Gravar', type: 'producao', activityKind: 'capture' },
      deliverable,
      service,
      { agencyId: 'ag-1' }
    );
    const editing = buildTaskPayloadFromTemplate(
      { id: 'editar_video_1', title: 'Editar', type: 'producao', activityKind: 'editing' },
      deliverable,
      service,
      { agencyId: 'ag-1' }
    );
    const photo = buildTaskPayloadFromTemplate(
      { id: 'fotografar_assets', title: 'Fotografar', type: 'producao', activityKind: 'photography' },
      deliverable,
      service,
      { agencyId: 'ag-1' }
    );
    expect(capture.activityKind).toBe('capture');
    expect(editing.activityKind).toBe('editing');
    expect(photo.activityKind).toBe('photography');
  });

  it('Task.type não é alterado pelo activityKind', () => {
    const payload = buildTaskPayloadFromTemplate(
      { id: 't', title: 'X', type: 'reuniao', activityKind: 'meeting' },
      deliverable,
      service,
      { agencyId: 'ag-1' }
    );
    expect(payload.type).toBe('reuniao');
    expect(payload.activityKind).toBe('meeting');
  });

  it('deliverable.phase não interfere no kind', () => {
    const payload = buildTaskPayloadFromTemplate(
      { id: 'editar_video_1', title: 'Editar', type: 'producao', activityKind: 'editing' },
      { ...deliverable, phase: 'foto_e_video' },
      service,
      { agencyId: 'ag-1' }
    );
    expect(payload.activityKind).toBe('editing');
    expect(payload).not.toHaveProperty('operationalPhase');
  });

  it('title não interfere no kind', () => {
    const payload = buildTaskPayloadFromTemplate(
      { id: 'weird', title: 'Editar e gravar tudo', type: 'producao' },
      deliverable,
      service,
      { agencyId: 'ag-1' }
    );
    expect(payload.activityKind).toBeNull();
  });

  it('template_id não é usado para inferência', () => {
    const payload = buildTaskPayloadFromTemplate(
      { id: 'editar_video_1', title: 'Item', type: 'producao' },
      deliverable,
      service,
      { agencyId: 'ag-1' }
    );
    expect(payload.template_id).toBe('editar_video_1');
    expect(payload.activityKind).toBeNull();
  });

  it('kind inválido no template → null (não quebra)', () => {
    const payload = buildTaskPayloadFromTemplate(
      { id: 't', title: 'X', type: 'producao', activityKind: 'edicao' },
      deliverable,
      service,
      { agencyId: 'ag-1' }
    );
    expect(payload.activityKind).toBeNull();
  });

  it('Task antiga conceitual: ausência de campo equivale a null após normalize', () => {
    const legacyTask = { id: 'old', title: 'Legado', type: 'producao' };
    expect(normalizeActivityKind(legacyTask.activityKind)).toBeNull();
  });

  it('não herda kind de children no parent', () => {
    const parent = buildTaskPayloadFromTemplate(
      {
        id: 'parent',
        title: 'Parent',
        type: 'producao',
        subtarefas: [
          { id: 'a', activityKind: 'capture' },
          { id: 'b', activityKind: 'editing' },
        ],
      },
      deliverable,
      service,
      { agencyId: 'ag-1' }
    );
    expect(parent.activityKind).toBeNull();
  });
});
