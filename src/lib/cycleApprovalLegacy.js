/**
 * Helpers for the legacy /cycle-approval surface.
 * Prefer modern /public-approval (hashed tokens) and /review (material deliveries).
 */

/**
 * Staff-facing href for a cycle awaiting approval (no public token in URL).
 * @param {string} cycleId
 * @param {(path: string) => string} createPageUrl
 */
export function staffCycleApprovalHref(cycleId, createPageUrl) {
  const id = String(cycleId || '').trim();
  if (!id) return createPageUrl('cycle-approval-manager');
  return createPageUrl(`cycle-approval?id=${encodeURIComponent(id)}`);
}

/**
 * Whether the legacy page may mutate a cycle for this session.
 * Clients must not approve via SDK; use portal / public-approval / material review.
 * @param {{ role?: string, agencyId?: string } | null | undefined} profile
 * @param {{ agencyId?: string } | null | undefined} cycle
 */
export function canStaffMutateLegacyCycleApproval(profile, cycle) {
  const role = String(profile?.role || '').toLowerCase();
  if (!profile?.agencyId || role === 'client' || !role) return false;
  if (!cycle?.agencyId) return false;
  return String(cycle.agencyId) === String(profile.agencyId);
}

/**
 * Prefer modern public-approval when the token is not a legacy cycle share token path.
 * Legacy cycle tokens stay on /cycle-approval (staff-only) until migrated.
 * @param {{ token?: string | null, id?: string | null }} params
 */
export function resolveCycleApprovalEntryMode({ token, id } = {}) {
  const t = String(token || '').trim();
  const cycleId = String(id || '').trim();
  if (cycleId) return { mode: 'staff_id', cycleId, token: null };
  if (t) return { mode: 'legacy_token', cycleId: null, token: t };
  return { mode: 'invalid', cycleId: null, token: null };
}
