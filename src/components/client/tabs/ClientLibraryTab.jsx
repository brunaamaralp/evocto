
import React from "react";
import { useClientContext } from "@/components/client/hooks/useClientContext";
import { useSession } from "@/components/auth/SessionManager";
import { LearningEntry } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LoadingState from "@/components/shared/LoadingState";
import EmptyState from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Eye } from "lucide-react";

export default function ClientLibraryTab() {
  const { agencyId } = useSession();
  const { clientId, client, loading: ctxLoading, error: ctxError } = useClientContext();
  const [loading, setLoading] = React.useState(false); // Changed initial state from true to false
  const [items, setItems] = React.useState([]);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    // Pré-requisitos: se faltar, não iniciar loading infinito
    if (!agencyId || !clientId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await LearningEntry.filter({ agencyId, projectId: clientId }, "-updated_date");
        if (!cancelled) setItems(data || []);
      } catch (e) {
        if (!cancelled) setError("Não foi possível carregar aprendizados");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [agencyId, clientId]);

  if (!clientId) {
    return (
      <div className="p-6">
        <EmptyState
          icon="clientes"
          title="Selecione um cliente"
          description="Abra um cliente para visualizar os aprendizados."
        />
      </div>
    );
  }

  if (ctxLoading || loading) {
    return <LoadingState message="Carregando aprendizados do cliente..." />;
  }

  if (ctxError || error) {
    return (
      <div className="p-6">
        <EmptyState
          icon="ideias"
          title="Erro ao carregar"
          description={ctxError || error}
          primaryAction={{ label: "Tentar novamente", onClick: () => window.location.reload() }}
        />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon="ideias"
          title="Sem aprendizados ainda"
          description="Quando você registrar aprendizados ou promovê-los, eles aparecerão aqui."
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Lightbulb className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-slate-900">
          Aprendizados — {client?.company || client?.name}
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((it) => (
          <Card key={it.id} className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">{it.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-slate-600 line-clamp-3">{it.description}</p>
              <div className="flex items-center gap-2">
                {it.niche && <Badge variant="outline">{it.niche}</Badge>}
                {it.format && <Badge className="bg-blue-100 text-blue-700">{it.format}</Badge>}
                <Badge variant="outline">{new Date(it.created_date).toLocaleDateString("pt-BR")}</Badge>
              </div>
              <div className="flex justify-end">
                <button className="text-sm text-blue-700 hover:underline inline-flex items-center gap-1">
                  <Eye className="w-4 h-4" /> Ver
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
