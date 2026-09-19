const urls = [
  'https://evocto.com',
  'https://www.evocto.com',
  'https://app.evocto.com',
  'https://evocto.netlify.app',
  'https://evocto.vercel.app',
];

async function probe(u) {
  try {
    const res = await fetch(u, { method: 'GET', redirect: 'follow' });
    const finalUrl = res.url;
    const text = await res.text();
    const looksSpa =
      /id=["']root["']/.test(text) ||
      /Evocto/.test(text) ||
      /vite|react/i.test(text);
    const hasMaterialHint = /material|review/i.test(text);
    return {
      url: u,
      status: res.status,
      finalUrl,
      looksSpa,
      titleMatch: (text.match(/<title[^>]*>([^<]*)/i) || [])[1] || null,
      hasMaterialHint,
    };
  } catch (err) {
    return { url: u, error: err.message };
  }
}

const results = [];
for (const u of urls) results.push(await probe(u));

// API probes if we find a live origin
const origins = [
  ...new Set(
    results
      .filter((r) => r.status && r.status < 500 && r.finalUrl)
      .map((r) => new URL(r.finalUrl).origin)
  ),
];

const api = [];
for (const origin of origins) {
  const endpoint = `${origin}/api/material-deliveries?route=review`;
  try {
    const res = await fetch(endpoint, { method: 'GET' });
    const body = await res.json().catch(() => ({}));
    api.push({
      endpoint,
      status: res.status,
      error: body.error || null,
      ok: body.ok ?? null,
      keys: Object.keys(body || {}),
    });
  } catch (err) {
    api.push({ endpoint, error: err.message });
  }
}

console.log(JSON.stringify({ hosts: results, api }, null, 2));
