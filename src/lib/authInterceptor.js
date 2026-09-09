/** Interceptor no-op — Evocto usa backend local, sem JWT de API. */
export async function authedFetch(url, options = {}) {
  const res = await fetch(url, options);
  return res;
}

export default authedFetch;
