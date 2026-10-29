import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertCircle,
  CheckCircle2,
  FileUp,
  Loader2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { friendlyError } from '@/lib/errorMessages';
import {
  EXTRACT_BRIEFING_ACCEPT,
  extractBriefingInicialFromFile,
} from '@/lib/extractBriefingInicialApi';
import { mergeBriefingInicialFromExtract } from '@/lib/extractBriefingInicialSchema';
import BriefingNarrativaAnaliseCard from '@/components/briefing/BriefingNarrativaAnaliseCard';

const FIELD_LABELS = {
  nome: 'Nome',
  nicho_modelo: 'Nicho / modelo',
  proposta_valor: 'Proposta de valor',
  tom_brand: 'Tom de voz',
  identidade_visual: 'Identidade visual',
  publico_alvo: 'Público-alvo',
  canais_venda: 'Canais de venda',
  historico_marketing: 'Histórico de marketing',
  desafios_sazonalidade: 'Desafios / sazonalidade',
  foco_prioritario: 'Foco prioritário',
  observacoes_estrategicas: 'Observações estratégicas',
  restricoes_criativas: 'Restrições criativas',
  orcamento_padrao_mensal: 'Orçamento',
  formato_padrao: 'Formato',
  produtos_linhas: 'Produtos / frentes',
};

const LOADING_STEPS = [
  'Lendo o documento…',
  'Identificando o nicho…',
  'Estruturando o DNA da marca…',
  'Preenchendo o formulário…',
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
  const [elapsedSec, setElapsedSec] = useState(0);
  const [errorHint, setErrorHint] = useState(null);
  const [analise, setAnalise] = useState(null);
  const [avisos, setAvisos] = useState([]);
  const [appliedLabels, setAppliedLabels] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | loading | success | error

  formRef.current = form;

  useEffect(() => {
    if (!autoFocus) return;
    rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [autoFocus]);

  useEffect(() => {
    if (!loading) {
      setLoadingStep(0);
      setElapsedSec(0);
      return undefined;
    }
    const stepId = setInterval(() => {
      setLoadingStep((s) => (s + 1) % LOADING_STEPS.length);
    }, 2200);
    const tickId = setInterval(() => {
      setElapsedSec((s) => s + 1);
    }, 1000);
    return () => {
      clearInterval(stepId);
      clearInterval(tickId);
    };
  }, [loading]);

  const runExtract = async (selected) => {
    if (!selected || loading || disabled) return;
    setLoading(true);
    setStatus('loading');
    setErrorHint(null);
    setAnalise(null);
    setAvisos([]);
    setAppliedLabels([]);
    toast.message('Importando briefing…', {
      description: 'Isso pode levar até cerca de 1 minuto.',
      duration: 4000,
    });

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
      setStatus('success');

      onApply?.(merged, {
        filename: selected.name,
        filled: appliedKeys.length,
        filledKeys: appliedKeys,
        avisos: result.avisos || [],
        analise: result.analise,
        analiseMarkdown: result.analise_markdown || '',
      });

      const successMsg = labels.length
        ? `Pronto. ${labels.length} campo(s) preenchido(s) — revise e salve.`
        : 'Documento lido. Revise a análise e complete o que faltar no formulário.';
      toast.success(successMsg, { duration: 6000 });

      requestAnimationFrame(() => {
        document
          .getElementById('empresa-form-heading')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } catch (err) {
      const rawMsg = String(err?.body?.message || err?.message || '').trim();
      const msg =
        rawMsg.length > 12 && /\s/.test(rawMsg)
          ? rawMsg
          : friendlyError(err?.code || rawMsg || err, 'action');
      setErrorHint(msg);
      setStatus('error');
      if (err?.body?.analise) setAnalise(err.body.analise);
      toast.error(msg, {
        description: 'Você ainda pode preencher o DNA manualmente abaixo.',
        duration: 8000,
      });
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
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
        aria-busy={loading}
        className={`rounded-2xl border px-4 py-5 transition-colors ${
          dragOver
            ? 'border-[#B80015] bg-[#FFF7F4]'
            : status === 'error'
              ? 'border-red-200 bg-white'
              : status === 'success'
                ? 'border-[#C8E6C9] bg-white'
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
                <p
                  className="mt-1 truncate text-xs text-[#5B5680]"
                  title={file.name}
                >
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
                  {hasResult || status === 'error'
                    ? 'Trocar arquivo'
                    : 'Escolher arquivo'}
                </>
              )}
            </Button>
          </div>
        </div>

        {loading ? (
          <div
            role="status"
            className="mt-4 rounded-xl border border-[#E8E4F4] bg-[#F8F6FC] px-3 py-3 text-sm text-[#5B5680]"
          >
            <div className="flex items-center gap-2">
              <Loader2
                className="h-4 w-4 shrink-0 animate-spin text-[#B80015]"
                aria-hidden
              />
              <span className="font-medium text-[#1A1210]">
                {LOADING_STEPS[loadingStep]}
              </span>
            </div>
            <p className="mt-1.5 text-xs text-[#9A94B0]">
              {elapsedSec}s decorridos · em geral termina em menos de 1 min.
              Não feche esta página.
            </p>
          </div>
        ) : null}

        {errorHint && !loading ? (
          <div
            role="alert"
            className="mt-3 flex gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-900"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div>
              <p className="font-medium">Não foi possível importar</p>
              <p className="mt-0.5 text-red-800">{errorHint}</p>
              <p className="mt-1.5 text-xs text-red-700/90">
                Tente TXT/DOCX, um PDF com texto selecionável, ou preencha o
                DNA manualmente abaixo.
              </p>
            </div>
          </div>
        ) : null}

        {status === 'success' && !loading ? (
          <div
            role="status"
            className="mt-3 flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-950"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div>
              <p className="font-medium">
                {appliedLabels.length
                  ? `${appliedLabels.length} campo(s) aplicados ao formulário`
                  : 'Análise pronta — revise o formulário'}
              </p>
              {appliedLabels.length > 0 ? (
                <p className="mt-1 text-xs text-emerald-900/80">
                  {appliedLabels.join(' · ')}
                </p>
              ) : null}
              <p className="mt-1.5 text-xs text-emerald-900/80">
                Role até o DNA, ajuste o que precisar e salve o briefing.
              </p>
            </div>
          </div>
        ) : null}
      </section>

      <BriefingNarrativaAnaliseCard analise={analise} avisos={avisos} />
    </div>
  );
}
