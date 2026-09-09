/**
 * Soft-UI pastel map for stages and modules.
 * Tailwind-ready class tokens used across shell, kanban, and cards.
 */

export const STAGE_PASTELS = {
  backlog: {
    bg: 'bg-[#F3F0F8]',
    column: 'bg-[#EDE8F5]',
    card: 'bg-white',
    border: 'border-[#DDD6EB]',
    bar: 'bg-[#9B8EC4]',
    text: 'text-[#4A4068]',
    badge: 'bg-[#EDE8F5] text-[#4A4068] border-[#DDD6EB]',
    dot: 'bg-[#9B8EC4]',
  },
  todo: {
    bg: 'bg-[#EAF2FB]',
    column: 'bg-[#DCEAF8]',
    card: 'bg-white',
    border: 'border-[#C5DBF0]',
    bar: 'bg-[#5B9BD5]',
    text: 'text-[#2E5A7A]',
    badge: 'bg-[#EAF2FB] text-[#2E5A7A] border-[#C5DBF0]',
    dot: 'bg-[#5B9BD5]',
  },
  in_progress: {
    bg: 'bg-[#FFF0E6]',
    column: 'bg-[#FFE4D1]',
    card: 'bg-white',
    border: 'border-[#FFD0B0]',
    bar: 'bg-[#E8955A]',
    text: 'text-[#8A4A22]',
    badge: 'bg-[#FFF0E6] text-[#8A4A22] border-[#FFD0B0]',
    dot: 'bg-[#E8955A]',
  },
  in_review: {
    bg: 'bg-[#F3EAFB]',
    column: 'bg-[#E8D9F7]',
    card: 'bg-white',
    border: 'border-[#D4BFEB]',
    bar: 'bg-[#9B6BC9]',
    text: 'text-[#5A3A7A]',
    badge: 'bg-[#F3EAFB] text-[#5A3A7A] border-[#D4BFEB]',
    dot: 'bg-[#9B6BC9]',
  },
  completed: {
    bg: 'bg-[#E6F7F0]',
    column: 'bg-[#D0F0E4]',
    card: 'bg-white',
    border: 'border-[#A8E0CB]',
    bar: 'bg-[#22C98A]',
    text: 'text-[#085041]',
    badge: 'bg-[#E6F7F0] text-[#085041] border-[#A8E0CB]',
    dot: 'bg-[#22C98A]',
  },
  blocked: {
    bg: 'bg-[#FDEBEC]',
    column: 'bg-[#FAD9DB]',
    card: 'bg-white',
    border: 'border-[#F0B8BC]',
    bar: 'bg-[#E24B4A]',
    text: 'text-[#8A2A2A]',
    badge: 'bg-[#FDEBEC] text-[#8A2A2A] border-[#F0B8BC]',
    dot: 'bg-[#E24B4A]',
  },
  cancelled: {
    bg: 'bg-[#F1F1F3]',
    column: 'bg-[#E6E6EA]',
    card: 'bg-white',
    border: 'border-[#D0D0D6]',
    bar: 'bg-[#8A8A96]',
    text: 'text-[#4A4A55]',
    badge: 'bg-[#F1F1F3] text-[#4A4A55] border-[#D0D0D6]',
    dot: 'bg-[#8A8A96]',
  },
};

/** Aliases for alternate status keys used in the app */
export const STAGE_ALIASES = {
  pending: 'todo',
  a_fazer: 'todo',
  doing: 'in_progress',
  em_andamento: 'in_progress',
  review: 'in_review',
  em_revisao: 'in_review',
  done: 'completed',
  concluido: 'completed',
  completed_with_issues: 'completed',
  planning: 'backlog',
  pending_approval: 'in_review',
  approved: 'todo',
  active: 'in_progress',
  closing: 'in_review',
  closed: 'completed',
};

