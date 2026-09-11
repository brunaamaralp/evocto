import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CICLO_LABELS, MES_LABELS } from '@/lib/campanhaAnual';

/**
 * Ideias opcionais por mês (estratégia + conceito) — input humano antes da IA.
 * Não normaliza/trima a cada tecla (senão espaços finais somem e trava digitação).
 */
export default function BriefingsMesSeedsEditor({
  value = [],
  onChange,
  produtosLinhas = [],
}) {
  const list = Array.isArray(value) ? value : [];

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

  return (
    <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
      <p className="text-sm text-slate-600">
        Opcional: ideias guiam a IA depois. Ciclo já vem do calendário.
      </p>
      {list.map((raw) => {
        const mes = Number(raw?.mes) || 1;
        const est = raw['01_estrategia'] || {};
        const con = raw['02_conceito'] || {};
        const nomeSugerido = raw.nome_campanha_sugerido ?? con.nome_sugerido ?? '';
        return (
          <div key={mes} className="rounded-lg border p-3 space-y-2 bg-white">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900">
                {MES_LABELS[mes]}
              </span>
              {est.ciclo_comercial && (
                <Badge variant="secondary">
                  {CICLO_LABELS[est.ciclo_comercial] || est.ciclo_comercial}
                </Badge>
              )}
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
    </div>
  );
}
