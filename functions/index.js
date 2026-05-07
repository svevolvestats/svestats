import { fetchJson, injectOG } from './_shared.js'

export async function onRequest(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const origin = url.origin
  const periodParam = url.searchParams.get('period')

  try {
    const dataBase = periodParam
      ? `${origin}/data/archetypes/${periodParam}`
      : `${origin}/data`

    const meta = await fetchJson(`${dataBase}/meta.json`)
    const p = meta.period ?? {}
    const periodStr = p.start && p.end ? `(${p.start}〜${p.end})` : ''
    const title = `個人戦CS環境${periodStr} | エボルヴ統計局`
    const imageUrl = `${origin}/og-meta.png`
    const pageUrl = periodParam ? `${origin}/?period=${encodeURIComponent(periodParam)}` : origin

    const indexRes = await env.ASSETS.fetch(new Request(`${origin}/index.html`))
    const html = await indexRes.text()

    return new Response(injectOG(html, { title, description: '', imageUrl, pageUrl }), {
      headers: {
        'Content-Type': 'text/html;charset=UTF-8',
        'Cache-Control': 'public, max-age=300',
      },
    })
  } catch {
    return env.ASSETS.fetch(new Request(`${origin}/index.html`))
  }
}
