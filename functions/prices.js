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

// prices.js
async function onRequest(context) {
  const url = new URL(context.request.url);
  return serveWithOG(context, {
    title: "\u30C7\u30C3\u30AD\u8CBB\u7528/\u30AB\u30FC\u30C9\u4FA1\u683C\u63A8\u79FB | \u30A8\u30DC\u30EB\u30F4\u7D71\u8A08\u5C40",
    description: "\u74B0\u5883\u30C7\u30C3\u30AD\u3092\u4ECA\u7D44\u3080\u306A\u3089\u3044\u304F\u3089\u304B\u3002Shadowverse EVOLVE \u306E\u30C7\u30C3\u30AD\u30BF\u30A4\u30D7\u5225\u69CB\u7BC9\u8CBB\u7528\u3068\u3001\u30AB\u30FC\u30C9\u4FA1\u683C\u306E\u5024\u4E0A\u304C\u308A\u30FB\u5024\u4E0B\u304C\u308A\u3092\u6BCE\u65E5\u96C6\u8A08\u3057\u3066\u3044\u307E\u3059\u3002",
    pageUrl: `${url.origin}/prices`
  });
}
export {
  onRequest
};
