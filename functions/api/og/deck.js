// api/og/deck.js
var VERCEL_OG = "https://project-1ahhd.vercel.app";
function cacheKey(d, s) {
  if (s) return `og/deck/s-${s}.png`;
  return `og/deck/d-${d.slice(0, 24)}.png`;
}
async function onRequest(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const d = url.searchParams.get("d");
  const s = url.searchParams.get("s");
  if (!d && !s) return new Response("missing param", { status: 400 });
  const key = cacheKey(d, s);
  const cached = await env.R2.get(key);
  if (cached) {
    return new Response(cached.body, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=2592000",
        "X-Cache": "HIT"
      }
    });
  }
  const param = s ? `s=${s}` : `d=${d}`;
  const vercelUrl = `${VERCEL_OG}/api/og/deck?${param}`;
  const res = await fetch(vercelUrl);
  if (!res.ok) {
    return new Response("OG generation failed", { status: 502 });
  }
  const buf = await res.arrayBuffer();
  context.waitUntil(
    env.R2.put(key, buf, {
      httpMetadata: { contentType: "image/png" }
    })
  );
  return new Response(buf, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=2592000",
      "X-Cache": "MISS"
    }
  });
}
export {
  onRequest
};
