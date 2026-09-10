/**
 * Simple in-memory rate limiter for public review endpoints.
 * Best-effort on serverless (per-instance); still blocks naive abuse.
 */

const buckets = new Map();

function prune(now) {
  if (buckets.size < 5000) return;
  for (const [key, entry] of buckets) {
    if (entry.resetAt < now) buckets.delete(key);
  }
}

/**
 * @param {string} key
 * @param {{ limit: number, windowMs: number }} opts
 * @returns {{ ok: true } | { ok: false, retryAfterSec: number }}
 */
export function consumeRateLimit(key, { limit, windowMs }) {
  const now = Date.now();
  prune(now);
  const entry = buckets.get(key);
  if (!entry || entry.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (entry.count >= limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }
  entry.count += 1;
  return { ok: true };
}

export function clientIp(req) {
  const xf = String(req.headers?.['x-forwarded-for'] || '')
    .split(',')[0]
    .trim();
  return xf || String(req.headers?.['x-nf-client-connection-ip'] || req.headers?.['client-ip'] || 'unknown');
}
