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
async function serveWithOG(context, ogProps) {
  const origin = new URL(context.request.url).origin;
  const indexRes = await context.env.ASSETS.fetch(new Request(`${origin}/index.html`));
  const html = await indexRes.text();
  return new Response(injectOG(html, ogProps), {
    headers: {
      "Content-Type": "text/html;charset=UTF-8",
      "Cache-Control": "public, max-age=300"
    }
  });
}

// crunch.js
async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const origin = url.origin;
  const expParam = url.searchParams.get("exp");
  try {
    const crunch = await fetchJson(`${origin}/data/crunch.json`);
    const expansions = crunch?.expansions || [];
    const exp = expansions.find((e) => e.expansion === expParam) || expansions[0];
    const expLabel = exp ? `${exp.expansion} ${exp.name}` : "";
    const title = exp ? `\u65B0\u5F3E\u30AB\u30FC\u30C9\u756A\u53F7\u63A8\u5B9A ${exp.expansion} | \u30A8\u30DC\u30EB\u30F4\u7D71\u8A08\u5C40` : "\u65B0\u5F3E\u30AB\u30FC\u30C9\u756A\u53F7\u63A8\u5B9A | \u30A8\u30DC\u30EB\u30F4\u7D71\u8A08\u5C40";
    const description = exp ? `Shadowverse EVOLVE ${expLabel} \u306E\u672A\u767A\u58F2\u30AB\u30FC\u30C9\u756A\u53F7\u3092\u3001\u516C\u958B\u6E08\u307F\u30AB\u30FC\u30C9\u3068\u767A\u8868\u30EC\u30A2\u30EA\u30C6\u30A3\u679A\u6570\u304B\u3089\u63A8\u5B9A` : "Shadowverse EVOLVE \u672A\u767A\u58F2\u30D1\u30C3\u30AF\u306E\u30AB\u30FC\u30C9\u756A\u53F7\u3092\u30AF\u30E9\u30B9\u30FB\u30EC\u30A2\u30EA\u30C6\u30A3\u5225\u306B\u63A8\u5B9A";
    const pageUrl = expParam ? `${origin}/crunch?exp=${encodeURIComponent(expParam)}` : `${origin}/crunch`;
    return await serveWithOG(context, { title, description, pageUrl });
  } catch {
    return await serveWithOG(context, {
      title: "\u65B0\u5F3E\u30AB\u30FC\u30C9\u756A\u53F7\u63A8\u5B9A | \u30A8\u30DC\u30EB\u30F4\u7D71\u8A08\u5C40",
      description: "Shadowverse EVOLVE \u672A\u767A\u58F2\u30D1\u30C3\u30AF\u306E\u30AB\u30FC\u30C9\u756A\u53F7\u3092\u30AF\u30E9\u30B9\u30FB\u30EC\u30A2\u30EA\u30C6\u30A3\u5225\u306B\u63A8\u5B9A",
      pageUrl: `${origin}/crunch`
    });
  }
}
export {
  onRequest
};
