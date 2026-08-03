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
var CRAWLER_RE = /bot|crawler|spider|discord|slack|twitter|facebook|kakao|telegram|whatsapp|line\/|skype|embed|preview|curl|wget|python-requests|pinterest/i;
function isCrawler(request) {
  return CRAWLER_RE.test(request.headers.get("user-agent") || "");
}
function serveIndex(context) {
  const origin = new URL(context.request.url).origin;
  return context.env.ASSETS.fetch(new Request(`${origin}/index.html`));
}
function cardImageUrl(print) {
  if (!print?.image_url) return null;
  const filename = print.image_url.split("/").pop().replace(/\.webp$/i, ".jpg");
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

// lineage.js
var SITE = "\u30A8\u30DC\u30EB\u30F4\u7D71\u8A08\u5C40";
var DEFAULT_TITLE = `\u30C7\u30C3\u30AD\u306E\u7CFB\u8B5C | ${SITE}`;
var DEFAULT_DESC = "Shadowverse EVOLVE \u500B\u4EBA\u6226CS\u306E\u30A2\u30FC\u30AD\u30BF\u30A4\u30D7\u304C\u3001\u74B0\u5883\u3054\u3068\u306B\u3069\u3046\u5206\u5C90\u30FB\u7D99\u627F\u3055\u308C\u305F\u304B\u3092\u53EF\u8996\u5316\u3002";
var CLASS_ALL = [
  "\u30A8\u30EB\u30D5",
  "\u30ED\u30A4\u30E4\u30EB",
  "\u30A6\u30A3\u30C3\u30C1",
  "\u30C9\u30E9\u30B4\u30F3",
  "\u30CA\u30A4\u30C8\u30E1\u30A2",
  "\u30D3\u30B7\u30E7\u30C3\u30D7",
  "\u30CB\u30E5\u30FC\u30C8\u30E9\u30EB",
  "\u30A6\u30DE\u5A18 \u30D7\u30EA\u30C6\u30A3\u30FC\u30C0\u30FC\u30D3\u30FC",
  "\u30A2\u30A4\u30C9\u30EB\u30DE\u30B9\u30BF\u30FC \u30B7\u30F3\u30C7\u30EC\u30E9\u30AC\u30FC\u30EB\u30BA",
  "\u30AB\u30FC\u30C9\u30D5\u30A1\u30A4\u30C8!! \u30F4\u30A1\u30F3\u30AC\u30FC\u30C9",
  "\u30D7\u30EA\u30F3\u30BB\u30B9\u30B3\u30CD\u30AF\u30C8\uFF01Re:Dive"
];
var CLASS_LABEL = {
  "\u30A6\u30DE\u5A18 \u30D7\u30EA\u30C6\u30A3\u30FC\u30C0\u30FC\u30D3\u30FC": "\u30A6\u30DE\u5A18",
  "\u30A2\u30A4\u30C9\u30EB\u30DE\u30B9\u30BF\u30FC \u30B7\u30F3\u30C7\u30EC\u30E9\u30AC\u30FC\u30EB\u30BA": "\u30C7\u30EC\u30DE\u30B9",
  "\u30AB\u30FC\u30C9\u30D5\u30A1\u30A4\u30C8!! \u30F4\u30A1\u30F3\u30AC\u30FC\u30C9": "\u30F4\u30A1\u30F3\u30AC\u30FC\u30C9",
  "\u30D7\u30EA\u30F3\u30BB\u30B9\u30B3\u30CD\u30AF\u30C8\uFF01Re:Dive": "\u30D7\u30EA\u30B3\u30CD"
};
var clsLabel = (c) => CLASS_LABEL[c] || c;
function truncate(s, n = 150) {
  s = String(s).replace(/\s+/g, " ").trim();
  return s.length > n ? s.slice(0, n - 1) + "\u2026" : s;
}
function buildEras(expansions) {
  const eras = (expansions || []).filter((e) => /^(BP|CP|ECP|SP)\d/.test(e.code)).sort((a, b) => a.date.localeCompare(b.date));
  const bp10 = eras.findIndex((e) => e.code === "BP10");
  const sliced = bp10 >= 0 ? eras.slice(bp10) : eras;
  return sliced.map((e, i) => ({ ...e, endDate: sliced[i + 1]?.date ?? "9999-12-31" }));
}
function selectEras(allEras, param) {
  if (!allEras.length) return null;
  if (!param) {
    const last = allEras.length - 1;
    return { start: allEras[Math.max(0, last - 1)], end: allEras[last] };
  }
  const parts = String(param).split("~");
  let si = allEras.findIndex((e) => e.code === parts[0]);
  let ei = parts[1] ? allEras.findIndex((e) => e.code === parts[1]) : si;
  if (si < 0) si = allEras.length - 1;
  if (ei < 0) ei = si;
  ei = Math.min(Math.max(ei, si), si + 1);
  return { start: allEras[si], end: allEras[ei] };
}
function periodsIn(periods, start, end) {
  return periods.filter((p) => {
    const d = p.split("~")[0];
    return d >= start.date && d < end.endDate;
  });
}
function rangeLabel(ps) {
  if (!ps.length) return "";
  return `${ps[0].split("~")[0]}\u301C${ps[ps.length - 1].split("~")[1] || ps[ps.length - 1]}`;
}
async function repCardImage(origin, node) {
  const names = node?.top_cards || [];
  if (!names.length) return null;
  const lite = await fetchJson(`${origin}/data/cards_lite.json`);
  const byName = {};
  for (const pass of [0, 1]) {
    for (const o of lite.oracles || []) {
      const isEvolved = (o.evolved_from?.length ?? 0) > 0;
      if (pass === 0 ? isEvolved : !isEvolved) continue;
      if (pass === 0 || !byName[o.name]) byName[o.name] = o;
      for (const alt of o.alt_names || []) {
        if (pass === 0 || !byName[alt]) byName[alt] = o;
      }
    }
  }
  for (const name of names) {
    const oracle = byName[name];
    const print = oracle && lite.prints?.[oracle.canonical_print];
    const img = print && cardImageUrl(print);
    if (img) return img;
  }
  return null;
}
function topArchetypes(nodes, periodSet, filterClass, limit = 3) {
  const agg = /* @__PURE__ */ new Map();
  for (const n of Object.values(nodes)) {
    if (!periodSet.has(n.period)) continue;
    if (filterClass && n.class !== filterClass) continue;
    const key = `${n.class}/${n.name}`;
    const cur = agg.get(key) || { name: n.name, cls: n.class, count: 0, winner: 0 };
    cur.count += n.count || 0;
    cur.winner += n.winner || 0;
    agg.set(key, cur);
  }
  return [...agg.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}
async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const origin = url.origin;
  if (!isCrawler(request)) return serveIndex(context);
  const view = url.searchParams.get("view") || "lineage";
  const classParam = url.searchParams.get("class");
  const eraParam = url.searchParams.get("era");
  const archParam = url.searchParams.get("archetype");
  try {
    const lineage = await fetchJson(`${origin}/data/archetype_lineage.json`);
    const nodes = lineage.nodes || {};
    const periods = lineage.periods || [];
    if (view === "era") {
      const allEras = buildEras(lineage.expansions);
      const sel = selectEras(allEras, eraParam);
      if (!sel) throw new Error("no eras");
      const ps = periodsIn(periods, sel.start, sel.end);
      const top2 = topArchetypes(nodes, new Set(ps));
      const single = sel.start.code === sel.end.code;
      const eraName = single ? sel.end.name : `${sel.start.code}\u301C${sel.end.code}`;
      const eraFull = single ? sel.end.name : `${sel.start.name} \u301C ${sel.end.name}`;
      const title2 = `${eraName} \u74B0\u5883\u307E\u3068\u3081 | ${SITE}`;
      const topStr2 = top2.map((a) => `${a.name}(${a.count})`).join("\u3001");
      const desc2 = [
        `${eraFull} \u306E\u500B\u4EBA\u6226CS \u5168\u30AF\u30E9\u30B9\u306E\u30A2\u30FC\u30AD\u30BF\u30A4\u30D7\u63A8\u79FB`,
        ps.length ? `\uFF08${rangeLabel(ps)}\u30FB${ps.length}\u671F\u9593\uFF09` : "",
        topStr2 ? `\u3002TOP8\u4E0A\u4F4D: ${topStr2}` : ""
      ].join("");
      let imageUrl = null;
      const lastPeriod = ps[ps.length - 1];
      if (lastPeriod) {
        const [head] = Object.values(nodes).filter((n) => n.period === lastPeriod).sort((a, b) => (b.count || 0) - (a.count || 0));
        if (head) imageUrl = await repCardImage(origin, head);
      }
      const eraCanon = single ? sel.end.code : `${sel.start.code}~${sel.end.code}`;
      return await serveWithOG(context, {
        title: title2,
        description: truncate(desc2),
        imageUrl,
        pageUrl: `${origin}/lineage?view=era&era=${encodeURIComponent(eraCanon)}`
      });
    }
    const present = new Set(Object.values(nodes).map((n) => n.class));
    const classes = CLASS_ALL.filter((c) => present.has(c));
    const cls = classParam && present.has(classParam) ? classParam : null;
    const clsPeriods = [...new Set(
      Object.values(nodes).filter((n) => !cls || n.class === cls).map((n) => n.period)
    )].sort();
    const latest = clsPeriods[clsPeriods.length - 1];
    const top = latest ? topArchetypes(nodes, /* @__PURE__ */ new Set([latest]), cls) : [];
    const topStr = top.map((a) => cls ? a.name : `${a.name}(${clsLabel(a.cls)})`).join("\u3001");
    const span = clsPeriods.length ? `${clsPeriods[0].split("~")[0]}\u301C${clsPeriods[clsPeriods.length - 1].split("~")[1]}` : "";
    let archName = null;
    if (archParam) {
      const hit = Object.values(nodes).filter((n) => n.id === archParam && (!cls || n.class === cls)).sort((a, b) => a.period.localeCompare(b.period)).pop();
      if (hit) archName = hit.name;
    }
    const params = new URLSearchParams();
    if (cls) params.set("class", cls);
    if (archParam) params.set("archetype", archParam);
    const qs = params.toString();
    const pageUrl = `${origin}/lineage${qs ? `?${qs}` : ""}`;
    if (!cls) {
      const desc2 = [
        DEFAULT_DESC,
        span ? `\u5BFE\u8C61: ${span}\uFF08${clsPeriods.length}\u671F\u9593\uFF09` : "",
        topStr ? `\u3002\u76F4\u8FD1\u306E\u4E0A\u4F4D: ${topStr}` : ""
      ].join("");
      return await serveWithOG(context, {
        title: DEFAULT_TITLE,
        description: truncate(desc2),
        pageUrl
      });
    }
    const label = clsLabel(cls);
    const title = archName ? `${archName}\uFF08${label}\uFF09\u306E\u7CFB\u8B5C | ${SITE}` : `${label} \u30C7\u30C3\u30AD\u306E\u7CFB\u8B5C | ${SITE}`;
    const desc = [
      `${label}\u306E\u30A2\u30FC\u30AD\u30BF\u30A4\u30D7\u304C\u74B0\u5883\u3054\u3068\u306B\u3069\u3046\u5206\u5C90\u30FB\u7D99\u627F\u3055\u308C\u305F\u304B\u3092\u53EF\u8996\u5316`,
      span ? `\uFF08${span}\u30FB${clsPeriods.length}\u671F\u9593\uFF09` : "",
      topStr ? `\u3002\u76F4\u8FD1: ${topStr}` : ""
    ].join("");
    return await serveWithOG(context, { title, description: truncate(desc), pageUrl });
  } catch {
    return await serveWithOG(context, {
      title: DEFAULT_TITLE,
      description: DEFAULT_DESC,
      pageUrl: `${origin}${url.pathname}${url.search}`
    });
  }
}
export {
  onRequest
};
