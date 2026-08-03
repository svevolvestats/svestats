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
      // Keep this short. The HTML names hashed asset files, so a stale copy asks
      // for chunks a deploy already replaced -> 404 -> the error screen, and the
      // screen's recovery button hits the very same cached HTML. 300s meant the
      // site could look broken for five minutes after every deploy; main.jsx only
      // budgets ~4s of automatic retries. The _headers rule for /index.html does
      // not help here — real entry points are /prices, /cards, … not /index.html.
      "Cache-Control": "public, max-age=30"
    }
  });
}

// cr.js
var NUM_RE = /^\d+(?:\.\d+)*$/;
var DEFAULT_TITLE = "\u7DCF\u5408\u30EB\u30FC\u30EB (CR) | \u30A8\u30DC\u30EB\u30F4\u7D71\u8A08\u5C40";
var DEFAULT_DESC = "Shadowverse EVOLVE \u7DCF\u5408\u30EB\u30FC\u30EB\uFF08CR\uFF09\u3092\u691C\u7D22\u30FB\u6761\u6587\u30EA\u30F3\u30AF\u3067\u304D\u308B\u975E\u516C\u5F0F\u7248";
function truncate(s, n = 150) {
  s = String(s).replace(/\s+/g, " ").trim();
  return s.length > n ? s.slice(0, n - 1) + "\u2026" : s;
}
async function onRequest(context) {
  const url = new URL(context.request.url);
  const r = url.searchParams.get("r");
  if (r && NUM_RE.test(r)) {
    try {
      const cr = await fetchJson(`${url.origin}/data/cr.json`);
      const rule = cr.rules.find((x) => x.num === r);
      if (rule) {
        return serveWithOG(context, {
          title: `\u7DCF\u5408\u30EB\u30FC\u30EB ${rule.num} | \u30A8\u30DC\u30EB\u30F4\u7D71\u8A08\u5C40`,
          description: truncate(`${rule.num} ${rule.text}`),
          pageUrl: `${url.origin}/cr?r=${encodeURIComponent(r)}`
        });
      }
    } catch {
    }
  }
  return serveWithOG(context, {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESC,
    pageUrl: `${url.origin}/cr`
  });
}
export {
  onRequest
};
