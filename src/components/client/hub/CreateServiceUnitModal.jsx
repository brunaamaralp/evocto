import { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  FileImage,
  FileText,
  Loader2,
  Plus,
  Send,
  Upload,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  getCreateCtaLabel,
  getServiceDisplayName,
} from '@/lib/serviceOperationProfile';
import { UNIT_CREATION_MODES } from '@/lib/createServiceUnitTask';

function fileKey(file, index) {
  return `${file.name}_${file.size}_${file.lastModified}_${index}`;
}

/**
 * Modal leve: nome da unidade + cria task com checklist do template.
 * Produção de conteúdo: fluxo completo ou envio direto para aprovação (com anexos).
 */
export default function CreateServiceUnitModal({
  open,
  onClose,
  service,
  profile,
  saving = false,
  error = '',
  uploadProgress = 0,
  onSubmit,
}) {
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState(UNIT_CREATION_MODES.FULL);
  const [files, setFiles] = useState([]);
  const [localError, setLocalError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setMode(UNIT_CREATION_MODES.FULL);
    setFiles([]);
    setLocalError('');
    setDragOver(false);
  }, [open, service?.id]);

  if (!open || !service || !profile) return null;

  const noun = profile.itemLabel || 'item';
  const isContentService = profile.offeringKey === 'producao_conteudo';
  const isApprovalMode = mode === UNIT_CREATION_MODES.READY_FOR_APPROVAL;
  const ctaText = String(getCreateCtaLabel(profile) || `Novo ${noun}`)
    .replace(/^\+\s*/, '')
    .trim();
  const displayError = localError || error;
  const canSubmit =
    Boolean(title.trim()) &&
    (!isApprovalMode || files.length > 0) &&
    !saving;

  const addFiles = (fileList) => {
    const incoming = Array.from(fileList || []).filter(Boolean);
    if (!incoming.length) return;
    setFiles((prev) => [...prev, ...incoming]);
    setLocalError('');
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const moveFile = (index, delta) => {
    setFiles((prev) => {
      const next = [...prev];
      const to = index + delta;
      if (to < 0 || to >= next.length) return prev;
      const [item] = next.splice(index, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const handleSubmit = (e, { keepOpen = false } = {}) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    if (isApprovalMode && files.length === 0) {
      setLocalError('Anexe pelo menos um arquivo (ex.: slides do carrossel).');
      return;
    }
    setLocalError('');
    onSubmit?.(trimmed, {
      mode,
      keepOpen,
      files: isApprovalMode ? files : [],
    });
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-unit-title"
    >
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white shadow-lg sm:rounded-2xl">
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
                ? 'Anexe o conteúdo (1 ou mais arquivos — carrossel) e envie para o cliente.'
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
                onClick={() => {
                  setMode(UNIT_CREATION_MODES.FULL);
                  setLocalError('');
                }}
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

          {isApprovalMode ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Anexos</Label>
                {files.length >= 2 ? (
                  <span className="text-xs text-[#555]">
                    Carrossel ({files.length} slides)
                  </span>
                ) : null}
              </div>
              <div
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  if (saving) return;
                  addFiles(e.dataTransfer?.files);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                className={`rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
                  dragOver
                    ? 'border-[#007bff] bg-[#007bff]/5'
                    : 'border-[#ddd] hover:border-[#bbb]'
                }`}
              >
                <Upload className="mx-auto mb-2 h-7 w-7 text-[#888]" aria-hidden />
                <p className="text-sm text-[#555]">
                  Arraste arquivos ou{' '}
                  <button
                    type="button"
                    className="font-medium text-[#007bff] underline-offset-2 hover:underline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={saving}
                  >
                    escolha
                  </button>
                </p>
                <p className="mt-1 text-xs text-[#888]">
                  Imagens, PDF ou vídeo — vários arquivos = carrossel
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,application/pdf,video/*"
                  className="hidden"
                  disabled={saving}
                  onChange={(e) => {
                    addFiles(e.target.files);
                    e.target.value = '';
                  }}
                />
              </div>

              {files.length > 0 ? (
                <ul className="space-y-1.5">
                  {files.map((file, index) => {
                    const isImage = String(file.type || '').startsWith('image/');
                    const Icon = isImage ? FileImage : FileText;
                    return (
                      <li
                        key={fileKey(file, index)}
                        className="flex items-center gap-2 rounded-lg border border-[#eee] bg-[#fafafa] px-2 py-1.5"
                      >
                        <Icon className="h-4 w-4 shrink-0 text-[#666]" aria-hidden />
                        <span className="min-w-0 flex-1 truncate text-sm text-[#222]">
                          {index + 1}. {file.name}
                        </span>
                        <div className="flex shrink-0 items-center gap-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            disabled={saving || index === 0}
                            onClick={() => moveFile(index, -1)}
                            aria-label="Mover para cima"
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            disabled={saving || index === files.length - 1}
                            onClick={() => moveFile(index, 1)}
                            aria-label="Mover para baixo"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-600 hover:text-red-700"
                            disabled={saving}
                            onClick={() => removeFile(index)}
                            aria-label="Remover"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : null}

              {saving && uploadProgress > 0 ? (
                <p className="text-xs text-[#555]">
                  Enviando anexos… {Math.min(100, Math.round(uploadProgress))}%
                </p>
              ) : null}
            </div>
          ) : null}

          {displayError ? (
            <p className="text-sm text-[#c0392b]" role="alert">
              {displayError}
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
            {isContentService && !isApprovalMode ? (
              <Button
                type="button"
                variant="outline"
                disabled={!canSubmit}
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
              disabled={!canSubmit}
            >
              {saving ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : isApprovalMode ? (
                <Send className="mr-1.5 h-4 w-4" />
              ) : (
                <Plus className="mr-1.5 h-4 w-4" />
              )}
              {saving
                ? isApprovalMode
                  ? 'Enviando…'
                  : 'Criando…'
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
