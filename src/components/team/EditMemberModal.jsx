import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertCircle,
  Check,
  Copy,
  KeyRound,
  Pencil,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import SecretPasswordField from '@/components/client/SecretPasswordField';

function generatePassword(length = 12) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%&*';
  const all = upper + lower + digits + symbols;
  const pick = (set) => set[Math.floor(Math.random() * set.length)];
  const chars = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  for (let i = chars.length; i < length; i += 1) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

export default function EditMemberModal({ isOpen, onClose, member, onSave }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [resetPassword, setResetPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [credentials, setCredentials] = useState(null);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    if (!isOpen || !member) return;
    setForm({
      name: member.full_name || member.name || '',
      email: member.email || '',
      password: '',
    });
    setResetPassword(false);
    setErrors({});
    setCredentials(null);
    setCopied('');
    setLoading(false);
  }, [isOpen, member]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const validate = () => {
    const next = {};
    if (!form.email.trim()) next.email = 'E-mail obrigatório';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'E-mail inválido';
    if (resetPassword) {
      if (!form.password || form.password.length < 8) next.password = 'Mínimo de 8 caracteres';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!member?.id || !validate()) return;

    setLoading(true);
    try {
      const payload = {
        userId: member.id || member.$id,
        email: form.email.trim(),
        name: form.name.trim(),
        ...(resetPassword ? { password: form.password } : {}),
      };
      if (!payload.userId) {
        toast.error('Membro sem ID — recarregue a página e tente de novo.');
        return;
      }
      const result = await onSave(payload);
      if (result?.success === false) return;

      if (result?.temporaryPassword) {
        setCredentials({
          email: result.email || form.email.trim(),
          password: result.temporaryPassword,
          loginUrl: `${window.location.origin}/login`,
          name: result.name || form.name.trim(),
        });
        return;
      }

      toast.success(result?.message || 'Membro atualizado.');
      onClose();
    } catch (error) {
      console.error('Error updating member:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyText = async (key, value) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      toast.success('Copiado');
      setTimeout(() => setCopied(''), 1500);
    } catch {
      toast.error('Não foi possível copiar');
    }
  };

  const copyAll = () => {
    if (!credentials) return;
    const text = [
      credentials.name ? `Nome: ${credentials.name}` : null,
      `E-mail: ${credentials.email}`,
      `Senha: ${credentials.password}`,
      `Login: ${credentials.loginUrl}`,
    ]
      .filter(Boolean)
      .join('\n');
    copyText('all', text);
  };

  const handleClose = () => {
    setCredentials(null);
    onClose();
  };

  if (!member) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        {credentials ? (
          <>
            <DialogHeader className="px-5 pt-5 pb-3 space-y-1">
              <DialogTitle className="text-lg">Acesso atualizado</DialogTitle>
              <DialogDescription>
                Compartilhe a nova senha com a pessoa. Ela só aparece agora.
              </DialogDescription>
            </DialogHeader>
            <div className="px-5 pb-5 space-y-3">
              {[
                { key: 'email', label: 'E-mail', value: credentials.email },
                { key: 'password', label: 'Senha', value: credentials.password },
                { key: 'loginUrl', label: 'Link de login', value: credentials.loginUrl },
              ].map((row) => (
                <div key={row.key} className="rounded-xl border border-[#E4DDD4] bg-[#F8F7FC] px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-wide text-[#6B635C]">{row.label}</p>
                      <p className="text-sm font-medium text-[#1A1210] truncate font-mono">{row.value}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="shrink-0 h-8 w-8 p-0"
                      onClick={() => copyText(row.key, row.value)}
                      aria-label={`Copiar ${row.label}`}
                    >
                      {copied === row.key ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" className="flex-1" onClick={copyAll}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar tudo
                </Button>
                <Button type="button" className="flex-1 bg-[#B80015] hover:bg-[#8A0010]" onClick={handleClose}>
                  Concluir
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <DialogHeader className="px-5 pt-5 pb-3 space-y-1">
              <DialogTitle className="text-lg flex items-center gap-2">
                <Pencil className="w-5 h-5 text-[#B80015]" />
                Editar membro
              </DialogTitle>
              <DialogDescription>
                Altere e-mail ou redefine a senha de acesso ao Evocto.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-member-name">Nome</Label>
                <Input
                  id="edit-member-name"
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  placeholder="Nome para exibir no app"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-member-email">E-mail de login</Label>
                <Input
                  id="edit-member-email"
                  type="email"
                  autoComplete="off"
                  value={form.email}
                  onChange={(e) => setField('email', e.target.value)}
                  className={errors.email ? 'border-red-300' : ''}
                />
                {errors.email && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.email}
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-[#E4DDD4] bg-[#F8F7FC] px-3 py-3 space-y-3">
                <label className="flex items-center gap-2 text-sm text-[#1A1210] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={resetPassword}
                    onChange={(e) => {
                      const on = e.target.checked;
                      setResetPassword(on);
                      setField('password', on ? generatePassword() : '');
                    }}
                    className="rounded border-[#C5C0D8]"
                  />
                  <KeyRound className="w-4 h-4 text-[#6B635C]" />
                  Redefinir senha
                </label>

                {resetPassword && (
                  <div className="space-y-2">
                    <Label htmlFor="edit-member-password">Nova senha</Label>
                    <div className="flex gap-2">
                      <div className="flex-1 min-w-0">
                        <SecretPasswordField
                          id="edit-member-password"
                          value={form.password}
                          onChange={(e) => setField('password', e.target.value)}
                          inputClassName={errors.password ? 'border-red-300' : ''}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="shrink-0"
                        onClick={() => setField('password', generatePassword())}
                        aria-label="Gerar nova senha"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </div>
                    {errors.password ? (
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {errors.password}
                      </p>
                    ) : (
                      <p className="text-xs text-[#6B635C]">
                        A senha antiga deixa de funcionar. Compartilhe a nova.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" className="flex-1" onClick={handleClose} disabled={loading}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-[#B80015] hover:bg-[#8A0010]"
                >
                  {loading ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
