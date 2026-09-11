/**
 * Header de identidade do cliente — sem CTA operacional.
 */
export default function ClientHubHeader({
  clientName,
  statusLabel = null,
  serviceCount = 0,
}) {
  const meta =
    serviceCount > 1
      ? [
          statusLabel || 'Cliente ativo',
          `${serviceCount} serviços`,
        ].join(' · ')
      : statusLabel
        ? statusLabel === 'Ativo' || statusLabel.toLowerCase() === 'ativo'
          ? 'Cliente ativo'
          : statusLabel
        : 'Cliente ativo';

  return (
    <header className="min-w-0 space-y-2">
      <h1 className="truncate text-[1.375rem] font-bold tracking-tight text-[#111] sm:text-[1.5rem]">
        {clientName || 'Cliente'}
      </h1>
      <p className="text-sm text-[#555]">{meta}</p>
    </header>
  );
}
