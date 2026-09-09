import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import {
  Users,
  Wrench,
  FileText,
  Lightbulb,
  Target,
  Search,
} from 'lucide-react';
import { Client, Service, Brief, Insights, Scope } from '@/api/entities';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';

const OPEN_EVENT = 'evocto:open-global-search';

export function openGlobalSearch() {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

const entityConfig = {
  Clientes: {
    fetcher: () => Client.list('-updated_date', 30),
    icon: Users,
    getPageUrl: (item) => createPageUrl(`client-detail?clientId=${item.id}`),
  },
  Serviços: {
    fetcher: () => Service.filter({ is_template: false }, '-updated_date', 30),
    icon: Wrench,
    getPageUrl: (item) =>
      createPageUrl(
        `service-detail?serviceId=${item.id}${
          item.clientId || item.customerId
            ? `&clientId=${item.clientId || item.customerId}`
            : ''
        }`
      ),
  },
  Briefings: {
    fetcher: () => Brief.list('-updated_date', 30),
    icon: FileText,
    getPageUrl: (item) => `/briefing-editor?id=${item.id}`,
  },
  Insights: {
    fetcher: () => Insights.list('-updated_date', 30),
    icon: Lightbulb,
    getPageUrl: (item) => `/InsightsEditor?id=${item.id}`,
  },
  Escopos: {
    fetcher: () => Scope.list('-updated_date', 30),
    icon: Target,
    getPageUrl: (item) => `/scope-editor?id=${item.id}`,
  },
};

export function GlobalSearchTrigger({ compact = false, className = '' }) {
  if (compact) {
    return (
      <button
        type="button"
        onClick={openGlobalSearch}
        className={cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-full text-[#7A7595] hover:bg-[#F5F2FC] hover:text-[#18162A] transition-colors',
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
        'flex w-full items-center gap-2 h-10 pl-3.5 pr-3 rounded-full bg-[#F5F2FC] border border-transparent text-sm text-left text-[#7A7595] hover:border-[#AFA9EC]/60 focus:outline-none focus:ring-2 focus:ring-[#6C47D8]/30 transition-shadow',
        className
      )}
      aria-label="Abrir busca global"
    >
      <Search className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate">Buscar cliente, serviço, briefing…</span>
      <kbd className="hidden sm:inline-flex h-6 items-center rounded-md border border-[#E8E5F5] bg-white px-1.5 text-[10px] font-medium text-[#7A7595]">
        ⌘K
      </kbd>
    </button>
  );
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pages, setPages] = useState({});
  const navigate = useNavigate();

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
    const fetchData = async () => {
      if (!open) return;
      setLoading(true);

      const promises = Object.entries(entityConfig).map(async ([groupName, config]) => {
        try {
          const items = await config.fetcher();
          return {
            groupName,
            items: items.map((item) => ({
              ...item,
              title: item.title || item.name || `Item ${String(item.id).slice(0, 4)}`,
              subtitle: item.company || item.customerName || item.sector || '',
            })),
            icon: config.icon,
            getPageUrl: config.getPageUrl,
          };
        } catch {
          return { groupName, items: [], icon: config.icon, getPageUrl: config.getPageUrl };
        }
      });

      const results = await Promise.all(promises);
      const pageData = results.reduce((acc, result) => {
        if (result.items.length > 0) {
          acc[result.groupName] = {
            items: result.items,
            icon: result.icon,
            getPageUrl: result.getPageUrl,
          };
        }
        return acc;
      }, {});

      setPages(pageData);
      setLoading(false);
    };

    if (open) {
      setPages({});
      fetchData();
    }
  }, [open]);

  const runCommand = useCallback((command) => {
    setOpen(false);
    command();
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Digite para buscar cliente, serviço, briefing..."
        data-search="command-input"
        aria-label="Campo de busca global"
      />
      <CommandList data-search="results">
        <CommandEmpty>{loading ? 'Carregando...' : 'Nenhum resultado encontrado.'}</CommandEmpty>
        {!loading &&
          Object.entries(pages).map(([group, { items, icon: Icon, getPageUrl }]) => (
            <CommandGroup key={group} heading={group}>
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.title} ${item.subtitle}`}
                  onSelect={() => runCommand(() => navigate(getPageUrl(item)))}
                  className="cursor-pointer"
                  data-search-item={group.toLowerCase()}
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
          ))}
      </CommandList>
    </CommandDialog>
  );
}
