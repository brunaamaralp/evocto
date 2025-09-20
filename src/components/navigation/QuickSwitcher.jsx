import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator
} from '@/components/ui/command';
import {
  Search, Users, Briefcase, Calendar, FileText,
  TrendingUp, MessageCircle, Settings, ArrowRight,
  Command as CommandIcon
} from 'lucide-react';
import { useSession } from '@/components/auth/SessionManager';
import { Client } from '@/api/entities';
import { Service } from '@/api/entities';
import { CyclePlan } from '@/api/entities';
import { createPageUrl } from '@/utils';

const QuickSwitcher = () => {
  const { agencyId } = useSession();
  const [open, setOpen] = useState(false);
  const [searchData, setSearchData] = useState({
    clients: [],
    services: [],
    cycles: []
  });

  // Carregar dados para busca
  useEffect(() => {
    const loadSearchData = async () => {
      if (!agencyId) return;

      try {
        const [clients, services, cycles] = await Promise.all([
          Client.filter({ agencyId }, '-updated_date', 20),
          Service.filter({ agencyId }, '-updated_date', 20),
          CyclePlan.filter({ agencyId }, '-updated_date', 10)
        ]);

        setSearchData({
          clients: clients || [],
          services: services || [],
          cycles: cycles || []
        });
      } catch (error) {
        console.error('Erro ao carregar dados de busca:', error);
      }
    };

    if (open) {
      loadSearchData();
    }
  }, [agencyId, open]);

  // Atalho de teclado
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

  const navigateTo = (url) => {
    setOpen(false);
    window.location.href = url;
  };

  return (
    <>
      {/* Trigger button */}
      <Button
        variant="outline"
        className="relative h-9 w-9 p-0 xl:h-10 xl:w-60 xl:justify-start xl:px-3 xl:py-2"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4 xl:mr-2" />
        <span className="hidden xl:inline-flex">Buscar...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-2 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 xl:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Buscar clientes, serviços, ciclos..." />
        <CommandList>
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
          
          {/* Navegação rápida */}
          <CommandGroup heading="Navegação">
            <CommandItem onSelect={() => navigateTo(createPageUrl('dashboard'))}>
              <TrendingUp className="mr-2 h-4 w-4" />
              Dashboard
            </CommandItem>
            <CommandItem onSelect={() => navigateTo(createPageUrl('clients'))}>
              <Users className="mr-2 h-4 w-4" />
              Clientes
            </CommandItem>
            <CommandItem onSelect={() => navigateTo(createPageUrl('services-overview'))}>
              <Briefcase className="mr-2 h-4 w-4" />
              Serviços
            </CommandItem>
            <CommandItem onSelect={() => navigateTo(createPageUrl('today'))}>
              <Calendar className="mr-2 h-4 w-4" />
              Hoje
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          {/* Clientes */}
          {searchData.clients.length > 0 && (
            <CommandGroup heading="Clientes">
              {searchData.clients.slice(0, 5).map((client) => (
                <CommandItem
                  key={client.id}
                  onSelect={() => navigateTo(`${createPageUrl('client')}?clientId=${client.id}`)}
                >
                  <Users className="mr-2 h-4 w-4 text-blue-500" />
                  <div className="flex items-center justify-between w-full">
                    <span>{client.company || client.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {client.status}
                    </Badge>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Serviços */}
          {searchData.services.length > 0 && (
            <CommandGroup heading="Serviços">
              {searchData.services.slice(0, 5).map((service) => (
                <CommandItem
                  key={service.id}
                  onSelect={() => navigateTo(`${createPageUrl('service-detail')}?serviceId=${service.id}`)}
                >
                  <Briefcase className="mr-2 h-4 w-4 text-purple-500" />
                  <div className="flex items-center justify-between w-full">
                    <span>{service.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {service.category}
                    </Badge>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Ciclos recentes */}
          {searchData.cycles.length > 0 && (
            <CommandGroup heading="Ciclos Recentes">
              {searchData.cycles.slice(0, 3).map((cycle) => (
                <CommandItem
                  key={cycle.id}
                  onSelect={() => navigateTo(`${createPageUrl('cycle-detail')}?cycleId=${cycle.id}`)}
                >
                  <Calendar className="mr-2 h-4 w-4 text-green-500" />
                  <div className="flex items-center justify-between w-full">
                    <span>{cycle.cyclePeriod}</span>
                    <Badge variant="outline" className="text-xs">
                      {cycle.status}
                    </Badge>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
};

export default QuickSwitcher;