import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Service } from "@/api/entities";
import { User } from "@/api/entities";

const CATEGORIES = [
  "marketing_digital",
  "branding",
  "desenvolvimento",
  "consultoria",
  "midia_paga",
  "organico",
  "produto"
];

export default function NewTemplateModal({ open, onOpenChange, onCreated }) {
  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState("marketing_digital");
  const [cycle, setCycle] = React.useState("monthly");
  const [saving, setSaving] = React.useState(false);

  const submit = async () => {
    if (!name) return;
    setSaving(true);
    try {
      const me = await User.me();
      const agencyId = me?.data?.agencyId;
      const created = await Service.create({
        agencyId,
        clientId: null,
        name,
        description: "",
        category,
        channels: [],
        cycle_frequency: cycle,
        timezone: "America/Sao_Paulo",
        is_active: true,
        is_template: true
      });
      if (onCreated) onCreated(created);
      onOpenChange(false);
      setName("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Template de Serviço</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Social Media (Padrão)" />
          </div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace("_", " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Frequência de Ciclo</Label>
            <Select value={cycle} onValueChange={setCycle}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Mensal</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="quarterly">Trimestral</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={!name || saving} className="bg-blue-600 hover:bg-blue-700">
            {saving ? "Criando..." : "Criar Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}