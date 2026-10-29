import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Building2, ChevronsUpDown, Users } from 'lucide-react';
import { createPageUrl } from '@/utils';
import {
  buildRecentClientHref,
  listRecentClientsForSwitcher,
  readRecentClients,
  RECENT_CLIENTS_CHANGED_EVENT,
} from '@/lib/recentClients';
import { cn } from '@/lib/utils';

/**
 * Switcher Asana-like: clientes visitados recentemente.
 */
export default function RecentClientsSwitcher({
  agencyId,
  currentClientId = null,
  currentClientName = null,
  compact = false,
  className = '',
}) {
  const [recent, setRecent] = useState(() => readRecentClients(agencyId));

  useEffect(() => {
    const refresh = () => setRecent(readRecentClients(agencyId));
    refresh();
    window.addEventListener(RECENT_CLIENTS_CHANGED_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(RECENT_CLIENTS_CHANGED_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [agencyId]);

  const others = listRecentClientsForSwitcher(agencyId, currentClientId);
  const hasCurrent = Boolean(currentClientId);
  const show = hasCurrent || recent.length > 0;
  if (!show || !agencyId) return null;

  const triggerLabel = hasCurrent
    ? currentClientName || 'Cliente'
    : 'Clientes recentes';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-9 gap-1.5 rounded-full px-2.5 text-[#6B635C] hover:text-[#1A1210] hover:bg-black/5 max-w-[200px]',
            compact && 'w-9 px-0 justify-center',
            className
          )}
          aria-label="Alternar cliente"
          title="Clientes recentes"
        >
          <Building2 className="h-4 w-4 shrink-0" />
          {!compact ? (
            <>
              <span className="truncate text-sm font-medium text-[#1A1210]">
                {triggerLabel}
              </span>
              <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
            </>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Clientes recentes</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {hasCurrent ? (
          <DropdownMenuItem disabled className="opacity-100">
            <Building2 className="h-4 w-4 mr-2 text-[#B80015]" />
            <div className="min-w-0 flex flex-col">
              <span className="truncate font-medium">
                {currentClientName || 'Cliente atual'}
              </span>
              <span className="text-[10px] text-muted-foreground">Atual</span>
            </div>
          </DropdownMenuItem>
        ) : null}
        {others.length === 0 ? (
          <div className="px-2 py-3 text-xs text-muted-foreground">
            {hasCurrent
              ? 'Visite outros clientes para alternar rápido aqui.'
              : 'Abra um cliente para aparecer nesta lista.'}
          </div>
        ) : (
          others.map((c) => (
            <DropdownMenuItem key={c.id} asChild>
              <Link
                to={buildRecentClientHref(c.id)}
                className="flex items-center cursor-pointer"
              >
                <span className="mr-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#B80015] text-[10px] font-bold text-white">
                  {(c.name || 'C')[0].toUpperCase()}
                </span>
                <div className="min-w-0 flex flex-col">
                  <span className="truncate">{c.name}</span>
                  {c.sector ? (
                    <span className="truncate text-[10px] text-muted-foreground">
                      {c.sector}
                    </span>
                  ) : null}
                </div>
              </Link>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            to={createPageUrl('clients')}
            className="flex items-center cursor-pointer"
          >
            <Users className="h-4 w-4 mr-2" />
            Ver todos os clientes
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
