import { useRef, useState } from 'react';
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
 */
export default function BriefingInicialFileImport({
  form,
  onApply,
  clientName = '',
  disabled = false,
}) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState(null);

  const clearFile = () => {
    setFile(null);
    setHint(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handlePick = (e) => {
    const next = e.target.files?.[0] || null;
    setFile(next);
    setHint(null);
  };

  const handleExtract = async () => {
    if (!file || loading || disabled) return;
    setLoading(true);
    setHint(null);
    try {
      const result = await extractBriefingInicialFromFile(file, { clientName });
      const merged = mergeBriefingInicialFromExtract(
        form,
        result.form || { empresa: result.empresa },
        clientName
      );
      onApply?.(merged, {
        filename: file.name,
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
          `Importado de “${file.name}”. Confira os campos abaixo antes de salvar.`
        );
      }
    } catch (err) {
      toast.error(friendlyError(err, 'action'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-dashed border-[#D4CFE8] bg-[#F8F6FC] px-4 py-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-white border border-[#E8E4F4] p-2">
          <FileUp className="w-4 h-4 text-[#5B5680]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[#18162A]">
            Importar de arquivo
          </p>
          <p className="text-xs text-[#7A7595] mt-0.5">
            PDF, DOCX ou TXT — o sistema lê e preenche o formulário para você
            revisar antes de salvar.
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
          variant="outline"
          size="sm"
          disabled={disabled || loading}
          onClick={() => inputRef.current?.click()}
        >
          Escolher arquivo
        </Button>
        {file ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-[#5B5680] max-w-[220px]">
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
        <Button
          type="button"
          size="sm"
          className="bg-[#18162A] hover:bg-[#2A2740] text-white"
          disabled={!file || loading || disabled}
          onClick={handleExtract}
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              Lendo…
            </>
          ) : (
            'Ler e preencher'
          )}
        </Button>
      </div>

      {hint ? (
        <Alert className="border-emerald-200 bg-emerald-50/80 py-2">
          <AlertDescription className="text-xs text-emerald-900">
            {hint}
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
