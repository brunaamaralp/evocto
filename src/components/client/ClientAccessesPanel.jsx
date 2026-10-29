import { useCallback, useEffect, useState } from 'react';
import {
  KeyRound,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Loader2,
  Save,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import EmptyState from '@/components/shared/EmptyState';
import SecretPasswordField from '@/components/client/SecretPasswordField';
import {
  listClientAccesses,
  createClientAccess,
  updateClientAccess,
  deleteClientAccess,
  revealClientAccessPassword,
  updateClientAccessGeneralNotes,
} from '@/lib/clientAccessesApi';

const EMPTY_FORM = {
  platform: '',
  url: '',
  username: '',
  password: '',
  notes: '',
};

function AccessCard({
  access,
  revealedPassword,
  passwordVisible,
  revealing,
  onToggleVisibility,
  onCopy,
  onEdit,
  onDelete,
}) {
  const [copied, setCopied] = useState(false);
  const isRevealed = revealedPassword != null;

  const handleCopy = async () => {
    const ok = await onCopy(access);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <Card className="rounded-2xl border-transparent shadow-sm bg-white">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-[#1A1210] truncate">{access.platform}</h3>
            {access.username ? (
              <p className="text-sm text-[#6B635C] truncate mt-0.5">{access.username}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEdit(access)}
              aria-label={`Editar ${access.platform}`}
            >
              <Pencil className="h-4 w-4 text-[#6B635C]" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onDelete(access)}
              aria-label={`Excluir ${access.platform}`}
            >
              <Trash2 className="h-4 w-4 text-[#B80015]" />
            </Button>
          </div>
        </div>

        {access.url ? (
          <a
            href={access.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-[#B80015] hover:underline truncate max-w-full"
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{access.url}</span>
          </a>
        ) : null}

        <div className="rounded-xl bg-[#F1EDE7] px-3 py-2.5 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-[#6B635C] uppercase tracking-wide">
              Senha
            </span>
            <div className="flex items-center gap-1">
              {access.hasPassword ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={revealing}
                    onClick={() => onToggleVisibility(access)}
                    aria-label={passwordVisible ? 'Ocultar senha' : 'Mostrar senha'}
                    aria-pressed={passwordVisible}
                  >
                    {revealing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : passwordVisible ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={revealing}
                    onClick={handleCopy}
                    aria-label="Copiar senha"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-green-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </>
              ) : (
                <span className="text-xs text-[#6B635C]">Não cadastrada</span>
              )}
            </div>
          </div>
          <p className="font-mono text-sm text-[#1A1210] break-all min-h-[1.25rem]">
            {!access.hasPassword
              ? '—'
              : passwordVisible && isRevealed
                ? revealedPassword
                : '••••••••••••'}
          </p>
        </div>

        {access.notes ? (
          <p className="text-sm text-[#6B635C] whitespace-pre-wrap">{access.notes}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function ClientAccessesPanel({ clientId }) {
  const [loading, setLoading] = useState(true);
  const [accesses, setAccesses] = useState([]);
  const [generalNotes, setGeneralNotes] = useState('');
  const [notesDraft, setNotesDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  /** @type {Record<string, string>} */
  const [revealed, setRevealed] = useState({});
  /** @type {Record<string, boolean>} */
  const [visibleMap, setVisibleMap] = useState({});
  const [revealingId, setRevealingId] = useState(null);

  const load = useCallback(async () => {
    if (!clientId) return;
    try {
      setLoading(true);
      const data = await listClientAccesses(clientId);
      setAccesses(Array.isArray(data.accesses) ? data.accesses : []);
      const notes = String(data.generalNotes || '');
      setGeneralNotes(notes);
      setNotesDraft(notes);
      setRevealed({});
      setVisibleMap({});
    } catch (err) {
      console.error('[ClientAccessesPanel] load', err?.code || err?.message);
      toast.error(err?.message || 'Erro ao carregar acessos');
      setAccesses([]);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load]);

  const ensurePassword = async (access) => {
    if (Object.prototype.hasOwnProperty.call(revealed, access.id)) {
      return revealed[access.id];
    }
    setRevealingId(access.id);
    try {
      const { password } = await revealClientAccessPassword(clientId, access.id);
      const value = password || '';
      setRevealed((prev) => ({ ...prev, [access.id]: value }));
      return value;
    } finally {
      setRevealingId(null);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (access) => {
    setEditing(access);
    setForm({
      platform: access.platform || '',
      url: access.url || '',
      username: access.username || '',
      password: '',
      notes: access.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSaveAccess = async () => {
    if (!form.platform.trim()) {
      toast.error('Informe a plataforma/serviço');
      return;
    }
    try {
      setSaving(true);
      if (editing) {
        const payload = {
          accessId: editing.id,
          clientId,
          platform: form.platform,
          url: form.url,
          username: form.username,
          notes: form.notes,
        };
        if (form.password) {
          payload.password = form.password;
        }
        await updateClientAccess(payload);
        toast.success('Acesso atualizado');
      } else {
        await createClientAccess({
          clientId,
          platform: form.platform,
          url: form.url,
          username: form.username,
          notes: form.notes,
          password: form.password,
        });
        toast.success('Acesso cadastrado');
      }
      setDialogOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      toast.error(err?.message || 'Erro ao salvar acesso');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await deleteClientAccess({ clientId, accessId: deleteTarget.id });
      toast.success('Acesso excluído');
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error(err?.message || 'Erro ao excluir acesso');
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleVisibility = async (access) => {
    const currentlyVisible = Boolean(visibleMap[access.id]);
    if (currentlyVisible) {
      setVisibleMap((prev) => ({ ...prev, [access.id]: false }));
      return;
    }
    try {
      await ensurePassword(access);
      setVisibleMap((prev) => ({ ...prev, [access.id]: true }));
    } catch (err) {
      toast.error(err?.message || 'Erro ao revelar senha');
    }
  };

  const handleCopy = async (access) => {
    try {
      const password = await ensurePassword(access);
      await navigator.clipboard.writeText(String(password));
      toast.success('Senha copiada');
      return true;
    } catch (err) {
      toast.error(err?.message || 'Não foi possível copiar a senha');
      return false;
    }
  };

  const handleSaveNotes = async () => {
    try {
      setSavingNotes(true);
      const { generalNotes: saved } = await updateClientAccessGeneralNotes({
        clientId,
        generalNotes: notesDraft,
      });
      setGeneralNotes(saved);
      setNotesDraft(saved);
      toast.success('Informações gerais salvas');
    } catch (err) {
      toast.error(err?.message || 'Erro ao salvar informações');
    } finally {
      setSavingNotes(false);
    }
  };

  const notesDirty = notesDraft !== generalNotes;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-[#6B635C]">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Carregando acessos…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-[#1A1210]">Acessos e credenciais</h2>
            <p className="text-sm text-[#6B635C]">
              Plataformas e logins vinculados a este cliente. Senhas ficam ocultas por padrão.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={load}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Atualizar
            </Button>
            <Button type="button" size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" />
              Novo acesso
            </Button>
          </div>
        </div>

        {accesses.length === 0 ? (
          <EmptyState
            icon={KeyRound}
            title="Nenhum acesso cadastrado"
            description="Cadastre logins de Instagram, Meta Ads, hospedagem e outros serviços."
            primaryAction={{
              label: 'Adicionar acesso',
              onClick: openCreate,
            }}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {accesses.map((access) => (
              <AccessCard
                key={access.id}
                access={access}
                revealedPassword={
                  Object.prototype.hasOwnProperty.call(revealed, access.id)
                    ? revealed[access.id]
                    : null
                }
                passwordVisible={Boolean(visibleMap[access.id])}
                revealing={revealingId === access.id}
                onToggleVisibility={handleToggleVisibility}
                onCopy={handleCopy}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <Card className="rounded-2xl border-transparent shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-[#1A1210]">
              Informações gerais
            </CardTitle>
            <p className="text-sm text-[#6B635C] font-normal">
              Contatos importantes, orientações de comunicação e particularidades do negócio.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              rows={8}
              placeholder="Ex.: contato principal, horários preferidos, restrições de comunicação…"
              className="rounded-xl bg-[#F1EDE7] border-transparent resize-y min-h-[160px]"
            />
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                onClick={handleSaveNotes}
                disabled={savingNotes || !notesDirty}
              >
                {savingNotes ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Salvar informações
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!saving) {
            setDialogOpen(open);
            if (!open) {
              setEditing(null);
              setForm(EMPTY_FORM);
            }
          }
        }}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-[#B80015]" />
              {editing ? 'Editar acesso' : 'Novo acesso'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div>
              <Label htmlFor="access-platform">Plataforma/serviço *</Label>
              <Input
                id="access-platform"
                value={form.platform}
                onChange={(e) => setForm((p) => ({ ...p, platform: e.target.value }))}
                className="mt-1.5 rounded-xl bg-[#F1EDE7] border-transparent"
                placeholder="Ex.: Instagram, Meta Ads, WordPress"
              />
            </div>
            <div>
              <Label htmlFor="access-url">URL de acesso</Label>
              <Input
                id="access-url"
                value={form.url}
                onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
                className="mt-1.5 rounded-xl bg-[#F1EDE7] border-transparent"
                placeholder="https://…"
              />
            </div>
            <div>
              <Label htmlFor="access-username">Usuário/e-mail</Label>
              <Input
                id="access-username"
                value={form.username}
                onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                className="mt-1.5 rounded-xl bg-[#F1EDE7] border-transparent"
                placeholder="login@exemplo.com"
                autoComplete="off"
              />
            </div>
            <div>
              <Label htmlFor="access-password">Senha</Label>
              <div className="mt-1.5">
                <SecretPasswordField
                  id="access-password"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder={
                    editing?.hasPassword
                      ? 'Deixe em branco para manter a senha atual'
                      : 'Senha do acesso'
                  }
                />
              </div>
              {editing?.hasPassword ? (
                <p className="text-xs text-[#6B635C] mt-1">
                  Preencha apenas se quiser alterar a senha armazenada.
                </p>
              ) : null}
            </div>
            <div>
              <Label htmlFor="access-notes">Observações</Label>
              <Textarea
                id="access-notes"
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                className="mt-1.5 rounded-xl bg-[#F1EDE7] border-transparent"
                rows={3}
                placeholder="Permissões, 2FA, contexto…"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => setDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="button" disabled={saving} onClick={handleSaveAccess}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              {editing ? 'Salvar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este acesso?</AlertDialogTitle>
            <AlertDialogDescription>
              O acesso a{' '}
              <strong className="text-[#1A1210]">{deleteTarget?.platform || 'esta plataforma'}</strong>{' '}
              e a senha armazenada serão removidos de forma permanente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#B80015] hover:bg-[#8A0010]"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo…
                </>
              ) : (
                'Excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
