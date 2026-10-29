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

function Section({ id, title, description, children }) {
  return (
    <div className="space-y-4 border-t border-[#EFEAE6] pt-5 first:border-t-0 first:pt-0">
      <div>
        <h3 id={id} className="text-sm font-semibold text-[#1A1210]">
          {title}
        </h3>
        {description ? (
          <p className="mt-0.5 text-xs text-[#6B635C]">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

/**
 * Campos do briefing inicial (DNA da empresa) — alinhados ao modelo Narrativa.
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

  const textField = ({
    id,
    label,
    key,
    rows = 0,
    placeholder = '',
    errorKey = key,
  }) => (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="inline-flex items-center">
        {label}
        {inferredNote(emp[key])}
      </Label>
      {rows > 0 ? (
        <Textarea
          id={id}
          rows={rows}
          value={emp[key] || ''}
          placeholder={placeholder}
          onChange={(e) => setEmpresaField(key, e.target.value)}
        />
      ) : (
        <Input
          id={id}
          value={emp[key] || ''}
          placeholder={placeholder}
          onChange={(e) => setEmpresaField(key, e.target.value)}
        />
      )}
      <FieldHint>{errors[errorKey]}</FieldHint>
    </div>
  );

  return (
    <section
      className="space-y-5 rounded-2xl border border-[#E8E4F4] bg-white px-4 py-5 sm:px-5"
      data-section="empresa"
      aria-labelledby="empresa-form-heading"
    >
      <div>
        <h2
          id="empresa-form-heading"
          className="text-base font-semibold text-[#1A1210]"
        >
          DNA da empresa
        </h2>
        <p className="mt-0.5 text-sm text-[#6B635C]">
          {imported
            ? 'Revise e ajuste o que a leitura preencheu. Depois salve o briefing.'
            : 'Identidade, frentes, canais e diretrizes — base para planejar depois.'}
        </p>
      </div>

      <div className="space-y-5">
        <Section
          id="dna-identidade"
          title="1. Identidade e posicionamento"
          description="Quem é o negócio e como se comunica."
        >
          {textField({ id: 'nome', label: 'Nome do negócio', key: 'nome' })}
          {textField({
            id: 'nicho_modelo',
            label: 'Nicho / modelo de negócio',
            key: 'nicho_modelo',
            placeholder: 'Ex.: serviços B2B, varejo, educação…',
          })}
          {textField({
            id: 'proposta_valor',
            label: 'Proposta de valor',
            key: 'proposta_valor',
            rows: 3,
          })}
          {textField({ id: 'tom', label: 'Tom de voz', key: 'tom_brand' })}
          {textField({
            id: 'identidade_visual',
            label: 'Identidade visual / estética',
            key: 'identidade_visual',
            rows: 2,
          })}
        </Section>

        <Section
          id="dna-publico-frentes"
          title="2. Público e frentes de receita"
          description="Para quem fala e o que vende / entrega."
        >
          {textField({
            id: 'publico',
            label: 'Público-alvo (consolidado)',
            key: 'publico_alvo',
            rows: 3,
          })}
          <div className="space-y-2">
            <Label>Produtos / linhas / frentes</Label>
            <ProdutosLinhasEditor
              value={emp.produtos_linhas || []}
              onChange={(produtos_linhas) =>
                setEmpresaField('produtos_linhas', produtos_linhas)
              }
            />
            <FieldHint>{errors.produtos_linhas}</FieldHint>
          </div>
        </Section>

        <Section
          id="dna-canais"
          title="3. Canais e operação"
          description="Como vende hoje e o que já tentou em marketing."
        >
          {textField({
            id: 'canais_venda',
            label: 'Canais de venda',
            key: 'canais_venda',
            rows: 2,
          })}
          {textField({
            id: 'historico_marketing',
            label: 'Histórico de marketing / tráfego',
            key: 'historico_marketing',
            rows: 2,
          })}
          {textField({
            id: 'desafios_sazonalidade',
            label: 'Desafios e sazonalidade',
            key: 'desafios_sazonalidade',
            rows: 2,
          })}
        </Section>

        <Section
          id="dna-diretrizes"
          title="4. Diretrizes e entrega"
          description="Prioridades estratégicas e formato operacional do contrato."
        >
          {textField({
            id: 'foco_prioritario',
            label: 'Foco prioritário',
            key: 'foco_prioritario',
            rows: 2,
          })}
          {textField({
            id: 'observacoes_estrategicas',
            label: 'Observações estratégicas',
            key: 'observacoes_estrategicas',
            rows: 3,
          })}
          {textField({
            id: 'restricoes',
            label: 'Restrições criativas',
            key: 'restricoes_criativas',
            rows: 2,
            placeholder: 'O que não fazer na comunicação',
          })}

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
            <p className="mb-2 text-sm font-medium text-[#1A1210]">
              Formato mensal
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Vídeos</Label>
                <Input
                  type="number"
                  min={0}
                  value={emp.formato_padrao?.num_videos ?? 0}
                  onChange={(e) =>
                    setFormato('num_videos', Number(e.target.value))
                  }
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
        </Section>
      </div>
    </section>
  );
}
