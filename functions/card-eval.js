// _shared.js
var R2_BASE = "https://pub-bdbcbaf7e9804fe7a47da87d11c7064c.r2.dev";
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
function upcomingCardImageUrl(card) {
  if (!card?.image_url) return null;
  return `${R2_BASE}/images/upcoming/${card.image_url}`;
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

// card-eval.js
var EXPANSION = "BP21";
var NUM_RE = /^BP21-\d{3}$/;
async function onRequest(context) {
  const origin = new URL(context.request.url).origin;
  const pageUrl = `${origin}/card-eval`;
  const title = "\u65B0\u5F3E\u30AB\u30FC\u30C9\u8A55\u4FA1 | \u30A8\u30DC\u30EB\u30F4\u7D71\u8A08\u5C40";
  const fallbackDesc = "Shadowverse EVOLVE \u306E\u65B0\u5F3E\u30AB\u30FC\u30C9\u3092\u307F\u3093\u306A\u3067\u8A55\u4FA1\uFF01\u30AB\u30FC\u30C9\u6027\u80FD\u30FB\u74B0\u5883\u4E88\u60F3\u30FB\u30A4\u30E9\u30B9\u30C8\u30923\u8EF8\u3067\u63A1\u70B9\u3002\u3006\u5207\u5F8C\u306B\u30E9\u30F3\u30AD\u30F3\u30B0\u3092\u516C\u958B\u3057\u307E\u3059\u3002";
  try {
    const [crunch, upcoming] = await Promise.all([
      fetchJson(`${origin}/data/crunch.json`).catch(() => null),
      fetchJson(`${origin}/data/upcoming.json`).catch(() => [])
    ]);
    const exp = (crunch?.expansions || []).find((e) => e.expansion === EXPANSION);
    const setLabel = exp ? `${exp.expansion} ${exp.name}` : EXPANSION;
    const description = `Shadowverse EVOLVE ${setLabel} \u306E\u65B0\u5F3E\u30AB\u30FC\u30C9\u3092\u307F\u3093\u306A\u3067\u8A55\u4FA1\uFF01\u30AB\u30FC\u30C9\u6027\u80FD\u30FB\u74B0\u5883\u4E88\u60F3\u30FB\u30A4\u30E9\u30B9\u30C8\u30923\u8EF8\u3067\u63A1\u70B9\u3002\u3006\u5207\u5F8C\u306B\u30E9\u30F3\u30AD\u30F3\u30B0\u3092\u516C\u958B\u3057\u307E\u3059\u3002`;
    const revealed = (upcoming || []).filter((c) => NUM_RE.test(c.oracle_id || "") && c.rarity && c.image_url && !c.reprint_of && !c.evolved_from);
    const pick = revealed.find((c) => c.rarity === "LG") || revealed[0];
    const imageUrl = pick ? upcomingCardImageUrl(pick) : null;
    return await serveWithOG(context, { title, description, pageUrl, imageUrl });
  } catch {
    return await serveWithOG(context, { title, description: fallbackDesc, pageUrl });
  }
}
export {
  onRequest
};
