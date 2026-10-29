import { useState } from 'react';
import { Eye, EyeOff, Copy, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

/**
 * Campo de senha com olho (mostrar/ocultar) e cópia para clipboard.
 * Por padrão a senha fica oculta.
 */
export default function SecretPasswordField({
  id,
  value = '',
  onChange,
  placeholder = '••••••••',
  readOnly = false,
  disabled = false,
  className,
  inputClassName,
  showCopy = true,
  emptyLabel = 'Sem senha',
}) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const hasValue = Boolean(String(value || '').length);

  const handleCopy = async () => {
    if (!hasValue) {
      toast.error(emptyLabel);
      return;
    }
    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(true);
      toast.success('Senha copiada');
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Não foi possível copiar a senha');
    }
  };

  return (
    <div className={cn('relative flex items-center gap-1', className)}>
      <div className="relative flex-1">
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          readOnly={readOnly}
          disabled={disabled}
          autoComplete="off"
          className={cn('pr-10 rounded-xl bg-[#F1EDE7] border-transparent', inputClassName)}
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B635C] hover:text-[#1A1210] disabled:opacity-40"
          onClick={() => setVisible((v) => !v)}
          disabled={disabled || (!hasValue && readOnly)}
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          aria-pressed={visible}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {showCopy ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0 rounded-xl"
          onClick={handleCopy}
          disabled={disabled || !hasValue}
          aria-label="Copiar senha"
        >
          {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
        </Button>
      ) : null}
    </div>
  );
}
