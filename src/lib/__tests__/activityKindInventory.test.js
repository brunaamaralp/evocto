import { describe, expect, it } from 'vitest';
import { normalizeActivityKind } from '@/constants/activityKinds';
import { buildTaskPayloadFromTemplate } from '@/lib/startDeliverableStage';
import {
  CICLO_NARRATIVA_7_FASES_TEMPLATE,
  flattenTaskTemplates,
} from '@/templates/cicloNarrativa7FasesTemplate';
import { CICLO_MENSAL_4_SEMANAS_TEMPLATE } from '@/templates/cicloMensal4SemanasTemplate';
import { buildNarrativaDeliverablesByTipo } from '@/lib/tipoCampanhaPipeline';
import {
  DIAGNOSTICO_COMUNICACAO_TEMPLATE,
  ESTRATEGIA_CONTEUDO_TEMPLATE,
  MARKETING_360_TEMPLATE,
} from '@/templates/defaultServiceTemplates';

const service = { id: 'svc-1', clientId: 'cli-1' };

function listTemplateDefs(deliverables) {
  const out = [];
  for (const d of Array.isArray(deliverables) ? deliverables : []) {
    const tasks = d.task_templates || d.tasks || [];
    for (const t of tasks) {
      const subs = Array.isArray(t.subtarefas) ? t.subtarefas : [];
      out.push({
        id: t.id,
        role: subs.length > 0 ? 'parent' : 'leaf',
        activityKind: t.activityKind ?? null,
        phase: d.phase || null,
      });
      for (const s of subs) {
        out.push({
          id: s.id,
          role: 'leaf',
          activityKind: s.activityKind ?? null,
          phase: d.phase || null,
          parentId: t.id,
        });
      }
    }
  }
  return out;
}

function byId(defs) {
  return Object.fromEntries(defs.map((d) => [d.id, d]));
}

describe('V2.2 inventory — Narrativa 5_videos', () => {
  const defs = listTemplateDefs(CICLO_NARRATIVA_7_FASES_TEMPLATE.deliverables);
  const map = byId(defs);

  it('parents heterogêneos permanecem sem kind', () => {
    expect(map.roteiros_5_videos.role).toBe('parent');
    expect(map.roteiros_5_videos.activityKind).toBeNull();
    expect(map.producao_foto_video.role).toBe('parent');
    expect(map.producao_foto_video.activityKind).toBeNull();
  });

  it('classifica leafs esperados', () => {
    expect(map.revisar_conceito_cliente.activityKind).toBe('meeting');
    expect(map.briefings_pecas.activityKind).toBe('briefing');
    expect(map.roteiro_1.activityKind).toBe('script');
    expect(map.roteiro_5.activityKind).toBe('script');
    expect(map.gravar_video_1.activityKind).toBe('capture');
    expect(map.gravar_video_5.activityKind).toBe('capture');
    expect(map.fotografar_assets.activityKind).toBe('photography');
    expect(map.editar_video_1.activityKind).toBe('editing');
    expect(map.editar_video_5.activityKind).toBe('editing');
    expect(map.qa_aprovacao_interna.activityKind).toBe('approval');
    expect(map.enviar_calendario_cliente.activityKind).toBe('calendar');
    expect(map.aplicar_alteracoes.activityKind).toBe('revision');
    expect(map.validar_alteracoes_cliente.activityKind).toBe('approval');
    expect(map.agendar_publicacao.activityKind).toBe('scheduling');
    expect(map.fechar_ciclo.activityKind).toBe('reporting');
  });

  it('kinds válidos no registry (quando presentes)', () => {
    for (const d of defs) {
      if (d.activityKind == null) continue;
      expect(normalizeActivityKind(d.activityKind)).toBe(d.activityKind);
    }
  });
});

describe('V2.2 inventory — variantes UGC / influencer', () => {
  it('UGC: parent null; leaves curation/calendar', () => {
    const defs = listTemplateDefs(buildNarrativaDeliverablesByTipo('ugc'));
    const map = byId(defs);
    expect(map.producao_ugc.role).toBe('parent');
    expect(map.producao_ugc.activityKind).toBeNull();
    expect(map.curar_ugc.activityKind).toBe('curation');
    expect(map.selecionar_ugc.activityKind).toBe('curation');
    expect(map.ordenar_ugc.activityKind).toBe('calendar');
  });

  it('influencer: parent null; capture/editing/approval', () => {
    const defs = listTemplateDefs(buildNarrativaDeliverablesByTipo('influenciador'));
    const map = byId(defs);
    expect(map.producao_influencer.role).toBe('parent');
    expect(map.producao_influencer.activityKind).toBeNull();
    expect(map.gravar_com_influencer.activityKind).toBe('capture');
    expect(map.editar_conteudo_influencer.activityKind).toBe('editing');
    expect(map.aprovacao_influencer.activityKind).toBe('approval');
  });
});

