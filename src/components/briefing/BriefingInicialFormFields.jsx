import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import ProdutosLinhasEditor from '@/components/briefing/anual/ProdutosLinhasEditor';

function FieldHint({ children }) {
  if (!children) return null;
  return <p className="text-xs text-red-600">{children}</p>;
}

function isInferred(value) {
  return /^\[?\s*inferido\s*\]?/i.test(String(value || '').trim());
}

/**
 * Campos do briefing inicial (DNA da empresa).
 */
export default function BriefingInicialFormFields({
  form,
  onChange,
  errors = {},
  imported = false,
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

  const inferredNote = (value) =>
    isInferred(value) ? (
      <span className="ml-1.5 rounded-md bg-[#FFF4E8] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#9A5B12]">
        Inferido
      </span>
    ) : null;

  return (
    <section
      className="space-y-5 rounded-2xl border border-[#E8E4F4] bg-white px-4 py-5 sm:px-5"
      data-section="empresa"
      aria-labelledby="empresa-form-heading"
    >
      <div>
        <h2
          id="empresa-form-heading"
          className="text-base font-semibold text-[#18162A]"
        >
          DNA da empresa
        </h2>
        <p className="mt-0.5 text-sm text-[#7A7595]">
          {imported
            ? 'Revise e ajuste o que a leitura preencheu. Depois salve o briefing.'
            : 'Público, tom, formato e produtos — base para planejar depois.'}
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="nome" className="inline-flex items-center">
            Nome da empresa
            {inferredNote(emp.nome)}
          </Label>
          <Input
            id="nome"
            value={emp.nome || ''}
            onChange={(e) => setEmpresaField('nome', e.target.value)}
          />
          <FieldHint>{errors.nome}</FieldHint>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="publico" className="inline-flex items-center">
            Público-alvo
            {inferredNote(emp.publico_alvo)}
          </Label>
          <Textarea
            id="publico"
            rows={3}
            value={emp.publico_alvo || ''}
            onChange={(e) => setEmpresaField('publico_alvo', e.target.value)}
          />
          <FieldHint>{errors.publico_alvo}</FieldHint>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tom" className="inline-flex items-center">
            Tom de marca
            {inferredNote(emp.tom_brand)}
          </Label>
          <Input
            id="tom"
            value={emp.tom_brand || ''}
            onChange={(e) => setEmpresaField('tom_brand', e.target.value)}
          />
          <FieldHint>{errors.tom_brand}</FieldHint>
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
          <FieldHint>{errors.orcamento_padrao_mensal}</FieldHint>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-[#18162A]">
            Formato mensal
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Vídeos</Label>
              <Input
                type="number"
                min={0}
                value={emp.formato_padrao?.num_videos ?? 0}
                onChange={(e) => setFormato('num_videos', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Designs</Label>
              <Input
                type="number"
                min={0}
                value={emp.formato_padrao?.num_designs ?? 0}
                onChange={(e) =>
                  setFormato('num_designs', Number(e.target.value))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Duração</Label>
              <Input
                value={emp.formato_padrao?.duracao_videos || ''}
                onChange={(e) => setFormato('duracao_videos', e.target.value)}
                placeholder="30-45s"
              />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="restricoes" className="inline-flex items-center">
            Restrições criativas
            {inferredNote(emp.restricoes_criativas)}
          </Label>
          <Textarea
            id="restricoes"
            rows={3}
            value={emp.restricoes_criativas || ''}
            onChange={(e) =>
              setEmpresaField('restricoes_criativas', e.target.value)
            }
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
          <FieldHint>{errors.produtos_linhas}</FieldHint>
        </div>
      </div>
    </section>
  );
}
