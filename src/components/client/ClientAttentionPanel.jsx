import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const TYPE_LABELS = {
  task_overdue: 'Atrasada',
  task_urgent: 'Urgente',
  approval_pending: 'Aprovação',
  cycle_pending: 'Ciclo',
  brief_incomplete: 'Briefing',
};

export default function ClientAttentionPanel({ items = [] }) {
  if (!items.length) return null;

  return (
    <section
      aria-labelledby="attention-heading"
      className="border-t border-[#eee] pt-8"
    >
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2
          id="attention-heading"
          className="text-sm font-semibold uppercase tracking-wide text-[#555]"
        >
          Merece atenção · {items.length}
        </h2>
      </div>

      <ul className="space-y-1">
        {items.map((item) => {
          const badge = TYPE_LABELS[item.type] || 'Atenção';
          const isUrgent =
            item.type === 'task_overdue' || item.type === 'task_urgent';

          return (
            <li key={item.id}>
              <Link
                to={item.href}
                className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-[#f9f9f9]"
              >
                <div className="min-w-0 flex-1 text-left">
                  <div className="mb-0.5 flex flex-wrap items-center gap-2">
                    <span
                      className={`text-xs font-semibold ${
                        isUrgent ? 'text-[#c0392b]' : 'text-[#555]'
                      }`}
                    >
                      {badge}
                    </span>
                    {item.label ? (
                      <span className="truncate text-xs text-[#555]">{item.label}</span>
                    ) : null}
                  </div>
                  <p className="truncate text-sm font-medium text-[#111]">{item.title}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-[#555]" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
