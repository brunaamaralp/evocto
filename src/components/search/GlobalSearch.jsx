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
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { Client, Service, Brief, Insights, Scope } from '@/api/entities';
import { navigateToCustomer } from '@/components/utils/navigation.jsx';
import { useDebounce } from '../hooks/useDebounce';

const entityConfig = {
  Clientes: {
    fetcher: () => Client.list('-updated_date', 30),
    icon: Users,
    getPageUrl: (item) => navigateToCustomer(item.id)
  },
  Serviços: {
    fetcher: () => Service.filter({ is_template: false }, '-updated_date', 30),
    icon: Wrench,
    getPageUrl: (item) => navigateToCustomer(item.customerId || item.clientId)
  },
  Briefings: {
    fetcher: () => Brief.list('-updated_date', 30),
    icon: FileText,
    getPageUrl: (item) => `/briefing-editor?id=${item.id}`
  },
  Insights: {
    fetcher: () => Insights.list('-updated_date', 30),
    icon: Lightbulb,
    getPageUrl: (item) => `/InsightsEditor?id=${item.id}`
  },
  Escopos: {
    fetcher: () => Scope.list('-updated_date', 30),
    icon: Target,
    getPageUrl: (item) => `/scope-editor?id=${item.id}`
  },
};

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pages, setPages] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
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
            items: items.map(item => ({
              ...item,
              title: item.title || item.name || `Item ${item.id.slice(0, 4)}`,
              subtitle: item.company || item.customerName || ''
            })),
            icon: config.icon,
            getPageUrl: config.getPageUrl
          };
        } catch (error) {
          return { groupName, items: [], icon: config.icon, getPageUrl: config.getPageUrl };
        }
      });

      const results = await Promise.all(promises);
      const pageData = results.reduce((acc, result) => {
        if (result.items.length > 0) {
          acc[result.groupName] = {
            items: result.items,
            icon: result.icon,
            getPageUrl: result.getPageUrl
          };
        }
        return acc;
      }, {});
      
      setPages(pageData);
      setLoading(false);
    };

    if (open) {
      // Reset pages when dialog opens and fetch fresh data
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
        placeholder="Buscar cliente, serviço, briefing..." 
        data-search="command-input"
        aria-label="Campo de busca global"
      />
      <CommandList data-search="results">
        <CommandEmpty>{loading ? "Carregando..." : "Nenhum resultado encontrado."}</CommandEmpty>
        {!loading && Object.entries(pages).map(([group, { items, icon: Icon, getPageUrl }]) => (
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
                    {item.subtitle && <span className="text-xs text-slate-500">{item.subtitle}</span>}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
      </CommandList>
    </CommandDialog>
  );
}