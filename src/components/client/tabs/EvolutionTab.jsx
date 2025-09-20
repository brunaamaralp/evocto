
import React from "react";
import { useClientContext } from "@/components/client/hooks/useClientContext";
import { useSession } from "@/components/auth/SessionManager";
import { EvolutionEvent } from "@/api/entities";
import LoadingState from "@/components/shared/LoadingState";
import EmptyState from "@/components/shared/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Clock, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function EvolutionTab() {
  const { agencyId } = useSession();
  const { clientId, client, loading: ctxLoading, error: ctxError } = useClientContext();
  const [loading, setLoading] = React.useState(false); // Changed initial state to false
  const [events, setEvents] = React.useState([]);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (!agencyId || !clientId) {
      setLoading(false); // Ensure loading is false if client/agency ID is missing
      return;
    }

    let cancelled = false; // Flag to prevent state updates on unmounted component
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await EvolutionEvent.filter({ agencyId, clientId }, "-date");
        if (!cancelled) setEvents(data || []);
      } catch (e) {
        if (!cancelled) setError("Não foi possível carregar evolução");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();

    return () => {
      cancelled = true; // Cleanup: set cancelled to true if component unmounts
    };
  }, [agencyId, clientId]);

  if (!clientId) {
    return (
      <div className="p-6">
        <EmptyState
          icon="etapas"
          title="Selecione um cliente"
          description="Abra um cliente para visualizar a evolução."
        />
      </div>
    );
  }

  if (ctxLoading || loading) return <LoadingState message="Carregando evolução..." />;

  if (ctxError || error) {
    return (
      <div className="p-6">
        <EmptyState
          icon="etapas"
          title="Erro ao carregar evolução"
          description={ctxError || error}
          primaryAction={{ label: "Recarregar", onClick: () => window.location.reload() }}
        />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon="etapas"
          title="Sem eventos de evolução"
          description="Quando houver marcos ou mudanças estratégicas, eles aparecerão aqui."
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Activity className="w-5 h-5 text-purple-600" />
        <h3 className="text-lg font-semibold text-slate-900">
          Evolução — {client?.company || client?.name}
        </h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {events.map((ev) => (
          <Card key={ev.id} className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between">
              <CardTitle className="text-base">{ev.title}</CardTitle>
              <Badge variant="outline" className="capitalize">{ev.type.replaceAll("_", " ")}</Badge>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-slate-700">{ev.description}</p>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <Clock className="w-3 h-3" />
                <span>{new Date(ev.date).toLocaleString("pt-BR")}</span>
                <TrendingUp className="w-3 h-3 ml-3" />
                <span>Impacto: {ev.impact}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
