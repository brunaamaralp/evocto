/** Helpers de apresentação do perfil do lead (sem I/O). */
import { format, formatDistanceToNowStrict, isToday, isTomorrow, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const TONE_CLASSES = {
  danger: 'border-[#F0B8BC] bg-[#FFF5F5] text-[#B80015]',
  warning: 'border-[#F3D9A4] bg-[#FFF8E8] text-[#8A5A00]',
  ok: 'border-[#CDE5D3] bg-[#F1FAF3] text-[#1F6B36]',
  muted: 'border-[#E4DDD4] bg-[#F8F7FB] text-[#6B635C]',
  neutral: 'border-[#E4DDD4] bg-white text-[#6B635C]',
};

export const TONE_DOT = {
  danger: 'bg-[#B80015]',
  warning: 'bg-[#D99A00]',
  ok: 'bg-[#2E8B57]',
  muted: 'bg-[#B5ACA3]',
  neutral: 'bg-[#B5ACA3]',
};

function toDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(value) {
  const d = toDate(value);
  return d ? format(d, 'dd/MM/yyyy', { locale: ptBR }) : '';
}

export function formatDateTime(value) {
  const d = toDate(value);
  return d ? format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '';
}

/** "Hoje, 14:30" · "Amanhã, 09:00" · "12/03, 10:00" */
export function formatRelativeDay(value) {
  const d = toDate(value);
  if (!d) return '';
  const time = format(d, 'HH:mm');
  if (isToday(d)) return `Hoje, ${time}`;
  if (isTomorrow(d)) return `Amanhã, ${time}`;
  if (isYesterday(d)) return `Ontem, ${time}`;
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return format(d, sameYear ? "dd 'de' MMM, HH:mm" : 'dd/MM/yyyy, HH:mm', { locale: ptBR });
}

export function formatAgo(value) {
  const d = toDate(value);
  if (!d) return '';
  return `há ${formatDistanceToNowStrict(d, { locale: ptBR })}`;
}

export function formatBytes(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

export function memberLabel(member) {
  return String(member?.full_name || member?.name || member?.email || 'Membro').trim();
}

export function memberName(members = [], id) {
  if (!id) return '';
  const m = members.find((x) => String(x.id) === String(id));
  return m ? memberLabel(m) : '';
}

export function leadDisplayName(lead = {}) {
  return String(lead.companyName || lead.name || 'Lead sem nome').trim();
}

/** Tipo de arquivo amigável a partir do mime/extensão. */
export function fileKind(item = {}) {
  const mime = String(item.mimeType || '').toLowerCase();
  const name = String(item.fileName || '').toLowerCase();
  if (mime.startsWith('image/')) return 'Imagem';
  if (mime === 'application/pdf' || name.endsWith('.pdf')) return 'PDF';
  if (/word|\.docx?$/.test(mime) || /\.docx?$/.test(name)) return 'Documento';
  if (/sheet|excel|csv/.test(mime) || /\.(xlsx?|csv)$/.test(name)) return 'Planilha';
  if (/presentation|powerpoint/.test(mime) || /\.pptx?$/.test(name)) return 'Apresentação';
  if (/zip|compressed/.test(mime)) return 'Compactado';
  return 'Arquivo';
}

export const ATTACHMENT_CATEGORIES = [
  { id: 'briefing', label: 'Briefing' },
  { id: 'proposta', label: 'Proposta comercial' },
  { id: 'contrato', label: 'Contrato' },
  { id: 'referencia', label: 'Referência / imagem' },
  { id: 'outro', label: 'Outro' },
];

export const ATTACHMENT_CATEGORY_LABELS = Object.fromEntries(
  ATTACHMENT_CATEGORIES.map((c) => [c.id, c.label])
);
