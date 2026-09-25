import { describe, expect, it } from 'vitest';
import { getActivityKindLabel } from '@/constants/activityKinds';
import {
  analyzeActivityKindCoverage,
  classifyActivityKindCoverage,
  extractClassifiableWorkUnits,
  resolveWorkUnitOrigin,
} from '@/lib/analyzeActivityKindCoverage';

const AGENCY = 'ag-1';
const OTHER = 'ag-2';

function task(partial) {
  return {
    agencyId: AGENCY,
    clientId: 'cli-1',
    serviceId: 'svc-1',
    ...partial,
  };
}

describe('classifyActivityKindCoverage', () => {
  it('leaf classificada', () => {
    const r = classifyActivityKindCoverage({
      activityKind: 'editing',
      templateId: 'editar_video_1',
      origin: 'template',
    });
    expect(r.status).toBe('classified');
    expect(r.activityKind).toBe('editing');
    expect(r.classifiable).toBe(true);
  });

  it('leaf null → unclassified', () => {
    const r = classifyActivityKindCoverage({
      activityKind: null,
      templateId: 'editar_video_99',
      origin: 'template',
    });
    expect(r.status).toBe('unclassified');
    expect(r.classifiable).toBe(true);
  });

  it('Task manual null', () => {
    const r = classifyActivityKindCoverage({
      activityKind: null,
      origin: 'manual',
    });
    expect(r.status).toBe('unclassified');
    expect(r.origin).toBe('manual');
    expect(r.reason).toMatch(/manual/i);
  });

  it('legado null indistinguível → unclassified (não inventa legacy)', () => {
    const r = classifyActivityKindCoverage({
      activityKind: null,
      templateId: 'roteiro_1',
      origin: 'template',
    });
    expect(r.status).toBe('unclassified');
    expect(r.reason).toMatch(/indistingu/i);
  });

  it('kind inválido', () => {
    const r = classifyActivityKindCoverage({
      activityKind: 'video_edit',
      origin: 'template',
    });
    expect(r.status).toBe('invalid_kind');
    expect(r.rawActivityKind).toBe('video_edit');
    expect(r.activityKind).toBeNull();
    expect(r.classifiable).toBe(true);
  });

  it('known_gap por template_id', () => {
    const r = classifyActivityKindCoverage({
      activityKind: null,
      templateId: 'gravar_conteudo',
      origin: 'template',
    });
    expect(r.status).toBe('known_gap');
  });

  it('known_gap por templateStepId', () => {
    const r = classifyActivityKindCoverage({
      activityKind: null,
      templateStepId: 'producao',
      origin: 'item_cycle',
    });
    expect(r.status).toBe('known_gap');
  });
});

describe('extract / analyze — narrativa parent × children', () => {
  const parent = task({
    id: 'p1',
    title: 'Produção Foto & Vídeo',
    template_id: 'producao_foto_video',
    created_from_template: true,
    activityKind: null,
  });
  const capture = task({
    id: 'c1',
    title: 'Gravar',
    parentTaskId: 'p1',
    template_id: 'gravar_video_1',
    created_from_template: true,
    activityKind: 'capture',
  });
  const photo = task({
    id: 'c2',
    title: 'Fotografar',
    parentTaskId: 'p1',
    template_id: 'fotografar_assets',
    created_from_template: true,
    activityKind: 'photography',
  });
  const edit = task({
    id: 'c3',
    title: 'Editar',
    parentTaskId: 'p1',
    template_id: 'editar_video_1',
    created_from_template: true,
    activityKind: 'editing',
  });

  it('parent é intentional_container e fora do denominador', () => {
    const analysis = analyzeActivityKindCoverage([parent, capture, photo, edit], {
      agencyId: AGENCY,
    });
    expect(analysis.summary.intentionalContainerCount).toBe(1);
    expect(analysis.summary.totalClassifiable).toBe(3);
    expect(analysis.summary.classifiedCount).toBe(3);
    expect(analysis.summary.coveragePercent).toBe(100);
    const parentUnit = analysis.units.find((u) => u.taskId === 'p1' && u.source === 'task');
    expect(parentUnit.status).toBe('intentional_container');
    expect(parentUnit.classifiable).toBe(false);
  });

  it('não dupla contagem parent + children', () => {
    const units = extractClassifiableWorkUnits([parent, capture, photo, edit], {
      agencyId: AGENCY,
    });
    const classifiable = units.filter((u) => u.classifiable);
    expect(classifiable).toHaveLength(3);
    expect(classifiable.every((u) => u.source === 'task')).toBe(true);
  });
});

