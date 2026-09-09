import React from 'react';
import { Button } from '@/components/ui/button';
import { Check, Pencil, Settings2 } from 'lucide-react';
import { formatFormatoLabel, formatOrcamento } from '@/lib/empresaConfig';

/**
 * Bloco read-only da configuração automática herdada da empresa.
 */
export default function EmpresaConfigResumo({
  config,
  onEditMes,
  compact = false,
}) {
  if (!config) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Configure a empresa antes de criar o briefing.
      </div>
    );
  }

  const rows = [
    { label: 'Público', value: config.publico_alvo },
    { label: 'Formato', value: formatFormatoLabel(config.formato) },
    { label: 'Orçamento', value: formatOrcamento(config.orcamento) },
    { label: 'Tom', value: config.tom_brand },
  ];

  if (Array.isArray(config.produtos_linhas) && config.produtos_linhas.length) {
    rows.push({
      label: 'Linhas',
      value: config.produtos_linhas.map((p) => p.nome).filter(Boolean).join(', '),
    });
  }

  return (
    <div className="rounded-lg border bg-slate-50 p-4">
      <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-slate-800">
        <Settings2 className="w-4 h-4" />
        {compact ? 'Configuração automática' : 'Configuração da Empresa (automática)'}
      </div>
      <ul className="space-y-1.5 text-sm text-slate-700">
        {rows.map((row) => (
          <li key={row.label} className="flex items-start gap-2">
            <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <span>
              <span className="text-slate-500">{row.label}:</span> {row.value || '—'}
            </span>
          </li>
        ))}
      </ul>
      {onEditMes && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-3 px-0 h-auto text-slate-700"
          onClick={onEditMes}
        >
          <Pencil className="w-3.5 h-3.5 mr-1.5" />
          Editar Só Este Mês
        </Button>
      )}
    </div>
  );
}
