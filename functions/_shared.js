const R2_BASE = 'https://pub-bdbcbaf7e9804fe7a47da87d11c7064c.r2.dev'
const CACHE_NAME = 'sve-og-v1'

export async function fetchJson(url) {
  const cache = await caches.open(CACHE_NAME)
  const cached = await cache.match(url)
  if (cached) return cached.json()

  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} → ${res.status}`)
  const text = await res.text()
  await cache.put(url, new Response(text, {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=3600' },
  }))
  return JSON.parse(text)
}

export function cardImageUrl(print) {
  if (!print?.image_url) return null
  const filename = print.image_url.split('/').pop()
  return `${R2_BASE}/images/${print.expansion}/${filename}`
}

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function injectOG(html, { title, description, imageUrl, pageUrl }) {
  let out = html
  out = out.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`)
  out = out.replace(/(<meta property="og:title" content=")[^"]*(")/,
    `$1${escapeHtml(title)}$2`)
  out = out.replace(/(<meta property="og:description" content=")[^"]*(")/,
    `$1${escapeHtml(description)}$2`)
  const extra = [
    `<meta property="og:url" content="${escapeHtml(pageUrl)}" />`,
    imageUrl ? `<meta property="og:image" content="${imageUrl}" />` : '',
    imageUrl ? `<meta name="twitter:image" content="${imageUrl}" />` : '',
  ].filter(Boolean).join('\n  ')
  out = out.replace('</head>', `  ${extra}\n</head>`)
  return out
}

export async function serveWithOG(context, ogProps) {
  const origin = new URL(context.request.url).origin
  // Use ASSETS binding to bypass Functions routing and get static HTML directly
  const indexRes = await context.env.ASSETS.fetch(new Request(`${origin}/index.html`))
  const html = await indexRes.text()
  return new Response(injectOG(html, ogProps), {
    headers: {
      'Content-Type': 'text/html;charset=UTF-8',
      'Cache-Control': 'public, max-age=300',
    },
  })
}
