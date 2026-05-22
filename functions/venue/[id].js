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
  out = out.replace(
    /(<meta property="og:description" content=")[^"]*(")/,
    `$1${escapeHtml(description)}$2`
  );
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

// venue/[id].js
function venueId(name) {
  let h = 5381;
  for (let i = 0; i < name.length; i++) {
    h = (h << 5) + h ^ name.charCodeAt(i);
    h = h >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}
async function onRequest(context) {
  const { params, request } = context;
  const id = decodeURIComponent(params.id);
  const url = new URL(request.url);
  const origin = url.origin;
  try {
    const venueInfo = await fetchJson(`${origin}/data/venue_info.json`);
    const venueName = Object.keys(venueInfo).find((name) => venueId(name) === id);
    if (!venueName) throw new Error("not found");
    const info = venueInfo[venueName];
    const prefName = info.address ? info.address : null;
    const description = prefName || "Shadowverse EVOLVE \u500B\u4EBA\u6226CS\u958B\u50AC\u5E97\u8217";
    return serveWithOG(context, {
      title: `${venueName} | \u30A8\u30DC\u30EB\u30F4\u7D71\u8A08\u5C40`,
      description,
      pageUrl: `${origin}/venue/${id}`
    });
  } catch {
    return context.env.ASSETS.fetch(new Request(`${origin}/index.html`));
  }
}
export {
  onRequest
};
