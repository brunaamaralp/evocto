import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { normalizeFormato } from '@/lib/empresaConfig';

/**
 * Override pontual de público/formato/orçamento/tom só para esta campanha.
 */
export default function EditarConfigCampanhaModal({
  open,
  onOpenChange,
  value,
  onSave,
}) {
  const [form, setForm] = useState(() => ({
    publico_alvo: value?.publico_alvo || '',
    formato: normalizeFormato(value?.formato),
    orcamento: value?.orcamento ?? '',
    tom_brand: value?.tom_brand || '',
  }));

  React.useEffect(() => {
    if (open) {
      setForm({
        publico_alvo: value?.publico_alvo || '',
        formato: normalizeFormato(value?.formato),
        orcamento: value?.orcamento ?? '',
        tom_brand: value?.tom_brand || '',
      });
    }
  }, [open, value]);

  const handleSave = () => {
    onSave?.({
      publico_alvo: String(form.publico_alvo || '').trim(),
      formato: normalizeFormato(form.formato),
      orcamento: Number(form.orcamento) || 0,
      tom_brand: String(form.tom_brand || '').trim(),
    });
    onOpenChange?.(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Só Este Mês</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Altera só esta campanha. A configuração padrão da empresa permanece intacta.
        </p>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label>Público-alvo</Label>
            <Textarea
              value={form.publico_alvo}
              onChange={(e) => setForm((p) => ({ ...p, publico_alvo: e.target.value }))}
              className="min-h-[64px]"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Vídeos</Label>
              <Input
                type="number"
                min={0}
                value={form.formato.num_videos}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    formato: { ...p.formato, num_videos: e.target.value },
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Designs</Label>
              <Input
                type="number"
                min={0}
                value={form.formato.num_designs}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    formato: { ...p.formato, num_designs: e.target.value },
                  }))
                }
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Duração</Label>
            <Input
              value={form.formato.duracao_videos}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  formato: { ...p.formato, duracao_videos: e.target.value },
                }))
              }
            />
          </div>
          <div className="space-y-1">
            <Label>Orçamento</Label>
            <Input
              type="number"
              min={0}
              value={form.orcamento}
              onChange={(e) => setForm((p) => ({ ...p, orcamento: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Tom de marca</Label>
            <Textarea
              value={form.tom_brand}
              onChange={(e) => setForm((p) => ({ ...p, tom_brand: e.target.value }))}
              className="min-h-[64px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange?.(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Salvar para este mês</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
