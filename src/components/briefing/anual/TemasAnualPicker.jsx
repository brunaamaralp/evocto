import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { CICLO_LABELS, MES_LABELS } from '@/lib/campanhaAnual';
import {
  calendarYearForPlanMonth,
  countTemasEscolhidos,
  mesParaCicloMap,
  normalizeTemasSugeridos,
  sortByPlanMonth,
} from '@/lib/campanhaAnualSchema';
import {
  inferCicloComercialFromText,
  resolveCicloComercial,
} from '@/lib/cicloComercialDetection';
import CicloResolucaoModal from '@/components/briefing/CicloResolucaoModal';

/**
 * Escolha/edição de temas — ciclo pode ser validado a partir da ideia.
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
  const mapCiclo = mesParaCicloMap(ciclos);
  const [resolucao, setResolucao] = useState(null);

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

  const openDetect = (t) => {
    const mes = Number(t?.mes) || 1;
    const inferred = inferCicloComercialFromText(
      t.titulo,
      t.ideia_central,
      t.produto_focal
    );
    if (!inferred.ciclo) {
      toast.message('Ajuste o tema — ainda sem ciclo detectável');
      return;
    }
    setResolucao({
      mes,
      cicloPlano: t.ciclo_plano || mapCiclo[mes] || t.ciclo || '',
      cicloDetectado: inferred.ciclo,
      confianca: inferred.confianca,
    });
  };

  const applyResolucao = ({ escolha, ciclo_plano, ciclo_detectado, confianca }) => {
    if (!resolucao?.mes) return;
    const resolved = resolveCicloComercial({
      ciclo_plano,
      ciclo_detectado,
      escolha,
      confianca,
    });
    updateMes(resolucao.mes, {
      ciclo: resolved.ciclo_final,
      ciclo_plano: resolved.ciclo_plano,
      ciclo_detectado: resolved.ciclo_detectado,
      ciclo_final: resolved.ciclo_final,
      ciclo_override: resolved.ciclo_override,
      ciclo_confianca: confianca,
      origem: 'humano',
    });
    setResolucao(null);
    toast.success(`Ciclo: ${CICLO_LABELS[resolved.ciclo_final] || resolved.ciclo_final}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600">
          Escolha o tema e, se quiser, valide o ciclo a partir da ideia.
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
          const cicloShow = t.ciclo_final || t.ciclo || '';
          return (
            <div
              key={mes}
              className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4 space-y-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-900">{labelFor(mes)}</span>
                {cicloShow && (
                  <Badge variant="secondary">
                    {CICLO_LABELS[cicloShow] || cicloShow}
                    {t.ciclo_override ? ' · override' : ''}
                  </Badge>
                )}
                {t.origem === 'ia' && <Badge variant="outline">IA</Badge>}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-7 text-xs"
                  onClick={() => openDetect(t)}
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1" />
                  Validar ciclo
                </Button>
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

      <CicloResolucaoModal
        open={Boolean(resolucao)}
        onOpenChange={(open) => {
          if (!open) setResolucao(null);
        }}
        mes={resolucao?.mes}
        cicloPlano={resolucao?.cicloPlano || ''}
        cicloDetectado={resolucao?.cicloDetectado || ''}
        confianca={resolucao?.confianca || 0}
        onConfirm={applyResolucao}
      />
    </div>
  );
}
