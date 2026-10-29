/**
 * Prévia da análise estruturada do motor Narrativa (revisão antes de salvar).
 */
export default function BriefingNarrativaAnaliseCard({ markdown = '', avisos = [] }) {
  if (!markdown && !(avisos || []).length) return null;

  return (
    <section
      aria-labelledby="narrativa-analise-heading"
      className="rounded-2xl border border-[#E8E4F4] bg-white px-4 py-4 space-y-3"
    >
      <div>
        <h2
          id="narrativa-analise-heading"
          className="text-sm font-semibold text-[#18162A]"
        >
          Análise Narrativa (revisão)
        </h2>
        <p className="text-xs text-[#7A7595] mt-0.5">
          Extraído do documento. Itens com [Inferido] foram deduzidos pelo contexto —
          confira antes de salvar no formulário.
        </p>
      </div>
      {markdown ? (
        <pre className="whitespace-pre-wrap break-words rounded-xl bg-[#F8F6FC] px-3 py-3 text-xs leading-relaxed text-[#3A3650] font-sans max-h-80 overflow-y-auto">
          {markdown}
        </pre>
      ) : null}
      {Array.isArray(avisos) && avisos.length ? (
        <ul className="text-xs text-amber-800 space-y-1 list-disc pl-4">
          {avisos.slice(0, 6).map((a) => (
            <li key={String(a)}>{String(a)}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