describe('extract / analyze — item-cycle unit × checklist', () => {
  const unit = task({
    id: 'u1',
    title: 'Produzir Reel',
    pipeline: 'producao_conteudo',
    activityKind: null,
    checklist: [
      { id: 'roteiro', templateStepId: 'roteiro', text: 'Roteiro', activityKind: 'script' },
      { id: 'captacao', templateStepId: 'captacao', text: 'Gravação', activityKind: 'capture' },
      { id: 'edicao', templateStepId: 'edicao', text: 'Edição', activityKind: 'editing' },
      { id: 'aprovacao', templateStepId: 'aprovacao', text: 'Aprovação', activityKind: 'approval' },
      { id: 'agendamento', templateStepId: 'agendamento', text: 'Agendamento', activityKind: 'scheduling' },
    ],
  });

  it('unit é container; checklist são as unidades', () => {
    const analysis = analyzeActivityKindCoverage([unit], { agencyId: AGENCY });
    expect(analysis.summary.intentionalContainerCount).toBe(1);
    expect(analysis.summary.totalClassifiable).toBe(5);
    expect(analysis.summary.classifiedCount).toBe(5);
    expect(analysis.summary.classifiedChecklistItemCount).toBe(5);
    expect(analysis.summary.classifiedTaskCount).toBe(0);
    expect(analysis.summary.coveragePercent).toBe(100);
  });

  it('não dupla contagem unit + checklist', () => {
    const classifiable = extractClassifiableWorkUnits([unit], { agencyId: AGENCY }).filter(
      (u) => u.classifiable
    );
    expect(classifiable).toHaveLength(5);
    expect(classifiable.every((u) => u.source === 'checklist')).toBe(true);
  });

  it('checklist item null (known_gap producao)', () => {
    const withGap = task({
      ...unit,
      id: 'u2',
      checklist: [
        { id: 'roteiro', templateStepId: 'roteiro', text: 'Roteiro', activityKind: 'script' },
        { id: 'producao', templateStepId: 'producao', text: 'Produção', activityKind: null },
        { id: 'edicao', templateStepId: 'edicao', text: 'Edição', activityKind: 'editing' },
      ],
    });
    const analysis = analyzeActivityKindCoverage([withGap], { agencyId: AGENCY });
    expect(analysis.summary.totalClassifiable).toBe(3);
    expect(analysis.summary.classifiedCount).toBe(2);
    expect(analysis.summary.knownGapCount).toBe(1);
    expect(analysis.summary.coveragePercent).toBeCloseTo(66.7, 0);
  });
});

