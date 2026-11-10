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

// judge.js
async function onRequest(context) {
  const url = new URL(context.request.url);
  try {
    return await serveWithOG(context, {
      title: "\u30B8\u30E3\u30C3\u30B8Q&A | \u30A8\u30DC\u30EB\u30F4\u7D71\u8A08\u5C40",
      description: "\u30AB\u30FC\u30C9\u306E\u52B9\u679C\u3084\u30EB\u30FC\u30EB\u306E\u7591\u554F\u306B\u3001\u30B8\u30E3\u30C3\u30B8\u6709\u5FD7\u304C\u56DE\u7B54\u3057\u307E\u3059\uFF08\u975E\u516C\u5F0F\uFF09\u3002",
      pageUrl: `${url.origin}/judge`
    });
  } catch {
    return context.env.ASSETS.fetch(new Request(`${url.origin}/index.html`));
  }
}
export {
  onRequest
};
