
import React from "react";
import { useClientContext } from "@/components/client/hooks/useClientContext";
import { Client } from "@/api/entities";
import LoadingState from "@/components/shared/LoadingState";
import EmptyState from "@/components/shared/EmptyState"; // Added import for EmptyState
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function SettingsTab() {
  const { client, loading, error, reload } = useClientContext();
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    industry: "",
    company_size: "",
    status: "ativo"
  });

  React.useEffect(() => {
    if (client) {
      setForm({
        name: client.name || "",
        company: client.company || "",
        email: client.email || "",
        phone: client.phone || "",
        industry: client.industry || "",
        company_size: client.company_size || "",
        status: client.status || "ativo"
      });
    }
  }, [client]);

  if (!client && !loading) {
    return (
      <div className="p-6">
        <EmptyState
          icon="clientes"
          title="Selecione um cliente"
          description="Abra um cliente para editar as configurações."
        />
      </div>
    );
  }

  if (loading) return <LoadingState message="Carregando configurações do cliente..." />;

  if (error) {
    return (
      <div className="p-6">
        <EmptyState
          icon="alerta"
          title="Erro ao carregar"
          description={error}
          primaryAction={{ label: "Tentar novamente", onClick: reload }}
        />
      </div>
    );
  }

  const setField = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const save = async () => {
    if (!client?.id) return;
    setSaving(true);
    try {
      await Client.update(client.id, form);
      toast.success("Configurações do cliente salvas");
      reload();
    } catch (e) {
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Configurações do Cliente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Nome do Contato</Label>
              <Input value={form.name} onChange={(e) => setField("name", e.target.value)} />
            </div>
            <div>
              <Label>Empresa</Label>
              <Input value={form.company} onChange={(e) => setField("company", e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
            </div>
            <div>
              <Label>Setor</Label>
              <Input value={form.industry} onChange={(e) => setField("industry", e.target.value)} />
            </div>
            <div>
              <Label>Tamanho da Empresa</Label>
              <Input value={form.company_size} onChange={(e) => setField("company_size", e.target.value)} placeholder="startup, pequena, média..." />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={save} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
