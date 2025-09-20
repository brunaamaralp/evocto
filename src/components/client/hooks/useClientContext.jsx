
import React from "react";
import { useSession } from "@/components/auth/SessionManager";
import { Client } from "@/api/entities";
import { Service } from "@/api/entities";
import { EmptyState } from "@/components/shared/EmptyState";

export function useClientContext() {
  const { agencyId } = useSession();
  const [client, setClient] = React.useState(null);
  const [services, setServices] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  const urlParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const clientId = urlParams.get("clientId") || urlParams.get("id");

  const reload = React.useCallback(async () => {
    // Evita loop de loading quando faltam pré-requisitos
    if (!clientId) {
      setClient(null);
      setServices([]);
      setError("Cliente não especificado.");
      setLoading(false);
      return;
    }
    if (!agencyId) {
      // sessão ainda carregando; não liga loading indefinido
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [c, svcs] = await Promise.all([
        Client.get(clientId),
        Service.filter({ agencyId, clientId })
      ]);
      if (!c || c.agencyId !== agencyId) throw new Error("Cliente não encontrado ou sem permissão.");
      setClient(c);
      setServices(svcs || []);
    } catch (e) {
      setError(e.message || "Erro ao carregar cliente");
      setClient(null);
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, [clientId, agencyId]);

  React.useEffect(() => {
    reload();
  }, [reload]);

  return { clientId, client, services, loading, error, reload };
}
