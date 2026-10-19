import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const TYPE_LABELS = {
  task_overdue: 'Atrasada',
  task_urgent: 'Urgente',
  approval_pending: 'Aprovação',
  cycle_pending: 'Período',
  brief_incomplete: 'Briefing',
};

export default function ClientAttentionPanel({ items = [] }) {
  if (!items.length) return null;

  return (
    <section aria-labelledby="attention-heading" className="border-t border-[#E8E5F5] pt-6">
      <h2 id="attention-heading" className="mb-3 text-sm text-[#7A7595]">
        Merece atenção · {items.length}
      </h2>

      <ul className="space-y-0.5">
        {items.map((item) => {
          const badge = TYPE_LABELS[item.type] || 'Atenção';
          const isUrgent =
            item.type === 'task_overdue' || item.type === 'task_urgent';

          return (
            <li key={item.id}>
              <Link
                to={item.href}
                className="flex items-center justify-between gap-3 rounded-md px-1 py-2 transition-colors hover:bg-[#F5F2FC]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C47D8]/40"
              >
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-medium text-[#18162A]">
                    {item.title}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-[#7A7595]">
                    <span className={isUrgent ? 'text-[#c0392b]' : undefined}>
                      {badge}
                    </span>
                    {item.label ? ` · ${item.label}` : ''}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-[#bbb]" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
