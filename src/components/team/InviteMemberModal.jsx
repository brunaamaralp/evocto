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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertCircle,
  Check,
  Copy,
  KeyRound,
  Mail,
  RefreshCw,
  Send,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';

const ROLES = [
  { value: 'admin', label: 'Administrador', hint: 'Gerencia equipe e configurações' },
  { value: 'team', label: 'Membro', hint: 'Executa projetos e tarefas' },
];

const EMPTY_FORM = {
  method: 'password',
  email: '',
  name: '',
  role: 'team',
  password: '',
};

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

export default function InviteMemberModal({ isOpen, onClose, onInvite }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [credentials, setCredentials] = useState(null);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setForm({ ...EMPTY_FORM, password: generatePassword() });
    setErrors({});
    setCredentials(null);
    setCopied('');
    setLoading(false);
  }, [isOpen]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const validate = () => {
    const next = {};
    if (!form.email.trim()) next.email = 'E-mail obrigatório';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'E-mail inválido';
    if (!form.role) next.role = 'Selecione a função';
    if (form.method === 'password') {
      if (!form.password || form.password.length < 8) next.password = 'Mínimo de 8 caracteres';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        method: form.method,
        email: form.email.trim(),
        role: form.role,
        ...(form.method === 'password'
          ? { name: form.name.trim(), password: form.password }
          : {}),
      };
      const result = await onInvite(payload);
      if (result?.success === false) return;
      if (result?.temporaryPassword) {
        setCredentials({
          email: result.email || form.email.trim(),
          password: result.temporaryPassword,
          loginUrl: result.loginUrl || `${window.location.origin}/login`,
          name: result.name || form.name.trim(),
        });
        return;
      }
      setForm(EMPTY_FORM);
    } catch (error) {
      console.error('Error inviting member:', error);
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        {credentials ? (
          <>
            <DialogHeader className="px-5 pt-5 pb-3 space-y-1">
              <DialogTitle className="text-lg">Membro criado</DialogTitle>
              <DialogDescription>
                Compartilhe estes dados com a pessoa. A senha só aparece agora.
              </DialogDescription>
            </DialogHeader>
            <div className="px-5 pb-5 space-y-3">
              {[
                { key: 'email', label: 'E-mail', value: credentials.email },
                { key: 'password', label: 'Senha', value: credentials.password },
                { key: 'loginUrl', label: 'Link de login', value: credentials.loginUrl },
              ].map((row) => (
                <div key={row.key} className="rounded-xl border border-[#E8E5F5] bg-[#F8F7FC] px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-wide text-[#7A7595]">{row.label}</p>
                      <p className="text-sm font-medium text-[#18162A] truncate font-mono">{row.value}</p>
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
                <Button type="button" className="flex-1 bg-[#6C47D8] hover:bg-[#5A3BC0]" onClick={handleClose}>
                  Concluir
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <DialogHeader className="px-5 pt-5 pb-3 space-y-1">
              <DialogTitle className="text-lg flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#6C47D8]" />
                Adicionar membro
              </DialogTitle>
              <DialogDescription>
                Crie o acesso agora ou envie um convite por e-mail.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-4">
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-[#F5F2FC] p-1">
                <button
                  type="button"
                  onClick={() => setField('method', 'password')}
                  className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    form.method === 'password'
                      ? 'bg-white text-[#18162A] shadow-sm'
                      : 'text-[#7A7595] hover:text-[#18162A]'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  Criar senha
                </button>
                <button
                  type="button"
                  onClick={() => setField('method', 'email')}
                  className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    form.method === 'email'
                      ? 'bg-white text-[#18162A] shadow-sm'
                      : 'text-[#7A7595] hover:text-[#18162A]'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  Enviar e-mail
                </button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="invite-email">E-mail</Label>
                <Input
                  id="invite-email"
                  type="email"
                  autoComplete="off"
                  placeholder="pessoa@empresa.com"
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

              {form.method === 'password' && (
                <div className="space-y-2">
                  <Label htmlFor="invite-name">Nome (opcional)</Label>
                  <Input
                    id="invite-name"
                    placeholder="Nome para exibir no app"
                    value={form.name}
                    onChange={(e) => setField('name', e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Função</Label>
                <Select value={form.role} onValueChange={(value) => setField('role', value)}>
                  <SelectTrigger className={errors.role ? 'border-red-300' : ''}>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        <div className="flex flex-col items-start py-0.5">
                          <span className="font-medium">{role.label}</span>
                          <span className="text-xs text-[#7A7595]">{role.hint}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.role && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.role}
                  </p>
                )}
              </div>

              {form.method === 'password' ? (
                <div className="space-y-2">
                  <Label htmlFor="invite-password">Senha de acesso</Label>
                  <div className="flex gap-2">
                    <Input
                      id="invite-password"
                      value={form.password}
                      onChange={(e) => setField('password', e.target.value)}
                      className={`font-mono ${errors.password ? 'border-red-300' : ''}`}
                    />
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
                    <p className="text-xs text-[#7A7595]">
                      Você copia e envia no WhatsApp ou outro canal. Sem e-mail automático.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[#7A7595] rounded-xl bg-[#F8F7FC] border border-[#E8E5F5] px-3 py-2">
                  A pessoa recebe um link por e-mail (válido por 7 dias) para entrar na equipe.
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" className="flex-1" onClick={handleClose} disabled={loading}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-[#6C47D8] hover:bg-[#5A3BC0]"
                >
                  {loading ? (
                    'Salvando...'
                  ) : form.method === 'password' ? (
                    <>
                      <KeyRound className="w-4 h-4 mr-2" />
                      Criar acesso
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Enviar convite
                    </>
                  )}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
