import { serveWithOG } from './_shared.js'

export async function onRequest(context) {
  const url = new URL(context.request.url)
  const q = url.searchParams.get('q') || ''

  const title = q
    ? `「${q}」の検索結果 | エボルヴ統計局`
    : 'カード検索 | エボルヴ統計局'
  const description = q
    ? `Shadowverse EVOLVE「${q}」のカード検索結果`
    : 'Shadowverse EVOLVE カード検索'

  return serveWithOG(context, {
    title,
    description,
    imageUrl: `${url.origin}/og-meta.png`,
    pageUrl: q ? `${url.origin}/cards?q=${encodeURIComponent(q)}` : `${url.origin}/cards`,
  })
}
