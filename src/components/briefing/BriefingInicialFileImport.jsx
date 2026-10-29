import { useEffect, useId, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Button } from '@/components/ui/button';
import {
  AlertCircle,
  CheckCircle2,
  FileUp,
  Loader2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { getAccount } from '@/api/appwriteClient';
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

const UI_VERSION = 'Import UI v8';

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
  const inputId = useId();
  const inputRef = useRef(null);
  const rootRef = useRef(null);
  const formRef = useRef(form);
  const busyRef = useRef(false);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [errorHint, setErrorHint] = useState(null);
  const [analise, setAnalise] = useState(null);
  const [avisos, setAvisos] = useState([]);
  const [appliedLabels, setAppliedLabels] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState('idle');
  const [successText, setSuccessText] = useState('');
  const [logs, setLogs] = useState([]);

  formRef.current = form;

  const log = (line) => {
    const stamp = new Date().toLocaleTimeString('pt-BR');
    const entry = `${stamp} · ${line}`;
    console.info('[BriefingImport]', line);
    setLogs((prev) => [...prev.slice(-12), entry]);
  };

  useEffect(() => {
    if (!autoFocus) return;
    rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [autoFocus]);

  useEffect(() => {
    if (!loading) {
      setElapsedSec(0);
      return undefined;
    }
    const tickId = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(tickId);
  }, [loading]);

  const fail = (err) => {
    const rawMsg = String(err?.body?.message || err?.message || '').trim();
    const msg =
      rawMsg.length > 12 && /\s/.test(rawMsg)
        ? rawMsg
        : friendlyError(err?.code || rawMsg || err, 'action');
    log(`ERRO: ${msg}`);
    flushSync(() => {
      setErrorHint(msg);
      setStatus('error');
      setLoading(false);
    });
    if (err?.body?.analise) setAnalise(err.body.analise);
    try {
      toast.error(msg, { duration: 12000 });
    } catch {
      /* ignore */
    }
  };

  const runExtract = async (selected) => {
    log(`Arquivo recebido: ${selected?.name || '(vazio)'} (${selected?.size || 0} bytes)`);

    if (!selected) {
      fail({ message: 'Nenhum arquivo foi selecionado.' });
      return;
    }
    if (disabled) {
      fail({
        message:
          'A importação está desabilitada (briefing concluído ou salvando).',
      });
      return;
    }
    if (busyRef.current) {
      log('Ignorado: já há uma importação em andamento');
      fail({ message: 'Já há uma importação em andamento. Aguarde.' });
      return;
    }

    busyRef.current = true;
    flushSync(() => {
      setFile(selected);
      setLoading(true);
      setStatus('loading');
      setErrorHint(null);
      setAnalise(null);
      setAvisos([]);
      setAppliedLabels([]);
      setSuccessText('');
    });
    log('UI: status=loading');

    try {
      toast.message('Importando briefing…', { duration: 6000 });
    } catch {
      /* ignore */
    }

    try {
      log('Chamando API de extração…');
      const result = await extractBriefingInicialFromFile(selected, {
        clientName,
      });
      log(
        `API ok · filled_keys=${(result.filled_keys || []).join(',') || '(nenhuma)'}`
      );

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

      const labels = appliedKeys
        .map((k) => FIELD_LABELS[k] || k)
        .filter(Boolean);
      const successMsg = labels.length
        ? `${labels.length} campo(s) preenchidos. Revise o DNA e salve.`
        : 'Documento lido. Revise a análise e complete o formulário.';

      flushSync(() => {
        setAnalise(result.analise || null);
        setAvisos(result.avisos || []);
        setAppliedLabels(labels);
        setStatus('success');
        setSuccessText(successMsg);
        setLoading(false);
      });
      log(`SUCESSO: ${successMsg}`);

      onApply?.(merged, {
        filename: selected.name,
        filled: appliedKeys.length,
        filledKeys: appliedKeys,
        avisos: result.avisos || [],
        analise: result.analise,
        analiseMarkdown: result.analise_markdown || '',
      });

      try {
        toast.success(successMsg, { duration: 10000 });
      } catch {
        /* ignore */
      }

      document
        .getElementById('empresa-form-heading')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      fail(err);
    } finally {
      busyRef.current = false;
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handlePick = async (e) => {
    const next = e.target.files?.[0] || null;
    log(`onChange do input: ${next ? next.name : 'sem arquivo'}`);
    await runExtract(next);
  };

  const onDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    const next = e.dataTransfer.files?.[0] || null;
    log(`drop: ${next ? next.name : 'sem arquivo'}`);
    await runExtract(next);
  };

  const testApi = async () => {
    log('Diagnóstico: testando sessão + endpoint…');
    flushSync(() => {
      setStatus('loading');
      setLoading(true);
      setErrorHint(null);
    });
    try {
      let jwt = '';
      try {
        const res = await getAccount().createJWT();
        jwt = res?.jwt || '';
        log(jwt ? `JWT ok (${jwt.slice(0, 12)}…)` : 'JWT vazio');
      } catch (err) {
        log(`JWT falhou: ${err?.message || err}`);
        throw Object.assign(new Error('session_required'), {
          code: 'session_required',
          message: `Falha ao criar JWT: ${err?.message || err}`,
        });
      }
      if (!jwt) {
        throw Object.assign(new Error('session_required'), {
          code: 'session_required',
        });
      }

      const res = await fetch('/.netlify/functions/extract-briefing-inicial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          filename: 'diag.txt',
          mimeType: 'text/plain',
          contentBase64: btoa('diagnostico de importacao de briefing inicial'),
          clientName: clientName || 'Diagnostico',
        }),
      });
      const text = await res.text();
      log(`HTTP ${res.status}: ${text.slice(0, 180)}`);
      if (!res.ok) {
        let msg = `Endpoint respondeu ${res.status}`;
        try {
          const body = JSON.parse(text);
          msg = body.message || body.error || msg;
        } catch {
          /* ignore */
        }
        throw Object.assign(new Error(msg), { status: res.status });
      }
      flushSync(() => {
        setStatus('success');
        setSuccessText('Diagnóstico OK — endpoint e sessão funcionam.');
        setLoading(false);
      });
      toast.success('Diagnóstico OK');
    } catch (err) {
      fail(err);
    } finally {
      setLoading(false);
    }
  };

  const hasResult = Boolean(analise) || appliedLabels.length > 0;
  const statusTone =
    status === 'error'
      ? 'border-red-400 bg-red-100 text-red-950'
      : status === 'success'
        ? 'border-emerald-400 bg-emerald-100 text-emerald-950'
        : status === 'loading'
          ? 'border-amber-400 bg-amber-100 text-amber-950'
          : 'border-[#E8E4F4] bg-[#F8F6FC] text-[#5B5680]';

  return (
    <div className="space-y-4" ref={rootRef} id="briefing-file-import">
      {/* Status sempre visível no fluxo da página (não depende de portal/toast) */}
      <div
        role={status === 'error' ? 'alert' : 'status'}
        className={`rounded-xl border-2 px-4 py-3 ${statusTone}`}
        data-import-status={status}
      >
        <p className="text-sm font-bold">
          {status === 'loading'
            ? `Importando… ${elapsedSec}s`
            : status === 'error'
              ? 'Importação falhou'
              : status === 'success'
                ? 'Importação ok'
                : 'Aguardando arquivo'}
        </p>
        <p className="mt-1 text-sm break-words">
          {status === 'loading'
            ? 'Lendo o documento e montando o DNA. Não feche a página.'
            : status === 'error'
              ? errorHint || 'Erro desconhecido'
              : status === 'success'
                ? successText
                : 'Escolha um PDF, DOCX ou TXT para começar.'}
        </p>
      </div>

      <section
        aria-labelledby="briefing-file-import-title"
        aria-busy={loading}
        className={`rounded-2xl border px-4 py-5 transition-colors ${
          dragOver
            ? 'border-[#B80015] bg-[#FFF7F4]'
            : status === 'error'
              ? 'border-red-300 bg-red-50'
              : status === 'success'
                ? 'border-emerald-300 bg-emerald-50'
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
                PDF, DOCX ou TXT. Arraste aqui ou escolha o arquivo.
              </p>
              <p className="mt-2 inline-block rounded-md bg-[#B80015] px-2 py-1 text-xs font-bold uppercase tracking-wide text-white">
                {UI_VERSION}
              </p>
              {file ? (
                <p className="mt-1 truncate text-xs font-medium text-[#5B5680]">
                  Arquivo: {file.name}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            <input
              id={inputId}
              ref={inputRef}
              type="file"
              accept={EXTRACT_BRIEFING_ACCEPT}
              className="sr-only"
              onChange={handlePick}
            />
            <label
              htmlFor={inputId}
              className={`inline-flex cursor-pointer items-center justify-center rounded-md bg-[#B80015] px-4 py-2 text-sm font-medium text-white hover:bg-[#8A0010] ${
                loading ? 'pointer-events-none opacity-70' : ''
              }`}
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
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={testApi}
            >
              Testar API de importação
            </Button>
          </div>
        </div>

        {appliedLabels.length > 0 && status === 'success' ? (
          <p className="mt-3 text-xs text-[#5B5680]">
            Campos: <span className="font-medium">{appliedLabels.join(' · ')}</span>
          </p>
        ) : null}
      </section>

      <div className="rounded-xl border border-[#E8E4F4] bg-white px-3 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9A94B0]">
          Log da importação
        </p>
        {logs.length === 0 ? (
          <p className="mt-1 text-xs text-[#9A94B0]">
            Os passos aparecem aqui ao escolher o arquivo ou testar a API.
          </p>
        ) : (
          <ul className="mt-1 max-h-40 space-y-0.5 overflow-y-auto font-mono text-[11px] text-[#1A1210]">
            {logs.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
      </div>

      <BriefingNarrativaAnaliseCard analise={analise} avisos={avisos} />
    </div>
  );
}
