import { describe, it, expect } from 'vitest';
import {
  countExtractedFields,
  detectFilledKeysFromRaw,
  empresaFromNarrativaAnalise,
  formatNarrativaAnaliseMarkdown,
  mergeBriefingInicialFromExtract,
  normalizeCampoAnalise,
  normalizeExtractedBriefingEmpresa,
  normalizeNarrativaAnalise,
  resolveExtractBriefingFileMeta,
  validateExtractBriefingRequest,
} from '../extractBriefingInicialSchema.js';
import { emptyBriefingInicialForm } from '../briefingInicial.js';

describe('extractBriefingInicialSchema', () => {
  it('resolves mime from extension when browser sends octet-stream', () => {
    const meta = resolveExtractBriefingFileMeta({
      filename: 'brief.pdf',
      mimeType: 'application/octet-stream',
    });
    expect(meta.ok).toBe(true);
    expect(meta.kind).toBe('pdf');
  });

  it('rejects legacy .doc', () => {
    const meta = resolveExtractBriefingFileMeta({
      filename: 'old.doc',
      mimeType: 'application/msword',
    });
    expect(meta.ok).toBe(false);
  });

  it('normalizes IA payload into form shape', () => {
    const form = normalizeExtractedBriefingEmpresa(
      {
        nome: 'Loja X',
        publico_alvo: 'Mulheres 25-40',
        tom: 'Acolhedor',
        orcamento: 5000,
        produtos: [{ nome: 'Linha Gold', descricao: 'Premium' }],
      },
      'Cliente'
    );
    expect(form.empresa.nome).toBe('Loja X');
    expect(form.empresa.tom_brand).toBe('Acolhedor');
    expect(form.empresa.orcamento_padrao_mensal).toBe(5000);
    expect(form.empresa.produtos_linhas[0].nome).toBe('Linha Gold');
  });

  it('detects filled keys without counting empty clientName fallback', () => {
    const keys = detectFilledKeysFromRaw({
      empresa: { publico_alvo: 'PME', tom_brand: 'Direto' },
    });
    expect(keys).toContain('publico_alvo');
    expect(keys).toContain('tom_brand');
    expect(keys).not.toContain('nome');
  });

  it('merges extract without wiping existing brand_guidelines', () => {
    const current = emptyBriefingInicialForm('Cliente');
    current.empresa.tom_brand = 'Atual';
    current.empresa.brand_guidelines = { url: 'https://x', name: 'g.pdf' };

    const { form: merged, filledKeys } = mergeBriefingInicialFromExtract(
      current,
      {
        empresa: {
          publico_alvo: 'PME',
          tom_brand: 'Direto',
          produtos_linhas: [{ nome: 'Serviço A' }],
        },
      },
      'Cliente'
    );

    expect(filledKeys).toEqual(
      expect.arrayContaining(['publico_alvo', 'tom_brand', 'produtos_linhas'])
    );
    expect(merged.empresa.tom_brand).toBe('Direto');
    expect(merged.empresa.publico_alvo).toBe('PME');
    expect(merged.empresa.brand_guidelines?.url).toBe('https://x');
    expect(merged.empresa.produtos_linhas[0].nome).toBe('Serviço A');
  });

  it('keeps current string when extract field was not filled by IA', () => {
    const current = emptyBriefingInicialForm('Cliente');
    current.empresa.publico_alvo = 'Já preenchido';
    const { form: merged } = mergeBriefingInicialFromExtract(
      current,
      { empresa: { publico_alvo: '', tom_brand: 'Novo tom' } },
      'Cliente'
    );
    expect(merged.empresa.publico_alvo).toBe('Já preenchido');
    expect(merged.empresa.tom_brand).toBe('Novo tom');
  });

  it('validates request payload', () => {
    const bad = validateExtractBriefingRequest({});
    expect(bad.valid).toBe(false);

    const ok = validateExtractBriefingRequest({
      filename: 'a.txt',
      mimeType: 'text/plain',
      contentBase64: Buffer.from(
        'conteudo de briefing de teste com texto'
      ).toString('base64'),
      clientName: 'X',
    });
    expect(ok.valid).toBe(true);
    expect(ok.value.kind).toBe('txt');
  });

  it('counts filled fields from keys list', () => {
    expect(
      countExtractedFields(null, ['nome', 'publico_alvo', 'tom_brand']).filled
    ).toBe(3);
  });

  it('does not trust incomplete campos_preenchidos over real empresa values', () => {
    const keys = detectFilledKeysFromRaw({
      campos_preenchidos: ['orcamento_padrao_mensal'],
      empresa: {
        nome: 'Casa Aurora',
        publico_alvo: 'Casais 30-45',
        tom_brand: '[Inferido] Acolhedor',
        orcamento_padrao_mensal: '',
        produtos_linhas: [{ nome: 'Hospedagem' }],
      },
    });
    expect(keys).toEqual(
      expect.arrayContaining(['nome', 'publico_alvo', 'tom_brand', 'produtos_linhas'])
    );
    expect(keys).not.toContain('orcamento_padrao_mensal');
  });

  it('merges analise-derived empresa even when server filledKeys are incomplete', () => {
    const current = emptyBriefingInicialForm('Cliente');
    const { form: merged, filledKeys } = mergeBriefingInicialFromExtract(
      current,
      {
        analise: {
          identidade: {
            nome_negocio: { valor: 'Casa Aurora', origem: 'extraido' },
            tom_voz: {
              valor: 'Acolhedor',
              origem: 'inferido',
              justificativa: 'tom do texto',
            },
            proposta_valor: { valor: 'Descanso local', origem: 'extraido' },
            nicho_modelo: { valor: 'Pousada', origem: 'inferido', justificativa: 'nicho' },
            identidade_visual: { valor: '[Não identificável]', origem: 'nao_identificavel' },
          },
          frentes_receita: [
            {
              nome: 'Hospedagem',
              objetivo: { valor: 'Ocupação', origem: 'extraido' },
              publico_principal: {
                valor: 'Casais',
                origem: 'inferido',
                justificativa: 'perfil',
              },
            },
          ],
          canais_operacao: {},
          diretrizes: {},
        },
        empresa: { nome: '', publico_alvo: '', tom_brand: '' },
      },
      'Cliente',
      { filledKeys: ['orcamento_padrao_mensal'] }
    );
    expect(merged.empresa.nome).toBe('Casa Aurora');
    expect(merged.empresa.tom_brand).toMatch(/Acolhedor/);
    expect(merged.empresa.nicho_modelo).toMatch(/Pousada/);
    expect(merged.empresa.proposta_valor).toBe('Descanso local');
    expect(merged.empresa.publico_alvo).toMatch(/Casais/);
    expect(merged.empresa.publico_alvo).not.toMatch(/Descanso local/);
    expect(merged.empresa.restricoes_criativas).toBe('');
    expect(merged.empresa.produtos_linhas[0].nome).toBe('Hospedagem');
    expect(filledKeys).toEqual(
      expect.arrayContaining([
        'nome',
        'tom_brand',
        'nicho_modelo',
        'proposta_valor',
        'produtos_linhas',
      ])
    );
  });

  it('maps Narrativa 1:1 without mashup into publico or restricoes', () => {
    const analise = {
      identidade: {
        nome_negocio: { valor: 'Studio Norte', origem: 'extraido' },
        nicho_modelo: { valor: 'Estúdio criativo B2B', origem: 'extraido' },
        proposta_valor: { valor: 'Identidade com consistência', origem: 'extraido' },
        tom_voz: { valor: 'Direto e humano', origem: 'extraido' },
        identidade_visual: { valor: 'Minimalista, tipografia forte', origem: 'extraido' },
      },
      frentes_receita: [
        {
          nome: 'Branding',
          objetivo: { valor: 'Contratos anuais', origem: 'extraido' },
          publico_principal: { valor: 'PMEs de serviço', origem: 'extraido' },
        },
      ],
      canais_operacao: {
        canais_venda: { valor: 'Indicação e LinkedIn', origem: 'extraido' },
        historico_marketing: { valor: 'Posts esporádicos', origem: 'inferido', justificativa: 'poucas menções' },
        desafios_sazonalidade: { valor: 'Queda no Q1', origem: 'extraido' },
      },
      diretrizes: {
        foco_prioritario: { valor: 'Pipeline B2B', origem: 'extraido' },
        observacoes_estrategicas: { valor: 'Priorizar cases', origem: 'extraido' },
      },
    };

    const empresa = empresaFromNarrativaAnalise(analise);
    expect(empresa.nicho_modelo).toBe('Estúdio criativo B2B');
    expect(empresa.proposta_valor).toBe('Identidade com consistência');
    expect(empresa.identidade_visual).toBe('Minimalista, tipografia forte');
    expect(empresa.canais_venda).toBe('Indicação e LinkedIn');
    expect(empresa.historico_marketing).toMatch(/Posts esporádicos/);
    expect(empresa.desafios_sazonalidade).toBe('Queda no Q1');
    expect(empresa.foco_prioritario).toBe('Pipeline B2B');
    expect(empresa.observacoes_estrategicas).toBe('Priorizar cases');
    expect(empresa.publico_alvo).toBe('PMEs de serviço');
    expect(empresa.publico_alvo).not.toMatch(/Identidade com consistência/);
    expect(empresa.restricoes_criativas).toBe('');
    expect(empresa.restricoes_criativas).not.toMatch(/Visual:/);
    expect(empresa.restricoes_criativas).not.toMatch(/Foco:/);

    const form = normalizeExtractedBriefingEmpresa({ analise }, 'Cliente');
    expect(form.empresa.foco_prioritario).toBe('Pipeline B2B');
    expect(form.empresa.nicho_modelo).toBe('Estúdio criativo B2B');
  });

  it('normalizes Narrativa analysis fields with inference markers', () => {
    const campo = normalizeCampoAnalise({
      valor: 'Tom acolhedor e premium',
      origem: 'inferido',
      justificativa: 'linguagem do briefing',
    });
    expect(campo.origem).toBe('inferido');
    expect(campo.valor).toContain('acolhedor');

    const analise = normalizeNarrativaAnalise({
      identidade: {
        nome_negocio: { valor: 'Casa Aurora', origem: 'extraido' },
        nicho_modelo: {
          valor: 'Hospitalidade / pousada boutique',
          origem: 'inferido',
          justificativa: 'serviço de hospedagem e café da manhã',
        },
        tom_voz: { valor: 'Acolhedor', origem: 'inferido', justificativa: 'tom' },
        proposta_valor: { valor: 'Descanso com experiência local', origem: 'extraido' },
        identidade_visual: { valor: '[Não identificável]', origem: 'nao_identificavel' },
      },
      frentes_receita: [
        {
          nome: 'Hospedagem',
          objetivo: { valor: 'Ocupação', origem: 'extraido' },
          publico_principal: {
            valor: 'Casais 30-45',
            origem: 'inferido',
            justificativa: 'perfil de hóspedes citado',
          },
        },
      ],
      canais_operacao: {},
      diretrizes: {
        foco_prioritario: { valor: 'Awareness regional', origem: 'extraido' },
        observacoes_estrategicas: {
          valor: 'Priorizar conteúdo de experiência',
          origem: 'inferido',
          justificativa: 'histórico fraco de tráfego',
        },
      },
    });

    const md = formatNarrativaAnaliseMarkdown(analise);
    expect(md).toContain('Casa Aurora');
    expect(md).toContain('[Inferido]');
    expect(md).toContain('Hospedagem');

    const empresa = empresaFromNarrativaAnalise(analise);
    expect(empresa.nome).toBe('Casa Aurora');
    expect(empresa.tom_brand).toMatch(/Inferido/);
    expect(empresa.nicho_modelo).toMatch(/Hospitalidade/);
    expect(empresa.proposta_valor).toBe('Descanso com experiência local');
    expect(empresa.foco_prioritario).toBe('Awareness regional');
    expect(empresa.publico_alvo).toMatch(/Casais/);
    expect(empresa.publico_alvo).not.toContain('Descanso com experiência');
    expect(empresa.restricoes_criativas).toBe('');
    expect(empresa.produtos_linhas[0].nome).toBe('Hospedagem');

    const form = normalizeExtractedBriefingEmpresa(
      { analise, empresa: { nome: 'Casa Aurora' } },
      'Cliente'
    );
    expect(form.empresa.nome).toBe('Casa Aurora');
    expect(form.empresa.foco_prioritario).toBe('Awareness regional');
    expect(form.empresa.produtos_linhas.length).toBeGreaterThan(0);
  });
});
