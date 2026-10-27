import { useCallback, useEffect, useState } from 'react';
import {
  KeyRound,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Loader2,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
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
import EmptyState from '@/components/shared/EmptyState';
import SecretPasswordField from '@/components/client/SecretPasswordField';
import {
  listAgencyAccesses,
  createAgencyAccess,
  updateAgencyAccess,
  deleteAgencyAccess,
  revealAgencyAccessPassword,
} from '@/lib/agencyAccessesApi';

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
    <Card className="rounded-2xl border-transparent bg-white shadow-sm">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-[#18162A]">{access.platform}</h3>
            {access.username ? (
              <p className="mt-0.5 truncate text-sm text-[#7A7595]">{access.username}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEdit(access)}
              aria-label={`Editar ${access.platform}`}
            >
              <Pencil className="h-4 w-4 text-[#7A7595]" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onDelete(access)}
              aria-label={`Excluir ${access.platform}`}
            >
              <Trash2 className="h-4 w-4 text-[#C02807]" />
            </Button>
          </div>
        </div>

        {access.url ? (
          <a
            href={access.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-w-full items-center gap-1.5 truncate text-sm text-[#C02807] hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{access.url}</span>
          </a>
        ) : null}

        <div className="space-y-1.5 rounded-xl bg-[#EEF4FA] px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-[#7A7595]">
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
                <span className="text-xs text-[#7A7595]">Não cadastrada</span>
              )}
            </div>
          </div>
          <p className="min-h-[1.25rem] break-all font-mono text-sm text-[#18162A]">
            {!access.hasPassword
              ? '—'
              : passwordVisible && isRevealed
                ? revealedPassword
                : '••••••••••••'}
          </p>
        </div>

        {access.notes ? (
          <p className="whitespace-pre-wrap text-sm text-[#7A7595]">{access.notes}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

/**
 * Cofre de credenciais internas da agência (não aparece em perfis de cliente).
 */
export default function AgencyAccessesPanel() {
  const [loading, setLoading] = useState(true);
  const [accesses, setAccesses] = useState([]);

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
    try {
      setLoading(true);
      const data = await listAgencyAccesses();
      setAccesses(Array.isArray(data.accesses) ? data.accesses : []);
      setRevealed({});
      setVisibleMap({});
    } catch (err) {
      console.error('[AgencyAccessesPanel] load', err?.code || err?.message);
      toast.error(err?.message || 'Erro ao carregar acessos');
      setAccesses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const ensurePassword = async (access) => {
    if (Object.prototype.hasOwnProperty.call(revealed, access.id)) {
      return revealed[access.id];
    }
    setRevealingId(access.id);
    try {
      const { password } = await revealAgencyAccessPassword(access.id);
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
          platform: form.platform,
          url: form.url,
          username: form.username,
          notes: form.notes,
        };
        if (form.password) {
          payload.password = form.password;
        }
        await updateAgencyAccess(payload);
        toast.success('Acesso atualizado');
      } else {
        await createAgencyAccess({
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
      await deleteAgencyAccess(deleteTarget.id);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-[#7A7595]">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando acessos…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-[#18162A]">Acessos da agência</h2>
          <p className="mt-0.5 text-sm leading-relaxed text-[#7A7595]">
            Credenciais internas. Senhas ocultas por padrão; revelar/copiar gera
            auditoria. Não aparecem nos clientes.
          </p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10 flex-1 rounded-xl sm:h-9 sm:flex-none"
            onClick={load}
          >
            <RefreshCw className="mr-1 h-4 w-4" />
            Atualizar
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-10 flex-1 rounded-xl sm:h-9 sm:flex-none"
            onClick={openCreate}
          >
            <Plus className="mr-1 h-4 w-4" />
            Novo acesso
          </Button>
        </div>
      </div>

      {accesses.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="Nenhum acesso cadastrado"
          description="Cadastre logins de ferramentas e plataformas usadas pela agência."
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
        <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-[#C02807]" />
              {editing ? 'Editar acesso' : 'Novo acesso'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div>
              <Label htmlFor="agency-access-platform">Plataforma/serviço *</Label>
              <Input
                id="agency-access-platform"
                value={form.platform}
                onChange={(e) => setForm((p) => ({ ...p, platform: e.target.value }))}
                className="mt-1.5 rounded-xl border-transparent bg-[#EEF4FA]"
                placeholder="Ex.: Notion, Figma, Conta de anúncios"
              />
            </div>
            <div>
              <Label htmlFor="agency-access-url">URL de acesso</Label>
              <Input
                id="agency-access-url"
                value={form.url}
                onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
                className="mt-1.5 rounded-xl border-transparent bg-[#EEF4FA]"
                placeholder="https://…"
              />
            </div>
            <div>
              <Label htmlFor="agency-access-username">Usuário/e-mail</Label>
              <Input
                id="agency-access-username"
                value={form.username}
                onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                className="mt-1.5 rounded-xl border-transparent bg-[#EEF4FA]"
                placeholder="login@agencia.com"
                autoComplete="off"
              />
            </div>
            <div>
              <Label htmlFor="agency-access-password">Senha</Label>
              <div className="mt-1.5">
                <SecretPasswordField
                  id="agency-access-password"
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
                <p className="mt-1 text-xs text-[#7A7595]">
                  Preencha apenas se quiser alterar a senha armazenada.
                </p>
              ) : null}
            </div>
            <div>
              <Label htmlFor="agency-access-notes">Observações</Label>
              <Textarea
                id="agency-access-notes"
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                className="mt-1.5 rounded-xl border-transparent bg-[#EEF4FA]"
                rows={3}
                placeholder="2FA, permissões, contexto…"
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
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
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
              <strong className="text-[#18162A]">
                {deleteTarget?.platform || 'esta plataforma'}
              </strong>{' '}
              e a senha armazenada serão removidos de forma permanente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#C02807] hover:bg-[#8A1C05]"
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
