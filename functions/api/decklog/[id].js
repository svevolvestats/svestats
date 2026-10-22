// api/decklog/[id].js
var FALLBACK_URL = "https://auth.svestats.cc/api/deck-recipe/";
var DECKLOG_TIMEOUT_MS = 8e3;
function json(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
async function fetchDecklog(deckId) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), DECKLOG_TIMEOUT_MS);
  try {
    const res = await fetch(`https://decklog.bushiroad.com/system/app/api/view/${deckId}`, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        "accept": "application/json, text/plain, */*",
        "x-accept-version": "v1",
        "origin": "https://decklog.bushiroad.com",
        "Referer": `https://decklog.bushiroad.com/view/${deckId}`,
        "X-Requested-With": "XMLHttpRequest",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      },
      body: JSON.stringify({ referrer: `https://decklog.bushiroad.com/view/${deckId}` })
    });
    let data = null;
    try {
      data = await res.json();
    } catch {
    }
    return { status: res.status, data };
  } catch (e) {
    return { status: 0, data: null, error: e.message };
  } finally {
    clearTimeout(timer);
  }
}
async function fetchFallback(deckId) {
  try {
    const res = await fetch(FALLBACK_URL + encodeURIComponent(deckId));
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data?.list) ? data : null;
  } catch {
    return null;
  }
}
async function onRequestPost(context) {
  const deckId = context.params.id;
  const dl = await fetchDecklog(deckId);
  const healthy = dl.status >= 200 && dl.status < 300 && dl.data;
  if (healthy || dl.status >= 400 && dl.status < 500 && dl.data) return json(dl.data, dl.status);
  const fb = await fetchFallback(deckId);
  if (fb) return json(fb, 200);
  return json({ error: dl.error || `decklog ${dl.status}`, decklog_down: true }, dl.status >= 500 ? dl.status : 502);
}
export {
  onRequestPost
};
