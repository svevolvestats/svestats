// _shared.js
var CACHE_NAME = "sve-og-v1";
async function fetchJson(url) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(url);
  if (cached) return cached.json();
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} \u2192 ${res.status}`);
  const text = await res.text();
  await cache.put(url, new Response(text, {
    headers: { "Content-Type": "application/json", "Cache-Control": "max-age=3600" }
  }));
  return JSON.parse(text);
}
function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function injectOG(html, { title, description, imageUrl, pageUrl }) {
  let out = html;
  out = out.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`);
  out = out.replace(
    /(<meta property="og:title" content=")[^"]*(")/,
    `$1${escapeHtml(title)}$2`
  );
  const descEscaped = escapeHtml(description);
  const prevOut = out;
  out = out.replace(
    /(<meta property="og:description" content=")[\s\S]*?(")/,
    `$1${descEscaped}$2`
  );
  if (out === prevOut) console.warn("[injectOG] og:description replacement failed \u2014 tag missing or malformed in index.html");
  out = out.replace(/<meta property="og:url"[^>]*>/g, "");
  out = out.replace(/<meta property="og:image"[^>]*>/g, "");
  out = out.replace(/<meta name="twitter:image"[^>]*>/g, "");
  const extra = [
    `<meta property="og:url" content="${escapeHtml(pageUrl)}" />`,
    imageUrl ? `<meta property="og:image" content="${imageUrl}" />` : "",
    imageUrl ? `<meta name="twitter:image" content="${imageUrl}" />` : ""
  ].filter(Boolean).join("\n  ");
  out = out.replace("</head>", `  ${extra}
</head>`);
  return out;
}

// index.js
async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const origin = url.origin;
  const periodParam = url.searchParams.get("period");
  try {
    const dataBase = periodParam ? `${origin}/data/archetypes/${periodParam}` : `${origin}/data`;
    const meta = await fetchJson(`${dataBase}/meta.json`);
    const p = meta.period ?? {};
    const periodStr = p.start && p.end ? `(${p.start}\u301C${p.end})` : "";
    const title = `\u500B\u4EBA\u6226CS\u74B0\u5883${periodStr} | \u30A8\u30DC\u30EB\u30F4\u7D71\u8A08\u5C40`;
    const imageUrl = periodParam ? `${origin}/og/meta/${periodParam}.png` : `${origin}/og/meta.png`;
    const pageUrl = periodParam ? `${origin}/?period=${encodeURIComponent(periodParam)}` : origin;
    const indexRes = await env.ASSETS.fetch(new Request(`${origin}/index.html`));
    const html = await indexRes.text();
    return new Response(injectOG(html, { title, description: "", imageUrl, pageUrl }), {
      headers: {
        "Content-Type": "text/html;charset=UTF-8",
        // same reasoning as _shared.js serveWithOG: stale HTML points at asset
        // hashes a deploy already replaced
        "Cache-Control": "public, max-age=30"
      }
    });
  } catch {
    return env.ASSETS.fetch(new Request(`${origin}/index.html`));
  }
}
export {
  onRequest
};
