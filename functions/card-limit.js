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

// card-limit.js
var TITLE = "\u7981\u6B62\u30FB\u6BBF\u5802\u5165\u308A\u60C5\u5831 | \u30A8\u30DC\u30EB\u30F4\u7D71\u8A08\u5C40";
var DESC = "Shadowverse EVOLVE \u306E\u7981\u6B62\u30AB\u30FC\u30C9\u30FB\u6BBF\u5802\u5165\u308A\u30AB\u30FC\u30C9\u304C\u3001\u3044\u3064\u304B\u3089\u3044\u3064\u307E\u3067\u5236\u9650\u3055\u308C\u3066\u3044\u305F\u304B\u3092\u5E74\u8868\u3067\u78BA\u8A8D\u3067\u304D\u307E\u3059\u3002\u30B9\u30BF\u30F3\u30C0\u30FC\u30C9\u30FB\u30AF\u30ED\u30B9\u30AA\u30FC\u30D0\u30FC\u5BFE\u5FDC\u3002";
async function onRequest(context) {
  const url = new URL(context.request.url);
  const crossover = url.searchParams.get("fmt") === "crossover";
  try {
    return await serveWithOG(context, {
      title: TITLE,
      description: DESC,
      pageUrl: `${url.origin}/card-limit${crossover ? "?fmt=crossover" : ""}`
    });
  } catch {
    return context.env.ASSETS.fetch(new Request(`${url.origin}/index.html`));
  }
}
export {
  onRequest
};
