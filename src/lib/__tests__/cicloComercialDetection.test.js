import { describe, expect, it } from 'vitest';
import {
  inferCicloComercialFromText,
  resolveCicloComercial,
} from '@/lib/cicloComercialDetection';

describe('cicloComercialDetection', () => {
  it('detects engajamento from live/whatsapp idea', () => {
    const r = inferCicloComercialFromText(
      'Live surprise de 1h',
      'Cliente entra só pelo WhatsApp'
    );
    expect(r.ciclo).toBe('engajamento');
    expect(r.confianca).toBeGreaterThan(50);
  });

  it('detects vendas from oferta/urgência', () => {
    const r = inferCicloComercialFromText('Contagem regressiva com 30% off');
    expect(r.ciclo).toBe('vendas');
  });

  it('marks override when escolha differs from plano', () => {
    const r = resolveCicloComercial({
      ciclo_plano: 'vendas',
      ciclo_detectado: 'engajamento',
      escolha: 'engajamento',
      confianca: 90,
    });
    expect(r.ciclo_final).toBe('engajamento');
    expect(r.ciclo_override).toBe(true);
    expect(r.ciclo_comercial).toBe('engajamento');
    expect(r.precisa_validacao).toBe(true);
  });
});
