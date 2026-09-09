/**
 * Cores estáveis por responsável (assigneeId).
 */

const ASSIGNEE_PALETTE = [
  { border: '#0f766e', bg: '#ccfbf1', text: '#115e59' }, // teal
  { border: '#b45309', bg: '#ffedd5', text: '#9a3412' }, // amber
  { border: '#1d4ed8', bg: '#dbeafe', text: '#1e3a8a' }, // blue
  { border: '#be123c', bg: '#ffe4e6', text: '#9f1239' }, // rose
  { border: '#7c3aed', bg: '#ede9fe', text: '#5b21b6' }, // violet
  { border: '#047857', bg: '#d1fae5', text: '#065f46' }, // emerald
  { border: '#c2410c', bg: '#fed7aa', text: '#9a3412' }, // orange
  { border: '#4338ca', bg: '#e0e7ff', text: '#3730a3' }, // indigo
];

const UNASSIGNED = { border: '#94a3b8', bg: '#f1f5f9', text: '#475569' };

function hashId(id) {
  const s = String(id || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function getAssigneeColor(assigneeId) {
  if (!assigneeId) return UNASSIGNED;
  const idx = hashId(assigneeId) % ASSIGNEE_PALETTE.length;
  return ASSIGNEE_PALETTE[idx];
}

export function assigneeColorStyle(assigneeId) {
  const c = getAssigneeColor(assigneeId);
  return {
    borderLeft: `4px solid ${c.border}`,
    backgroundColor: c.bg,
  };
}

export default getAssigneeColor;
