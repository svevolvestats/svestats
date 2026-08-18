// api/player-overlay.js
var AUTH = "https://auth.svestats.cc/api/player-link/public";
var TTL = 60;
var ERR_TTL = 10;
var EMPTY = { names: {}, visible: {}, sns: {} };
function json(body, ttl) {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": `public, max-age=${ttl}`
    }
  });
}
async function onRequest(context) {
  const { request, waitUntil } = context;
  const cache = caches.default;
  const cacheKey = new Request(new URL("/api/player-overlay", request.url).toString(), { method: "GET" });
  const hit = await cache.match(cacheKey);
  if (hit) return hit;
  let res;
  try {
    const up = await fetch(AUTH, {
      headers: { "User-Agent": "svestats-overlay" },
      signal: AbortSignal.timeout(4e3)
    });
    if (!up.ok) throw new Error(`upstream ${up.status}`);
    const data = await up.json();
    res = json(
      { names: data?.names || {}, visible: data?.visible || {}, sns: data?.sns || {} },
      TTL
    );
  } catch {
    res = json(EMPTY, ERR_TTL);
  }
  waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}
export {
  onRequest
};
