import { serveWithOG } from './_shared.js'

export async function onRequest(context) {
  const url = new URL(context.request.url)
  const q = url.searchParams.get('q') || ''

  const qDisplay = q
    .replace(/([^<>=\s]*)>=(\d+)/g, '$1$2以上')
    .replace(/([^<>=\s]*)<=(\d+)/g, '$1$2以下')
    .replace(/([^<>=\s]*)>(\d+)/g, '$1$2超過')
    .replace(/([^<>=\s]*)<(\d+)/g, '$1$2未満')

  const title = q
    ? `「${qDisplay}」の検索結果 | エボルヴ統計局`
    : 'カード検索 | エボルヴ統計局'
  const description = q
    ? `Shadowverse EVOLVE「${qDisplay}」のカード検索結果`
    : 'Shadowverse EVOLVE カード検索'

  return serveWithOG(context, {
    title,
    description,
    pageUrl: q ? `${url.origin}/cards?q=${encodeURIComponent(q)}` : `${url.origin}/cards`,
  })
}
