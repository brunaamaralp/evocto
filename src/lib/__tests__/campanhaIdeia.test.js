import { describe, it, expect } from 'vitest';
import {
  BRIEF_KIND_CAMPANHA_MENSAL,
  UX_KIND_CAMPANHA,
  ideiaFromBrief,
  operacaoFromBrief,
  normalizeCampanhaUnit,
  briefPatchFromIdeia,
  mergeIdeiaIntoCampanhaForm,
  attachIdeiaToCampanhaPayload,
  isCampanhaUnitBrief,
  getCampanhaCycleId,
} from '../campanhaIdeia.js';
import {
  buildCampanhaBriefPayload,
  EMPTY_CAMPANHA_FORM,
} from '../campanhaBriefing.js';

describe('isCampanhaUnitBrief', () => {
  it('reconhece brief_kind campanha_mensal', () => {
    expect(isCampanhaUnitBrief({ brief_kind: BRIEF_KIND_CAMPANHA_MENSAL })).toBe(
      true
    );
    expect(isCampanhaUnitBrief({ brief_kind: 'campanha_anual' })).toBe(false);
  });

  it('heurística sem kind com campos de ficha', () => {
    expect(isCampanhaUnitBrief({ nome_campanha: 'Fev' })).toBe(true);
    expect(isCampanhaUnitBrief({ title: 'x' })).toBe(false);
  });
});

describe('ideiaFromBrief', () => {
  it('lê flat legado', () => {
    expect(
      ideiaFromBrief({
        nome_campanha: 'Dia das Mães',
        objetivo: 'Aumentar ticket',
        acoes_comerciais: 'Combo + frete',
        linha_focal: 'Linha kids',
        ciclo_comercial: 'aquisição',
      })
    ).toEqual({
      titulo: 'Dia das Mães',
      conceito: 'Aumentar ticket',
      mecanismo: 'Combo + frete',
      foco: 'Linha kids',
      ciclo: 'aquisição',
    });
  });

  it('prioriza nested ideia', () => {
    expect(
      ideiaFromBrief({
        nome_campanha: 'Old',
        objetivo: 'Old obj',
        ideia: {
          titulo: 'New',
          conceito: 'Conceito novo',
          mecanismo: 'Mec',
          foco: 'Foco',
          ciclo: 'retenção',
        },
      }).titulo
    ).toBe('New');
  });

  it('usa dimensões anuais quando flat vazio', () => {
    const ideia = ideiaFromBrief({
      dimensoes_anual: {
        '02_conceito': {
          nome: 'Do tema',
          ideia_central: 'Ideia central',
        },
        '01_estrategia': { produto_focal: 'SKU 1', ciclo_comercial: 'lançamento' },
      },
    });
    expect(ideia.titulo).toBe('Do tema');
    expect(ideia.conceito).toBe('Ideia central');
    expect(ideia.foco).toBe('SKU 1');
    expect(ideia.ciclo).toBe('lançamento');
  });
});

describe('normalizeCampanhaUnit', () => {
  it('monta view Hub/Workspace', () => {
    const unit = normalizeCampanhaUnit({
      id: 'b1',
      clientId: 'c1',
      agencyId: 'a1',
      serviceId: 's1',
      ciclo_id: 'cy1',
      brief_kind: BRIEF_KIND_CAMPANHA_MENSAL,
      nome_campanha: 'Março',
      objetivo: 'X',
      acoes_comerciais: 'Y',
      linha_focal: 'Z',
      ciclo_final: 'upsell',
      talento_locacao: 'Estúdio',
      mes: 3,
      ano: 2026,
    });
    expect(unit.ux_kind).toBe(UX_KIND_CAMPANHA);
    expect(unit.brief_kind).toBe(BRIEF_KIND_CAMPANHA_MENSAL);
    expect(unit.label).toBe('Março');
    expect(unit.cycleId).toBe('cy1');
    expect(unit.ideia.ciclo).toBe('upsell');
    expect(unit.operacao.talento_locacao).toBe('Estúdio');
  });
});

describe('briefPatchFromIdeia', () => {
  it('escreve nested + flat sincronizados', () => {
    const patch = briefPatchFromIdeia({
      titulo: 'T',
      conceito: 'C',
      mecanismo: 'M',
      foco: 'F',
      ciclo: 'ciclo-x',
    });
    expect(patch.ideia.titulo).toBe('T');
    expect(patch.nome_campanha).toBe('T');
    expect(patch.objetivo).toBe('C');
    expect(patch.acoes_comerciais).toBe('M');
    expect(patch.linha_focal).toBe('F');
    expect(patch.ciclo_comercial).toBe('ciclo-x');
    expect(patch.ciclo_final).toBe('ciclo-x');
    expect(patch.ux_kind).toBe(UX_KIND_CAMPANHA);
  });
});

describe('mergeIdeiaIntoCampanhaForm + create payload', () => {
  it('mescla no form legado', () => {
    const form = mergeIdeiaIntoCampanhaForm(
      { ...EMPTY_CAMPANHA_FORM },
      {
        titulo: 'Nova',
        conceito: 'Conceito',
        mecanismo: 'Mec',
        foco: 'Foco',
        ciclo: 'aquisição',
      }
    );
    expect(form.nome_campanha).toBe('Nova');
    expect(form.objetivo).toBe('Conceito');
    expect(form.acoes_comerciais).toBe('Mec');
  });

  it('buildCampanhaBriefPayload anexa ideia nested', () => {
    const payload = buildCampanhaBriefPayload({
      agencyId: 'a1',
      clientId: 'c1',
      empresa: { id: 'e1' },
      campanhaForm: {
        ...EMPTY_CAMPANHA_FORM,
        nome_campanha: 'Camp',
        objetivo: 'Obj',
        acoes_comerciais: 'Acoes',
        talento_locacao: 'Talento',
        data_gravacao_inicio: '2026-03-01',
        data_gravacao_fim: '2026-03-10',
        ciclo_comercial: 'aquisição',
        linha_focal: 'Linha',
      },
    });
    expect(payload.brief_kind).toBe(BRIEF_KIND_CAMPANHA_MENSAL);
    expect(payload.ux_kind).toBe(UX_KIND_CAMPANHA);
    expect(payload.ideia).toMatchObject({
      titulo: 'Camp',
      conceito: 'Obj',
      mecanismo: 'Acoes',
      foco: 'Linha',
      ciclo: 'aquisição',
    });
  });
});

describe('attachIdeiaToCampanhaPayload / helpers', () => {
  it('attach é idempotente o bastante', () => {
    const p = attachIdeiaToCampanhaPayload({
      nome_campanha: 'X',
      objetivo: 'Y',
      acoes_comerciais: 'Z',
    });
    expect(p.ideia.titulo).toBe('X');
  });

  it('getCampanhaCycleId e operacaoFromBrief', () => {
    expect(getCampanhaCycleId({ cyclePlanId: 'p1' })).toBe('p1');
    expect(
      operacaoFromBrief({
        talento_locacao: ' A ',
        tipo_campanha: '',
      }).tipo_campanha
    ).toBe('5_videos');
  });
});
