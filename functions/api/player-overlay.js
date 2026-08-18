// api/player-overlay.js
var AUTH = "https://auth.svestats.cc/api/player-link/public";
var TTL = 60;
var EMPTY = { names: {}, visible: {}, sns: {} };
function json(body, ttl) {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": `public, max-age=${ttl}`
    }
  });
}
async function onRequest() {
  try {
    const res = await fetch(AUTH, {
      // Workers edge cache: only the first request in each TTL window reaches the VM.
      cf: { cacheTtl: TTL, cacheEverything: true },
      headers: { "User-Agent": "svestats-overlay" },
      signal: AbortSignal.timeout(4e3)
    });
    if (!res.ok) return json(EMPTY, 10);
    const data = await res.json();
    return json(
      {
        names: data?.names || {},
        visible: data?.visible || {},
        sns: data?.sns || {}
      },
      TTL
    );
  } catch {
    return json(EMPTY, 10);
  }
}
export {
  onRequest
};
