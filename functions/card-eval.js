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
function ogShard(id) {
  return id.toLowerCase().split("-")[0].replace(/[^a-z0-9]/g, "") || "_";
}
function upcomingCardImageUrl(card) {
  if (!card?.image_url) return null;
  return `${R2_BASE}/images/upcoming/${card.image_url}`;
}
function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function injectOG(html, { title, description, imageUrl, pageUrl, canonical }) {
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
  if (description) {
    out = out.replace(/(<meta name="description" content=")[\s\S]*?(")/, `$1${descEscaped}$2`);
  }
  if (canonical) {
    out = out.replace(/<link rel="canonical"[^>]*>/g, "");
    out = out.replace("</head>", `  <link rel="canonical" href="${escapeHtml(canonical)}" />
</head>`);
  }
  out = out.replace(/<meta property="og:url"[^>]*>/g, "");
  out = out.replace(/<meta property="og:image"[^>]*>/g, "");
  out = out.replace(/<meta name="twitter:image"[^>]*>/g, "");
  const extra = [
    `<meta property="og:url" content="${escapeHtml(pageUrl)}" />`,
    // imageUrl is built from URL params on some routes (?period=, ?event=, ?s=),
    // so it must be escaped like every other attribute value here.
    imageUrl ? `<meta property="og:image" content="${escapeHtml(imageUrl)}" />` : "",
    imageUrl ? `<meta name="twitter:image" content="${escapeHtml(imageUrl)}" />` : ""
  ].filter(Boolean).join("\n  ");
  out = out.replace("</head>", `  ${extra}
</head>`);
  return out;
}
var CANONICAL_PARAMS = [
  ["/", ["period", "era"]],
  ["/recap", ["event"]],
  ["/archetype/*", ["period", "recap", "trio", "era"]],
  ["/lineage", ["class"]],
  ["/guide", ["tab"]],
  ["/cr", ["tab"]],
  ["/venue", ["tab", "kind"]],
  ["/prices", ["card"]]
];
function defaultCanonical(requestUrl) {
  const url = new URL(requestUrl);
  let path = url.pathname;
  if (path.length > 1 && path.endsWith("/")) path = path.replace(/\/+$/, "");
  const rule = CANONICAL_PARAMS.find(([p]) => p.endsWith("/*") ? path.startsWith(p.slice(0, -1)) : path === p);
  const qs = (rule ? rule[1] : []).filter((key) => url.searchParams.get(key)).map((key) => `${key}=${encodeURIComponent(url.searchParams.get(key))}`).join("&");
  return `${url.origin}${path}${qs ? `?${qs}` : ""}`;
}
async function serveWithOG(context, ogProps) {
  const origin = new URL(context.request.url).origin;
  if (!ogProps.noindex && ogProps.canonical === void 0) {
    ogProps = { ...ogProps, canonical: defaultCanonical(context.request.url) };
  }
  const indexRes = await context.env.ASSETS.fetch(new Request(`${origin}/index.html`));
  let html = await indexRes.text();
  if (!ogProps.defaultOG) html = injectOG(html, ogProps);
  else if (ogProps.canonical) {
    html = html.replace("</head>", `  <link rel="canonical" href="${escapeHtml(ogProps.canonical)}" />
</head>`);
  }
  const extraHeaders = {};
  if (ogProps.noindex) {
    const robots = ogProps.noindex === "follow" ? "noindex" : "noindex, nofollow";
    html = html.replace("</head>", `  <meta name="robots" content="${robots}" />
</head>`);
    extraHeaders["X-Robots-Tag"] = robots;
  }
  return new Response(html, {
    headers: {
      ...extraHeaders,
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
var numRe = (exp) => new RegExp(`^${exp}-\\d{3}$`);
function pickExpansion(crunch, expParam) {
  const list = crunch?.expansions || [];
  if (expParam) return list.find((e) => e.expansion === expParam) || null;
  const open = list.filter((e) => e.card_eval !== false && (e.release_date || ""));
  open.sort((a, b) => (b.release_date || "").localeCompare(a.release_date || ""));
  return open[0] || null;
}
async function releasedImage(origin, exp, re) {
  const slots = Object.values(exp.cells || {}).flatMap((cell) => (cell.slots || []).map((s) => ({ ...s, rarity: cell.rarity }))).filter((s) => s.status === "revealed" && s.kind === "base" && re.test(s.oracle_id || ""));
  const slot = slots.find((s) => s.rarity === "LG") || slots[0];
  if (!slot) return null;
  const id = slot.oracle_id;
  const shard = await fetchJson(`${origin}/data/og/cards/${ogShard(id)}.json`).catch(() => null);
  return shard?.[id.toLowerCase()]?.[2] || null;
}
async function onRequest(context) {
  const url = new URL(context.request.url);
  const origin = url.origin;
  const expParam = url.searchParams.get("exp");
  const pageUrl = expParam ? `${origin}/card-eval?exp=${encodeURIComponent(expParam)}` : `${origin}/card-eval`;
  const title = "\u65B0\u5F3E\u30AB\u30FC\u30C9\u8A55\u4FA1 | \u30A8\u30DC\u30EB\u30F4\u7D71\u8A08\u5C40";
  const fallbackDesc = "Shadowverse EVOLVE \u306E\u65B0\u5F3E\u30AB\u30FC\u30C9\u3092\u307F\u3093\u306A\u3067\u8A55\u4FA1\uFF01\u30AB\u30FC\u30C9\u6027\u80FD\u30FB\u74B0\u5883\u4E88\u60F3\u30FB\u30A4\u30E9\u30B9\u30C8\u30923\u8EF8\u3067\u63A1\u70B9\u3002\u3006\u5207\u5F8C\u306B\u30E9\u30F3\u30AD\u30F3\u30B0\u3092\u516C\u958B\u3057\u307E\u3059\u3002";
  try {
    const [crunch, upcoming] = await Promise.all([
      fetchJson(`${origin}/data/crunch.json`).catch(() => null),
      fetchJson(`${origin}/data/upcoming.json`).catch(() => [])
    ]);
    const exp = pickExpansion(crunch, expParam);
    if (!exp) return await serveWithOG(context, { title, description: fallbackDesc, pageUrl });
    const setLabel = `${exp.expansion} ${exp.name}`;
    const description = `Shadowverse EVOLVE ${setLabel} \u306E\u65B0\u5F3E\u30AB\u30FC\u30C9\u3092\u307F\u3093\u306A\u3067\u8A55\u4FA1\uFF01\u30AB\u30FC\u30C9\u6027\u80FD\u30FB\u74B0\u5883\u4E88\u60F3\u30FB\u30A4\u30E9\u30B9\u30C8\u30923\u8EF8\u3067\u63A1\u70B9\u3002\u3006\u5207\u5F8C\u306B\u30E9\u30F3\u30AD\u30F3\u30B0\u3092\u516C\u958B\u3057\u307E\u3059\u3002`;
    const re = numRe(exp.expansion);
    const revealed = (upcoming || []).filter((c) => re.test(c.oracle_id || "") && c.rarity && c.image_url && !c.reprint_of && !c.evolved_from);
    const pick = revealed.find((c) => c.rarity === "LG") || revealed[0];
    let imageUrl = pick ? upcomingCardImageUrl(pick) : null;
    if (!imageUrl) imageUrl = await releasedImage(origin, exp, re);
    return await serveWithOG(context, { title, description, pageUrl, imageUrl });
  } catch {
    return await serveWithOG(context, { title, description: fallbackDesc, pageUrl });
  }
}
export {
  onRequest
};
