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

// guide.js
var TITLE = "\u521D\u5FC3\u8005\u30AC\u30A4\u30C9 | \u30A8\u30DC\u30EB\u30F4\u7D71\u8A08\u5C40";
var DESC = "\u30B7\u30E3\u30C9\u30A6\u30D0\u30FC\u30B9\u30A8\u30DC\u30EB\u30F4\u3092\u59CB\u3081\u305F\u3070\u304B\u308A\u306E\u65B9\u5411\u3051\u306B\u3001\u30B9\u30BF\u30FC\u30BF\u30FC\u30C7\u30C3\u30AD\u30FB\u304A\u624B\u9803\u30C7\u30C3\u30AD\u306E\u9078\u3073\u65B9\u30011\u30BF\u30FC\u30F3\u306E\u30EB\u30FC\u30EB\u306E\u6D41\u308C\u3001\u8FD1\u304F\u3067\u904A\u3079\u308B\u5E97\u8217\u3001\u7528\u8A9E\u96C6\u3092\u307E\u3068\u3081\u307E\u3057\u305F\u3002";
async function onRequest(context) {
  const url = new URL(context.request.url);
  try {
    return await serveWithOG(context, {
      title: TITLE,
      description: DESC,
      pageUrl: `${url.origin}/guide`
    });
  } catch {
    return context.env.ASSETS.fetch(new Request(`${url.origin}/index.html`));
  }
}
export {
  onRequest
};
