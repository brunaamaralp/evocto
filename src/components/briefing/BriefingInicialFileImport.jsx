import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileUp, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import {
  EXTRACT_BRIEFING_ACCEPT,
  extractBriefingInicialFromFile,
} from '@/lib/extractBriefingInicialApi';
import { mergeBriefingInicialFromExtract } from '@/lib/extractBriefingInicialSchema';
import BriefingNarrativaAnaliseCard from '@/components/briefing/BriefingNarrativaAnaliseCard';

const FIELD_LABELS = {
  nome: 'Nome',
  publico_alvo: 'Público-alvo',
  tom_brand: 'Tom de marca',
  orcamento_padrao_mensal: 'Orçamento',
  formato_padrao: 'Formato',
  restricoes_criativas: 'Restrições',
  produtos_linhas: 'Produtos',
};

const LOADING_STEPS = [
  'Lendo o documento…',
  'Identificando o nicho…',
  'Estruturando o DNA da marca…',
];

/**
 * Upload → motor Narrativa → preenche formulário para revisão.
 */
export default function BriefingInicialFileImport({
  form,
  onApply,
  clientName = '',
  disabled = false,
  autoFocus = false,
}) {
  const inputRef = useRef(null);
  const rootRef = useRef(null);
  const formRef = useRef(form);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [errorHint, setErrorHint] = useState(null);
  const [analise, setAnalise] = useState(null);
  const [avisos, setAvisos] = useState([]);
  const [appliedLabels, setAppliedLabels] = useState([]);
  const [dragOver, setDragOver] = useState(false);

  formRef.current = form;

  useEffect(() => {
    if (!autoFocus) return;
    rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [autoFocus]);

  useEffect(() => {
    if (!loading) {
      setLoadingStep(0);
      return undefined;
    }
    const id = setInterval(() => {
      setLoadingStep((s) => (s + 1) % LOADING_STEPS.length);
    }, 2200);
    return () => clearInterval(id);
  }, [loading]);

  const runExtract = async (selected) => {
    if (!selected || loading || disabled) return;
    setLoading(true);
    setErrorHint(null);
    setAnalise(null);
    setAvisos([]);
    setAppliedLabels([]);
    try {
      const result = await extractBriefingInicialFromFile(selected, {
        clientName,
      });
      const filledKeys = result.filled_keys || [];
      const { form: merged, filledKeys: appliedKeys } =
        mergeBriefingInicialFromExtract(
          formRef.current,
          {
            ...(result.form || { empresa: result.empresa }),
            analise: result.analise,
            empresa: result.empresa || result.form?.empresa,
          },
          clientName,
          { filledKeys }
        );

      setAnalise(result.analise || null);
      setAvisos(result.avisos || []);
      const labels = appliedKeys
        .map((k) => FIELD_LABELS[k] || k)
        .filter(Boolean);
      setAppliedLabels(labels);

      onApply?.(merged, {
        filename: selected.name,
        filled: appliedKeys.length,
        filledKeys: appliedKeys,
        avisos: result.avisos || [],
        analise: result.analise,
        analiseMarkdown: result.analise_markdown || '',
      });

      toast.success(
        labels.length
          ? `Pronto. ${labels.length} campo(s) preenchido(s) — revise e salve.`
          : 'Documento lido. Revise a análise e o formulário.'
      );

      requestAnimationFrame(() => {
        document
          .getElementById('narrativa-analise-heading')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } catch (err) {
      const msg =
        err?.body?.message ||
        err?.message ||
        'Não foi possível ler o arquivo.';
      setErrorHint(msg);
      if (err?.body?.analise) setAnalise(err.body.analise);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const acceptFile = async (next) => {
    if (!next) return;
    setFile(next);
    await runExtract(next);
  };

  const handlePick = async (e) => {
    await acceptFile(e.target.files?.[0] || null);
  };

  const onDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled || loading) return;
    await acceptFile(e.dataTransfer.files?.[0] || null);
  };

  const hasResult = Boolean(analise) || appliedLabels.length > 0;

  return (
    <div className="space-y-4" ref={rootRef} id="briefing-file-import">
      <section
        aria-labelledby="briefing-file-import-title"
        className={`rounded-2xl border px-4 py-5 transition-colors ${
          dragOver
            ? 'border-[#B80015] bg-[#FFF7F4]'
            : hasResult
              ? 'border-[#E8E4F4] bg-white'
              : 'border-dashed border-[#D4CFE8] bg-[#FAFAFB]'
        }`}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex items-start gap-3">
            <div className="mt-0.5 rounded-xl border border-[#E8E4F4] bg-white p-2.5">
              <Upload className="h-4 w-4 text-[#B80015]" aria-hidden />
            </div>
            <div className="min-w-0">
              <h2
                id="briefing-file-import-title"
                className="text-sm font-semibold text-[#1A1210]"
              >
                Importar de arquivo
              </h2>
              <p className="mt-0.5 text-sm text-[#6B635C]">
                PDF, DOCX ou TXT. Arraste aqui ou escolha o arquivo — a leitura
                preenche o formulário para você revisar.
              </p>
              {file && !loading ? (
                <p className="mt-1 truncate text-xs text-[#5B5680]" title={file.name}>
                  {file.name}
                </p>
              ) : null}
            </div>
          </div>

          <div className="shrink-0">
            <input
              ref={inputRef}
              type="file"
              accept={EXTRACT_BRIEFING_ACCEPT}
              className="sr-only"
              onChange={handlePick}
              disabled={disabled || loading}
            />
            <Button
              type="button"
              className="w-full bg-[#B80015] hover:bg-[#8A0010] text-white sm:w-auto"
              disabled={disabled || loading}
              onClick={() => inputRef.current?.click()}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Lendo…
                </>
              ) : (
                <>
                  <FileUp className="mr-2 h-4 w-4" />
                  {hasResult ? 'Trocar arquivo' : 'Escolher arquivo'}
                </>
              )}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#F8F6FC] px-3 py-2.5 text-sm text-[#5B5680]">
            <Loader2 className="h-4 w-4 animate-spin text-[#B80015]" aria-hidden />
            <span>{LOADING_STEPS[loadingStep]}</span>
            <span className="text-xs text-[#9A94B0]">· até ~1 min</span>
          </div>
        ) : null}

        {errorHint ? (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {errorHint}
          </p>
        ) : null}

        {appliedLabels.length > 0 && !loading ? (
          <p className="mt-3 text-xs text-[#5B5680]">
            Preenchido no formulário:{' '}
            <span className="font-medium text-[#1A1210]">
              {appliedLabels.join(' · ')}
            </span>
          </p>
        ) : null}
      </section>

      <BriefingNarrativaAnaliseCard analise={analise} avisos={avisos} />
    </div>
  );
}
