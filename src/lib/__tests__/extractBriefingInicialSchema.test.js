import { describe, it, expect } from 'vitest';
import {
  countExtractedFields,
  detectFilledKeysFromRaw,
  mergeBriefingInicialFromExtract,
  normalizeExtractedBriefingEmpresa,
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
});
