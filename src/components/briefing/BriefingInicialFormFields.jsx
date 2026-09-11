import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CiclosComerciaisPicker from '@/components/briefing/anual/CiclosComerciaisPicker';
import BriefingsMesSeedsEditor from '@/components/briefing/anual/BriefingsMesSeedsEditor';
import ProdutosLinhasEditor from '@/components/briefing/anual/ProdutosLinhasEditor';
import { buildBriefingsMesSeeds } from '@/lib/campanhaAnualSchema';
import { MES_OPTIONS, formatPlanPeriod } from '@/lib/campanhaAnual';

/**
 * Campos do briefing inicial (Empresa + plano do ano).
 * Usado no link público e no preenchimento interno da equipe.
 */
export default function BriefingInicialFormFields({
  form,
  onChange,
  errors = {},
}) {
  const emp = form?.empresa || {};

  const setEmpresaField = (key, value) => {
    onChange?.({
      ...form,
      empresa: { ...form.empresa, [key]: value },
    });
  };

  const setFormato = (key, value) => {
    onChange?.({
      ...form,
      empresa: {
        ...form.empresa,
        formato_padrao: { ...form.empresa.formato_padrao, [key]: value },
      },
    });
  };

  const setCiclos = (ciclos) => {
    onChange?.({
      ...form,
      ciclos_comerciais: ciclos,
      briefings_mes: buildBriefingsMesSeeds(
        ciclos,
        form.briefings_mes,
        form.mes_inicio
      ),
    });
  };

  const setPeriodo = (patch) => {
    const next = { ...form, ...patch };
    next.briefings_mes = buildBriefingsMesSeeds(
      next.ciclos_comerciais,
      next.briefings_mes,
      next.mes_inicio
    );
    onChange?.(next);
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border-[#E8E4F4] shadow-sm" data-section="empresa">
        <CardHeader>
          <CardTitle className="text-lg text-[#18162A]">1. Empresa</CardTitle>
          <p className="text-sm text-[#7A7595] font-normal">
            Público, tom, formato e produtos — o DNA que se repete nas campanhas.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome da empresa</Label>
            <Input
              id="nome"
              value={emp.nome || ''}
              onChange={(e) => setEmpresaField('nome', e.target.value)}
            />
            {errors.nome && <p className="text-xs text-red-600">{errors.nome}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="publico">Público-alvo</Label>
            <Textarea
              id="publico"
              rows={3}
              value={emp.publico_alvo || ''}
              onChange={(e) => setEmpresaField('publico_alvo', e.target.value)}
            />
            {errors.publico_alvo && (
              <p className="text-xs text-red-600">{errors.publico_alvo}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tom">Tom de marca</Label>
            <Input
              id="tom"
              value={emp.tom_brand || ''}
              onChange={(e) => setEmpresaField('tom_brand', e.target.value)}
            />
            {errors.tom_brand && (
              <p className="text-xs text-red-600">{errors.tom_brand}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="orcamento">Orçamento mensal padrão (R$)</Label>
            <Input
              id="orcamento"
              type="number"
              min={0}
              value={emp.orcamento_padrao_mensal ?? ''}
              onChange={(e) =>
                setEmpresaField('orcamento_padrao_mensal', e.target.value)
              }
            />
            {errors.orcamento_padrao_mensal && (
              <p className="text-xs text-red-600">{errors.orcamento_padrao_mensal}</p>
            )}
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Vídeos / mês</Label>
              <Input
                type="number"
                min={0}
                value={emp.formato_padrao?.num_videos ?? 0}
                onChange={(e) => setFormato('num_videos', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Designs / mês</Label>
              <Input
                type="number"
                min={0}
                value={emp.formato_padrao?.num_designs ?? 0}
                onChange={(e) => setFormato('num_designs', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Duração vídeos</Label>
              <Input
                value={emp.formato_padrao?.duracao_videos || ''}
                onChange={(e) => setFormato('duracao_videos', e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="restricoes">Restrições criativas</Label>
            <Textarea
              id="restricoes"
              rows={2}
              value={emp.restricoes_criativas || ''}
              onChange={(e) => setEmpresaField('restricoes_criativas', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Produtos / linhas</Label>
            <ProdutosLinhasEditor
              value={emp.produtos_linhas || []}
              onChange={(produtos_linhas) =>
                setEmpresaField('produtos_linhas', produtos_linhas)
              }
            />
            {errors.produtos_linhas && (
              <p className="text-xs text-red-600">{errors.produtos_linhas}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-[#E8E4F4] shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-[#18162A]">2. Plano do ano</CardTitle>
          <p className="text-sm text-[#7A7595] font-normal">
            Defina o início do período (12 meses) e marque o ciclo de cada mês.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
            <div className="space-y-1.5">
              <Label htmlFor="mes_inicio">Início do plano</Label>
              <select
                id="mes_inicio"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.mes_inicio}
                onChange={(e) =>
                  setPeriodo({ mes_inicio: Number(e.target.value) || 1 })
                }
              >
                {MES_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              {errors.mes_inicio && (
                <p className="text-xs text-red-600">{errors.mes_inicio}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ano">Ano de início</Label>
              <Input
                id="ano"
                type="number"
                min={2020}
                max={2100}
                value={form.ano}
                onChange={(e) =>
                  setPeriodo({ ano: Number(e.target.value) || form.ano })
                }
              />
              {errors.ano && <p className="text-xs text-red-600">{errors.ano}</p>}
            </div>
          </div>
          <p className="text-xs text-[#7A7595]">
            Período: {formatPlanPeriod(form.mes_inicio, form.ano)}
          </p>
          <div>
            <Label className="mb-2 block">Ciclos comerciais</Label>
            <CiclosComerciaisPicker
              value={form.ciclos_comerciais}
              onChange={setCiclos}
              mesInicio={form.mes_inicio}
              anoInicio={form.ano}
            />
            {(errors.ciclos_incompletos || errors.meses_faltando) && (
              <p className="text-xs text-red-600 mt-2">
                {errors.ciclos_incompletos ||
                  errors.meses_faltando ||
                  'Complete os ciclos'}
              </p>
            )}
          </div>
          <div>
            <Label className="mb-2 block">Ideias por mês (opcional)</Label>
            <BriefingsMesSeedsEditor
              value={form.briefings_mes}
              onChange={(briefings_mes) => onChange?.({ ...form, briefings_mes })}
              produtosLinhas={emp.produtos_linhas || []}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
