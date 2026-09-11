import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getCreateCtaLabel,
  getServiceDisplayName,
  shouldShowCreateCta,
} from '@/lib/serviceOperationProfile';

/**
 * Orientação tipográfica do serviço + CTA contextual.
 * Sem card, badge de taxonomia ou copy meta.
 */
export default function ServiceOperationHeader({
  service,
  profile,
  periodLabel = null,
  onCreate,
  hasUnits = false,
}) {
  if (!service) return null;

  const title = getServiceDisplayName(service);
  const showCta = shouldShowCreateCta(profile) && hasUnits;
  const ctaLabel = getCreateCtaLabel(profile);
  const ctaText = String(ctaLabel || '')
    .replace(/^\+\s*/, '')
    .trim();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-0.5">
        <h2 className="text-lg font-semibold tracking-tight text-[#111] sm:text-xl">
          {title}
        </h2>
        {periodLabel ? (
          <p className="text-sm text-[#666]">{periodLabel}</p>
        ) : null}
      </div>
      {showCta && ctaText ? (
        <Button
          className="w-full shrink-0 bg-[#007bff] hover:bg-[#0056b3] sm:w-auto"
          onClick={onCreate}
        >
          <Plus className="mr-1.5 h-4 w-4" aria-hidden />
          {ctaText}
        </Button>
      ) : null}
    </div>
  );
}
