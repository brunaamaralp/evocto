import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { CICLO_LABELS, MES_LABELS } from '@/lib/campanhaAnual';
import {
  inferCicloComercialFromText,
  resolveCicloComercial,
} from '@/lib/cicloComercialDetection';
import CicloResolucaoModal from '@/components/briefing/CicloResolucaoModal';

/**
 * Ideias opcionais por mês — ideação livre; ciclo pode ser detectado depois.
 */
export default function BriefingsMesSeedsEditor({
  value = [],
  onChange,
  produtosLinhas = [],
}) {
  const list = Array.isArray(value) ? value : [];
  const [resolucao, setResolucao] = useState(null);

  const updateMes = (mes, patch) => {
    const next = list.map((item) => {
      const itemMes = Number(item?.mes);
      if (itemMes !== mes) return item;
      return {
        ...item,
        ...patch,
        mes: itemMes,
        '01_estrategia': {
          ...(item['01_estrategia'] || {}),
          ...(patch['01_estrategia'] || {}),
        },
        '02_conceito': {
          ...(item['02_conceito'] || {}),
          ...(patch['02_conceito'] || {}),
        },
      };
    });
    onChange?.(next);
  };

  const openDetect = (raw) => {
    const mes = Number(raw?.mes) || 1;
    const est = raw['01_estrategia'] || {};
    const con = raw['02_conceito'] || {};
    const inferred = inferCicloComercialFromText(
      raw.nome_campanha_sugerido,
      con.nome_sugerido,
      con.ideia_central,
      est.objetivo_especifico,
      est.produto_focal
    );
    if (!inferred.ciclo) {
      toast.message('Escreva a ideia primeiro — ainda sem ciclo detectável');
      return;
    }
    const plano =
      raw.ciclo_plano || est.ciclo_comercial || raw.ciclo_final || '';
    setResolucao({
      mes,
      cicloPlano: plano,
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
      ciclo_plano: resolved.ciclo_plano,
      ciclo_detectado: resolved.ciclo_detectado,
      ciclo_final: resolved.ciclo_final,
      ciclo_override: resolved.ciclo_override,
      ciclo_confianca: confianca,
      '01_estrategia': { ciclo_comercial: resolved.ciclo_comercial },
    });
    setResolucao(null);
    toast.success(
      resolved.ciclo_override
        ? `Ciclo do mês: ${CICLO_LABELS[resolved.ciclo_final]} (diferente do plano)`
        : `Ciclo do mês: ${CICLO_LABELS[resolved.ciclo_final]}`
    );
  };

  return (
    <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
      <p className="text-sm text-slate-600">
        Ideação livre por mês. Depois, detecte o ciclo a partir da ideia (ou use o do
        calendário).
      </p>
      {list.map((raw) => {
        const mes = Number(raw?.mes) || 1;
        const est = raw['01_estrategia'] || {};
        const con = raw['02_conceito'] || {};
        const nomeSugerido = raw.nome_campanha_sugerido ?? con.nome_sugerido ?? '';
        const cicloShow =
          raw.ciclo_final || est.ciclo_comercial || raw.ciclo_plano || '';
        return (
          <div key={mes} className="rounded-lg border p-3 space-y-2 bg-white">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-900">
                {MES_LABELS[mes]}
              </span>
              {cicloShow && (
                <Badge variant="secondary">
                  {CICLO_LABELS[cicloShow] || cicloShow}
                  {raw.ciclo_override ? ' · override' : ''}
                </Badge>
              )}
              {raw.ciclo_detectado && raw.ciclo_detectado !== cicloShow && (
                <Badge variant="outline" className="text-[10px]">
                  Detectado: {CICLO_LABELS[raw.ciclo_detectado]}
                </Badge>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-auto h-7 text-xs"
                onClick={() => openDetect(raw)}
              >
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                Detectar ciclo
              </Button>
            </div>

            <div className="grid sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Nome sugerido</Label>
                <Input
                  value={nomeSugerido}
                  onChange={(e) =>
                    updateMes(mes, {
                      nome_campanha_sugerido: e.target.value,
                      '02_conceito': { nome_sugerido: e.target.value },
                    })
                  }
                  placeholder="Ex.: Pausa para Você"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Produto focal</Label>
                <Input
                  list={`produtos-mes-${mes}`}
                  value={est.produto_focal ?? ''}
                  onChange={(e) =>
                    updateMes(mes, {
                      '01_estrategia': { produto_focal: e.target.value },
                    })
                  }
                  placeholder="Linha ou variado"
                />
                <datalist id={`produtos-mes-${mes}`}>
                  {produtosLinhas.map((p) => (
                    <option key={p.id || p.nome} value={p.nome} />
                  ))}
                  <option value="Variado" />
                </datalist>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Objetivo específico</Label>
              <Textarea
                value={est.objetivo_especifico ?? ''}
                onChange={(e) =>
                  updateMes(mes, {
                    '01_estrategia': { objetivo_especifico: e.target.value },
                  })
                }
                placeholder="Educação, conversão, comunidade…"
                className="min-h-[56px]"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Ideia central</Label>
              <Input
                value={con.ideia_central ?? ''}
                onChange={(e) =>
                  updateMes(mes, {
                    '02_conceito': { ideia_central: e.target.value },
                  })
                }
                placeholder="Conceito em uma frase"
              />
            </div>
          </div>
        );
      })}

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