describe('analyzeActivityKindCoverage — casos mistos', () => {
  it('dois kinds diferentes no breakdown', () => {
    const tasks = [
      task({
        id: 't1',
        title: 'Editar',
        template_id: 'e1',
        created_from_template: true,
        activityKind: 'editing',
      }),
      task({
        id: 't2',
        title: 'Roteiro',
        template_id: 'r1',
        created_from_template: true,
        activityKind: 'script',
      }),
    ];
    const analysis = analyzeActivityKindCoverage(tasks, { agencyId: AGENCY });
    const byKind = Object.fromEntries(analysis.byKind.map((r) => [r.key, r.count]));
    expect(byKind.editing).toBe(1);
    expect(byKind.script).toBe(1);
    expect(analysis.byKind.find((r) => r.key === 'editing').label).toBe(
      getActivityKindLabel('editing')
    );
  });

  it('invalid_kind fora dos classificados', () => {
    const tasks = [
      task({
        id: 'bad',
        title: 'X',
        created_from_template: true,
        template_id: 'x',
        activityKind: 'video_edit',
      }),
      task({
        id: 'ok',
        title: 'Y',
        created_from_template: true,
        template_id: 'y',
        activityKind: 'editing',
      }),
    ];
    const analysis = analyzeActivityKindCoverage(tasks, { agencyId: AGENCY });
    expect(analysis.summary.classifiedCount).toBe(1);
    expect(analysis.summary.invalidKindCount).toBe(1);
    expect(analysis.invalidKindItems[0].rawActivityKind).toBe('video_edit');
    expect(analysis.summary.coveragePercent).toBe(50);
  });

  it('dataset vazio', () => {
    const analysis = analyzeActivityKindCoverage([], { agencyId: AGENCY });
    expect(analysis.summary.totalClassifiable).toBe(0);
    expect(analysis.summary.coveragePercent).toBeNull();
    expect(analysis.issues).toHaveLength(0);
  });

  it('dataset 100% classificado', () => {
    const tasks = [
      task({
        id: 'a',
        created_from_template: true,
        template_id: 'a',
        activityKind: 'meeting',
      }),
    ];
    expect(analyzeActivityKindCoverage(tasks, { agencyId: AGENCY }).summary.coveragePercent).toBe(
      100
    );
  });

  it('dataset 0% classificado', () => {
    const tasks = [
      task({
        id: 'a',
        created_from_template: true,
        template_id: 'a',
        activityKind: null,
      }),
    ];
    expect(analyzeActivityKindCoverage(tasks, { agencyId: AGENCY }).summary.coveragePercent).toBe(
      0
    );
  });

  it('isolamento por agencyId', () => {
    const tasks = [
      task({
        id: 'a1',
        agencyId: AGENCY,
        created_from_template: true,
        template_id: 'a',
        activityKind: 'editing',
      }),
      task({
        id: 'a2',
        agencyId: OTHER,
        created_from_template: true,
        template_id: 'b',
        activityKind: 'script',
      }),
    ];
    const analysis = analyzeActivityKindCoverage(tasks, { agencyId: AGENCY });
    expect(analysis.summary.totalClassifiable).toBe(1);
    expect(analysis.summary.classifiedCount).toBe(1);
    expect(analysis.units.every((u) => u.agencyId === AGENCY)).toBe(true);
  });

  it('mistura Tasks + checklist sem dupla contagem', () => {
    const tasks = [
      task({
        id: 'leaf',
        title: 'Reunião',
        created_from_template: true,
        template_id: 'reuniao',
        activityKind: 'meeting',
      }),
      task({
        id: 'unit',
        title: 'Reel',
        pipeline: 'producao_conteudo',
        activityKind: null,
        checklist: [
          {
            id: 'edicao',
            templateStepId: 'edicao',
            text: 'Edição',
            activityKind: 'editing',
          },
          {
            id: 'aprovacao',
            templateStepId: 'aprovacao',
            text: 'Aprovação',
            activityKind: 'approval',
          },
        ],
      }),
      task({
        id: 'manual',
        title: 'Avulsa',
        activityKind: null,
      }),
    ];
    const analysis = analyzeActivityKindCoverage(tasks, { agencyId: AGENCY });
    // leaf(1) + checklist(2) + manual(1) = 4 classifiable; unit container ignored
    expect(analysis.summary.intentionalContainerCount).toBe(1);
    expect(analysis.summary.totalClassifiable).toBe(4);
    expect(analysis.summary.classifiedCount).toBe(3);
    expect(analysis.summary.manualUnclassifiedCount).toBe(1);
    expect(analysis.summary.coveragePercent).toBe(75);
  });

  it('fixtures representativas V2.4', () => {
    const narrativaParent = task({
      id: 'np',
      title: 'Produção Foto & Vídeo',
      template_id: 'producao_foto_video',
      created_from_template: true,
      activityKind: null,
    });
    const children = [
      task({
        id: 'nc1',
        parentTaskId: 'np',
        template_id: 'g1',
        created_from_template: true,
        activityKind: 'capture',
      }),
      task({
        id: 'nc2',
        parentTaskId: 'np',
        template_id: 'f1',
        created_from_template: true,
        activityKind: 'photography',
      }),
      task({
        id: 'nc3',
        parentTaskId: 'np',
        template_id: 'e1',
        created_from_template: true,
        activityKind: 'editing',
      }),
    ];
    const itemCycle = task({
      id: 'ic',
      title: 'Conteúdo',
      pipeline: 'item_cycle',
      activityKind: null,
      checklist: [
        { id: 'roteiro', templateStepId: 'roteiro', text: 'Roteiro', activityKind: 'script' },
        { id: 'captacao', templateStepId: 'captacao', text: 'Captação', activityKind: 'capture' },
        { id: 'edicao', templateStepId: 'edicao', text: 'Edição', activityKind: 'editing' },
        { id: 'aprovacao', templateStepId: 'aprovacao', text: 'Aprovação', activityKind: 'approval' },
        {
          id: 'agendamento',
          templateStepId: 'agendamento',
          text: 'Agendamento',
          activityKind: 'scheduling',
        },
      ],
    });
    const manual = task({ id: 'm1', title: 'Manual', activityKind: null });
    const oldish = task({
      id: 'old',
      title: 'Antiga',
      created_from_template: true,
      template_id: 'old_step',
      activityKind: null,
    });
    const invalid = task({
      id: 'inv',
      title: 'Inválida',
      created_from_template: true,
      template_id: 'inv_step',
      activityKind: 'video_edit',
    });

    const analysis = analyzeActivityKindCoverage(
      [narrativaParent, ...children, itemCycle, manual, oldish, invalid],
      { agencyId: AGENCY }
    );

    // classifiable: 3 children + 5 checklist + 1 manual + 1 old + 1 invalid = 11
    expect(analysis.summary.totalClassifiable).toBe(11);
    expect(analysis.summary.classifiedCount).toBe(8);
    expect(analysis.summary.intentionalContainerCount).toBe(2); // parent + unit
    expect(analysis.summary.invalidKindCount).toBe(1);
    expect(analysis.summary.manualUnclassifiedCount).toBe(1);
    expect(analysis.summary.legacyDistinguishable).toBe(false);
    expect(analysis.universe.legacyDistinguishable).toBe(false);
  });

  it('coveragePercent correto com containers fora do denominador', () => {
    const parent = task({
      id: 'p',
      template_id: 'producao_foto_video',
      created_from_template: true,
      activityKind: null,
    });
    const ok = task({
      id: 'c',
      parentTaskId: 'p',
      template_id: 'e',
      created_from_template: true,
      activityKind: 'editing',
    });
    const miss = task({
      id: 'c2',
      parentTaskId: 'p',
      template_id: 'x',
      created_from_template: true,
      activityKind: null,
    });
    const analysis = analyzeActivityKindCoverage([parent, ok, miss], { agencyId: AGENCY });
    expect(analysis.summary.totalClassifiable).toBe(2);
    expect(analysis.summary.classifiedCount).toBe(1);
    expect(analysis.summary.coveragePercent).toBe(50);
  });
});

describe('resolveWorkUnitOrigin', () => {
  it('template vs manual vs item_cycle', () => {
    expect(
      resolveWorkUnitOrigin('task', { created_from_template: true, template_id: 'x' })
    ).toBe('template');
    expect(resolveWorkUnitOrigin('task', { title: 'Avulsa' })).toBe('manual');
    expect(
      resolveWorkUnitOrigin('checklist', {}, { templateStepId: 'edicao' })
    ).toBe('item_cycle');
    expect(resolveWorkUnitOrigin('checklist', {}, { text: 'nota' })).toBe('manual');
  });
});
