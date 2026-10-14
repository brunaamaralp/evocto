import { describe, expect, it, vi } from 'vitest';
import { buildActivityKindTemplateLookup } from '@/lib/activityKindTemplateLookup';
import {
  applyActivityKindBackfill,
  buildActivityKindBackfillPlan,
  groupActivityKindBackfillPatches,
  summarizeActivityKindBackfillPlan,
} from '@/lib/backfillActivityKindFromTemplates';

describe('buildActivityKindTemplateLookup', () => {
  it('resolve leafs inequívocos e exclui known_gap', () => {
    const lookup = buildActivityKindTemplateLookup();
    expect(lookup.byTemplateId.get('editar_video_1')).toBe('editing');
    expect(lookup.byTemplateId.get('roteiro_1')).toBe('script');
    expect(lookup.byTemplateId.has('gravar_conteudo')).toBe(false);
    expect(lookup.byTemplateId.has('producao_foto_video')).toBe(false);
    expect(lookup.byStepId.get('edicao')).toBe('editing');
    expect(lookup.byStepId.get('roteiro')).toBe('script');
    expect(lookup.byStepId.has('producao')).toBe(false);
  });

  it('marca captacao como ambíguo se packs divergem (foto vs vídeo)', () => {
    const lookup = buildActivityKindTemplateLookup();
    // sessao_fotos = photography; producao_video preset = capture
    expect(lookup.ambiguousStepIds).toContain('captacao');
    expect(lookup.byStepId.has('captacao')).toBe(false);
  });
});

describe('buildActivityKindBackfillPlan', () => {
  const lookup = buildActivityKindTemplateLookup();

  it('backfill de Task aberta unclassified com template_id conhecido', () => {
    const tasks = [
      {
        id: 't1',
        title: 'Editar vídeo 1',
        status: 'todo',
        template_id: 'editar_video_1',
        activityKind: null,
        agencyId: 'ag1',
      },
    ];
    const { plan, skipped } = buildActivityKindBackfillPlan(tasks, {
      agencyId: 'ag1',
      lookup,
    });
    expect(plan).toHaveLength(1);
    expect(plan[0].to).toBe('editing');
    expect(plan[0].source).toBe('task');
    expect(skipped.some((s) => s.reason === 'already_classified')).toBe(false);
  });

  it('backfill de checklist aberto com templateStepId conhecido', () => {
    const tasks = [
      {
        id: 'u1',
        title: 'Reel',
        status: 'in_progress',
        pipeline: 'producao_conteudo',
        activityKind: null,
        agencyId: 'ag1',
        checklist: [
          {
            id: 'c1',
            text: 'Edição',
            templateStepId: 'edicao',
            activityKind: null,
            completed: false,
          },
          {
            id: 'c2',
            text: 'Produção',
            templateStepId: 'producao',
            activityKind: null,
            completed: false,
          },
        ],
      },
    ];
    const { plan, skipped } = buildActivityKindBackfillPlan(tasks, {
      agencyId: 'ag1',
      lookup,
    });
    expect(plan.some((p) => p.checklistItemId === 'c1' && p.to === 'editing')).toBe(
      true
    );
    expect(skipped.some((s) => s.reason === 'known_gap')).toBe(true);
    expect(plan.some((p) => p.templateStepId === 'producao')).toBe(false);
  });

  it('não backfilla trabalho concluído quando openOnly', () => {
    const tasks = [
      {
        id: 't2',
        title: 'Roteiro',
        status: 'completed',
        template_id: 'roteiro_1',
        activityKind: null,
        agencyId: 'ag1',
      },
    ];
    const { plan, skipped } = buildActivityKindBackfillPlan(tasks, {
      agencyId: 'ag1',
      lookup,
      openOnly: true,
    });
    expect(plan).toHaveLength(0);
    expect(skipped.some((s) => s.reason === 'not_open')).toBe(true);
  });

  it('não backfilla known_gap gravar_conteudo', () => {
    const tasks = [
      {
        id: 't3',
        title: 'Gravar',
        status: 'todo',
        template_id: 'gravar_conteudo',
        activityKind: null,
        agencyId: 'ag1',
      },
    ];
    const { plan, skipped } = buildActivityKindBackfillPlan(tasks, {
      agencyId: 'ag1',
      lookup,
    });
    expect(plan).toHaveLength(0);
    expect(skipped.some((s) => s.reason === 'known_gap')).toBe(true);
  });

  it('dry-run apply não chama Task.update', async () => {
    const update = vi.fn();
    const tasks = [
      {
        id: 't1',
        title: 'Editar',
        status: 'todo',
        template_id: 'editar_video_1',
        activityKind: null,
        agencyId: 'ag1',
      },
    ];
    const { plan } = buildActivityKindBackfillPlan(tasks, {
      agencyId: 'ag1',
      lookup,
    });
    const result = await applyActivityKindBackfill(plan, tasks, {
      dryRun: true,
      Task: { update },
    });
    expect(result.dryRun).toBe(true);
    expect(update).not.toHaveBeenCalled();
    expect(result.patchCount).toBe(1);
  });

  it('apply real chama Task.update com patch', async () => {
    const update = vi.fn().mockResolvedValue({});
    const tasks = [
      {
        id: 'u1',
        title: 'Reel',
        status: 'todo',
        pipeline: 'item_cycle',
        activityKind: null,
        agencyId: 'ag1',
        checklist: [
          {
            id: 'c1',
            text: 'Edição',
            templateStepId: 'edicao',
            activityKind: null,
            completed: false,
          },
        ],
      },
    ];
    const { plan } = buildActivityKindBackfillPlan(tasks, {
      agencyId: 'ag1',
      lookup,
    });
    const patches = groupActivityKindBackfillPatches(plan, tasks);
    expect(patches[0].patch.checklist[0].activityKind).toBe('editing');

    const result = await applyActivityKindBackfill(plan, tasks, {
      dryRun: false,
      Task: { update },
    });
    expect(result.updated).toBe(1);
    expect(update).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({
        checklist: expect.arrayContaining([
          expect.objectContaining({ id: 'c1', activityKind: 'editing' }),
        ]),
      })
    );
  });

  it('summary conta elegíveis e skips', () => {
    const summary = summarizeActivityKindBackfillPlan(
      [{ to: 'editing', source: 'task', taskId: 'a' }],
      [{ reason: 'known_gap' }, { reason: 'not_open' }]
    );
    expect(summary.eligible).toBe(1);
    expect(summary.byKind.editing).toBe(1);
    expect(summary.bySkipReason.known_gap).toBe(1);
  });
});
