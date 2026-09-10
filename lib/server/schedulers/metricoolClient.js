/**
 * Metricool REST API — schedule posts.
 * Docs: https://app.metricool.com/resources/apidocs/index.html
 */

const METRICOOL_API_BASE =
  process.env.METRICOOL_API_BASE || 'https://app.metricool.com/api';

const NETWORK_ALIASES = {
  ig: 'instagram',
  instagram: 'instagram',
  fb: 'facebook',
  facebook: 'facebook',
  x: 'twitter',
  twitter: 'twitter',
  linkedin: 'linkedin',
  tiktok: 'tiktok',
  pinterest: 'pinterest',
  youtube: 'youtube',
  gmb: 'gmb',
  threads: 'threads',
};

export function getMetricoolConfig() {
  const userToken = String(process.env.METRICOOL_USER_TOKEN || '').trim();
  const userId = String(process.env.METRICOOL_USER_ID || '').trim();
  const blogId = String(process.env.METRICOOL_BLOG_ID || '').trim();
  const timezone =
    String(process.env.METRICOOL_TIMEZONE || 'America/Sao_Paulo').trim() ||
    'America/Sao_Paulo';

  return {
    configured: Boolean(userToken && userId && blogId),
    userToken: userToken || null,
    userId: userId || null,
    blogId: blogId || null,
    timezone,
    docsUrl: 'https://help.metricool.com/wli-scheduler-endpoint-example-on-a-custom-backend-proxy-frko7',
  };
}

function mapProviders(channels) {
  const list = Array.isArray(channels) && channels.length ? channels : ['instagram'];
  const out = [];
  for (const ch of list) {
    const network = NETWORK_ALIASES[String(ch || '').toLowerCase()];
    if (network && !out.some((p) => p.network === network)) {
      out.push({ network });
    }
  }
  return out.length ? out : [{ network: 'instagram' }];
}

function toPublicationDateTime(scheduledFor, timezone) {
  if (!scheduledFor) {
    const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const iso = d.toISOString().slice(0, 19);
    return { dateTime: iso, timezone };
  }
  const s = String(scheduledFor).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return { dateTime: `${s}T10:00:00`, timezone };
  }
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) {
    return { dateTime: `${s.slice(0, 19)}`, timezone };
  }
  // Metricool wants local-ish ISO without offset
  return { dateTime: d.toISOString().slice(0, 19), timezone };
}

async function metricoolRequest(cfg, path, body) {
  const url = new URL(`${METRICOOL_API_BASE}${path}`);
  url.searchParams.set('userId', cfg.userId);
  url.searchParams.set('blogId', cfg.blogId);

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Mc-Auth': cfg.userToken,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const msg =
      data?.message ||
      data?.error ||
      data?.raw ||
      `Metricool HTTP ${res.status}`;
    const err = new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

export async function pushMetricoolPosts(payload, opts = {}) {
  const cfg = getMetricoolConfig();
  if (!cfg.configured) {
    return {
      success: false,
      provider: 'metricool',
      error: 'missing_credentials',
      message:
        'Configure METRICOOL_USER_TOKEN, METRICOOL_USER_ID e METRICOOL_BLOG_ID no servidor.',
      docsUrl: cfg.docsUrl,
    };
  }

  const posts = Array.isArray(payload?.posts) ? payload.posts : [];
  if (!posts.length) {
    return {
      success: false,
      provider: 'metricool',
      error: 'empty_payload',
      message: 'Nenhum post para agendar.',
    };
  }

  if (opts.dryRun) {
    return {
      success: true,
      provider: 'metricool',
      mode: 'dry_run',
      postCount: posts.length,
      message: `Dry-run: ${posts.length} post(s) prontos para Metricool`,
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
      publicationDate: toPublicationDateTime(post.scheduled_for, cfg.timezone),
      text,
      providers: mapProviders(post.channels),
      autoPublish: true,
      draft: post.status === 'draft',
      shortener: false,
      saveExternalMediaFiles: Boolean(post.mediaUrl),
      ...(post.mediaUrl ? { media: [post.mediaUrl] } : {}),
    };

    try {
      const data = await metricoolRequest(cfg, '/v2/scheduler/posts', body);
      results.push({
        localId: post.id,
        remoteId: data?.id || data?.data?.id || null,
        raw: data,
      });
    } catch (err) {
      errors.push({
        localId: post.id,
        error: err?.message || 'metricool_request_failed',
      });
    }
  }

  const success = results.length > 0 && errors.length === 0;
  return {
    success,
    provider: 'metricool',
    mode: 'api',
    postCount: results.length,
    created: results,
    errors: errors.length ? errors : undefined,
    message: success
      ? `${results.length} post(s) enviados ao Metricool`
      : results.length
        ? `${results.length} ok, ${errors.length} erro(s)`
        : `Falha Metricool: ${errors[0]?.error || 'sem posts criados'}`,
  };
}
