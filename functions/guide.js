// _shared.js
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
var PLAY = {
  title: "\u521D\u5FC3\u8005\u30AC\u30A4\u30C9 | \u30A8\u30DC\u30EB\u30F4\u7D71\u8A08\u5C40",
  description: "\u30B7\u30E3\u30C9\u30A6\u30D0\u30FC\u30B9\u30A8\u30DC\u30EB\u30F4\u3092\u59CB\u3081\u305F\u3070\u304B\u308A\u306E\u65B9\u5411\u3051\u306B\u3001\u30B9\u30BF\u30FC\u30BF\u30FC\u30C7\u30C3\u30AD\u30FB\u304A\u624B\u9803\u30C7\u30C3\u30AD\u306E\u9078\u3073\u65B9\u3001\u30EB\u30FC\u30EB\u306E\u6D41\u308C\u3001\u8FD1\u304F\u3067\u904A\u3079\u308B\u5E97\u8217\u3084\u904A\u3073\u4EF2\u9593\u306E\u63A2\u3057\u65B9\u3092\u307E\u3068\u3081\u307E\u3057\u305F\u3002"
};
var EVENT = {
  title: "\u5927\u4F1A\u30AC\u30A4\u30C9 | \u521D\u5FC3\u8005\u30AC\u30A4\u30C9 | \u30A8\u30DC\u30EB\u30F4\u7D71\u8A08\u5C40",
  description: "\u306F\u3058\u3081\u3066\u5927\u4F1A\u306B\u51FA\u308B\u65B9\u5411\u3051\u306B\u3001\u5927\u4F1A\u306E\u7A2E\u985E\u3001\u7533\u3057\u8FBC\u307F\u304B\u3089\u5F53\u65E5\u307E\u3067\u306E\u6D41\u308C\u3001\u6301\u3061\u7269\u3001\u5BFE\u6226\u306E\u30DE\u30CA\u30FC\u3001\u8FD1\u304F\u306E\u5927\u4F1A\u306E\u63A2\u3057\u65B9\u3092\u307E\u3068\u3081\u307E\u3057\u305F\u3002"
};
async function onRequest(context) {
  const url = new URL(context.request.url);
  const event = url.searchParams.get("tab") === "event";
  const og = event ? EVENT : PLAY;
  try {
    return await serveWithOG(context, {
      title: og.title,
      description: og.description,
      pageUrl: event ? `${url.origin}/guide?tab=event` : `${url.origin}/guide`
    });
  } catch {
    return context.env.ASSETS.fetch(new Request(`${url.origin}/index.html`));
  }
}
export {
  onRequest
};
