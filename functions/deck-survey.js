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

// deck-survey.js
var TITLE = "\u30A2\u30FC\u30AD\u30BF\u30A4\u30D7\u6027\u683C\u30A2\u30F3\u30B1\u30FC\u30C8 | \u30A8\u30DC\u30EB\u30F4\u7D71\u8A08\u5C40";
var DESC = "\u4ECA\u306E\u74B0\u5883\u306E\u30C7\u30C3\u30AD\u3092\u3001\u901F\u3055\u30FB\u76E4\u9762\u30FB\u5BFE\u8A71\u30FB\u518D\u73FE\u6027\u30FB\u30B3\u30F3\u30DC\u30FB\u7FD2\u719F\u306E6\u3064\u306E\u8EF8\u3067\u8A55\u4FA1\u3059\u308B\u30A2\u30F3\u30B1\u30FC\u30C8\u3067\u3059\u3002\u96C6\u307E\u3063\u305F\u56DE\u7B54\u306F\u521D\u5FC3\u8005\u5411\u3051\u306E\u30C7\u30C3\u30AD\u8A3A\u65AD\u306B\u4F7F\u3046\u4E88\u5B9A\u3067\u3059\u3002";
async function onRequest(context) {
  const url = new URL(context.request.url);
  try {
    return await serveWithOG(context, {
      title: TITLE,
      description: DESC,
      pageUrl: `${url.origin}/deck-survey`
    });
  } catch {
    return context.env.ASSETS.fetch(new Request(`${url.origin}/index.html`));
  }
}
export {
  onRequest
};
