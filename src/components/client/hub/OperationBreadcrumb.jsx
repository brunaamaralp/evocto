import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

/**
 * Trail Cliente › Serviço › [Período] › Unidade
 */
export default function OperationBreadcrumb({ crumbs = [] }) {
  if (!Array.isArray(crumbs) || crumbs.length === 0) return null;

  return (
    <nav aria-label="Contexto operacional" className="min-w-0">
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-1 text-xs text-[#777]">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <li key={`${crumb.label}-${index}`} className="inline-flex min-w-0 items-center gap-1">
              {index > 0 ? (
                <ChevronRight className="h-3 w-3 shrink-0 text-[#bbb]" aria-hidden />
              ) : null}
              {crumb.href && !isLast ? (
                <Link
                  to={crumb.href}
                  className="truncate font-medium text-[#555] hover:text-[#007bff]"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  className={`truncate ${isLast ? 'font-semibold text-[#111]' : 'text-[#555]'}`}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
