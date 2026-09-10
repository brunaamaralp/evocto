/**
 * Later scheduling connector (best-effort).
 * Later does not publish a stable public developer API; this uses the
 * commonly reported REST base when agency/business tokens exist.
 * Prefer Buffer or Metricool for production automation.
 */

const LATER_API_BASE = process.env.LATER_API_BASE || 'https://api.later.com/v2';

export function getLaterConfig() {
  const accessToken = String(process.env.LATER_ACCESS_TOKEN || '').trim();
  const profileIds = String(process.env.LATER_PROFILE_IDS || '')
    .split(/[,;\s]+/)
    .map((x) => x.trim())
    .filter(Boolean);

  return {
    configured: Boolean(accessToken && profileIds.length),
    accessToken: accessToken || null,
    profileIds,
    docsUrl: 'https://www.later.com/',
    note:
      'Later não oferece API pública oficial estável. Connector experimental — use Buffer/Metricool se falhar.',
  };
}

function toScheduledAt(scheduledFor) {
  if (!scheduledFor) return null;
  const s = String(scheduledFor).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T15:00:00Z`;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

async function laterRequest(cfg, method, path, body) {
  const res = await fetch(`${LATER_API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.accessToken}`,
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text?.slice(0, 400) };
  }

  if (!res.ok) {
    const msg =
      data?.message ||
      data?.error ||
      data?.raw ||
      `Later HTTP ${res.status}`;
    const err = new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function pushLaterPosts(payload, opts = {}) {
  const cfg = getLaterConfig();
  if (!cfg.configured) {
    return {
      success: false,
      provider: 'later',
      error: 'missing_credentials',
      message:
        'Configure LATER_ACCESS_TOKEN e LATER_PROFILE_IDS no servidor (API experimental).',
      docsUrl: cfg.docsUrl,
      note: cfg.note,
    };
  }

  const posts = Array.isArray(payload?.posts) ? payload.posts : [];
  if (!posts.length) {
    return {
      success: false,
      provider: 'later',
      error: 'empty_payload',
      message: 'Nenhum post para agendar.',
    };
  }

  if (opts.dryRun) {
    return {
      success: true,
      provider: 'later',
      mode: 'dry_run',
      postCount: posts.length,
      message: `Dry-run: ${posts.length} post(s) prontos para Later`,
      note: cfg.note,
    };
  }

  const results = [];
  const errors = [];

  for (const post of posts) {
    const text = String(post.caption || post.title || '').trim();
    if (!text) {
      errors.push({ localId: post.id, error: 'empty_text' });
      continue;
    }

    const body = {
      text,
      profile_ids: cfg.profileIds,
      title: post.title || undefined,
      scheduled_at: toScheduledAt(post.scheduled_for) || undefined,
      media_url: post.mediaUrl || undefined,
    };

    try {
      const data = await laterRequest(cfg, 'POST', '/posts', body);
      results.push({
        localId: post.id,
        remoteId: data?.id || data?.data?.id || null,
        raw: data,
      });
    } catch (err) {
      errors.push({
        localId: post.id,
        error: err?.message || 'later_request_failed',
      });
    }
  }

  const success = results.length > 0 && errors.length === 0;
  return {
    success,
    provider: 'later',
    mode: 'api',
    postCount: results.length,
    created: results,
    errors: errors.length ? errors : undefined,
    note: cfg.note,
    message: success
      ? `${results.length} post(s) enviados ao Later`
      : results.length
        ? `${results.length} ok, ${errors.length} erro(s)`
        : `Falha Later: ${errors[0]?.error || 'sem posts criados'}. Prefira Buffer/Metricool se a API Later não estiver habilitada na conta.`,
  };
}
