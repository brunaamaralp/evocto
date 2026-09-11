import { describe, it, expect } from 'vitest';
import {
  formatPeriodLabel,
  getCreateCtaLabel,
  getServiceDisplayName,
  getServiceOperationProfile,
  OPERATION_PATTERNS,
  PERIOD_MODES,
  resolveOfferingKey,
  shouldShowCreateCta,
  UNIT_KINDS,
} from '../serviceOperationProfile.js';

describe('serviceOperationProfile', () => {
  it('resolve Produção de Conteúdo como recurring monthly + task', () => {
    const profile = getServiceOperationProfile({
      offering_key: 'producao_conteudo',
      name: 'MALU — Produção de Conteúdo',
    });
    expect(profile.offeringKey).toBe('producao_conteudo');
    expect(profile.operationPattern).toBe(OPERATION_PATTERNS.RECURRING);
    expect(profile.periodMode).toBe(PERIOD_MODES.MONTHLY);
    expect(profile.unitKind).toBe(UNIT_KINDS.TASK);
    expect(profile.itemLabel).toBe('conteúdo');
    expect(getCreateCtaLabel(profile)).toBe('+ Novo conteúdo');
    expect(shouldShowCreateCta(profile)).toBe(true);
  });

  it('resolve Ciclo Mensal como recurring + campaign_brief', () => {
    const profile = getServiceOperationProfile({
      offering_key: 'ciclo_mensal_4_semanas',
    });
    expect(profile.unitKind).toBe(UNIT_KINDS.CAMPAIGN_BRIEF);
    expect(profile.createCta).toBe('+ Nova campanha');
    expect(profile.periodMode).toBe(PERIOD_MODES.MONTHLY);
  });

  it('resolve Sessão de Fotos como on_demand sem período', () => {
    const profile = getServiceOperationProfile({
      offering_key: 'sessao_fotos',
    });
    expect(profile.operationPattern).toBe(OPERATION_PATTERNS.ON_DEMAND);
    expect(profile.periodMode).toBe(PERIOD_MODES.NONE);
    expect(getCreateCtaLabel(profile)).toBe('+ Nova sessão');
  });

  it('resolve Posicionamento como single_project sem CTA', () => {
    const profile = getServiceOperationProfile({
      offering_key: 'posicionamento_marca',
    });
    expect(profile.operationPattern).toBe(OPERATION_PATTERNS.SINGLE_PROJECT);
    expect(profile.unitKind).toBe(UNIT_KINDS.SERVICE_STEPS);
    expect(shouldShowCreateCta(profile)).toBe(false);
    expect(getCreateCtaLabel(profile)).toBeNull();
  });

  it('alias pipeline conteudo → producao_conteudo', () => {
    expect(resolveOfferingKey({ pipeline: 'conteudo' })).toBe('producao_conteudo');
  });

  it('fallback desconhecido não expõe CTA genérico na UI', () => {
    const profile = getServiceOperationProfile({
      name: 'Serviço Custom XYZ',
    });
    expect(profile.offeringKey).toBe('unknown');
    expect(profile.operationPattern).toBe(OPERATION_PATTERNS.ON_DEMAND);
    expect(profile.periodMode).toBe(PERIOD_MODES.NONE);
    expect(profile.createCta).toBe('+ Novo item');
    expect(shouldShowCreateCta(profile)).toBe(false);
    expect(getCreateCtaLabel(profile)).toBe(null);
  });

  it('formatPeriodLabel não prefixa Ciclo', () => {
    expect(formatPeriodLabel('2026-09-01')).toMatch(/setembro/i);
    expect(formatPeriodLabel('2026-09-01')).not.toMatch(/^ciclo/i);
    expect(formatPeriodLabel({ startDate: '2026-09-15' })).toMatch(/2026/);
    expect(formatPeriodLabel({ title: 'Ciclo de Setembro de 2026' })).toBe(
      'Setembro de 2026'
    );
  });

  it('infere offering pelo nome quando não há key', () => {
    expect(
      resolveOfferingKey({ name: 'MALU — Sessão de Fotos' })
    ).toBe('sessao_fotos');
  });

  it('getServiceDisplayName remove prefixo do cliente', () => {
    expect(
      getServiceDisplayName({
        offering_key: 'producao_conteudo',
        name: 'MALU — Produção de Conteúdo',
      })
    ).toBe('Produção de Conteúdo');
  });
});
