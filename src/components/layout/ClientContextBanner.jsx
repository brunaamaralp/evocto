import { Link } from 'react-router-dom';
import { Building2, X } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { CLIENT_CONTEXT } from '@/lib/clientContextTheme';

/**
 * Faixa + chip persistentes: deixa óbvio que o usuário saiu do menu global.
 */
export default function ClientContextBanner({
  clientId,
  className = '',
}) {
  if (!clientId) return null;

  return (
    <div className={`${className}`}>
      <div className={`h-1 w-full ${CLIENT_CONTEXT.topBar}`} aria-hidden />
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-2.5 bg-teal-50/90 border-b border-teal-100">
        <div className="flex items-center gap-2 min-w-0">
          <Building2 className="w-4 h-4 text-teal-900/80 shrink-0" aria-hidden />
        </div>
        <Link
          to={createPageUrl('clients')}
          className="inline-flex items-center gap-1 text-xs font-medium text-teal-800 hover:text-teal-950 shrink-0 rounded-full px-2 py-1 hover:bg-teal-100/80 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          {CLIENT_CONTEXT.exitLabel}
        </Link>
      </div>
    </div>
  );
}