export const MODULE_PASTELS = {
  dashboard: {
    bg: 'bg-[#EDE9FB]',
    soft: 'bg-[#F5F2FC]',
    text: 'text-[#4A2FA3]',
    accent: 'bg-[#6C47D8]',
    border: 'border-[#D4CBF5]',
  },
  clients: {
    bg: 'bg-[#EAF2FB]',
    soft: 'bg-[#F3F8FC]',
    text: 'text-[#2E5A7A]',
    accent: 'bg-[#5B9BD5]',
    border: 'border-[#C5DBF0]',
  },
  tasks: {
    bg: 'bg-[#FFF0E6]',
    soft: 'bg-[#FFF7F1]',
    text: 'text-[#8A4A22]',
    accent: 'bg-[#E8955A]',
    border: 'border-[#FFD0B0]',
  },
  services: {
    bg: 'bg-[#F3EAFB]',
    soft: 'bg-[#F9F4FC]',
    text: 'text-[#5A3A7A]',
    accent: 'bg-[#9B6BC9]',
    border: 'border-[#D4BFEB]',
  },
  library: {
    bg: 'bg-[#E6F7F0]',
    soft: 'bg-[#F2FBF7]',
    text: 'text-[#085041]',
    accent: 'bg-[#22C98A]',
    border: 'border-[#A8E0CB]',
  },
  reports: {
    bg: 'bg-[#FFF8E6]',
    soft: 'bg-[#FFFCF3]',
    text: 'text-[#7A5A10]',
    accent: 'bg-[#E0B84A]',
    border: 'border-[#F0DC9A]',
  },
  team: {
    bg: 'bg-[#FDEBEC]',
    soft: 'bg-[#FEF6F7]',
    text: 'text-[#8A2A2A]',
    accent: 'bg-[#E24B4A]',
    border: 'border-[#F0B8BC]',
  },
  settings: {
    bg: 'bg-[#F1F1F3]',
    soft: 'bg-[#F8F8F9]',
    text: 'text-[#4A4A55]',
    accent: 'bg-[#6E6A88]',
    border: 'border-[#D0D0D6]',
  },
};

export const CARD_PASTEL_CYCLE = [
  { bg: 'bg-[#FFF0E6]', bar: 'bg-[#E8955A]', text: 'text-[#8A4A22]', tag: 'bg-[#FFE4D1] text-[#8A4A22]' },
  { bg: 'bg-[#EAF2FB]', bar: 'bg-[#5B9BD5]', text: 'text-[#2E5A7A]', tag: 'bg-[#DCEAF8] text-[#2E5A7A]' },
  { bg: 'bg-[#E6F7F0]', bar: 'bg-[#22C98A]', text: 'text-[#085041]', tag: 'bg-[#D0F0E4] text-[#085041]' },
  { bg: 'bg-[#F3EAFB]', bar: 'bg-[#9B6BC9]', text: 'text-[#5A3A7A]', tag: 'bg-[#E8D9F7] text-[#5A3A7A]' },
  { bg: 'bg-[#FDEBEC]', bar: 'bg-[#E88A9A]', text: 'text-[#8A2A3A]', tag: 'bg-[#FAD9DB] text-[#8A2A3A]' },
  { bg: 'bg-[#FFF8E6]', bar: 'bg-[#E0B84A]', text: 'text-[#7A5A10]', tag: 'bg-[#F5E9C4] text-[#7A5A10]' },
];

export function getStagePastel(status) {
  if (!status) return STAGE_PASTELS.backlog;
  const key = String(status).toLowerCase().replace(/\s+/g, '_');
  const resolved = STAGE_ALIASES[key] || key;
  return STAGE_PASTELS[resolved] || STAGE_PASTELS.backlog;
}

export function getModulePastel(moduleKey) {
  return MODULE_PASTELS[moduleKey] || MODULE_PASTELS.dashboard;
}

export function getCardPastel(index = 0) {
  return CARD_PASTEL_CYCLE[Math.abs(index) % CARD_PASTEL_CYCLE.length];
}

/** Kanban column definitions aligned with pastel map */
export const KANBAN_COLUMNS = [
  { id: 'backlog', title: 'Backlog', status: 'backlog', limit: null },
  { id: 'todo', title: 'A Fazer', status: 'todo', limit: 10 },
  { id: 'in_progress', title: 'Em Andamento', status: 'in_progress', limit: 8 },
  { id: 'in_review', title: 'Em Revisão', status: 'in_review', limit: 6 },
  { id: 'completed', title: 'Concluído', status: 'completed', limit: null },
].map((col) => ({
  ...col,
  ...getStagePastel(col.status),
  color: getStagePastel(col.status).column,
}));
