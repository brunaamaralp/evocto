/**
 * Particiona serviços da lente: selecionado sempre visível; resto em overflow.
 */

export function partitionLensServices(
  services,
  selectedServiceId,
  maxVisible = 3
) {
  const list = Array.isArray(services) ? services.filter((s) => s?.id) : [];
  if (list.length === 0) return { visible: [], overflow: [] };

  const selectedId = selectedServiceId != null ? String(selectedServiceId) : null;
  const selected = selectedId
    ? list.find((s) => String(s.id) === selectedId)
    : null;
  const rest = list.filter((s) => String(s.id) !== selectedId);

  const visible = [];
  if (selected) visible.push(selected);
  for (const service of rest) {
    if (visible.length >= maxVisible) break;
    visible.push(service);
  }

  const visibleIds = new Set(visible.map((s) => String(s.id)));
  const overflow = list.filter((s) => !visibleIds.has(String(s.id)));

  return { visible, overflow };
}
