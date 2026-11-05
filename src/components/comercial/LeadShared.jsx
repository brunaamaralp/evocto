/**
 * Peças compartilhadas do perfil do lead: seção editável inline, badges e estados.
 */
import { useEffect, useState } from 'react';
import { AlertCircle, Loader2, Pencil, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  buildLeadPatch,
  toDateInputValue,
  validateLeadPatch,
} from '@/lib/agencyLeads/leadFields';
import { TONE_CLASSES, TONE_DOT, memberLabel } from './leadUi';

const NONE = '__none__';

export function SectionCard({ title, icon: Icon, action, children, className }) {
  return (
    <section className={cn('rounded-2xl border border-[#E4DDD4] bg-white', className)}>
      {title ? (
        <header className="flex items-center justify-between gap-2 border-b border-[#F1EDE7] px-4 py-2.5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-[#1A1210]">
            {Icon ? <Icon className="h-4 w-4 text-[#B80015]" aria-hidden /> : null}
            {title}
          </h3>
          {action}
        </header>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function FollowUpBadge({ followUp, className, compact = false }) {
  if (!followUp || !followUp.label) return null;
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium',
        TONE_CLASSES[followUp.tone] || TONE_CLASSES.neutral,
        className
      )}
      title={followUp.label}
    >
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', TONE_DOT[followUp.tone])} aria-hidden />
      <span className="truncate">{compact ? followUp.label.replace('Sem acompanhamento há', 'Parado há') : followUp.label}</span>
    </span>
  );
}

export function TabLoading({ label = 'Carregando…' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-[#6B635C]" role="status">
      <Loader2 className="h-4 w-4 animate-spin text-[#B80015]" />
      {label}
    </div>
  );
}

export function TabEmpty({ icon: Icon, title, description, action }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#E4DDD4] bg-white px-5 py-8 text-center">
      {Icon ? <Icon className="mx-auto h-6 w-6 text-[#B5ACA3]" aria-hidden /> : null}
      <p className="mt-2 text-sm font-semibold text-[#1A1210]">{title}</p>
      {description ? <p className="mt-1 text-xs leading-relaxed text-[#6B635C]">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function TabError({ message, onRetry, schemaMissing = false }) {
  return (
    <div className="flex items-start gap-2 rounded-2xl border border-[#F0B8BC] bg-[#FFF5F5] px-4 py-3 text-sm">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#B80015]" />
      <div className="min-w-0">
        {schemaMissing ? (
          <>
            <p className="font-medium text-[#1A1210]">Recurso ainda em configuração</p>
            <p className="mt-1 text-xs leading-relaxed text-[#6B635C]">
              Peça ao administrador para rodar{' '}
              <span className="font-medium text-[#1A1210]">npm run appwrite:setup-agency-lead-crm</span>{' '}
              e atualize a página. Os dados básicos do lead continuam funcionando.
            </p>
          </>
        ) : (
          <p className="text-[#1A1210]">{message || 'Não foi possível carregar.'}</p>
        )}
        {onRetry ? (
          <Button type="button" variant="link" className="mt-1 h-auto p-0 text-xs" onClick={onRetry}>
            <RefreshCw className="mr-1 h-3 w-3" />
            Tentar novamente
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function MemberSelect({ members = [], value, onChange, placeholder = 'Selecionar', id, allowEmpty = true }) {
  return (
    <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? '' : v)}>
      <SelectTrigger id={id} className="mt-1.5">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowEmpty ? <SelectItem value={NONE}>Ninguém</SelectItem> : null}
        {members.map((m) => (
          <SelectItem key={m.id} value={String(m.id)}>
            {memberLabel(m)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function initialValue(field, lead) {
  const raw = lead?.[field.key];
  if (field.type === 'date') return toDateInputValue(raw);
  if (raw === null || raw === undefined) return '';
  if (field.type === 'money' || field.type === 'percent') return String(raw);
  return String(raw);
}

function FieldInput({ field, value, onChange, members }) {
  const id = `lead-field-${field.key}`;
  let control;
  if (field.type === 'select') {
    control = (
      <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? '' : v)}>
        <SelectTrigger id={id} className="mt-1.5">
          <SelectValue placeholder={field.placeholder || 'Selecionar'} />
        </SelectTrigger>
        <SelectContent>
          {field.required ? null : <SelectItem value={NONE}>—</SelectItem>}
          {field.options.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  } else if (field.type === 'member') {
    control = <MemberSelect id={id} members={members} value={value} onChange={onChange} />;
  } else if (field.type === 'textarea') {
    control = (
      <Textarea
        id={id}
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5"
        placeholder={field.placeholder}
      />
    );
  } else {
    control = (
      <Input
        id={id}
        type={field.type === 'date' ? 'date' : field.type === 'email' ? 'email' : 'text'}
        inputMode={field.type === 'money' || field.type === 'percent' ? 'decimal' : field.type === 'tel' ? 'tel' : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5"
        placeholder={field.placeholder}
      />
    );
  }
  return (
    <div className={field.full || field.type === 'textarea' ? 'sm:col-span-2' : undefined}>
      <Label htmlFor={id} className="text-xs text-[#6B635C]">
        {field.label}
        {field.required ? ' *' : ''}
      </Label>
      {control}
    </div>
  );
}

/**
 * Seção do perfil com leitura compacta e edição inline.
 * `fields`: [{ key, label, type, options?, render?(lead), full?, required?, placeholder?, hidden?(lead) }]
 */
export function EditableSection({ title, icon, lead, fields, members = [], onSave, canEdit = true }) {
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) return;
    setValues(Object.fromEntries(fields.map((f) => [f.key, initialValue(f, lead)])));
    // só reinicia ao entrar em edição
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const handleSave = async () => {
    const patch = buildLeadPatch(values);
    const error = validateLeadPatch(patch);
    if (error) {
      toast.error(error);
      return;
    }
    setSaving(true);
    try {
      await onSave(patch);
      toast.success('Alterações salvas');
      setEditing(false);
    } catch (err) {
      toast.error(err?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const visible = fields.filter((f) => !f.hidden || !f.hidden(editing ? { ...lead, ...values } : lead));

  return (
    <SectionCard
      title={title}
      icon={icon}
      action={
        canEdit && !editing ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-[#6B635C] hover:text-[#B80015]"
            onClick={() => setEditing(true)}
          >
            <Pencil className="mr-1 h-3.5 w-3.5" />
            Editar
          </Button>
        ) : null
      }
    >
      {editing ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {visible.map((f) => (
              <FieldInput
                key={f.key}
                field={f}
                members={members}
                value={values[f.key] ?? ''}
                onChange={(v) => setValues((p) => ({ ...p, [f.key]: v }))}
              />
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-[#B80015] hover:bg-[#8A0010]"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
              Salvar
            </Button>
          </div>
        </div>
      ) : (
        <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
          {visible.map((f) => {
            const rendered = f.render ? f.render(lead) : lead?.[f.key];
            const empty = rendered === null || rendered === undefined || rendered === '';
            return (
              <div key={f.key} className={cn('min-w-0', f.full || f.type === 'textarea' ? 'sm:col-span-2' : '')}>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-[#9A9088]">{f.label}</dt>
                <dd
                  className={cn(
                    'mt-0.5 break-words text-sm',
                    empty ? 'text-[#B5ACA3]' : 'text-[#1A1210]',
                    f.type === 'textarea' ? 'whitespace-pre-wrap' : ''
                  )}
                >
                  {empty ? '—' : rendered}
                </dd>
              </div>
            );
          })}
        </dl>
      )}
    </SectionCard>
  );
}
