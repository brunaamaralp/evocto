import { useState } from 'react';
import { ChevronDown, Lightbulb, Sparkles } from 'lucide-react';
import { normalizeNarrativaAnalise } from '@/lib/extractBriefingInicialSchema';

const ORIGEM_STYLE = {
  extraido: {
    label: 'No arquivo',
    className: 'bg-[#F1EDE7] text-[#3A5A7A]',
  },
  inferido: {
    label: 'Inferido',
    className: 'bg-[#FFF4E8] text-[#9A5B12]',
  },
  nao_identificavel: {
    label: 'Sem dado',
    className: 'bg-[#F3F2F7] text-[#6B635C]',
  },
};

function OrigemBadge({ origem }) {
  const style = ORIGEM_STYLE[origem] || ORIGEM_STYLE.extraido;
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${style.className}`}
    >
      {style.label}
    </span>
  );
}

function FieldRow({ label, campo }) {
  if (!campo) return null;
  const missing = campo.origem === 'nao_identificavel';
  return (
    <div className="space-y-1 border-b border-[#F0EDF7] py-2.5 last:border-b-0">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-[#9A94B0]">
          {label}
        </p>
        <OrigemBadge origem={campo.origem} />
      </div>
      <p
        className={`text-sm leading-snug ${
          missing ? 'text-[#9A94B0] italic' : 'text-[#1A1210]'
        }`}
      >
        {missing ? 'Não identificado no documento' : campo.valor}
      </p>
      {campo.origem === 'inferido' && campo.justificativa ? (
        <p className="flex items-start gap-1.5 text-xs text-[#9A5B12]">
          <Lightbulb className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
          <span>{campo.justificativa}</span>
        </p>
      ) : null}
    </div>
  );
}

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-[#E8E4F4] bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left hover:bg-[#FAFAFB]"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-[#1A1210]">{title}</span>
        <ChevronDown
          className={`h-4 w-4 text-[#6B635C] transition-transform ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden
        />
      </button>
      {open ? <div className="border-t border-[#E8E4F4] px-3.5 pb-1">{children}</div> : null}
    </div>
  );
}

/**
 * Análise estruturada do motor Narrativa — revisão visual antes de salvar.
 */
export default function BriefingNarrativaAnaliseCard({
  analise = null,
  avisos = [],
}) {
  if (!analise && !(avisos || []).length) return null;

  const a = analise ? normalizeNarrativaAnalise({ analise }) : null;
  const inferredCount = a
    ? [
        a.identidade.nome_negocio,
        a.identidade.nicho_modelo,
        a.identidade.proposta_valor,
        a.identidade.tom_voz,
        a.identidade.identidade_visual,
        a.canais_operacao.canais_venda,
        a.canais_operacao.historico_marketing,
        a.canais_operacao.desafios_sazonalidade,
        a.diretrizes.foco_prioritario,
        a.diretrizes.observacoes_estrategicas,
        ...a.frentes_receita.flatMap((f) => [f.objetivo, f.publico_principal]),
      ].filter((c) => c?.origem === 'inferido').length
    : 0;

  return (
    <section
      aria-labelledby="narrativa-analise-heading"
      className="space-y-3 rounded-2xl border border-[#E8E4F4] bg-[#FAFAFB] px-4 py-4"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg border border-[#E8E4F4] bg-white p-2">
          <Sparkles className="h-4 w-4 text-[#B80015]" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2
            id="narrativa-analise-heading"
            className="text-sm font-semibold text-[#1A1210]"
          >
            Leitura do documento
          </h2>
          <p className="mt-0.5 text-xs text-[#6B635C]">
            Confira o que veio do arquivo e o que foi inferido. Depois ajuste o
            formulário abaixo e salve.
            {inferredCount > 0
              ? ` ${inferredCount} item(ns) inferido(s).`
              : ''}
          </p>
        </div>
      </div>

      {a ? (
        <div className="space-y-2">
          <Section title="1. Identidade & posicionamento">
            <FieldRow label="Nome" campo={a.identidade.nome_negocio} />
            <FieldRow label="Nicho / modelo" campo={a.identidade.nicho_modelo} />
            <FieldRow
              label="Proposta de valor"
              campo={a.identidade.proposta_valor}
            />
            <FieldRow label="Tom de voz" campo={a.identidade.tom_voz} />
            <FieldRow
              label="Identidade visual"
              campo={a.identidade.identidade_visual}
            />
          </Section>

          <Section title="2. Frentes de receita">
            {a.frentes_receita.map((f, i) => (
              <div key={`${f.nome}-${i}`} className="py-2.5 border-b border-[#F0EDF7] last:border-b-0">
                <p className="text-sm font-medium text-[#1A1210] mb-1">
                  {f.nome || `Frente ${i + 1}`}
                </p>
                <FieldRow label="Objetivo" campo={f.objetivo} />
                <FieldRow label="Público" campo={f.publico_principal} />
              </div>
            ))}
          </Section>

          <Section title="3. Canais & histórico" defaultOpen={false}>
            <FieldRow
              label="Canais de venda"
              campo={a.canais_operacao.canais_venda}
            />
            <FieldRow
              label="Histórico de marketing"
              campo={a.canais_operacao.historico_marketing}
            />
            <FieldRow
              label="Desafios / sazonalidade"
              campo={a.canais_operacao.desafios_sazonalidade}
            />
          </Section>

          <Section title="4. Diretrizes" defaultOpen={false}>
            <FieldRow
              label="Foco prioritário"
              campo={a.diretrizes.foco_prioritario}
            />
            <FieldRow
              label="Observações estratégicas"
              campo={a.diretrizes.observacoes_estrategicas}
            />
          </Section>
        </div>
      ) : null}

      {Array.isArray(avisos) && avisos.length ? (
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 px-3 py-2.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-amber-800 mb-1.5">
            Atenções
          </p>
          <ul className="space-y-1 text-xs text-amber-900">
            {avisos.slice(0, 6).map((item) => (
              <li key={String(item)} className="leading-snug">
                · {String(item)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
