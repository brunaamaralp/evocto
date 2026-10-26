/**
 * Tokens visuais do contexto de cliente vs. sistema global.
 * Global: purple brand + canvas lavanda; cliente: teal para leitura imediata.
 */
export const CLIENT_CONTEXT = {
  label: 'Contexto do cliente',
  exitLabel: 'Sair do contexto',
  /** Fundo da casca da página */
  shellBg: 'evocto-shell--client',
  /** Faixa superior permanente */
  topBar: 'bg-teal-700',
  /** Sidebar */
  sidebarBg: 'bg-teal-950',
  sidebarText: 'text-teal-50',
  sidebarMuted: 'text-teal-200/80',
  sidebarBorder: 'border-teal-800/60',
  sidebarHover: 'hover:bg-teal-900 hover:text-white',
  sidebarActive: 'bg-teal-700 text-white shadow-sm',
  sidebarFooter: 'bg-teal-900/80 border-teal-800/60',
  /** Chip / banner no header */
  chip: 'bg-teal-700 text-white',
  chipSoft: 'bg-teal-100 text-teal-900 border-teal-200',
  /** Borda de destaque no conteúdo */
  contentAccent: 'border-l-4 border-l-teal-600',
};

export const GLOBAL_SHELL = {
  sidebarBg: 'bg-[#1A0D0B]',
  sidebarText: 'text-[#FFD4C8]',
  sidebarMuted: 'text-[#7A7595]',
  sidebarBorder: 'border-white/5',
  sidebarHover: 'hover:bg-white/5 hover:text-[#FCE8E3]',
  sidebarActive: 'bg-[rgba(192,40,7,0.28)] text-[#FCE8E3] shadow-sm',
  sidebarIconActive: 'text-[#FF9A7A]',
  logoBg: 'bg-[#C02807]',
  avatarBg: 'bg-[#C02807]',
};

export function isClientContextPath(pathname = '', search = '') {
  const params = new URLSearchParams(search);
  const clientId = params.get('clientId') || params.get('id');
  if (!clientId) return false;
  return (
    pathname.includes('client-detail') ||
    pathname.includes('client-') ||
    pathname.includes('briefing-') ||
    params.has('clientId')
  );
}
