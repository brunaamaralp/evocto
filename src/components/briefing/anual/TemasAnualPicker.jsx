import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CICLO_LABELS, MES_LABELS } from '@/lib/campanhaAnual';
import {
  calendarYearForPlanMonth,
  countTemasEscolhidos,
  normalizeTemasSugeridos,
  sortByPlanMonth,
} from '@/lib/campanhaAnualSchema';

/**
 * Escolha/edição de temas sugeridos pela IA (1 principal + 1 alternativa / mês).
 * Edição de texto sem trim a cada tecla.
 */
export default function TemasAnualPicker({
  value = [],
  onChange,
  ciclos = null,
  mesInicio = 1,
  anoInicio = null,
}) {
  const list =
    Array.isArray(value) && value.length > 0
      ? sortByPlanMonth(value, mesInicio)
      : normalizeTemasSugeridos([], ciclos, mesInicio);
  const { escolhidos, total, complete } = countTemasEscolhidos(
    normalizeTemasSugeridos(list, ciclos, mesInicio)
  );

  const labelFor = (mes) => {
    const base = MES_LABELS[mes] || String(mes);
    if (anoInicio == null) return base;
    const y = calendarYearForPlanMonth(mes, mesInicio, anoInicio);
    return `${base}/${String(y).slice(2)}`;
  };

  const updateMes = (mes, patch) => {
    const next = list.map((item) => {
      const itemMes = Number(item?.mes);
      if (itemMes !== mes) return item;
      const merged = { ...item, ...patch, mes: itemMes };
      if (patch.selecionado_id) {
        const opt = (merged.opcoes || []).find((o) => o.id === patch.selecionado_id);
        if (opt) {
          merged.titulo = opt.titulo ?? '';
          merged.ideia_central = opt.ideia_central ?? '';
          merged.produto_focal = opt.produto_focal ?? '';
          merged.selecionado = true;
        }
      }
      return merged;
    });
    onChange?.(next);
  };

  const editChosen = (mes, field, fieldValue) => {
    const next = list.map((item) => {
      const itemMes = Number(item?.mes);
      if (itemMes !== mes) return item;
      const selecionadoId = item.selecionado_id || 'principal';
      const opcoes = (Array.isArray(item.opcoes) ? item.opcoes : []).map((o) =>
        o.id === selecionadoId ? { ...o, [field]: fieldValue } : o
      );
      return {
        ...item,
        [field]: fieldValue,
        opcoes,
        origem: 'humano',
        selecionado: true,
      };
    });
    onChange?.(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600">
          Escolha principal ou alternativa por mês e ajuste o texto se quiser.
        </p>
        <Badge
          className={
            complete
              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
              : 'bg-slate-100 text-slate-700'
          }
          variant="outline"
        >
          {escolhidos}/{total} escolhidos
        </Badge>
      </div>

      <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
        {list.map((t) => {
          const mes = Number(t?.mes) || 1;
          const opcoes = Array.isArray(t.opcoes) ? t.opcoes : [];
          const selecionadoId = t.selecionado_id || 'principal';
          return (
            <div
              key={mes}
              className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4 space-y-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-900">{labelFor(mes)}</span>
                {t.ciclo && (
                  <Badge variant="secondary">
                    {CICLO_LABELS[t.ciclo] || t.ciclo}
                  </Badge>
                )}
                {t.origem === 'ia' && <Badge variant="outline">IA</Badge>}
              </div>

              <div className="grid sm:grid-cols-2 gap-2">
                {opcoes.map((opt) => {
                  const selected = selecionadoId === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updateMes(mes, { selecionado_id: opt.id })}
                      className={`text-left rounded-lg border p-3 transition-colors ${
                        selected
                          ? 'border-[#6C47D8] bg-[#F5F2FC] ring-1 ring-[#6C47D8]'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-1">
                        {opt.id === 'principal' ? 'Principal' : 'Alternativa'}
                      </div>
                      <div className="font-medium text-slate-900 text-sm line-clamp-2">
                        {opt.titulo || 'Sem título'}
                      </div>
                      {opt.ideia_central && (
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                          {opt.ideia_central}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="grid sm:grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                <div className="space-y-1">
                  <Label className="text-xs">Título do tema</Label>
                  <Input
                    value={t.titulo ?? ''}
                    onChange={(e) => editChosen(mes, 'titulo', e.target.value)}
                    placeholder="Nome da campanha"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Produto focal</Label>
                  <Input
                    value={t.produto_focal ?? ''}
                    onChange={(e) => editChosen(mes, 'produto_focal', e.target.value)}
                    placeholder="Linha / produto"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ideia central</Label>
                <Textarea
                  rows={2}
                  value={t.ideia_central ?? ''}
                  onChange={(e) => editChosen(mes, 'ideia_central', e.target.value)}
                  placeholder="Conceito em 1–2 frases"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
