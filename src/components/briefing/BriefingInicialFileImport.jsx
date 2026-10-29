import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileUp, Loader2, X } from 'lucide-react';
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
  formato_padrao: 'Formato (vídeos/designs)',
  restricoes_criativas: 'Restrições',
  produtos_linhas: 'Produtos/linhas',
};

/**
 * Upload de PDF/DOCX/TXT → motor Narrativa → preenche formulário para revisão.
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
  const [hint, setHint] = useState(null);
  const [errorHint, setErrorHint] = useState(null);
  const [analiseMarkdown, setAnaliseMarkdown] = useState('');
  const [avisos, setAvisos] = useState([]);

  formRef.current = form;

  useEffect(() => {
    if (!autoFocus) return;
    rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [autoFocus]);

  const clearFile = () => {
    setFile(null);
    setHint(null);
    setErrorHint(null);
    setAnaliseMarkdown('');
    setAvisos([]);
    if (inputRef.current) inputRef.current.value = '';
  };

  const runExtract = async (selected) => {
    if (!selected || loading || disabled) return;
    setLoading(true);
    setHint(null);
    setErrorHint(null);
    setAnaliseMarkdown('');
    setAvisos([]);
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

      setAnaliseMarkdown(result.analise_markdown || '');
      setAvisos(result.avisos || []);

      onApply?.(merged, {
        filename: selected.name,
        filled: appliedKeys.length,
        filledKeys: appliedKeys,
        avisos: result.avisos || [],
        analise: result.analise,
        analiseMarkdown: result.analise_markdown || '',
      });

      const labels = appliedKeys
        .map((k) => FIELD_LABELS[k] || k)
        .filter(Boolean);
      toast.success(
        labels.length
          ? `Análise Narrativa pronta. Preenchemos: ${labels.join(', ')}. Revise e salve.`
          : 'Arquivo lido. Revise a análise e o formulário.'
      );

      setHint(
        labels.length
          ? `Campos atualizados: ${labels.join(', ')}. Valores com [Inferido] foram deduzidos — confira.`
          : `Importado de “${selected.name}”. Confira a análise e o formulário.`
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
      if (err?.body?.analise_markdown) {
        setAnaliseMarkdown(err.body.analise_markdown);
      }
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePick = async (e) => {
    const next = e.target.files?.[0] || null;
    if (!next) return;
    setFile(next);
    await runExtract(next);
  };

  return (
    <section
      ref={rootRef}
      id="briefing-file-import"
      aria-labelledby="briefing-file-import-title"
      className={`rounded-2xl border-2 border-dashed px-4 py-5 space-y-4 transition-colors ${
        autoFocus
          ? 'border-[#C02807]/40 bg-[#FFF7F4] ring-2 ring-[#C02807]/20'
          : 'border-[#C02807]/35 bg-[#FFF9F7]'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-xl bg-white border border-[#F0D5CC] p-2.5 shadow-sm">
          <FileUp className="w-5 h-5 text-[#C02807]" />
        </div>
        <div className="min-w-0 flex-1">
          <p
            id="briefing-file-import-title"
            className="text-base font-semibold text-[#18162A]"
          >
            Importar briefing de arquivo
          </p>
          <p className="text-sm text-[#7A7595] mt-1">
            Motor Narrativa: identifica o nicho, extrai o explícito, infere
            lacunas com justificativa e preenche o DNA da marca para você
            revisar.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
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
          className="bg-[#C02807] hover:bg-[#8A1C05] text-white"
          disabled={disabled || loading}
          onClick={() => inputRef.current?.click()}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Lendo e preenchendo… (pode levar até 1 min)
            </>
          ) : (
            <>
              <FileUp className="w-4 h-4 mr-2" />
              Escolher PDF, DOCX ou TXT
            </>
          )}
        </Button>
        {file && !loading ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-[#5B5680] max-w-[260px]">
            <span className="truncate" title={file.name}>
              {file.name}
            </span>
            <button
              type="button"
              className="shrink-0 rounded p-0.5 hover:bg-white"
              onClick={clearFile}
              aria-label="Remover arquivo"
              disabled={loading}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        ) : null}
      </div>

      {errorHint ? (
        <Alert className="border-red-200 bg-red-50 py-2">
          <AlertDescription className="text-xs text-red-800">
            {errorHint}
          </AlertDescription>
        </Alert>
      ) : hint ? (
        <Alert className="border-emerald-200 bg-emerald-50/80 py-2">
          <AlertDescription className="text-xs text-emerald-900">
            {hint}
          </AlertDescription>
        </Alert>
      ) : (
        <p className="text-xs text-[#9A94B0]">
          Prefira TXT/DOCX com texto selecionável. PDF escaneado (só imagem)
          pode falhar.
        </p>
      )}

      <BriefingNarrativaAnaliseCard
        markdown={analiseMarkdown}
        avisos={avisos}
      />
    </section>
  );
}
