import { describe, expect, it } from 'vitest';
import { normalizeActivityKind } from '@/constants/activityKinds';
import {
  buildChecklistFromContentItemTemplate,
  buildReadyForApprovalChecklist,
  normalizeChecklistStepFromTemplate,
} from '@/templates/itemCycleTemplateHelpers';
import {
  CONTENT_ITEM_TASK_TEMPLATE,
  DEFAULT_CONTENT_SUBTAREFAS,
  PRODUCAO_CONTEUDO_TEMPLATE,
} from '@/templates/producaoConteudoTemplate';
import {
  DEFAULT_SESSAO_FOTOS_SUBTAREFAS,
  SESSAO_FOTOS_TEMPLATE,
  SESSAO_ITEM_TASK_TEMPLATE,
} from '@/templates/sessaoFotosTemplate';
import {
  OPERATIONAL_ITEM_CYCLE_PRESETS,
  OPERATIONAL_ITEM_CYCLE_TEMPLATES,
} from '@/templates/operationalItemCyclePresets';

describe('V2.3 checklist contract — normalizeChecklistStepFromTemplate', () => {
  it('preserva id canônico e activityKind', () => {
    const item = normalizeChecklistStepFromTemplate(
      { id: 'edicao', text: 'Edição', activityKind: 'editing', required: true },
      0
    );
    expect(item.id).toBe('edicao');
    expect(item.templateStepId).toBe('edicao');
    expect(item.activityKind).toBe('editing');
  });

  it('kind inválido → null', () => {
    const item = normalizeChecklistStepFromTemplate(
      { id: 'x', text: 'X', activityKind: 'edicao' },
      0
    );
    expect(item.activityKind).toBeNull();
  });

  it('passo sem kind → null', () => {
    const item = normalizeChecklistStepFromTemplate(
      { id: 'producao', text: 'Produção' },
      0
    );
    expect(item.activityKind).toBeNull();
    expect(item.templateStepId).toBe('producao');
  });
});

describe('V2.3 materialização — producaoConteudo', () => {
  const service = {
    ...PRODUCAO_CONTEUDO_TEMPLATE,
    id: 'svc-content',
    content_item_template: CONTENT_ITEM_TASK_TEMPLATE,
  };

  it('preserva identidade e kinds dos passos', () => {
    const checklist = buildChecklistFromContentItemTemplate(service);
    const byId = Object.fromEntries(checklist.map((c) => [c.id, c]));

    expect(byId.roteiro).toMatchObject({
      templateStepId: 'roteiro',
      activityKind: 'script',
      text: 'Roteiro',
    });
    expect(byId.edicao).toMatchObject({
      templateStepId: 'edicao',
      activityKind: 'editing',
    });
    expect(byId.aprovacao.activityKind).toBe('approval');
    expect(byId.agendamento.activityKind).toBe('scheduling');
    // ambíguo: captação/gravação/criação
    expect(byId.producao.activityKind).toBeNull();
    expect(byId.producao.templateStepId).toBe('producao');
  });

  it('não usa Date.now em ids canônicos', () => {
    const a = buildChecklistFromContentItemTemplate(service);
    const b = buildChecklistFromContentItemTemplate(service);
    expect(a.map((i) => i.id)).toEqual(b.map((i) => i.id));
    expect(a.map((i) => i.id)).toEqual([
      'roteiro',
      'producao',
      'edicao',
      'aprovacao',
      'agendamento',
    ]);
  });

  it('unit Task heterogênea continua activityKind null', () => {
    expect(CONTENT_ITEM_TASK_TEMPLATE.activityKind ?? null).toBeNull();
    expect(
      normalizeActivityKind(CONTENT_ITEM_TASK_TEMPLATE.activityKind)
    ).toBeNull();
  });

  it('ready-for-approval marca passos pré-aprovação via templateStepId', () => {
    const checklist = buildReadyForApprovalChecklist(service);
    expect(checklist.find((c) => c.id === 'roteiro').completed).toBe(true);
    expect(checklist.find((c) => c.id === 'producao').completed).toBe(true);
    expect(checklist.find((c) => c.id === 'edicao').completed).toBe(true);
    expect(checklist.find((c) => c.id === 'aprovacao').completed).toBe(false);
  });

  it('DEFAULT_CONTENT_SUBTAREFAS carrega kinds na definição', () => {
    expect(DEFAULT_CONTENT_SUBTAREFAS.find((s) => s.id === 'roteiro').activityKind).toBe(
      'script'
    );
    expect(DEFAULT_CONTENT_SUBTAREFAS.find((s) => s.id === 'edicao').activityKind).toBe(
      'editing'
    );
  });
});

describe('V2.3 materialização — sessaoFotos', () => {
  const service = {
    ...SESSAO_FOTOS_TEMPLATE,
    id: 'svc-sessao',
    content_item_template: SESSAO_ITEM_TASK_TEMPLATE,
  };

  it('mapeia photography / editing / delivery', () => {
    const checklist = buildChecklistFromContentItemTemplate(service);
    const byId = Object.fromEntries(checklist.map((c) => [c.id, c]));
    expect(byId.briefing.activityKind).toBe('briefing');
    expect(byId.captacao.activityKind).toBe('photography');
    expect(byId.tratamento_edicao.activityKind).toBe('editing');
    expect(byId.selecao.activityKind).toBe('curation');
    expect(byId.entrega.activityKind).toBe('delivery');
    expect(byId.aprovacao.activityKind).toBe('approval');
  });

  it('unit sessao permanece sem kind', () => {
    expect(SESSAO_ITEM_TASK_TEMPLATE.activityKind ?? null).toBeNull();
  });
});

