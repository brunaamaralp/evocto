import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import EmpresaConfigResumo from './EmpresaConfigResumo';
import { configFromEmpresa } from '@/lib/empresaConfig';
import {
  parseBriefingCampanha,
  parsedToFormValues,
} from '@/lib/parseBriefingCampanha';

const MAX_CHARS = 5000;
const MIN_CHARS = 50;

/**
 * Modo texto livre — cola notas e dispara o parser.
 */
export default function BriefingTextLivre({
  empresa,
  initialText = '',
  onAnalyzed,
  onUseForm,
  onCancel,
}) {
  const [text, setText] = useState(initialText);
  const [analyzing, setAnalyzing] = useState(false);
  const config = configFromEmpresa(empresa);
  const len = text.length;
  const canAnalyze = len >= MIN_CHARS && !analyzing && Boolean(empresa);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      // Parser local — latência <1s; await microtask para mostrar loading
      await new Promise((r) => setTimeout(r, 80));
      const parsed = parseBriefingCampanha(text);
      const formValues = parsedToFormValues(parsed);
      onAnalyzed?.({ parsed, formValues, texto: text });
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-5">
      <EmpresaConfigResumo config={config} compact />

      <div>
        <p className="text-sm text-slate-700 mb-2">
          Cole aqui as notas da reunião:
          <span className="text-slate-500">
            {' '}
            (sistema detecta: nome, objetivo, ações, quem aparece, datas)
          </span>
        </p>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
          placeholder={`Vamos fazer a campanha de outono.\nObjetivo é aumentar as vendas.\nLança a linha Gold com desconto 15%.\nA dona aparece, interior da loja.\nGrava 15-18 de setembro.`}
          className="min-h-[300px] max-h-[600px]"
        />
        <div className="flex justify-between mt-1 text-xs text-slate-500">
          <span>Caracteres: {len}/{MAX_CHARS}</span>
          <span>📌 Dica: Quanto mais detalhe, melhor</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button disabled={!canAnalyze} onClick={handleAnalyze}>
          {analyzing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {analyzing ? 'Analisando...' : 'Analisar Briefing'}
        </Button>
        {onUseForm && (
          <Button type="button" variant="outline" onClick={onUseForm}>
            Usar Formulário
          </Button>
        )}
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </div>
  );
}
