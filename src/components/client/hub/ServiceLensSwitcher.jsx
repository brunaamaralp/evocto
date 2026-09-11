import { Plus } from 'lucide-react';
import { getServiceDisplayName } from '@/lib/serviceOperationProfile';

/**
 * Segmentos de serviço (lente). Visível só com 2+ serviços.
 */
export default function ServiceLensSwitcher({
  services = [],
  selectedServiceId = null,
  attentionCounts = {},
  onSelect,
  onAddService,
}) {
  if (!Array.isArray(services) || services.length < 2) return null;

  return (
    <div
      className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
      role="tablist"
      aria-label="Serviços do cliente"
    >
      {services.map((service) => {
        const id = String(service.id);
        const selected = id === String(selectedServiceId);
        const count = Number(attentionCounts[id] || 0);
        const label = getServiceDisplayName(service);

        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onSelect?.(id)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
              selected
                ? 'border-[#007bff] bg-[#007bff] text-white'
                : 'border-[#ddd] bg-white text-[#333] hover:border-[#bbb]'
            }`}
          >
            <span className="font-medium">{label}</span>
            {count > 0 ? (
              <span
                className={`ml-1.5 tabular-nums ${
                  selected ? 'text-white/90' : 'text-[#c0392b]'
                }`}
              >
                · {count}
              </span>
            ) : null}
          </button>
        );
      })}

      {onAddService ? (
        <button
          type="button"
          onClick={onAddService}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-dashed border-[#ccc] px-3 py-1.5 text-sm font-medium text-[#555] hover:border-[#007bff] hover:text-[#007bff]"
          aria-label="Adicionar serviço"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
