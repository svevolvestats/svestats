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

// svgdiff.js
async function onRequest(context) {
  const url = new URL(context.request.url);
  return serveWithOG(context, {
    title: "SVGDiff\uFF08\u65E7\u30B7\u30E3\u30C9\u30A6\u30D0\u30FC\u30B9 \xD7 \u30A8\u30DC\u30EB\u30F4\uFF09| \u30A8\u30DC\u30EB\u30F4\u7D71\u8A08\u5C40",
    description: "\u65E7\u30B7\u30E3\u30C9\u30A6\u30D0\u30FC\u30B9\u306E\u5168\u30AB\u30FC\u30C9\u3092\u540D\u524D\u57FA\u6E96\u3067\u30A8\u30DC\u30EB\u30F4\u3068\u7167\u5408\u3002\u5404\u5F3E\u306E\u5B9F\u88C5\u6E08\u307F / \u672A\u5B9F\u88C5\u30AB\u30FC\u30C9\u3092\u4E00\u89A7\u3067\u304D\u307E\u3059\u3002",
    pageUrl: `${url.origin}/svgdiff`
  });
}
export {
  onRequest
};
