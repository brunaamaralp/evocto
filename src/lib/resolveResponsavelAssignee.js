/**
 * Resolve `responsavel` (bruna|duda|cliente) em `assigneeId`/`assigneeName`
 * a partir da lista `profiles` da agência.
 *
 * @param {object[]} profiles
 * @param {string} responsavel
 * @returns {{ assigneeId: string|null, assigneeName: string } | null}
 */
export function resolveResponsavelAssignee(profiles = [], responsavel) {
  const raw = String(responsavel || '').trim();
  if (!raw) return null;

  const lower = raw.toLowerCase();
  if (/cliente/.test(lower)) {
    return { assigneeId: null, assigneeName: 'Cliente' };
  }

  const parts = raw
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  const wantsBruna = parts.some((p) => p.toLowerCase() === 'bruna' || /bruna/i.test(p));
  const wantsDuda = parts.some((p) => p.toLowerCase() === 'duda' || /duda/i.test(p));

  const target = wantsBruna ? 'bruna' : wantsDuda ? 'duda' : null;
  if (!target) return null;

  const byName = (arr) =>
    (arr || []).find((p) => {
      const hay = `${p?.name || ''} ${p?.full_name || ''} ${p?.email || ''}`.toLowerCase();
      return target === 'bruna' ? /bruna/i.test(hay) : /duda/i.test(hay);
    });

  const profile =
    byName(profiles) ||
    // fallback: escolhe o primeiro profile com role "team"
    null;

  const assigneeId = profile ? profile.userId || profile.id || null : null;
  const assigneeName = profile
    ? profile.full_name || profile.name || profile.email || String(profile.id)
    : target === 'bruna'
      ? 'Bruna'
      : 'Duda';

  return { assigneeId, assigneeName };
}

