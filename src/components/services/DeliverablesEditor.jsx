import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ArrowUp, ArrowDown, Save } from "lucide-react";

function newDeliverable() {
  const rid = Math.random().toString(36).slice(2, 10);
  return {
    id: rid,
    name: "",
    description: "",
    quantity: 1,
    frequency: "monthly",
    category: "",
    estimated_hours: 1,
    priority: "medium",
    requires_approval: false,
    template_notes: "",
  };
}

export default function DeliverablesEditor({ service, onSave }) {
  const initial = useMemo(() => service?.deliverables || [], [service]);
  const [items, setItems] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const move = (idx, dir) => {
    const ni = [...items];
    const tgt = idx + dir;
    if (tgt < 0 || tgt >= ni.length) return;
    const tmp = ni[idx];
    ni[idx] = ni[tgt];
    ni[tgt] = tmp;
    setItems(ni);
  };

  const add = () => setItems((arr) => [...arr, newDeliverable()]);
  const remove = (idx) => setItems((arr) => arr.filter((_, i) => i !== idx));

  const saveAll = async () => {
    setSaving(true);
    setErr("");
    setOk("");
    try {
      const sanitized = items.map((it) => ({
        ...it,
        quantity: Number(it.quantity) || 0,
        estimated_hours: Number(it.estimated_hours) || 0,
      }));
      await onSave(sanitized);
      setOk("Entregáveis salvos.");
    } catch (e) {
      setErr(e?.response?.data?.error || e?.message || "Falha ao salvar entregáveis");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border border-slate-200">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={add} className="gap-1">
            <Plus className="w-4 h-4" /> Adicionar entregável
          </Button>
          <Button onClick={saveAll} disabled={saving} className="gap-1">
            <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>

        <div className="space-y-3">
          {items.length === 0 && <p className="text-slate-600">Nenhum entregável. Adicione um item.</p>}
          {items.map((it, idx) => (
            <div key={it.id || idx} className="p-3 rounded-lg border bg-slate-50 space-y-2">
              <div className="grid md:grid-cols-3 gap-2">
                <Input
                  placeholder="Nome do entregável"
                  value={it.name}
                  onChange={(e) => {
                    const v = e.target.value;
                    setItems((arr) => arr.map((x, i) => (i === idx ? { ...x, name: v } : x)));
                  }}
                />
                <Input
                  placeholder="Categoria (ex.: posts, stories...)"
                  value={it.category || ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setItems((arr) => arr.map((x, i) => (i === idx ? { ...x, category: v } : x)));
                  }}
                />
                <Select
                  value={it.frequency || "monthly"}
                  onValueChange={(v) => {
                    setItems((arr) => arr.map((x, i) => (i === idx ? { ...x, frequency: v } : x)));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Frequência" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diário</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="quarterly">Trimestral</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid md:grid-cols-3 gap-2">
                <Input
                  type="number"
                  placeholder="Quantidade"
                  value={it.quantity}
                  onChange={(e) => {
                    const v = e.target.value;
                    setItems((arr) => arr.map((x, i) => (i === idx ? { ...x, quantity: v } : x)));
                  }}
                />
                <Input
                  type="number"
                  placeholder="Horas estimadas"
                  value={it.estimated_hours}
                  onChange={(e) => {
                    const v = e.target.value;
                    setItems((arr) => arr.map((x, i) => (i === idx ? { ...x, estimated_hours: v } : x)));
                  }}
                />
                <Select
                  value={it.priority || "medium"}
                  onValueChange={(v) => {
                    setItems((arr) => arr.map((x, i) => (i === idx ? { ...x, priority: v } : x)));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Prioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => move(idx, -1)}>
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => move(idx, 1)}>
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => remove(idx)} className="text-red-600 gap-1">
                  <Trash2 className="w-4 h-4" /> Remover
                </Button>
              </div>

              <Input
                placeholder="Notas do template / descrição detalhada"
                value={it.template_notes || ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setItems((arr) => arr.map((x, i) => (i === idx ? { ...x, template_notes: v } : x)));
                }}
              />
            </div>
          ))}
        </div>

        {ok && <p className="text-emerald-600 text-sm">{ok}</p>}
        {err && <p className="text-red-600 text-sm">{err}</p>}
      </CardContent>
    </Card>
  );
}