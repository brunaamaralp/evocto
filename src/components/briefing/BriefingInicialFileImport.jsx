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
import { friendlyError } from '@/lib/errorMessages';

/**
 * Upload de PDF/DOCX/TXT → extrai DNA → aplica no formulário para revisão.
 * Um clique escolhe o arquivo e já dispara a leitura.
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
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState(null);

  useEffect(() => {
    if (!autoFocus) return;
    rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [autoFocus]);

  const clearFile = () => {
    setFile(null);
    setHint(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const runExtract = async (selected) => {
    if (!selected || loading || disabled) return;
    setLoading(true);
    setHint(null);
    try {
      const result = await extractBriefingInicialFromFile(selected, {
        clientName,
      });
      const merged = mergeBriefingInicialFromExtract(
        form,
        result.form || { empresa: result.empresa },
        clientName
      );
      onApply?.(merged, {
        filename: selected.name,
        filled: result.filled,
        avisos: result.avisos || [],
      });
      const n = Number(result.filled) || 0;
      toast.success(
        n > 0
          ? `${n} campo(s) preenchido(s) a partir do arquivo. Revise e salve.`
          : 'Arquivo lido. Revise o formulário e salve.'
      );
      if (Array.isArray(result.avisos) && result.avisos.length) {
        setHint(result.avisos.slice(0, 3).join(' · '));
      } else {
        setHint(
          `Importado de “${selected.name}”. Confira os campos abaixo antes de salvar.`
        );
      }
    } catch (err) {
      toast.error(friendlyError(err, 'action'));
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
            Envie um PDF, DOCX ou TXT. O sistema lê o conteúdo, preenche o
            formulário e você revisa antes de salvar.
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
              Lendo arquivo…
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

      {hint ? (
        <Alert className="border-emerald-200 bg-emerald-50/80 py-2">
          <AlertDescription className="text-xs text-emerald-900">
            {hint}
          </AlertDescription>
        </Alert>
      ) : (
        <p className="text-xs text-[#9A94B0]">
          Depois da leitura, confira os campos da empresa abaixo e clique em
          salvar.
        </p>
      )}
    </section>
  );
}
