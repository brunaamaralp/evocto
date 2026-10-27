import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FileText,
  Link2,
  StickyNote,
  Plus,
  Search,
  Pencil,
  Trash2,
  ExternalLink,
  Loader2,
  RefreshCw,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import EmptyState from '@/components/shared/EmptyState';
import { UploadFile } from '@/api/integrations';
import { useSession } from '@/components/auth/SessionManager';
import {
  listAgencyInfoItems,
  createAgencyInfoItem,
  updateAgencyInfoItem,
  archiveAgencyInfoItem,
} from '@/lib/agencyInfoApi';
import {
  TYPE_META,
  CATEGORY_OPTIONS,
  categoryLabel,
  formatItemCount,
} from '@/lib/agencyInfoUi';

const TYPE_ICONS = {
  document: FileText,
  link: Link2,
  note: StickyNote,
};

const EMPTY_FORM = {
  type: 'note',
  title: '',
  category: 'outros',
  body: '',
  summary: '',
  externalUrl: '',
  file: null,
  fileId: '',
  fileUrl: '',
  fileName: '',
  fileMimeType: '',
  fileSize: null,
};

function TypeTile({ type, count, active, onClick }) {
  const meta = TYPE_META[type];
  const Icon = TYPE_ICONS[type] || FileText;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[4.75rem] flex-col justify-between rounded-2xl border px-2.5 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C02807]/35 sm:min-h-[5.25rem] sm:px-3.5 sm:py-3 ${
        active
          ? 'border-[#C02807]/40 bg-[#FFF5F2]'
          : 'border-[#E8E5F5] bg-white hover:border-[#d0d7e2] hover:bg-[#EEF4FA]/60'
      }`}
    >
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-xl sm:h-8 sm:w-8 ${
          active ? 'bg-[#FFE8E0] text-[#C02807]' : 'bg-[#EEF4FA] text-[#555]'
        }`}
      >
        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
      </span>
      <div className="mt-1.5 min-w-0 sm:mt-2">
        <p className="truncate text-xs font-medium text-[#111] sm:text-sm">{meta.label}</p>
        <p className="mt-0.5 truncate text-[11px] text-[#666] sm:text-xs">
          {formatItemCount(count, 'item', 'itens')}
        </p>
      </div>
    </button>
  );
}

