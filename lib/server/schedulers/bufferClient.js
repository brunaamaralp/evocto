/**
 * Buffer GraphQL API — create scheduled posts.
 * Docs: https://developers.buffer.com/
 */

const BUFFER_API_URL = process.env.BUFFER_API_URL || 'https://api.buffer.com';

export function getBufferConfig() {
  const apiKey = String(process.env.BUFFER_API_KEY || '').trim();
  const channelMap = parseChannelMap(
    process.env.BUFFER_CHANNEL_IDS || process.env.BUFFER_CHANNEL_ID || ''
  );
  const defaultChannelId =
    channelMap.default ||
    channelMap.instagram ||
    Object.values(channelMap)[0] ||
    '';

  return {
    configured: Boolean(apiKey && defaultChannelId),
    apiKey: apiKey || null,
    channelMap,
    defaultChannelId: defaultChannelId || null,
    docsUrl: 'https://developers.buffer.com/guides/posts-and-scheduling.html',
  };
}

function parseChannelMap(raw) {
  const s = String(raw || '').trim();
  if (!s) return {};
  if (s.startsWith('{')) {
    try {
      const obj = JSON.parse(s);
      return Object.fromEntries(
        Object.entries(obj).map(([k, v]) => [String(k).toLowerCase(), String(v).trim()])
      );
    } catch {
      return {};
    }
  }
  // comma list → default + numbered; first is default
  const ids = s.split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean);
  if (ids.length === 1) return { default: ids[0], instagram: ids[0] };
  const map = { default: ids[0] };
  ids.forEach((id, i) => {
    map[`channel_${i}`] = id;
  });
  return map;
}

function resolveChannelIds(channels, cfg) {
  const list = Array.isArray(channels) && channels.length ? channels : ['instagram'];
  const resolved = [];
  for (const ch of list) {
    const key = String(ch || '').toLowerCase();
    const id = cfg.channelMap[key] || cfg.defaultChannelId;
    if (id && !resolved.includes(id)) resolved.push(id);
  }
  if (!resolved.length && cfg.defaultChannelId) resolved.push(cfg.defaultChannelId);
  return resolved;
}

function toDueAt(scheduledFor) {
  if (!scheduledFor) return null;
  const s = String(scheduledFor).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T15:00:00.000Z`;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

async function bufferGraphql(apiKey, query, variables) {
  const res = await fetch(BUFFER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(variables ? { query, variables } : { query }),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Buffer respondeu inválido (HTTP ${res.status})`);
  }
  if (!res.ok) {
    throw new Error(data?.message || data?.error || `Buffer HTTP ${res.status}`);
  }
  if (data.errors?.length) {
    throw new Error(data.errors.map((e) => e.message).join('; '));
  }
  return data.data;
}

/**
 * @param {object} payload canonical schedule payload
 * @param {{ dryRun?: boolean }} opts
 */
export async function pushBufferPosts(payload, opts = {}) {
  const cfg = getBufferConfig();
  if (!cfg.configured) {
    return {
      success: false,
      provider: 'buffer',
      error: 'missing_credentials',
      message:
        'Configure BUFFER_API_KEY e BUFFER_CHANNEL_ID (ou BUFFER_CHANNEL_IDS JSON) no servidor.',
      docsUrl: cfg.docsUrl,
    };
  }

  const posts = Array.isArray(payload?.posts) ? payload.posts : [];
  if (!posts.length) {
    return {
      success: false,
      provider: 'buffer',
      error: 'empty_payload',
      message: 'Nenhum post para agendar.',
    };
  }

  if (opts.dryRun) {
    return {
      success: true,
      provider: 'buffer',
      mode: 'dry_run',
      postCount: posts.length,
      message: `Dry-run: ${posts.length} post(s) prontos para Buffer`,
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
    const channelIds = resolveChannelIds(post.channels, cfg);
    const dueAt = toDueAt(post.scheduled_for);
    const mode = dueAt ? 'customScheduled' : 'addToQueue';

    for (const channelId of channelIds) {
      const query = `
        mutation CreatePost($input: CreatePostInput!) {
          createPost(input: $input) {
            ... on PostActionSuccess {
              post { id dueAt text }
            }
            ... on MutationError {
              message
            }
          }
        }
      `;
      const input = {
        text,
        channelId,
        schedulingType: 'automatic',
        mode,
        ...(dueAt ? { dueAt } : {}),
      };
      try {
        const data = await bufferGraphql(cfg.apiKey, query, { input });
        const action = data?.createPost;
        if (action?.post?.id) {
          results.push({
            localId: post.id,
            channelId,
            remoteId: action.post.id,
            dueAt: action.post.dueAt || dueAt,
          });
        } else {
          errors.push({
            localId: post.id,
            channelId,
            error: action?.message || 'unknown_buffer_error',
          });
        }
      } catch (err) {
        errors.push({
          localId: post.id,
          channelId,
          error: err?.message || 'buffer_request_failed',
        });
      }
    }
  }

  const success = results.length > 0 && errors.length === 0;
  return {
    success,
    provider: 'buffer',
    mode: 'api',
    postCount: results.length,
    created: results,
    errors: errors.length ? errors : undefined,
    message: success
      ? `${results.length} post(s) enviados ao Buffer`
      : results.length
        ? `${results.length} ok, ${errors.length} erro(s)`
        : `Falha Buffer: ${errors[0]?.error || 'sem posts criados'}`,
  };
}
