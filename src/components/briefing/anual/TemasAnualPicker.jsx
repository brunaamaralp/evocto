import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CICLO_LABELS, MES_LABELS } from '@/lib/campanhaAnual';
import {
  countTemasEscolhidos,
  normalizeTemaMesSugestao,
  normalizeTemasSugeridos,
} from '@/lib/campanhaAnualSchema';

/**
 * Escolha/edição de temas sugeridos pela IA (1 principal + 1 alternativa / mês).
 */
export default function TemasAnualPicker({ value = [], onChange, ciclos = null }) {
  const list = normalizeTemasSugeridos(value, ciclos);
  const { escolhidos, total, complete } = countTemasEscolhidos(list);

  const updateMes = (mes, patch) => {
    const next = list.map((item) => {
      const n = normalizeTemaMesSugestao(item);
      if (n.mes !== mes) return n;
      const merged = normalizeTemaMesSugestao({ ...n, ...patch, mes });
      if (patch.selecionado_id) {
        const opt = merged.opcoes.find((o) => o.id === patch.selecionado_id);
        if (opt) {
          merged.titulo = opt.titulo;
          merged.ideia_central = opt.ideia_central;
          merged.produto_focal = opt.produto_focal;
        }
      }
      return merged;
    });
    onChange?.(next);
  };

  const editChosen = (mes, field, fieldValue) => {
    const next = list.map((item) => {
      const n = normalizeTemaMesSugestao(item);
      if (n.mes !== mes) return n;
      const opcoes = n.opcoes.map((o) =>
        o.id === n.selecionado_id ? { ...o, [field]: fieldValue } : o
      );
      return normalizeTemaMesSugestao({
        ...n,
        [field]: fieldValue,
        opcoes,
        origem: 'humano',
      });
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
        {list.map((tema) => {
          const t = normalizeTemaMesSugestao(tema);
          return (
            <div
              key={t.mes}
              className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4 space-y-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-900">{MES_LABELS[t.mes]}</span>
                {t.ciclo && (
                  <Badge variant="secondary">
                    {CICLO_LABELS[t.ciclo] || t.ciclo}
                  </Badge>
                )}
                {t.origem === 'ia' && <Badge variant="outline">IA</Badge>}
              </div>

              <div className="grid sm:grid-cols-2 gap-2">
                {t.opcoes.map((opt) => {
                  const selected = t.selecionado_id === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updateMes(t.mes, { selecionado_id: opt.id })}
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
                    value={t.titulo || ''}
                    onChange={(e) => editChosen(t.mes, 'titulo', e.target.value)}
                    placeholder="Nome da campanha"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Produto focal</Label>
                  <Input
                    value={t.produto_focal || ''}
                    onChange={(e) => editChosen(t.mes, 'produto_focal', e.target.value)}
                    placeholder="Linha / produto"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ideia central</Label>
                <Textarea
                  rows={2}
                  value={t.ideia_central || ''}
                  onChange={(e) => editChosen(t.mes, 'ideia_central', e.target.value)}
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
