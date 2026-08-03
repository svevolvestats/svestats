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

// recap.js
async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const origin = url.origin;
  const eventId = url.searchParams.get("event");
  try {
    let meta;
    let resolvedEventId = eventId;
    if (!eventId) {
      const index = await fetchJson(`${origin}/data/recap/index.json`);
      if (!index || index.length === 0) throw new Error("no events");
      resolvedEventId = index[0].event_id;
      meta = await fetchJson(`${origin}/data/recap/${resolvedEventId}/meta.json`);
    } else {
      meta = await fetchJson(`${origin}/data/recap/${eventId}/meta.json`);
    }
    const p = meta.period ?? {};
    const dateStr = p.start && p.end && p.start !== p.end ? `${p.start}\u301C${p.end}` : p.start || "";
    const title = `${meta.event_title} | \u30A8\u30DC\u30EB\u30F4\u7D71\u8A08\u5C40`;
    const participantCount = meta.participants ?? meta.total_decks;
    const desc = participantCount != null ? `${participantCount}\u540D\u53C2\u52A0\uFF08${dateStr}\uFF09\u5927\u4F1A\u7D50\u679C\u30FB\u30A2\u30FC\u30AD\u30BF\u30A4\u30D7\u5206\u6790` : `\uFF08${dateStr}\uFF09\u5927\u4F1A\u7D50\u679C\u30FB\u30A2\u30FC\u30AD\u30BF\u30A4\u30D7\u5206\u6790`;
    const pageUrl = `${origin}/recap?event=${resolvedEventId}`;
    const imageUrl = `${origin}/og/recap/${resolvedEventId}.png`;
    return await serveWithOG(context, { title, description: desc, imageUrl, pageUrl });
  } catch {
    return env.ASSETS.fetch(new Request(`${origin}/index.html`));
  }
}
export {
  onRequest
};
