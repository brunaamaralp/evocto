import {
  GENERATE_MATERIAL_SCHEMA_VERSION,
  assessGenerateMaterialQuality,
  buildGenerateMaterialContext,
  normalizeTipo,
  validateGenerateMaterialContext,
  validateGenerateMaterialRequest,
} from '../generateMaterialSchema.js';

describe('generateMaterialSchema', () => {
  it('normalizes tipo aliases', () => {
    expect(normalizeTipo('presentation')).toBe('apresentacao');
    expect(normalizeTipo('pptx')).toBe('apresentacao');
    expect(normalizeTipo('proposta')).toBe('proposta');
  });

  it('validates create request', () => {
    const bad = validateGenerateMaterialRequest({});
    expect(bad.valid).toBe(false);
    expect(bad.errors.agencyId).toBeTruthy();
    expect(bad.errors.clientId).toBeTruthy();

    const ok = validateGenerateMaterialRequest({
      agencyId: 'ag1',
      clientId: 'cl1',
      tipo: 'proposta',
      titulo: 'Teste',
      escopo: '8 reels',
    });
    expect(ok.valid).toBe(true);
    expect(ok.value.overrides.titulo).toBe('Teste');
    expect(ok.value.overrides.escopo).toBe('8 reels');
  });

  it('builds canonical context with quality score', () => {
    const canonical = buildGenerateMaterialContext('proposta', {
      agencyName: 'Evocto',
      client: { id: 'c1', name: 'Cliente X' },
      empresa: {
        publico_alvo: 'PME',
        tom_brand: 'Direto',
        produtos_linhas: [{ nome: 'Gestão' }],
      },
      overrides: {
        objetivo: 'Fechar contrato',
        escopo: 'Conteúdo mensal',
        investimento: 'R$ 5k',
      },
    });
    expect(canonical.schema_version).toBe(GENERATE_MATERIAL_SCHEMA_VERSION);
    expect(canonical.cliente.nome).toBe('Cliente X');
    expect(canonical.overrides.escopo).toBe('Conteúdo mensal');
    expect(canonical.qualidade.score).toBeGreaterThan(50);
    expect(validateGenerateMaterialContext(canonical).valid).toBe(true);
  });

  it('flags quality warnings when DNA/overrides empty', () => {
    const canonical = buildGenerateMaterialContext('proposta', {
      client: { id: 'c1', name: 'Y' },
    });
    const q = assessGenerateMaterialQuality(canonical);
    expect(q.ok).toBe(false);
    expect(q.warnings.length).toBeGreaterThan(0);
  });
});
