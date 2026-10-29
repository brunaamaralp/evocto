import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  Menu,
  LayoutGrid,
  CheckSquare,
  CalendarDays,
} from 'lucide-react';
import { getMobileBottomNavItems } from '@/lib/shellNavigation';
import { GLOBAL_SHELL } from '@/lib/clientContextTheme';
import { cn } from '@/lib/utils';

const ICONS = {
  home: LayoutDashboard,
  clients: Users,
  approvals: ClipboardCheck,
  more: Menu,
  hub: LayoutGrid,
  tasks: CheckSquare,
  plan: CalendarDays,
};

/**
 * Bottom nav dedicada (lg:hidden). Destinos principais + Mais → sidebar.
 */
export default function MobileBottomNav({
  mode = 'global',
  clientId = null,
  serviceId = null,
  currentPage = '',
  onOpenMenu,
  hidden = false,
}) {
  const location = useLocation();
  const taskPreset = new URLSearchParams(location.search).get('preset');
  const items = getMobileBottomNavItems({
    mode,
    clientId,
    serviceId,
    currentPage,
    taskPreset,
  });

  if (hidden) return null;

  const isClient = mode === 'client' && Boolean(clientId);
  /** Cliente: Jeans; global: Cereja — ambos da identidade Narrativa */
  const activeClass = isClient ? 'text-[#8FA9BE]' : 'text-[#B80015]';
  const idleClass = isClient
    ? 'text-[#6B635C] hover:text-[#16070A]'
    : 'text-[#6B635C] hover:text-[#1A1210]';

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-[#E4DDD4] bg-white/95 backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Navegação principal"
    >
      <ul
        className="mx-auto flex h-14 max-w-lg items-stretch px-1"
        style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const Icon = ICONS[item.id] || LayoutDashboard;
          const isMore = item.action === 'more';
          const className = cn(
            'flex flex-col items-center justify-center gap-0.5 min-w-0 h-full min-h-[44px] text-[11px] font-medium transition-colors',
            item.isActive ? activeClass : idleClass
          );

          if (isMore) {
            return (
              <li key={item.id} className="min-w-0">
                <button
                  type="button"
                  onClick={onOpenMenu}
                  className={cn(className, 'w-full')}
                  aria-label="Abrir menu completo"
                >
                  <Icon className="h-[18px] w-[18px] stroke-[1.75]" aria-hidden />
                  <span className="truncate max-w-full px-0.5">{item.label}</span>
                </button>
              </li>
            );
          }

          return (
            <li key={item.id} className="min-w-0">
              <Link
                to={item.href}
                className={className}
                aria-current={item.isActive ? 'page' : undefined}
              >
                <Icon
                  className={cn(
                    'h-[18px] w-[18px] stroke-[1.75]',
                    item.isActive && !isClient ? GLOBAL_SHELL.sidebarIconActive : ''
                  )}
                  aria-hidden
                />
                <span className="truncate max-w-full px-0.5">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
