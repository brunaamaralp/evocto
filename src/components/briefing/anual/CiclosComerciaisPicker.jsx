import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CICLOS_COMERCIAIS,
  mesParaCicloMap,
  normalizeCiclosComerciais,
  validateCiclosComerciais,
} from '@/lib/campanhaAnualSchema';
import { CICLO_HINTS, CICLO_LABELS, MES_LABELS } from '@/lib/campanhaAnual';

const CICLO_COLORS = {
  autoridade: 'bg-sky-100 text-sky-900 border-sky-200',
  vendas: 'bg-amber-100 text-amber-900 border-amber-200',
  engajamento: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  reconhecimento: 'bg-violet-100 text-violet-900 border-violet-200',
};

const CICLO_SHORT = {
  autoridade: 'Aut.',
  vendas: 'Vend.',
  engajamento: 'Eng.',
  reconhecimento: 'Rec.',
};

/**
 * Atribui cada mês (1–12) a um ciclo comercial.
 * Clique no mês cicla: autoridade → vendas → engajamento → reconhecimento → (remove).
 */
export default function CiclosComerciaisPicker({
  value,
  onChange,
  activeCiclo = null,
}) {
  const ciclos = useMemo(() => normalizeCiclosComerciais(value), [value]);
  const map = useMemo(() => mesParaCicloMap(ciclos), [ciclos]);
  const validation = useMemo(
    () => validateCiclosComerciais(ciclos, { requireFullYear: true }),
    [ciclos]
  );

  const setMesCiclo = (mes, ciclo) => {
    const next = normalizeCiclosComerciais(ciclos);
    for (const c of CICLOS_COMERCIAIS) {
      next[c] = next[c].filter((m) => m !== mes);
    }
    if (ciclo) {
      next[ciclo] = [...next[ciclo], mes].sort((a, b) => a - b);
    }
    onChange?.(next);
  };

  const handleMesClick = (mes) => {
    if (activeCiclo) {
      const current = map[mes];
      setMesCiclo(mes, current === activeCiclo ? '' : activeCiclo);
      return;
    }
    const current = map[mes];
    const idx = current ? CICLOS_COMERCIAIS.indexOf(current) : -1;
    const nextCiclo =
      idx < 0
        ? CICLOS_COMERCIAIS[0]
        : idx === CICLOS_COMERCIAIS.length - 1
          ? ''
          : CICLOS_COMERCIAIS[idx + 1];
    setMesCiclo(mes, nextCiclo);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {CICLOS_COMERCIAIS.map((ciclo) => (
          <div
            key={ciclo}
            className={`rounded-lg border p-2.5 text-sm ${CICLO_COLORS[ciclo]}`}
          >
            <div className="font-semibold">{CICLO_LABELS[ciclo]}</div>
            <div className="text-xs opacity-80 mt-0.5">{CICLO_HINTS[ciclo]}</div>
            <div className="text-xs mt-2 font-medium break-words">
              {ciclos[ciclo].length
                ? ciclos[ciclo].map((m) => MES_LABELS[m]).join(', ')
                : '—'}
            </div>
          </div>
        ))}
      </div>

      <div>
        <p className="text-sm text-slate-600 mb-2">
          {activeCiclo
            ? `Clique nos meses para marcar como ${CICLO_LABELS[activeCiclo]}.`
            : 'Clique em cada mês para alternar o ciclo comercial.'}
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((mes) => {
            const ciclo = map[mes];
            return (
              <Button
                key={mes}
                type="button"
                variant="outline"
                className={`h-auto min-h-[3.25rem] py-2.5 px-1.5 flex flex-col gap-0.5 ${
                  ciclo ? CICLO_COLORS[ciclo] : 'bg-white'
                }`}
                onClick={() => handleMesClick(mes)}
              >
                <span className="font-semibold text-sm">{MES_LABELS[mes]}</span>
                <span className="text-[10px] font-normal opacity-80 leading-tight">
                  <span className="sm:hidden">{ciclo ? CICLO_SHORT[ciclo] : 'definir'}</span>
                  <span className="hidden sm:inline">{ciclo ? CICLO_LABELS[ciclo] : 'definir'}</span>
                </span>
              </Button>
            );
          })}
        </div>
      </div>

      {!validation.valid ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {validation.errors.meses_faltando ||
            Object.values(validation.errors)[0] ||
            'Complete a atribuição dos 12 meses.'}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-emerald-700">
          <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
            Ano completo
          </Badge>
          Todos os meses têm ciclo comercial.
        </div>
      )}
    </div>
  );
}