describe('V2.3 presets', () => {
  it('producao_video preserva kinds inequívocos', () => {
    const tpl = OPERATIONAL_ITEM_CYCLE_TEMPLATES.producao_video;
    const checklist = buildChecklistFromContentItemTemplate({
      ...tpl,
      content_item_template: tpl.content_item_template,
    });
    const byStep = Object.fromEntries(
      checklist.map((c) => [c.templateStepId || c.id, c.activityKind])
    );
    expect(byStep.roteiro).toBe('script');
    expect(byStep.captacao).toBe('capture');
    expect(byStep.edicao).toBe('editing');
    expect(byStep.aprovacao).toBe('approval');
    expect(byStep.entrega).toBe('delivery');
  });

  it('cada preset gera checklist com templateStepId', () => {
    for (const preset of OPERATIONAL_ITEM_CYCLE_PRESETS) {
      const tpl = OPERATIONAL_ITEM_CYCLE_TEMPLATES[preset.key];
      const checklist = buildChecklistFromContentItemTemplate(tpl);
      expect(checklist.length).toBeGreaterThan(0);
      for (const item of checklist) {
        expect(item.templateStepId).toBeTruthy();
        expect(item.id).toBeTruthy();
        if (item.activityKind != null) {
          expect(normalizeActivityKind(item.activityKind)).toBe(item.activityKind);
        }
      }
    }
  });
});

describe('V2.3 round-trip / edição / duplicação / legado', () => {
  const service = {
    id: 'svc-1',
    offering_key: 'producao_conteudo',
    content_item_template: CONTENT_ITEM_TASK_TEMPLATE,
  };

  it('materializa → toggle completed → metadata permanece', () => {
    const checklist = buildChecklistFromContentItemTemplate(service);
    const idx = checklist.findIndex((c) => c.id === 'edicao');
    const updated = checklist.map((item, i) =>
      i === idx
        ? { ...item, completed: true, completedAt: new Date().toISOString() }
        : item
    );
    expect(updated[idx].activityKind).toBe('editing');
    expect(updated[idx].templateStepId).toBe('edicao');
    expect(updated[idx].completed).toBe(true);
  });

  it('editar text não remove kind / templateStepId', () => {
    const checklist = buildChecklistFromContentItemTemplate(service);
    const idx = checklist.findIndex((c) => c.id === 'roteiro');
    const updated = checklist.map((item, i) =>
      i === idx ? { ...item, text: 'Roteiro revisado' } : item
    );
    expect(updated[idx].activityKind).toBe('script');
    expect(updated[idx].templateStepId).toBe('roteiro');
    expect(updated[idx].text).toBe('Roteiro revisado');
  });

  it('duplicação (spread) preserva kinds e identidade', () => {
    const checklist = buildChecklistFromContentItemTemplate(service);
    const duplicated = checklist.map((c) => ({ ...c }));
    expect(duplicated.find((c) => c.id === 'edicao').activityKind).toBe('editing');
    expect(duplicated.find((c) => c.id === 'roteiro').templateStepId).toBe('roteiro');
  });

  it('checklist antigo sem kind continua válido', () => {
    const legacy = [
      { id: '123', text: 'Editar', required: true, completed: false },
    ];
    const normalized = legacy.map((item, i) =>
      normalizeChecklistStepFromTemplate(item, i, { generateFallbackId: false })
    );
    expect(normalized[0].activityKind).toBeNull();
    expect(normalized[0].templateStepId).toBeNull();
    expect(normalized[0].text).toBe('Editar');
    expect(normalized[0].id).toBe('123');
  });

  it('item manual sem kind', () => {
    const manual = normalizeChecklistStepFromTemplate(
      { id: `checklist_${Date.now()}_x`, text: 'Nota avulsa', required: false },
      0
    );
    expect(manual.activityKind).toBeNull();
    expect(manual.templateStepId).toBeNull();
  });

  it('dois passos com kinds diferentes permanecem diferentes', () => {
    const checklist = buildChecklistFromContentItemTemplate(service);
    expect(checklist.find((c) => c.id === 'roteiro').activityKind).toBe('script');
    expect(checklist.find((c) => c.id === 'edicao').activityKind).toBe('editing');
  });
});

describe('V2.3 sessao steps inventory', () => {
  it('DEFAULT_SESSAO_FOTOS_SUBTAREFAS classificados', () => {
    const map = Object.fromEntries(
      DEFAULT_SESSAO_FOTOS_SUBTAREFAS.map((s) => [s.id, s.activityKind])
    );
    expect(map.captacao).toBe('photography');
    expect(map.tratamento_edicao).toBe('editing');
    expect(map.entrega).toBe('delivery');
  });
});
