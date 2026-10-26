import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Users,
  Wrench,
  Megaphone,
  CheckSquare,
  Calendar,
  Search,
  LayoutDashboard,
  Filter,
  ClipboardCheck,
} from 'lucide-react';
import { useSession } from '@/components/auth/SessionManager';
import { cn } from '@/lib/utils';
import {
  fetchGlobalSearchEntities,
  getGlobalSearchShortcuts,
  openGlobalSearchResult,
} from '@/lib/globalSearchSources';

const OPEN_EVENT = 'evocto:open-global-search';

export function openGlobalSearch() {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

const GROUP_ICONS = {
  Clientes: Users,
  Serviços: Wrench,
  Campanhas: Megaphone,
  Tarefas: CheckSquare,
  Ciclos: Calendar,
};

function searchShortcutLabel() {
  if (typeof navigator === 'undefined') return 'Ctrl+K';
  const platform = navigator.platform || navigator.userAgent || '';
  return /Mac|iPhone|iPad|iPod/i.test(platform) ? '⌘K' : 'Ctrl+K';
}

export function GlobalSearchTrigger({ compact = false, className = '' }) {
  if (compact) {
    return (
      <button
        type="button"
        onClick={openGlobalSearch}
        className={cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-full text-[#7A7595] hover:bg-[#EEF4FA] hover:text-[#18162A] transition-colors',
          className
        )}
        aria-label="Abrir busca"
      >
        <Search className="h-4 w-4" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={openGlobalSearch}
      className={cn(
        'flex w-full items-center gap-2 h-10 pl-3.5 pr-3 rounded-full bg-[#EEF4FA] border border-transparent text-sm text-left text-[#7A7595] hover:border-[#FF9A7A]/60 focus:outline-none focus:ring-2 focus:ring-[#C02807]/30 transition-shadow',
        className
      )}
      aria-label="Abrir busca global"
    >
      <Search className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate">Buscar cliente, tarefa, campanha…</span>
      <kbd className="hidden sm:inline-flex h-6 items-center rounded-md border border-[#E8E5F5] bg-white px-1.5 text-[10px] font-medium text-[#7A7595]">
        {searchShortcutLabel()}
      </kbd>
    </button>
  );
}

export default function GlobalSearch({ preferredClientId = null } = {}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [partialFailure, setPartialFailure] = useState(false);
  const [entities, setEntities] = useState({
    clients: [],
    services: [],
    campaigns: [],
    tasks: [],
    cycles: [],
  });
  const { agencyId, user } = useSession();
  const navigate = useNavigate();
  const userId = user?.id || user?.data?.id || null;
  const shortcuts = getGlobalSearchShortcuts({ userId });

  const preferClient = (items) => {
    if (!preferredClientId || !Array.isArray(items)) return items || [];
    const id = String(preferredClientId);
    const matched = [];
    const rest = [];
    for (const item of items) {
      const clientMatch =
        String(item.clientId || '') === id ||
        String(item.id || '') === id ||
        (item.href && String(item.href).includes(`clientId=${id}`));
      if (clientMatch) matched.push(item);
      else rest.push(item);
    }
    return [...matched, ...rest];
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    const onOpen = () => setOpen(true);
    document.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setPartialFailure(false);
    setEntities({
      clients: [],
      services: [],
      campaigns: [],
      tasks: [],
      cycles: [],
    });

    fetchGlobalSearchEntities(agencyId)
      .then((data) => {
        if (cancelled) return;
        setEntities(data);
        setPartialFailure(Boolean(data?.partialFailure));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, agencyId]);

  const runCommand = useCallback(
    (item) => {
      setOpen(false);
      openGlobalSearchResult(item, navigate);
    },
    [navigate]
  );

  const entityGroups = [
    { key: 'clients', label: 'Clientes', items: preferClient(entities.clients) },
    { key: 'tasks', label: 'Tarefas', items: preferClient(entities.tasks) },
    { key: 'campaigns', label: 'Campanhas', items: preferClient(entities.campaigns) },
    { key: 'services', label: 'Serviços', items: preferClient(entities.services) },
    { key: 'cycles', label: 'Ciclos', items: preferClient(entities.cycles) },
  ].filter((g) => g.items.length > 0);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Buscar cliente, tarefa, campanha ou filtro…"
        data-search="command-input"
        aria-label="Campo de busca global"
      />
      <CommandList data-search="results">
        <CommandEmpty>
          {loading
            ? 'Carregando...'
            : partialFailure
              ? 'Alguns resultados indisponíveis. Tente de novo.'
              : 'Nenhum resultado encontrado.'}
        </CommandEmpty>

        {!loading && partialFailure ? (
          <div
            className="px-3 py-2 text-xs text-amber-700 bg-amber-50 border-b border-amber-100"
            role="status"
          >
            Alguns resultados indisponíveis — a busca pode estar incompleta.
          </div>
        ) : null}

        <CommandGroup heading="Navegação">
          {shortcuts.nav.map((item) => {
            const Icon =
              item.id === 'nav-approvals'
                ? ClipboardCheck
                : item.id === 'nav-tasks'
                  ? CheckSquare
                  : item.id === 'nav-clients'
                    ? Users
                    : LayoutDashboard;
            return (
              <CommandItem
                key={item.id}
                value={`${item.title} ${item.subtitle}`}
                onSelect={() => runCommand(item)}
                className="cursor-pointer"
              >
                <Icon className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>{item.title}</span>
                  <span className="text-xs text-slate-500">{item.subtitle}</span>
                </div>
              </CommandItem>
            );
          })}
        </CommandGroup>

        {shortcuts.presets.length > 0 ? (
          <>
            <CommandSeparator />
            <CommandGroup heading="Filtros de tarefas">
              {shortcuts.presets.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.title} ${item.subtitle} filtro preset`}
                  onSelect={() => runCommand(item)}
                  className="cursor-pointer"
                >
                  <Filter className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span>{item.title}</span>
                    <span className="text-xs text-slate-500">{item.subtitle}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : null}

        {!loading &&
          entityGroups.map(({ label, items }) => {
            const Icon = GROUP_ICONS[label] || Search;
            return (
              <CommandGroup key={label} heading={label}>
                {items.slice(0, 8).map((item) => (
                  <CommandItem
                    key={`${label}-${item.id}`}
                    value={`${item.title} ${item.subtitle} ${label}`}
                    onSelect={() => runCommand(item)}
                    className="cursor-pointer"
                    data-search-item={label.toLowerCase()}
                    aria-label={`Abrir ${item.title}`}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span>{item.title}</span>
                      {item.subtitle ? (
                        <span className="text-xs text-slate-500">{item.subtitle}</span>
                      ) : null}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}
      </CommandList>
    </CommandDialog>
  );
}
