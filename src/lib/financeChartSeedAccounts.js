/**
 * Merge helpers para completar o plano de contas padrão da agência.
 */

import { DEFAULT_AGENCY_CHART_OF_ACCOUNTS } from './agencyChartOfAccounts.js';

/** @deprecated Prefer DEFAULT_AGENCY_CHART_OF_ACCOUNTS — mantido para imports existentes. */
export function expandedCategorySeedAccounts() {
  return DEFAULT_AGENCY_CHART_OF_ACCOUNTS.map((s) => ({ ...s }));
}

/**
 * @param {Array<{ code?: string }>} existing
 * @param {Array<{ code?: string }>} [seeds]
 */
export function missingSeedAccounts(existing, seeds = DEFAULT_AGENCY_CHART_OF_ACCOUNTS) {
  const have = new Set(
    (Array.isArray(existing) ? existing : [])
      .map((a) => String(a?.code || '').trim())
      .filter(Boolean)
  );
  return (Array.isArray(seeds) ? seeds : []).filter((s) => {
    const code = String(s?.code || '').trim();
    return code && !have.has(code);
  });
}