function ItemCard({ item, onEdit, onArchive, onOpen }) {
  const Icon = TYPE_ICONS[item.type] || FileText;
  const typeLabel = TYPE_META[item.type]?.singular || item.type;

  return (
    <Card className="rounded-2xl border-transparent bg-white shadow-sm">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF4FA] text-[#555]">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-[#18162A]">{item.title}</h3>
              <p className="mt-0.5 text-xs text-[#7A7595]">
                {typeLabel}
                {item.category ? ` · ${categoryLabel(item.category)}` : ''}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {item.type === 'link' && item.externalUrl ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onOpen(item)}
                aria-label={`Abrir ${item.title}`}
              >
                <ExternalLink className="h-4 w-4 text-[#7A7595]" />
              </Button>
            ) : null}
            {(item.type === 'document' && (item.fileUrl || item.externalUrl)) ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onOpen(item)}
                aria-label={`Abrir ${item.title}`}
              >
                <ExternalLink className="h-4 w-4 text-[#7A7595]" />
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEdit(item)}
              aria-label={`Editar ${item.title}`}
            >
              <Pencil className="h-4 w-4 text-[#7A7595]" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onArchive(item)}
              aria-label={`Arquivar ${item.title}`}
            >
              <Trash2 className="h-4 w-4 text-[#7A7595]" />
            </Button>
          </div>
        </div>

        {item.summary ? (
          <p className="line-clamp-2 text-sm text-[#7A7595]">{item.summary}</p>
        ) : item.body && item.type === 'note' ? (
          <p className="line-clamp-3 whitespace-pre-wrap text-sm text-[#7A7595]">{item.body}</p>
        ) : null}

        {item.fileName ? (
          <p className="truncate text-xs text-[#999]">{item.fileName}</p>
        ) : null}
        {item.type === 'link' && item.externalUrl ? (
          <p className="truncate text-xs text-[#999]">{item.externalUrl}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function AgencyCentralPanel() {
  const { agencyId } = useSession();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchDraft, setSearchDraft] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [archiveTarget, setArchiveTarget] = useState(null);
  const [archiving, setArchiving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listAgencyInfoItems({
        status: 'active',
        q: searchTerm || undefined,
        limit: 100,
      });
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      console.error('[AgencyCentralPanel] load', err?.code || err?.message);
      toast.error(err?.message || 'Erro ao carregar a Central');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const base = { document: 0, link: 0, note: 0, all: items.length };
    for (const item of items) {
      if (base[item.type] != null) base[item.type] += 1;
    }
    return base;
  }, [items]);

  const visibleItems = useMemo(() => {
    if (typeFilter === 'all') return items;
    return items.filter((item) => item.type === typeFilter);
  }, [items, typeFilter]);

  const openCreate = (preferredType = 'note') => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, type: preferredType });
    setDialogOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      type: item.type || 'note',
      title: item.title || '',
      category: item.category || 'outros',
      body: item.body || '',
      summary: item.summary || '',
      externalUrl: item.externalUrl || '',
      file: null,
      fileId: item.fileId || '',
      fileUrl: item.fileUrl || '',
      fileName: item.fileName || '',
      fileMimeType: item.fileMimeType || '',
      fileSize: item.fileSize ?? null,
    });
    setDialogOpen(true);
  };

  const handleOpenExternal = (item) => {
    const url = item.fileUrl || item.externalUrl;
    if (!url) {
      toast.error('Nenhum link disponível');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('Informe o título');
      return;
    }
    if (form.type === 'link' && !form.externalUrl.trim()) {
      toast.error('Informe a URL do link');
      return;
    }

    try {
      setSaving(true);

      let fileFields = {
        fileId: form.fileId || null,
        fileUrl: form.fileUrl || null,
        fileName: form.fileName || null,
        fileMimeType: form.fileMimeType || null,
        fileSize: form.fileSize,
      };

      if (form.type === 'document' && form.file) {
        const uploaded = await UploadFile({ file: form.file, agencyId });
        const fileUrl = uploaded.file_url || uploaded.url;
        if (!fileUrl) throw new Error('URL do arquivo não retornada');
        fileFields = {
          fileId: uploaded.fileId || null,
          fileUrl,
          fileName: form.file.name,
          fileMimeType: form.file.type || 'application/octet-stream',
          fileSize: form.file.size || null,
        };
      }

      if (
        form.type === 'document' &&
        !fileFields.fileId &&
        !fileFields.fileUrl &&
        !form.externalUrl.trim()
      ) {
        toast.error('Envie um arquivo ou informe uma URL externa');
        return;
      }

      const payload = {
        type: form.type,
        title: form.title.trim(),
        category: form.category || 'outros',
        body: form.body || '',
        summary: form.summary || '',
        externalUrl: form.externalUrl.trim() || '',
        ...fileFields,
      };

      if (editing) {
        await updateAgencyInfoItem({ itemId: editing.id, ...payload });
        toast.success('Item atualizado');
      } else {
        await createAgencyInfoItem(payload);
        toast.success('Item adicionado à Central');
      }

      setDialogOpen(false);
      setForm(EMPTY_FORM);
      setEditing(null);
      await load();
    } catch (err) {
      console.error('[AgencyCentralPanel] save', err);
      toast.error(err?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!archiveTarget?.id) return;
    try {
      setArchiving(true);
      await archiveAgencyInfoItem(archiveTarget.id);
      toast.success('Item arquivado');
      setArchiveTarget(null);
      await load();
    } catch (err) {
      toast.error(err?.message || 'Erro ao arquivar');
    } finally {
      setArchiving(false);
    }
  };

  const applySearch = () => {
    setSearchTerm(searchDraft.trim());
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
        {(['document', 'link', 'note']).map((type) => (
          <TypeTile
            key={type}
            type={type}
            count={counts[type] || 0}
            active={typeFilter === type}
            onClick={() => setTypeFilter((prev) => (prev === type ? 'all' : type))}
          />
        ))}
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="flex min-w-0 flex-1 gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#bbb]" />
            <Input
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applySearch();
              }}
              placeholder="Buscar…"
              className="h-10 rounded-xl border-transparent bg-[#EEF4FA] pl-9"
              aria-label="Buscar por título ou categoria"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-xl sm:hidden"
            onClick={applySearch}
            aria-label="Buscar"
          >
            <Search className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            className="hidden rounded-xl sm:inline-flex"
            onClick={applySearch}
          >
            Buscar
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-xl"
            onClick={load}
            aria-label="Atualizar"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <Button
          type="button"
          className="h-10 w-full rounded-xl bg-primary hover:bg-[var(--color-primary-dark)] sm:w-auto"
          onClick={() =>
            openCreate(typeFilter === 'all' ? 'note' : typeFilter)
          }
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Novo item
        </Button>
      </div>

      {typeFilter !== 'all' ? (
        <p className="text-xs text-[#7A7595]">
          Filtrando por {TYPE_META[typeFilter]?.label?.toLowerCase()}
          {' · '}
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => setTypeFilter('all')}
          >
            Ver todos
          </button>
        </p>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-[#7A7595]">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Carregando…
        </div>
      ) : visibleItems.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Central ainda vazia"
          description={
            searchTerm || typeFilter !== 'all'
              ? 'Nenhum item com esses filtros. Ajuste a busca ou o tipo.'
              : 'Adicione documentos, links úteis e informações internas da agência.'
          }
          primaryAction={{
            label: 'Adicionar primeiro item',
            onClick: () => openCreate(typeFilter === 'all' ? 'document' : typeFilter),
          }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {visibleItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onEdit={openEdit}
              onArchive={setArchiveTarget}
              onOpen={handleOpenExternal}
            />
          ))}
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (saving) return;
          setDialogOpen(open);
          if (!open) {
            setEditing(null);
            setForm(EMPTY_FORM);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Editar item' : 'Novo item na Central'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select
                  value={form.type}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, type: value }))
                  }
                  disabled={Boolean(editing)}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(TYPE_META).map((meta) => (
                      <SelectItem key={meta.key} value={meta.key}>
                        {meta.singular}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Select
                  value={form.category || 'outros'}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, category: value }))
                  }
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="central-title">Título</Label>
              <Input
                id="central-title"
                value={form.title}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, title: e.target.value }))
                }
                className="rounded-xl"
                placeholder="Ex.: Modelo de proposta"
              />
            </div>

            {form.type === 'link' ? (
              <div className="space-y-1.5">
                <Label htmlFor="central-url">URL</Label>
                <Input
                  id="central-url"
                  value={form.externalUrl}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, externalUrl: e.target.value }))
                  }
                  className="rounded-xl"
                  placeholder="https://"
                />
              </div>
            ) : null}

            {form.type === 'document' ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="central-file">Arquivo</Label>
                  <Input
                    id="central-file"
                    type="file"
                    className="rounded-xl"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setForm((prev) => ({
                        ...prev,
                        file,
                        fileName: file?.name || prev.fileName,
                      }));
                    }}
                  />
                  {form.fileName && !form.file ? (
                    <p className="text-xs text-[#7A7595]">
                      Arquivo atual: {form.fileName}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="central-ext-url">Ou URL externa (opcional)</Label>
                  <Input
                    id="central-ext-url"
                    value={form.externalUrl}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, externalUrl: e.target.value }))
                    }
                    className="rounded-xl"
                    placeholder="https://drive.google.com/…"
                  />
                </div>
              </div>
            ) : null}

            {form.type === 'note' ? (
              <div className="space-y-1.5">
                <Label htmlFor="central-body">Conteúdo</Label>
                <Textarea
                  id="central-body"
                  value={form.body}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, body: e.target.value }))
                  }
                  rows={6}
                  className="rounded-xl"
                  placeholder="Procedimentos, orientações, combinados…"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="central-summary">Resumo (opcional)</Label>
                <Textarea
                  id="central-summary"
                  value={form.summary}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, summary: e.target.value }))
                  }
                  rows={3}
                  className="rounded-xl"
                  placeholder="Breve descrição para achar depois"
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => setDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="button" disabled={saving} onClick={handleSave}>
              {saving ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Salvando…
                </>
              ) : (
                <>
                  <Upload className="mr-1.5 h-4 w-4" />
                  {editing ? 'Salvar' : 'Adicionar'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(archiveTarget)}
        onOpenChange={(open) => {
          if (!open && !archiving) setArchiveTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar item?</AlertDialogTitle>
            <AlertDialogDescription>
              “{archiveTarget?.title}” sai da Central ativa. Você poderá
              reativá-lo depois se necessário.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={archiving} onClick={handleArchive}>
              {archiving ? 'Arquivando…' : 'Arquivar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
