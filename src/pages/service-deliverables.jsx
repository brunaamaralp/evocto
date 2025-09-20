import React, { useEffect, useState, useCallback } from "react";
import { Service } from "@/api/entities";
import { useSession } from "@/components/auth/SessionManager";
import DeliverablesEditor from "@/components/services/DeliverablesEditor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function ServiceDeliverablesPage() {
  const { isAuthenticated } = useSession();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const id = urlParams.get("id");
      if (!id) {
        setErr("Informe ?id=SERVICE_ID na URL.");
        setService(null);
        setLoading(false);
        return;
      }
      const s = await Service.get(id);
      setService(s || null);
    } catch (e) {
      setErr(e?.message || "Falha ao carregar serviço");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!isAuthenticated) {
    return (
      <div className="p-6">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Entregáveis do Serviço</CardTitle>
          </CardHeader>
          <CardContent className="text-slate-600">
            <div className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="w-4 h-4" />
              Faça login para acessar esta página.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Entregáveis do Serviço</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-slate-600">Carregando...</p>
          ) : err ? (
            <div className="text-red-600 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {err}
            </div>
          ) : !service ? (
            <p className="text-slate-600">Serviço não encontrado.</p>
          ) : (
            <>
              <div className="text-sm text-slate-600">
                <span className="font-medium text-slate-900">Serviço:</span> {service.name} •{" "}
                <span className="font-medium text-slate-900">Cliente:</span> {service.clientId || "—"}
              </div>

              <DeliverablesEditor
                service={service}
                onSave={async (newDeliverables) => {
                  setOk("");
                  setErr("");
                  try {
                    await Service.update(service.id, { deliverables: newDeliverables });
                    setOk("Entregáveis salvos com sucesso.");
                    await load();
                  } catch (e) {
                    setErr(e?.response?.data?.error || e?.message || "Falha ao salvar entregáveis");
                  }
                }}
              />

              {ok && (
                <div className="text-emerald-600 text-sm flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> {ok}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}