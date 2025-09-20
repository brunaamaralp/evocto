
import React from "react";
import { Service } from "@/api/entities";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Palette } from "lucide-react";

const FREQUENCIES = [
  { value: "daily", label: "Diário" },
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensal" },
  { value: "quarterly", label: "Trimestral" }
];

const PRIORITIES = [
  { value: "low", label: "Baixa" },
  { value: "medium", label: "Média" },
  { value: "high", label: "Alta" }
];

function newDeliverable() {
  return {
    id: `deliv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    description: "",
    quantity: 1,
    frequency: "monthly",
    category: "",
    estimated_hours: 2,
    priority: "medium",
    requires_approval: false,
    template_notes: ""
  };
}

export default function TemplateDesignEditor({ open, onOpenChange, service, onSaved }) {
  const [saving, setSaving] = React.useState(false);
  const [items, setItems] = React.useState(Array.isArray(service?.deliverables) ? service.deliverables : []);

  // Memoize deliverables to use as a stable dependency
  const deliverablesMemo = React.useMemo(
    () => (Array.isArray(service?.deliverables) ? service.deliverables : []),
    [service?.deliverables]
  );

  React.useEffect(() => {
    setItems(deliverablesMemo);
  }, [deliverablesMemo]);

  const update = (index, patch) => {
    setItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const addItem = () => setItems(prev => [...prev, newDeliverable()]);
  const removeItem = (index) => setItems(prev => prev.filter((_, i) => i !== index));

  const save = async () => {
    setSaving(true);
    try {
      // Garante IDs e tipos corretos
      const normalized = items.map((d) => ({
        ...d,
        id: d.id || `deliv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        quantity: Number(d.quantity ?? 0),
        estimated_hours: d.estimated_hours != null ? Number(d.estimated_hours) : undefined
      }));
      await Service.update(service.id, { deliverables: normalized });
      if (typeof onSaved === "function") onSaved(normalized);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-blue-600" />
            Editar Design do Template
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-slate-600">
            Defina os entregáveis padrão deste template. Eles serão usados para contratos e ciclos.
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-700">
              Template: <span className="font-medium">{service?.name}</span>
            </div>
            <Button variant="outline" size="sm" onClick={addItem} className="gap-2">
              <Plus className="w-4 h-4" /> Adicionar Entregável
            </Button>
          </div>

          <ScrollArea className="max-h-[55vh] rounded border">
            <div className="divide-y">
              {items.length === 0 && (
                <div className="p-6 text-sm text-slate-500">
                  Nenhum entregável ainda. Clique em “Adicionar Entregável”.
                </div>
              )}

              {items.map((d, idx) => (
                <div key={d.id || idx} className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-6 space-y-2">
                      <Label>Nome do Entregável</Label>
                      <Input
                        value={d.name || ""}
                        onChange={(e) => update(idx, { name: e.target.value })}
                        placeholder="Ex.: 5 posts para Instagram"
                        aria-label="Nome do entregável"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <Label>Quantidade</Label>
                      <Input
                        type="number"
                        min={0}
                        value={d.quantity ?? 0}
                        onChange={(e) => update(idx, { quantity: Number(e.target.value) })}
                        aria-label="Quantidade"
                      />
                    </div>
                    <div className="md:col-span-4 space-y-2">
                      <Label>Frequência</Label>
                      <Select
                        value={d.frequency || "monthly"}
                        onValueChange={(v) => update(idx, { frequency: v })}
                      >
                        <SelectTrigger aria-label="Frequência">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {FREQUENCIES.map(f => (
                            <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="md:col-span-4 space-y-2">
                      <Label>Categoria</Label>
                      <Input
                        value={d.category || ""}
                        onChange={(e) => update(idx, { category: e.target.value })}
                        placeholder="posts, stories, campanha…"
                        aria-label="Categoria"
                      />
                    </div>
                    <div className="md:col-span-4 space-y-2">
                      <Label>Horas Estimadas</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.5"
                        value={d.estimated_hours ?? 0}
                        onChange={(e) => update(idx, { estimated_hours: Number(e.target.value) })}
                        aria-label="Horas estimadas"
                      />
                    </div>
                    <div className="md:col-span-4 space-y-2">
                      <Label>Prioridade</Label>
                      <Select
                        value={d.priority || "medium"}
                        onValueChange={(v) => update(idx, { priority: v })}
                      >
                        <SelectTrigger aria-label="Prioridade">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {PRIORITIES.map(p => (
                            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="md:col-span-12 space-y-2">
                      <Label>Descrição</Label>
                      <Textarea
                        value={d.description || ""}
                        onChange={(e) => update(idx, { description: e.target.value })}
                        placeholder="Detalhes do entregável"
                        aria-label="Descrição"
                      />
                    </div>
                    <div className="md:col-span-12 space-y-2">
                      <Label>Notas (Template)</Label>
                      <Textarea
                        value={d.template_notes || ""}
                        onChange={(e) => update(idx, { template_notes: e.target.value })}
                        placeholder="Observações específicas para quando este entregável for usado"
                        aria-label="Notas do template"
                      />
                    </div>

                    <div className="md:col-span-6 flex items-center gap-2">
                      <Checkbox
                        id={`req_${d.id || idx}`}
                        checked={!!d.requires_approval}
                        onCheckedChange={(checked) => update(idx, { requires_approval: Boolean(checked) })}
                      />
                      <Label htmlFor={`req_${d.id || idx}`}>Requer aprovação do cliente</Label>
                    </div>

                    <div className="md:col-span-6 flex md:justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-1"
                        onClick={() => removeItem(idx)}
                        aria-label="Remover entregável"
                      >
                        <Trash2 className="h-4 w-4" /> Remover
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
            {saving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
