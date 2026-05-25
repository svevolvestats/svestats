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
function cardImageUrl(print) {
  if (!print?.image_url) return null;
  const filename = print.image_url.split("/").pop();
  return `${R2_BASE}/images/${print.expansion}/${filename}`;
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

// archetype/[id].js
async function onRequest(context) {
  const { params, request } = context;
  const ua = request.headers.get("user-agent") || "";
  const isBot = /discord|slack|twitter|facebook|kakao|bot/i.test(ua);
  if (!isBot) {
    return context.env.ASSETS.fetch(request);
  }
  const archId = decodeURIComponent(params.id);
  const url = new URL(request.url);
  const origin = url.origin;
  const period = url.searchParams.get("period");
  const recap = url.searchParams.get("recap");
  try {
    const dataBase = recap ? `${origin}/data/recap/${recap}` : period ? `${origin}/data/archetypes/${period}` : `${origin}/data`;
    const [meta, oracles, prints] = await Promise.all([
      fetchJson(`${dataBase}/meta.json`),
      fetchJson(`${origin}/data/oracles.json`),
      fetchJson(`${origin}/data/prints.json`)
    ]);
    const arch = meta.archetypes?.find((a) => a.id === archId);
    if (!arch) throw new Error("not found");
    const printsMap = Object.fromEntries(prints.map((p2) => [p2.cardno, p2]));
    const oracleByName = {};
    for (const o of oracles) {
      oracleByName[o.name] = o;
      for (const alt of o.alt_names || []) oracleByName[alt] = o;
    }
    let imageUrl = null;
    for (const cardName of arch.top_cards || []) {
      const oracle = oracleByName[cardName];
      if (oracle) {
        const img = cardImageUrl(printsMap[oracle.canonical_print]);
        if (img) {
          imageUrl = img;
          break;
        }
      }
    }
    const archName = arch.name || archId;
    const p = meta.period ?? {};
    let contextLabel = p.start && p.end ? `${p.start}\u301C${p.end}` : "";
    if (recap) {
      const index = await fetchJson(`${origin}/data/recap/index.json`);
      const ev = index?.find((e) => e.event_id === recap);
      contextLabel = ev?.short_name || ev?.event_title || meta.event_title || p.start || "";
    }
    const periodStr = contextLabel ? `\uFF08${contextLabel}\uFF09` : "";
    const title = `${archName}${periodStr}| \u30A8\u30DC\u30EB\u30F4\u7D71\u8A08\u5C40`;
    const winPct = ((arch.win_share ?? 0) * 100).toFixed(2);
    const top8Pct = ((arch.top8_share ?? 0) * 100).toFixed(2);
    const totalLabel = meta.total_decks ? `TOP${meta.total_decks}` : "TOP8";
    const desc = `\u512A\u52DD: ${arch.winner ?? 0}\u56DE(${winPct}%) | ${totalLabel}: ${arch.count ?? 0}\u56DE(${top8Pct}%)`;
    const pageUrl = recap ? `${origin}/archetype/${archId}?recap=${recap}` : period ? `${origin}/archetype/${archId}?period=${encodeURIComponent(period)}` : `${origin}/archetype/${archId}`;
    return serveWithOG(context, { title, description: desc, imageUrl, pageUrl });
  } catch {
    return context.env.ASSETS.fetch(new Request(`${origin}/index.html`));
  }
}
export {
  onRequest
};
