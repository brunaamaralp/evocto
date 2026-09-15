import { useEffect, useState } from 'react';
import { Loader2, Plus, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  getCreateCtaLabel,
  getServiceDisplayName,
} from '@/lib/serviceOperationProfile';
import { UNIT_CREATION_MODES } from '@/lib/createServiceUnitTask';

/**
 * Modal leve: nome da unidade + cria task com checklist do template.
 * Produção de conteúdo: fluxo completo ou envio direto para aprovação.
 */
export default function CreateServiceUnitModal({
  open,
  onClose,
  service,
  profile,
  saving = false,
  error = '',
  onSubmit,
}) {
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState(UNIT_CREATION_MODES.FULL);

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setMode(UNIT_CREATION_MODES.FULL);
  }, [open, service?.id]);

  if (!open || !service || !profile) return null;

  const noun = profile.itemLabel || 'item';
  const isContentService = profile.offeringKey === 'producao_conteudo';
  const isApprovalMode = mode === UNIT_CREATION_MODES.READY_FOR_APPROVAL;
  const ctaText = String(getCreateCtaLabel(profile) || `Novo ${noun}`)
    .replace(/^\+\s*/, '')
    .trim();

  const handleSubmit = (e, { keepOpen = false } = {}) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onSubmit?.(trimmed, { mode, keepOpen });
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-unit-title"
    >
      <div className="w-full max-w-md rounded-t-2xl bg-white shadow-lg sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-[#eee] px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#007bff]">
              {getServiceDisplayName(service)}
            </p>
            <h2
              id="create-unit-title"
              className="mt-1 text-lg font-semibold text-[#111]"
            >
              {isApprovalMode ? 'Enviar para aprovação' : ctaText}
            </h2>
            <p className="mt-1 text-sm text-[#555]">
              {isApprovalMode
                ? 'Conteúdo já produzido — vai direto para aprovação do cliente.'
                : 'As etapas do template serão aplicadas automaticamente.'}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={saving}
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={(e) => handleSubmit(e)} className="space-y-4 px-5 py-5">
          {isContentService ? (
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-[#f7fafc] p-1">
              <button
                type="button"
                className={`rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  !isApprovalMode
                    ? 'bg-white font-medium text-[#111] shadow-sm'
                    : 'text-[#666] hover:text-[#111]'
                }`}
                onClick={() => setMode(UNIT_CREATION_MODES.FULL)}
                disabled={saving}
              >
                Fluxo completo
              </button>
              <button
                type="button"
                className={`rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  isApprovalMode
                    ? 'bg-white font-medium text-[#111] shadow-sm'
                    : 'text-[#666] hover:text-[#111]'
                }`}
                onClick={() => setMode(UNIT_CREATION_MODES.READY_FOR_APPROVAL)}
                disabled={saving}
              >
                Pronto para aprovação
              </button>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="unit-title">Nome d{noun === 'ação' ? 'a' : 'o'} {noun}</Label>
            <Input
              id="unit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                profile.offeringKey === 'producao_conteudo'
                  ? 'Ex.: Reel — Produto X'
                  : profile.offeringKey === 'sessao_fotos'
                    ? 'Ex.: Ensaio — Outubro Rosa'
                    : `Nome d${noun === 'ação' ? 'a' : 'o'} ${noun}`
              }
              autoFocus
              disabled={saving}
            />
          </div>

          {error ? (
            <p className="text-sm text-[#c0392b]" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </Button>
            {isContentService ? (
              <Button
                type="button"
                variant="outline"
                disabled={saving || !title.trim()}
                onClick={(e) => handleSubmit(e, { keepOpen: true })}
              >
                {saving ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-1.5 h-4 w-4" />
                )}
                {saving ? 'Criando…' : 'Criar e adicionar outro'}
              </Button>
            ) : null}
            <Button
              type="submit"
              className="bg-[#007bff] hover:bg-[#0056b3]"
              disabled={saving || !title.trim()}
            >
              {saving ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : isApprovalMode ? (
                <Send className="mr-1.5 h-4 w-4" />
              ) : (
                <Plus className="mr-1.5 h-4 w-4" />
              )}
              {saving
                ? 'Criando…'
                : isApprovalMode
                  ? 'Enviar para aprovação'
                  : ctaText}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