describe('V2.2 inventory — legado 4 semanas', () => {
  const defs = listTemplateDefs(CICLO_MENSAL_4_SEMANAS_TEMPLATE.deliverables);
  const map = byId(defs);

  it('classifica leafs inequívocos', () => {
    expect(map.revisar_conceito_cliente.activityKind).toBe('meeting');
    expect(map.briefings_pecas.activityKind).toBe('briefing');
    expect(map.roteiros_conteudo.activityKind).toBe('script');
    expect(map.fotografar_assets.activityKind).toBe('photography');
    expect(map.qa_interno.activityKind).toBe('approval');
    expect(map.ajustes_refinamento.activityKind).toBe('revision');
    expect(map.primeira_rodada_feedback.activityKind).toBe('approval');
    expect(map.segunda_rodada_aprovacao.activityKind).toBe('approval');
    expect(map.publicar_feed_stories.activityKind).toBe('publishing');
    expect(map.ativar_anuncios.activityKind).toBe('publishing');
    expect(map.reuniao_mensal_relatorio.activityKind).toBe('meeting');
    expect(map.relatorio_ciclo.activityKind).toBe('reporting');
    expect(map.lembrete_segunda_s1.activityKind).toBe('admin');
    expect(map.comunicado_whatsapp.activityKind).toBe('admin');
  });

  it('gravar_conteudo permanece ambiguous (null) — dívida de modelagem', () => {
    expect(map.gravar_conteudo.activityKind).toBeNull();
    expect(map.gravar_conteudo.role).toBe('leaf');
  });
});

describe('V2.2 inventory — defaultServiceTemplates', () => {
  it('diagnóstico / estratégia / 360 classificados onde inequívoco', () => {
    const defs = [
      ...listTemplateDefs(DIAGNOSTICO_COMUNICACAO_TEMPLATE.deliverables),
      ...listTemplateDefs(ESTRATEGIA_CONTEUDO_TEMPLATE.deliverables),
      ...listTemplateDefs(MARKETING_360_TEMPLATE.deliverables),
    ];
    const map = byId(defs);
    expect(map.coleta_materiais_marca.activityKind).toBe('research');
    expect(map.entrevista_stakeholders.activityKind).toBe('meeting');
    expect(map.definir_pilares.activityKind).toBe('strategy');
    expect(map.calendario_editorial.activityKind).toBe('calendar');
    expect(map.briefing_pecas.activityKind).toBe('briefing');
    expect(map.gestao_midia.activityKind).toBe('publishing');
    expect(map.aprovacoes_cliente.activityKind).toBe('approval');
    expect(map.review_com_cliente.activityKind).toBe('meeting');
  });

  it('producao_conteudo e atualizar_playbooks permanecem null (ambíguos)', () => {
    const defs = listTemplateDefs(MARKETING_360_TEMPLATE.deliverables);
    const map = byId(defs);
    expect(map.producao_conteudo.activityKind).toBeNull();
    expect(map.atualizar_playbooks.activityKind).toBeNull();
  });
});

describe('V2.2 materialização — amostra representativa', () => {
  const flat = flattenTaskTemplates(CICLO_NARRATIVA_7_FASES_TEMPLATE.deliverables);
  const byTemplateId = Object.fromEntries(flat.map((t) => [t.id, t]));

  const samples = [
    ['roteiro_1', 'script'],
    ['gravar_video_1', 'capture'],
    ['fotografar_assets', 'photography'],
    ['editar_video_1', 'editing'],
    ['enviar_calendario_cliente', 'calendar'],
    ['qa_aprovacao_interna', 'approval'],
    ['aplicar_alteracoes', 'revision'],
    ['revisar_conceito_cliente', 'meeting'],
    ['agendar_publicacao', 'scheduling'],
    ['fechar_ciclo', 'reporting'],
  ];

  it.each(samples)('%s → Task.%s', (templateId, kind) => {
    const tpl = byTemplateId[templateId];
    expect(tpl).toBeTruthy();
    const deliverable = {
      id: tpl.deliverableId,
      name: 'fase',
      phase: tpl.phase,
    };
    const payload = buildTaskPayloadFromTemplate(tpl, deliverable, service, {
      agencyId: 'ag-1',
    });
    expect(payload.activityKind).toBe(kind);
    expect(payload.type).toBe(tpl.type);
  });

  it('parent materializado permanece null', () => {
    const tpl = byTemplateId.producao_foto_video;
    const payload = buildTaskPayloadFromTemplate(
      tpl,
      { id: tpl.deliverableId, name: 'FOTO', phase: tpl.phase },
      service,
      { agencyId: 'ag-1' }
    );
    expect(payload.activityKind).toBeNull();
  });

  it('não inferir por phase/title/template_id', () => {
    const tpl = {
      id: 'editar_video_99',
      title: 'Editar vídeo 99',
      type: 'producao',
      // sem activityKind
    };
    const payload = buildTaskPayloadFromTemplate(
      tpl,
      { id: 'fase_foto_e_video', name: 'FOTO E VÍDEO', phase: 'foto_e_video' },
      service,
      { agencyId: 'ag-1' }
    );
    expect(payload.activityKind).toBeNull();
  });
});
