import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, X } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { CLIENT_CONTEXT } from '@/lib/clientContextTheme';

/**
 * Faixa + chip persistentes: deixa óbvio que o usuário saiu do menu global.
 */
export default function ClientContextBanner({
  clientName,
  clientId,
  className = '',
}) {
  if (!clientId && !clientName) return null;

  return (
    <div className={`${className}`}>
      <div className={`h-1.5 w-full ${CLIENT_CONTEXT.topBar}`} aria-hidden />
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-2 bg-teal-50 border-b border-teal-200">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold shrink-0 ${CLIENT_CONTEXT.chip}`}
          >
            <Building2 className="w-3.5 h-3.5" />
            {CLIENT_CONTEXT.label}
          </span>
          {clientName && (
            <span className="text-sm font-medium text-teal-950 truncate">
              {clientName}
            </span>
          )}
        </div>
        <Link
          to={createPageUrl('clients')}
          className="inline-flex items-center gap-1 text-xs font-medium text-teal-800 hover:text-teal-950 shrink-0"
        >
          <X className="w-3.5 h-3.5" />
          {CLIENT_CONTEXT.exitLabel}
        </Link>
      </div>
    </div>
  );
}
