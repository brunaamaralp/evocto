/**
 * Priority "medium" is the default and should not clutter task cards/lists.
 * Keep it selectable in forms; only hide the visual badge/indicator.
 */
export function shouldShowPriorityBadge(priority) {
  const value = String(priority || '').toLowerCase();
  return Boolean(value) && value !== 'medium';
}

const PRIORITY_LABELS_PT = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
};

export function priorityLabelPt(priority) {
  const value = String(priority || '').toLowerCase().trim();
  if (!value) return '';
  return PRIORITY_LABELS_PT[value] || value;
}
