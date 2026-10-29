/**
 * Tokens visuais do contexto de cliente vs. sistema global.
 * Ambos usam a identidade Narrativa; o modo cliente diferencia
 * com Azul jeans em vez da Cereja do shell global.
 */
export const CLIENT_CONTEXT = {
  label: 'Contexto do cliente',
  exitLabel: 'Sair do contexto',
  /** Fundo da casca da página */
  shellBg: 'evocto-shell--client',
  /** Faixa superior permanente */
  topBar: 'bg-[#16070A]',
  /** Sidebar — mesma base vinho; ativo em Jeans */
  sidebarBg: 'bg-[#16070A]',
  sidebarText: 'text-[#FFE8E4]',
  sidebarMuted: 'text-[#C9B8B4]',
  sidebarBorder: 'border-white/5',
  sidebarHover: 'hover:bg-white/5 hover:text-[#FFF8F0]',
  sidebarActive: 'bg-[rgba(143,169,190,0.28)] text-[#E8EEF3] shadow-sm',
  sidebarIconActive: 'text-[#8FA9BE]',
  sidebarFooter: 'bg-[#16070A]',
  logoBg: 'bg-[#B80015]',
  avatarBg: 'bg-[#B80015]',
  /** Chip / banner no header */
  chip: 'bg-[#C9D6E2] text-[#16070A]',
  chipSoft: 'bg-[#E8EEF3] text-[#16070A] border-[#8FA9BE]',
  /** Borda de destaque no conteúdo */
  contentAccent: 'border-l-4 border-l-[#8FA9BE]',
};

export const GLOBAL_SHELL = {
  sidebarBg: 'bg-[#16070A]',
  sidebarText: 'text-[#FFE8E4]',
  sidebarMuted: 'text-[#C9B8B4]',
  sidebarBorder: 'border-white/5',
  sidebarHover: 'hover:bg-white/5 hover:text-[#FFF8F0]',
  sidebarActive: 'bg-[rgba(184,0,21,0.28)] text-[#FFE8E4] shadow-sm',
  sidebarIconActive: 'text-[#DD4E28]',
  logoBg: 'bg-[#B80015]',
  avatarBg: 'bg-[#B80015]',
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
