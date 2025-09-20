import React, { useEffect, useState, useCallback } from "react";
import { Service } from "@/api/entities";
import { Client } from "@/api/entities";
import { useSession } from "@/components/auth/SessionManager";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle2, AlertCircle } from "lucide-react";

export default function ServiceTemplateCloner({ onCloned }) {
  const { agencyId } = useSession();
  const [templates, setTemplates] = useState([]);
  const [clients, setClients] = useState([]);
  const [state, setState] = useState({
    templateId: "",
    clientId: "",
    name: "",
  });
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    if (!agencyId) return;
    const [tpl, cls] = await Promise.all([
      Service.filter({ agencyId, is_template: true }, "-updated_date", 50),
      Client.filter({ agencyId }, "-updated_date", 100),
    ]);
    setTemplates(tpl || []);
    setClients(cls || []);
  }, [agencyId]);

  useEffect(() => { load(); }, [load]);

  const cloneNow = async () => {
    setLoading(true);
    setOk("");
    setErr("");
    try {
      const tpl = templates.find((t) => t.id === state.templateId);
      if (!tpl) {
        setErr("Selecione um template.");
        setLoading(false);
        return;
      }
      if (!state.clientId) {
        setErr("Selecione um cliente.");
        setLoading(false);
        return;
      }
      const newService = {
        agencyId,
        clientId: state.clientId,
        name: state.name?.trim() || `${tpl.name} - Clonado`,
        description: tpl.description || "",
        category: tpl.category,
        channels: tpl.channels || [],
        deliverables: tpl.deliverables || [],
        pricing: tpl.pricing || null,
        cycle_frequency: tpl.cycle_frequency || "monthly",
        timezone: tpl.timezone || "America/Sao_Paulo",
        start_date: tpl.start_date || null,
        approval_policy: tpl.approval_policy || "manual_approve",
        is_active: true,
        is_template: false,
      };
      await Service.create(newService);
      setOk("Serviço clonado com sucesso.");
      setState({ templateId: "", clientId: "", name: "" });
      if (onCloned) onCloned();
    } catch (e) {
      setErr(e?.response?.data?.error || e?.message || "Falha ao clonar serviço");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border border-slate-200">
      <CardContent className="p-4 space-y-3">
        <div className="grid md:grid-cols-3 gap-3">
          <select
            className="border rounded-md px-3 py-2"
            value={state.templateId}
            onChange={(e) => setState((s) => ({ ...s, templateId: e.target.value }))}
          >
            <option value="">Selecione um template</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.category})
              </option>
            ))}
          </select>

          <select
            className="border rounded-md px-3 py-2"
            value={state.clientId}
            onChange={(e) => setState((s) => ({ ...s, clientId: e.target.value }))}
          >
            <option value="">Selecione um cliente</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.company ? `- ${c.company}` : ""}
              </option>
            ))}
          </select>

          <Input
            placeholder="Nome do novo serviço"
            value={state.name}
            onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))}
          />
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={cloneNow} disabled={loading} className="gap-1">
            <Copy className="w-4 h-4" />
            {loading ? "Clonando..." : "Clonar"}
          </Button>

        {ok && (
          <div className="text-emerald-600 text-sm flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" /> {ok}
          </div>
        )}
        {err && (
          <div className="text-red-600 text-sm flex items-center gap-1">
            <AlertCircle className="w-4 h-4" /> {err}
          </div>
        )}
        </div>
      </CardContent>
    </Card>
  );
}