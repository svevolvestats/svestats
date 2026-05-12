import { serveWithOG } from './_shared.js'

export async function onRequest(context) {
  const url = new URL(context.request.url)
  const q = url.searchParams.get('q') || ''

  const qDisplay = q
    .replace(/>=/g, '以上')
    .replace(/<=/g, '以下')
    .replace(/>/g, '超過')
    .replace(/</g, '未満')

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
