/**
 * Tokens visuais do contexto de cliente vs. sistema global.
 * Ambos usam a identidade Narrativa; o modo cliente diferencia
 * com Sky Blue (highlight) em vez do Burnt Grape do shell global.
 */
export const CLIENT_CONTEXT = {
  label: 'Contexto do cliente',
  exitLabel: 'Sair do contexto',
  /** Fundo da casca da página */
  shellBg: 'evocto-shell--client',
  /** Faixa superior permanente */
  topBar: 'bg-[#1A0D0B]',
  /** Sidebar — mesma base quente da marca; ativo em Sky */
  sidebarBg: 'bg-[#1A0D0B]',
  sidebarText: 'text-[#FFD4C8]',
  sidebarMuted: 'text-[#A89A96]',
  sidebarBorder: 'border-white/5',
  sidebarHover: 'hover:bg-white/5 hover:text-[#FCE8E3]',
  sidebarActive: 'bg-[rgba(187,217,244,0.22)] text-[#E8F2FB] shadow-sm',
  sidebarIconActive: 'text-[#BBD9F4]',
  sidebarFooter: 'bg-[#1A0D0B]/
  logoBg: 'bg-[#C02807]',
  avatarBg: 'bg-[#C02807]',
  /** Chip / banner no header */
  chip: 'bg-[#BBD9F4] text-[#1A0D0B]',
  chipSoft: 'bg-[#E8F2FB] text-[#1A0D0B] border-[#BBD9F4]/
  /** Borda de destaque no conteúdo */
  contentAccent: 'border-l-4 border-l-[#BBD9F4]',
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
