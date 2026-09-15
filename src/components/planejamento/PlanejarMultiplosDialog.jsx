import { useEffect, useMemo, useState } from 'react';
import { Layers, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  MULTIPLOS_MAX,
  MULTIPLOS_MIN,
  listEligibleEmptyMonths,
  savePlanejarMultiplosBatch,
  validateMultiplosSelection,
} from '@/lib/planejarMultiplos';
import { MES_LABELS_CURTOS } from '@/lib/panoramaAnual';

/**
 * PI-4 — seleciona 3–5 meses vazios e grava ideias em batch.
 */
export default function PlanejarMultiplosDialog({
  open,
  onOpenChange,
  clientId,
  agencyId,
  userId = null,
  ano,
  months = [],
  onSaved,
}) {
  const year = Number(ano) || new Date().getFullYear();
  const eligible = useMemo(() => listEligibleEmptyMonths(months), [months]);

  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setSelected([]);
    setDrafts({});
    setError(null);
    setSaving(false);
  }, [open]);

  const toggleMes = (mes) => {
    setSelected((prev) => {
      if (prev.includes(mes)) return prev.filter((m) => m !== mes);
      if (prev.length >= MULTIPLOS_MAX) return prev;
      return [...prev, mes].sort((a, b) => a - b);
    });
  };

  const selection = validateMultiplosSelection(selected);

  const goCanvas = () => {
    if (!selection.valid) {
      setError(selection.error);
      return;
    }
    setError(null);
    setDrafts((prev) => {
      const next = { ...prev };
      for (const mes of selection.meses) {
        if (!next[mes]) {
          next[mes] = {
            mes,
            titulo: '',
            conceito: '',
            ciclo: '',
          };
        }
      }
      for (const key of Object.keys(next)) {
        if (!selection.meses.includes(Number(key))) delete next[key];
      }
      return next;
    });
    setStep(2);
  };

  const setDraftField = (mes, key, value) => {
    setDrafts((prev) => ({
      ...prev,
      [mes]: { ...prev[mes], mes, [key]: value },
    }));
  };

  const handleSave = async () => {
    if (!clientId || !agencyId) {
      setError('Cliente/agência ausentes');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const list = selection.meses.map((mes) => ({
        mes,
        titulo: drafts[mes]?.titulo || '',
        conceito: drafts[mes]?.conceito || '',
        ciclo: drafts[mes]?.ciclo || '',
      }));
      const result = await savePlanejarMultiplosBatch({
        agencyId,
        clientId,
        ano: year,
        drafts: list,
        userId,
      });
      onSaved?.(result);
      onOpenChange?.(false);
    } catch (err) {
      console.error('[PlanejarMultiplos]', err);
      setError(err?.message || 'Falha ao salvar batch');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Planejar Múltiplos
          </DialogTitle>
          <DialogDescription>
            Escolha de {MULTIPLOS_MIN} a {MULTIPLOS_MAX} meses vazios de {year} e
            rascunhe a ideia de cada um. Eles ficam “planejados” no Panorama.
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Selecionados: {selected.length}/{MULTIPLOS_MAX}
            </p>
            {eligible.length === 0 ? (
              <p className="text-sm text-slate-500">
                Não há meses vazios neste ano. Libere um mês ou mude o ano no
                Panorama.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                {eligible.map((m) => {
                  const active = selected.includes(m.mes);
                  return (
                    <button
                      key={m.mes}
                      type="button"
                      onClick={() => toggleMes(m.mes)}
                      className={[
                        'rounded-xl border px-2 py-3 text-center text-sm font-semibold transition',
                        active
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300',
                      ].join(' ')}
                    >
                      {m.label || MES_LABELS_CURTOS[m.mes]}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {selection.meses.map((mes) => (
              <div
                key={mes}
                className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-2"
              >
                <p className="text-sm font-semibold text-slate-800">
                  {MES_LABELS_CURTOS[mes]} / {year}
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor={`pm-titulo-${mes}`}>Título</Label>
                  <Input
                    id={`pm-titulo-${mes}`}
                    value={drafts[mes]?.titulo || ''}
                    onChange={(e) => setDraftField(mes, 'titulo', e.target.value)}
                    placeholder="Nome da campanha"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`pm-conceito-${mes}`}>Conceito (opcional)</Label>
                  <Textarea
                    id={`pm-conceito-${mes}`}
                    rows={2}
                    value={drafts[mes]?.conceito || ''}
                    onChange={(e) =>
                      setDraftField(mes, 'conceito', e.target.value)
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`pm-ciclo-${mes}`}>Ciclo (opcional)</Label>
                  <Input
                    id={`pm-ciclo-${mes}`}
                    value={drafts[mes]?.ciclo || ''}
                    onChange={(e) => setDraftField(mes, 'ciclo', e.target.value)}
                    placeholder="ex.: atração"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          {step === 2 ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(1)}
              disabled={saving}
            >
              Voltar
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange?.(false)}
            >
              Cancelar
            </Button>
          )}
          {step === 1 ? (
            <Button
              type="button"
              onClick={goCanvas}
              disabled={eligible.length < MULTIPLOS_MIN}
            >
              Continuar
            </Button>
          ) : (
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando…
                </>
              ) : (
                `Salvar ${selection.meses.length} campanhas`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
