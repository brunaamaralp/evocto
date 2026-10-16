/** Estágios do CRM leve da agência (SPEC_CONTROLE_AGENCIA P2.1 — opção A). */

export const LEAD_STAGES = [
  { id: 'lead', label: 'Lead' },
  { id: 'qualificacao', label: 'Qualificação' },
  { id: 'proposta', label: 'Proposta' },
  { id: 'fechado', label: 'Fechado' },
  { id: 'perdido', label: 'Perdido' },
];

export const LEAD_STAGE_IDS = LEAD_STAGES.map((s) => s.id);

export const LEAD_STAGE_LABELS = Object.fromEntries(
  LEAD_STAGES.map((s) => [s.id, s.label])
);

export function normalizeLeadStage(value) {
  const s = String(value || '').trim().toLowerCase();
  return LEAD_STAGE_IDS.includes(s) ? s : 'lead';
}

export function formatLeadValue(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  try {
    return n.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    });
  } catch {
    return `R$ ${Math.round(n)}`;
  }
}
