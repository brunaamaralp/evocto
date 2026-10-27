import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ProdutosLinhasEditor from '@/components/briefing/anual/ProdutosLinhasEditor';

/**
 * Campos do briefing inicial (DNA da empresa).
 * Planejamento mês a mês fica no Panorama, após análise deste briefing.
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

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border-[#E8E4F4] shadow-sm" data-section="empresa">
        <CardHeader>
          <CardTitle className="text-lg text-[#18162A]">Empresa</CardTitle>
          <p className="text-sm text-[#7A7595] font-normal">
            Público, tom, formato e produtos — o DNA para analisar antes de planejar.
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
    </div>
  );
}
