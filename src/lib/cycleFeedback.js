/**
 * Feedback estruturado ao fim do ciclo (payload no CyclePlan).
 */

export const EMPTY_CYCLE_FEEDBACK = Object.freeze({
  vendas_meta: '',
  vendas_realizado: '',
  engagement_esperado: '',
  engagement_realizado: '',
  o_que_funcionou: '',
  o_que_nao_funcionou: '',
  aprendizados: '',
  registrado_em: null,
  registrado_por: null,
});

export function normalizeCycleFeedback(raw = {}) {
  return {
    ...EMPTY_CYCLE_FEEDBACK,
    ...raw,
    vendas_meta: raw.vendas_meta ?? '',
    vendas_realizado: raw.vendas_realizado ?? '',
    engagement_esperado: raw.engagement_esperado ?? '',
    engagement_realizado: raw.engagement_realizado ?? '',
    o_que_funcionou: String(raw.o_que_funcionou || ''),
    o_que_nao_funcionou: String(raw.o_que_nao_funcionou || ''),
    aprendizados: String(raw.aprendizados || ''),
    registrado_em: raw.registrado_em || null,
    registrado_por: raw.registrado_por || null,
  };
}

export function validateCycleFeedback(form) {
  const errors = {};
  if (!String(form.o_que_funcionou || '').trim() && !String(form.aprendizados || '').trim()) {
    errors.aprendizados = 'Informe o que funcionou ou um aprendizado';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function isCycleFeedbackComplete(feedback) {
  const f = normalizeCycleFeedback(feedback);
  return Boolean(
    String(f.aprendizados || '').trim() ||
      String(f.o_que_funcionou || '').trim() ||
      String(f.vendas_realizado || '').trim() ||
      String(f.engagement_realizado || '').trim()
  );
}
