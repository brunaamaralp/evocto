/**
 * Tokens visuais do contexto de cliente vs. sistema global.
 * Global usa azul/cinza; cliente usa teal para leitura imediata.
 */
export const CLIENT_CONTEXT = {
  label: 'Contexto do cliente',
  exitLabel: 'Sair do contexto',
  /** Fundo da casca da página */
  shellBg: 'bg-teal-50/50',
  /** Faixa superior permanente */
  topBar: 'bg-teal-700',
  /** Sidebar */
  sidebarBg: 'bg-teal-950',
  sidebarText: 'text-teal-50',
  sidebarMuted: 'text-teal-200/80',
  sidebarBorder: 'border-teal-800',
  sidebarHover: 'hover:bg-teal-900 hover:text-white',
  sidebarActive: 'bg-teal-700 text-white border border-teal-500',
  sidebarFooter: 'bg-teal-900/80 border-teal-800',
  /** Chip / banner no header */
  chip: 'bg-teal-700 text-white',
  chipSoft: 'bg-teal-100 text-teal-900 border-teal-200',
  /** Borda de destaque no conteúdo */
  contentAccent: 'border-l-4 border-l-teal-600',
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
