import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CICLO_LABELS, CICLO_HINTS, MES_LABELS } from '@/lib/campanhaAnual';

/**
 * Modal: Ciclo do plano vs ciclo detectado na ideia — Bruna escolhe.
 */
export default function CicloResolucaoModal({
  open,
  onOpenChange,
  mes = null,
  cicloPlano = '',
  cicloDetectado = '',
  confianca = 0,
  onConfirm,
}) {
  const planoLabel = CICLO_LABELS[cicloPlano] || cicloPlano || '—';
  const detectadoLabel = CICLO_LABELS[cicloDetectado] || cicloDetectado || '—';
  const diverge = Boolean(cicloPlano && cicloDetectado && cicloPlano !== cicloDetectado);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Validar ciclo
            {mes ? ` · ${MES_LABELS[mes] || mes}` : ''}
          </DialogTitle>
          <DialogDescription>
            A ideia sugere um ciclo. Confirme se segue o plano ou o ciclo detectado.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 p-3 space-y-1">
            <p className="text-xs uppercase tracking-wide text-slate-500">Ciclo do plano</p>
            <p className="font-semibold text-slate-900">{planoLabel}</p>
            {cicloPlano && (
              <p className="text-xs text-slate-600">{CICLO_HINTS[cicloPlano]}</p>
            )}
          </div>
          <div className="rounded-lg border border-[#D4CBF5] bg-[#F5F2FC] p-3 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">Detectado</p>
              {confianca > 0 && (
                <Badge variant="outline" className="text-[10px]">
                  {confianca}%
                </Badge>
              )}
            </div>
            <p className="font-semibold text-slate-900">{detectadoLabel}</p>
            {cicloDetectado && (
              <p className="text-xs text-slate-600">{CICLO_HINTS[cicloDetectado]}</p>
            )}
          </div>
        </div>

        {diverge && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-md px-3 py-2">
            Plano e ideia divergem. Escolha qual ciclo vale para este mês.
          </p>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-end">
          {cicloPlano && (
            <Button
              type="button"
              variant={diverge ? 'outline' : 'default'}
              className={!diverge ? 'bg-[#6C47D8] hover:bg-[#5A3BC0] text-white' : ''}
              onClick={() =>
                onConfirm?.({
                  escolha: cicloPlano,
                  ciclo_plano: cicloPlano,
                  ciclo_detectado: cicloDetectado,
                  confianca,
                })
              }
            >
              Usar plano ({planoLabel})
            </Button>
          )}
          {cicloDetectado && (
            <Button
              type="button"
              className="bg-[#6C47D8] hover:bg-[#5A3BC0] text-white"
              onClick={() =>
                onConfirm?.({
                  escolha: cicloDetectado,
                  ciclo_plano: cicloPlano,
                  ciclo_detectado: cicloDetectado,
                  confianca,
                })
              }
            >
              Usar detectado ({detectadoLabel})
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
