import { MoreHorizontal, Plus } from 'lucide-react';
import { getServiceDisplayName } from '@/lib/serviceOperationProfile';
import { partitionLensServices } from '@/lib/partitionLensServices';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/** Quantos chips cabem na faixa antes do menu “Mais”. */
const MAX_VISIBLE_CHIPS = 3;

function LensChip({ service, selected, attentionCount = 0, onSelect }) {
  const label = getServiceDisplayName(service);
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      title={label}
      onClick={() => onSelect?.(String(service.id))}
      className={`inline-flex max-w-[11rem] shrink-0 items-center rounded-full border px-3.5 py-1.5 text-sm transition-colors sm:max-w-[14rem] ${
        selected
          ? 'border-[#007bff] bg-[#007bff] text-white'
          : 'border-[#ddd] bg-white text-[#333] hover:border-[#bbb]'
      }`}
    >
      <span className="truncate font-medium">{label}</span>
      {attentionCount > 0 ? (
        <span
          className={`ml-1.5 shrink-0 tabular-nums ${
            selected ? 'text-white/90' : 'text-[#c0392b]'
          }`}
        >
          · {attentionCount}
        </span>
      ) : null}
    </button>
  );
}

/**
 * Lente de serviço.
 * 1 serviço → só “Adicionar serviço”
 * 2+ → chips; a partir de 4 serviços, overflow em “Mais”
 */
export default function ServiceLensSwitcher({
  services = [],
  selectedServiceId = null,
  attentionCounts = {},
  onSelect,
  onAddService,
}) {
  if (!Array.isArray(services) || services.length === 0) return null;

  const multi = services.length >= 2;

  if (!multi) {
    if (!onAddService) return null;
    return (
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onAddService}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-[#ccc] px-3 py-1.5 text-sm font-medium text-[#555] hover:border-[#007bff] hover:text-[#007bff]"
          aria-label="Adicionar serviço"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Adicionar serviço
        </button>
      </div>
    );
  }

  const { visible, overflow } = partitionLensServices(
    services,
    selectedServiceId,
    MAX_VISIBLE_CHIPS
  );
  const overflowAttention = overflow.reduce(
    (sum, s) => sum + Number(attentionCounts[String(s.id)] || 0),
    0
  );

  return (
    <div className="space-y-2">
      <div
        className="-mx-1 flex flex-wrap items-center gap-2 px-1"
        role="tablist"
        aria-label="Serviços do cliente"
      >
        {visible.map((service) => {
          const id = String(service.id);
          return (
            <LensChip
              key={id}
              service={service}
              selected={id === String(selectedServiceId)}
              attentionCount={Number(attentionCounts[id] || 0)}
              onSelect={onSelect}
            />
          );
        })}

        {overflow.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#ddd] bg-white px-3 py-1.5 text-sm font-medium text-[#333] hover:border-[#bbb]"
                aria-label={`Mais serviços (${overflow.length})`}
              >
                <MoreHorizontal className="h-3.5 w-3.5" aria-hidden />
                Mais
                {overflowAttention > 0 ? (
                  <span className="tabular-nums text-[#c0392b]">
                    · {overflowAttention}
                  </span>
                ) : (
                  <span className="tabular-nums text-[#888]">
                    · {overflow.length}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="max-h-72 min-w-[14rem] overflow-y-auto"
            >
              {overflow.map((service) => {
                const id = String(service.id);
                const count = Number(attentionCounts[id] || 0);
                const label = getServiceDisplayName(service);
                return (
                  <DropdownMenuItem
                    key={id}
                    onSelect={() => onSelect?.(id)}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="truncate">{label}</span>
                    {count > 0 ? (
                      <span className="shrink-0 tabular-nums text-[#c0392b]">
                        {count}
                      </span>
                    ) : null}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}

        {onAddService ? (
          <button
            type="button"
            onClick={onAddService}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-dashed border-[#ccc] px-3 py-1.5 text-sm font-medium text-[#555] hover:border-[#007bff] hover:text-[#007bff]"
            aria-label="Adicionar serviço"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            <span>Serviço</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
