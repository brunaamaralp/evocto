import React from 'react';

/**
 * Soft UI page header: bold title + optional subtitle/metrics + actions.
 */
export default function PageHeader({
  title,
  subtitle,
  meta,
  metrics,
  actions,
  toolbar,
  prefix,
  className = '',
  metaClassName = '',
  animate = true,
}) {
  const rootClass = [
    'flex flex-col gap-4 mb-6',
    animate ? 'animate-in fade-in duration-300' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <header className={rootClass}>
      {prefix}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#18162A]">
            {title}
          </h1>
          {subtitle ? (
            <p className="text-sm text-[#7A7595] max-w-2xl">{subtitle}</p>
          ) : null}
          {meta ? (
            <p
              className={`text-xs font-medium text-[#9B8EC4] uppercase tracking-wide ${metaClassName}`}
              data-page-meta
            >
              {meta}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex items-center gap-2 shrink-0 flex-wrap">{actions}</div>
        ) : null}
      </div>

      {Array.isArray(metrics) && metrics.length > 0 ? (
        <div className="flex flex-wrap gap-6 sm:gap-8 pt-1">
          {metrics.map((m, i) => (
            <div key={m.label || i} className="evocto-kpi">
              <span className="evocto-kpi-value">{m.value}</span>
              <span className="evocto-kpi-label">{m.label}</span>
            </div>
          ))}
        </div>
      ) : null}

      {toolbar ? (
        <div className="rounded-2xl bg-[#F5F2FC]/80 border border-[#E8E5F5]/80 p-3 sm:p-4">
          {toolbar}
        </div>
      ) : null}
    </header>
  );
}
