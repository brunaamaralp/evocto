import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getCreateCtaLabel,
  getServiceDisplayName,
  shouldShowCreateCta,
} from '@/lib/serviceOperationProfile';

/**
 * Título do serviço selecionado + CTA único (pertence ao serviço, não ao cliente).
 */
export default function ServiceOperationHeader({
  service,
  profile,
  periodLabel = null,
  onCreate,
}) {
  if (!service) return null;

  const title = getServiceDisplayName(service);
  const showCta = shouldShowCreateCta(profile);
  const ctaLabel = getCreateCtaLabel(profile);
  // CTA text already includes "+ "; Button adds icon separately — strip leading +
  const ctaText = String(ctaLabel || '')
    .replace(/^\+\s*/, '')
    .trim();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-base font-semibold uppercase tracking-wide text-[#111]">
          {title}
        </h2>
        {periodLabel ? (
          <p className="mt-1 text-sm text-[#555]">{periodLabel}</p>
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
