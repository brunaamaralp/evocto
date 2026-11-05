import { useRef, useState } from 'react';
import { Download, Eye, File, FileImage, FileText, Loader2, Paperclip, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  MAX_ATTACHMENT_BYTES,
  attachmentDownloadUrl,
  attachmentViewUrl,
  canManageLeadItem,
} from '@/lib/agencyLeads/leadCrmApi';
import { TabEmpty, TabError, TabLoading } from '../LeadShared';
import {
  ATTACHMENT_CATEGORIES,
  ATTACHMENT_CATEGORY_LABELS,
  formatBytes,
  formatDateTime,
  fileKind,
} from '../leadUi';

function KindIcon({ item }) {
  const kind = fileKind(item);
  const Icon = kind === 'Imagem' ? FileImage : kind === 'PDF' || kind === 'Documento' ? FileText : File;
  return <Icon className="h-5 w-5 text-[#B80015]" aria-hidden />;
}

function safeUrl(fn, item) {
  try {
    return fn(item);
  } catch {
    return null;
  }
}

export default function LeadFilesTab({ files, loading, error, schemaMissing, onRetry, user, isAdmin, onUpload, onDelete }) {
  const inputRef = useRef(null);
  const [category, setCategory] = useState('proposta');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [busyId, setBusyId] = useState(null);

  if (loading) return <TabLoading label="Carregando arquivos…" />;
  if (error) return <TabError message={error} schemaMissing={schemaMissing} onRetry={onRetry} />;

  const handleFiles = async (fileList) => {
    const list = Array.from(fileList || []);
    if (!list.length) return;
    const tooBig = list.filter((f) => f.size > MAX_ATTACHMENT_BYTES);
    if (tooBig.length) toast.error(`Arquivo acima de 25 MB ignorado: ${tooBig.map((f) => f.name).join(', ')}`);
    const valid = list.filter((f) => f.size <= MAX_ATTACHMENT_BYTES);
    if (!valid.length) return;
    setUploading(true);
    let ok = 0;
    for (const file of valid) {
      try {
        await onUpload(file, category);
        ok += 1;
      } catch (err) {
        toast.error(`${file.name}: ${err?.message || 'falha no envio'}`);
      }
    }
    setUploading(false);
    if (ok) toast.success(ok > 1 ? `${ok} arquivos anexados` : 'Arquivo anexado');
    if (inputRef.current) inputRef.current.value = '';
  };

  const remove = async (item) => {
    if (!window.confirm(`Excluir "${item.fileName}"? Esta ação não pode ser desfeita.`)) return;
    setBusyId(item.id);
    try {
      await onDelete(item);
      toast.success('Arquivo excluído');
    } catch (err) {
      toast.error(err?.message || 'Erro ao excluir arquivo');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div
        className={cn(
          'rounded-2xl border border-dashed bg-white p-4 transition-colors',
          dragOver ? 'border-[#B80015] bg-[#FFF5F5]' : 'border-[#E4DDD4]'
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-2 text-sm text-[#6B635C]">
            <Upload className="h-4 w-4 shrink-0 text-[#B80015]" />
            <span>Arraste arquivos aqui ou selecione (até 25 MB)</span>
          </div>
          <div className="flex gap-2">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9 w-[170px] text-xs" aria-label="Categoria do arquivo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ATTACHMENT_CATEGORIES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" size="sm" className="h-9 bg-[#B80015] hover:bg-[#8A0010]" disabled={uploading} onClick={() => inputRef.current?.click()}>
              {uploading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Paperclip className="mr-1.5 h-3.5 w-3.5" />}
              {uploading ? 'Enviando…' : 'Anexar'}
            </Button>
          </div>
        </div>
        <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      </div>

      {files.length === 0 ? (
        <TabEmpty icon={Paperclip} title="Nenhum arquivo anexado" description="Briefings, propostas, contratos e referências do lead ficam reunidos aqui." />
      ) : (
        <ul className="divide-y divide-[#F1EDE7] rounded-2xl border border-[#E4DDD4] bg-white">
          {files.map((item) => {
            const canManage = canManageLeadItem(item, { userId: user?.id, isAdmin });
            const view = safeUrl(attachmentViewUrl, item);
            const download = safeUrl(attachmentDownloadUrl, item);
            return (
              <li key={item.id} className="flex items-center gap-3 px-3 py-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F8F7FB]">
                  <KindIcon item={item} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#1A1210]" title={item.fileName}>
                    {item.fileName}
                  </p>
                  <p className="truncate text-xs text-[#9A9088]">
                    {[
                      ATTACHMENT_CATEGORY_LABELS[item.category] || fileKind(item),
                      formatBytes(item.fileSize),
                      formatDateTime(item.occurredAt || item.created_date),
                      item.authorName,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <div className="flex shrink-0 gap-0.5">
                  {view ? (
                    <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                      <a href={view} target="_blank" rel="noopener noreferrer" aria-label={`Visualizar ${item.fileName}`}>
                        <Eye className="h-4 w-4 text-[#6B635C]" />
                      </a>
                    </Button>
                  ) : null}
                  {download ? (
                    <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                      <a href={download} aria-label={`Baixar ${item.fileName}`}>
                        <Download className="h-4 w-4 text-[#6B635C]" />
                      </a>
                    </Button>
                  ) : null}
                  {canManage ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label={`Excluir ${item.fileName}`}
                      disabled={busyId === item.id}
                      onClick={() => remove(item)}
                    >
                      {busyId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-[#6B635C]" />}
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
