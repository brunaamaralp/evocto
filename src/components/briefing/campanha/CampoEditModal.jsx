import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

const FIELD_LABELS = {
  nome_campanha: 'Nome da Campanha',
  objetivo: 'Objetivo Comercial',
  acoes_comerciais: 'Ações Comerciais',
  talento_locacao: 'Quem Aparece / Locação',
  data_gravacao_inicio: 'Data de Gravação (início)',
  data_gravacao_fim: 'Data de Gravação (fim)',
  data_gravacao_texto: 'Data de Gravação',
};

/**
 * Micro-modal para editar um campo detectado no review.
 */
export default function CampoEditModal({
  open,
  onOpenChange,
  fieldKey,
  detectedValue = '',
  currentValue = '',
  onSave,
}) {
  const [value, setValue] = useState(currentValue || '');
  const isDate = fieldKey === 'data_gravacao_inicio' || fieldKey === 'data_gravacao_fim';
  const isLong =
    fieldKey === 'acoes_comerciais' ||
    fieldKey === 'objetivo' ||
    fieldKey === 'talento_locacao';

  React.useEffect(() => {
    if (open) setValue(currentValue || '');
  }, [open, currentValue]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar: {FIELD_LABELS[fieldKey] || fieldKey}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          {detectedValue ? (
            <div className="rounded-md bg-slate-50 border p-3 text-sm">
              <p className="text-slate-500 mb-1">Detectado:</p>
              <p className="text-slate-800">&quot;{detectedValue}&quot;</p>
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label>Novo valor</Label>
            {isLong ? (
              <Textarea
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="min-h-[96px]"
              />
            ) : (
              <Input
                type={isDate ? 'date' : 'text'}
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange?.(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              onSave?.(value);
              onOpenChange?.(false);
            }}
          >
            Salvar Edição
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
