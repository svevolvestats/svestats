// _shared.js
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

// deckbuilder.js
var R2_PUB = "https://pub-bdbcbaf7e9804fe7a47da87d11c7064c.r2.dev";
async function decodeDeckParam(encoded) {
  try {
    const b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const ds = new DecompressionStream("deflate-raw");
    const writer = ds.writable.getWriter();
    writer.write(bytes);
    writer.close();
    const buf = await new Response(ds.readable).arrayBuffer();
    const data = JSON.parse(new TextDecoder().decode(buf));
    if (data.v !== 2) return null;
    return { name: data.name || "", cls: data.cls || "", co: data.co === 1 };
  } catch {
    return null;
  }
}
async function fetchSharedDeck(id) {
  try {
    const r = await fetch(`${R2_PUB}/shared/${id}.json`);
    if (!r.ok) return null;
    const data = await r.json();
    if (data.v !== 2) return null;
    return { name: data.name || "", cls: data.cls || "", co: data.co === 1 };
  } catch {
    return null;
  }
}
function buildDeckOG(data, pageUrl) {
  const { name, cls, co } = data;
  const formatLabel = co ? "\u30AF\u30ED\u30B9\u30AA\u30FC\u30D0\u30FC" : "\u30B9\u30BF\u30F3\u30C0\u30FC\u30C9";
  const clsLabel = cls ? `[${cls}]` : "";
  const deckLabel = name || "\u30DE\u30A4\u30C7\u30C3\u30AD";
  return {
    title: `${deckLabel}${clsLabel} | \u30C7\u30C3\u30AD\u30D3\u30EB\u30C0\u30FC | \u30A8\u30DC\u30EB\u30F4\u7D71\u8A08\u5C40`,
    description: cls ? `${cls} ${formatLabel}\u30C7\u30C3\u30AD | Shadowverse EVOLVE \u30C7\u30C3\u30AD\u30D3\u30EB\u30C0\u30FC` : `Shadowverse EVOLVE ${formatLabel}\u30C7\u30C3\u30AD | \u30C7\u30C3\u30AD\u30D3\u30EB\u30C0\u30FC`,
    pageUrl
  };
}
var DEFAULT_OG = {
  title: "\u30C7\u30C3\u30AD\u30D3\u30EB\u30C0\u30FC | \u30A8\u30DC\u30EB\u30F4\u7D71\u8A08\u5C40",
  description: "Shadowverse EVOLVE \u30C7\u30C3\u30AD\u30D3\u30EB\u30C0\u30FC"
};
async function onRequest(context) {
  const url = new URL(context.request.url);
  const s = url.searchParams.get("s");
  const d = url.searchParams.get("d");
  if (!s && !d) {
    return serveWithOG(context, { ...DEFAULT_OG, pageUrl: `${url.origin}/deckbuilder` });
  }
  const data = s ? await fetchSharedDeck(s) : await decodeDeckParam(d);
  if (!data) {
    return serveWithOG(context, { ...DEFAULT_OG, pageUrl: url.href });
  }
  const ogProps = buildDeckOG(data, url.href);
  const paramKey = s ? `s=${s}` : `d=${d}`;
  ogProps.imageUrl = `${url.origin}/api/og/deck?${paramKey}`;
  return serveWithOG(context, ogProps);
}
export {
  onRequest
};
