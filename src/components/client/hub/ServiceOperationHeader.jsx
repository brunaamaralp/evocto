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
        <h2 className="text-lg font-semibold tracking-tight text-[#18162A] sm:text-xl">
          {title}
        </h2>
        {periodLabel ? (
          <p className="text-sm text-[#7A7595]">{periodLabel}</p>
        ) : null}
      </div>
      {showCta && ctaText ? (
        <Button
          className="w-full shrink-0 bg-[#6C47D8] hover:bg-[#5A3BC0] sm:w-auto"
          onClick={onCreate}
        >
          <Plus className="mr-1.5 h-4 w-4" aria-hidden />
          {ctaText}
        </Button>
      ) : null}
    </div>
  );
}
