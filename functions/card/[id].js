import { fetchJson, cardImageUrl, serveWithOG } from '../_shared.js'

export async function onRequest(context) {
  const { params, request } = context
  const cardId = decodeURIComponent(params.id)
  const origin = new URL(request.url).origin

  try {
    const [oracles, prints] = await Promise.all([
      fetchJson(`${origin}/data/oracles.json`),
      fetchJson(`${origin}/data/prints.json`),
    ])

    const printsMap = Object.fromEntries(prints.map(p => [p.cardno, p]))

    // Case-insensitive lookup: find the canonical-cased id
    const idLower = cardId.toLowerCase()
    let oracle = oracles.find(o => o.oracle_id === cardId)
      || oracles.find(o => o.oracle_id.toLowerCase() === idLower)
    let resolvedCardId = cardId
    if (!oracle) {
      const hit = printsMap[cardId]
        || prints.find(p => p.cardno.toLowerCase() === idLower)
      if (hit) {
        oracle = oracles.find(o => o.oracle_id === hit.oracle_id)
        resolvedCardId = hit.cardno
      }
    }
    if (!oracle) throw new Error('not found')

    // Use the specific print if accessed via cardno, otherwise canonical
    const printCardno = printsMap[resolvedCardId] ? resolvedCardId : oracle.canonical_print
    const print = printsMap[printCardno]

    const title = `${print?.name || oracle.name} | エボルヴ統計局`
    const desc = (oracle.text || '').replace(/\n/g, ' ').slice(0, 150) || 'Shadowverse EVOLVE カード'

    return serveWithOG(context, {
      title,
      description: desc,
      imageUrl: cardImageUrl(print),
      pageUrl: `${origin}/card/${cardId}`,
    })
  } catch {
    return context.env.ASSETS.fetch(new Request(`${origin}/index.html`))
  }
}
