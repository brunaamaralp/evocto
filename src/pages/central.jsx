import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Library, KeyRound } from 'lucide-react';
import { useSession } from '@/components/auth/SessionManager';
import LoadingState from '@/components/shared/LoadingState';
import EmptyState from '@/components/shared/EmptyState';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AgencyCentralPanel from '@/components/agency/AgencyCentralPanel';
import AgencyAccessesPanel from '@/components/agency/AgencyAccessesPanel';
import { createPageUrl } from '@/utils';

const VALID_TABS = new Set(['biblioteca', 'acessos']);

/**
 * Central da Agência — documentos, links, informações e cofre de acessos.
 * Independente dos perfis de cliente.
 */
export default function CentralPage() {
  const { isAuthenticated, agencyId, loading } = useSession();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabFromUrl = String(searchParams.get('tab') || 'biblioteca').trim();
  const activeTab = VALID_TABS.has(tabFromUrl) ? tabFromUrl : 'biblioteca';

  const setTab = (tab) => {
    const next = new URLSearchParams(searchParams);
    if (tab === 'biblioteca') next.delete('tab');
    else next.set('tab', tab);
    setSearchParams(next, { replace: true });
  };

  const headerCopy = useMemo(() => {
    if (activeTab === 'acessos') {
      return 'Credenciais internas da agência — senhas criptografadas, ocultas por padrão.';
    }
    return 'Biblioteca interna — documentos, links úteis e informações operacionais.';
  }, [activeTab]);

  if (loading) {
    return <LoadingState message="Carregando Central…" />;
  }

  if (!isAuthenticated || !agencyId) {
    return (
      <EmptyState
        icon={Library}
        title="Sessão necessária"
        description="Entre na sua conta da agência para acessar a Central."
        primaryAction={{
          label: 'Ir para o login',
          href: createPageUrl('login'),
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-24 sm:pb-8">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <Library className="h-5 w-5 shrink-0 text-[#B80015]" aria-hidden />
          <h1 className="text-xl font-bold tracking-tight text-[#1A1210] sm:text-2xl">
            Central
          </h1>
        </div>
        <p className="text-sm leading-relaxed text-[#6B635C]">{headerCopy}</p>
      </header>

      <Tabs value={activeTab} onValueChange={setTab} className="space-y-5">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-2xl bg-[#F1EDE7] p-1">
          <TabsTrigger
            value="biblioteca"
            className="rounded-xl px-3 py-2.5 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <Library className="mr-1.5 h-4 w-4 shrink-0" />
            Biblioteca
          </TabsTrigger>
          <TabsTrigger
            value="acessos"
            className="rounded-xl px-3 py-2.5 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <KeyRound className="mr-1.5 h-4 w-4 shrink-0" />
            Acessos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="biblioteca" className="mt-0 focus-visible:outline-none">
          <AgencyCentralPanel />
        </TabsContent>
        <TabsContent value="acessos" className="mt-0 focus-visible:outline-none">
          <AgencyAccessesPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
