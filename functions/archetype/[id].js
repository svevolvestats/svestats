import { fetchJson, cardImageUrl, serveWithOG } from '../_shared.js'

export async function onRequest(context) {
  const { params, request } = context
  const archId = decodeURIComponent(params.id)
  const url = new URL(request.url)
  const origin = url.origin
  const period = url.searchParams.get('period')
  const recap = url.searchParams.get('recap')

  try {
    const dataBase = recap
      ? `${origin}/data/recap/${recap}`
      : period
        ? `${origin}/data/archetypes/${period}`
        : `${origin}/data`

    const [meta, oracles, prints] = await Promise.all([
      fetchJson(`${dataBase}/meta.json`),
      fetchJson(`${origin}/data/oracles.json`),
      fetchJson(`${origin}/data/prints.json`),
    ])

    // winner/count/top_cards are in meta.archetypes[], not archetypes.json
    const arch = meta.archetypes?.find(a => a.id === archId)
    if (!arch) throw new Error('not found')

    const printsMap = Object.fromEntries(prints.map(p => [p.cardno, p]))
    const oracleByName = {}
    for (const o of oracles) {
      oracleByName[o.name] = o
      for (const alt of (o.alt_names || [])) oracleByName[alt] = o
    }

    // Get representative card image from top_cards
    let imageUrl = null
    for (const cardName of (arch.top_cards || [])) {
      const oracle = oracleByName[cardName]
      if (oracle) {
        const img = cardImageUrl(printsMap[oracle.canonical_print])
        if (img) { imageUrl = img; break }
      }
    }

    const archName = arch.name || archId
    const p = meta.period ?? {}
    let contextLabel = p.start && p.end ? `${p.start}〜${p.end}` : ''
    if (recap) {
      const index = await fetchJson(`${origin}/data/recap/index.json`)
      const ev = index?.find(e => e.event_id === recap)
      contextLabel = ev?.short_name || ev?.event_title || meta.event_title || p.start || ''
    }
    const periodStr = contextLabel ? `（${contextLabel}）` : ''
    const title = `${archName}${periodStr}| エボルヴ統計局`
    const winPct = ((arch.win_share ?? 0) * 100).toFixed(2)
    const top8Pct = ((arch.top8_share ?? 0) * 100).toFixed(2)
    const totalLabel = meta.total_decks ? `TOP${meta.total_decks}` : 'TOP8'
    const desc = `優勝: ${arch.winner ?? 0}回(${winPct}%) | ${totalLabel}: ${arch.count ?? 0}回(${top8Pct}%)`
    const pageUrl = recap
      ? `${origin}/archetype/${archId}?recap=${recap}`
      : period
        ? `${origin}/archetype/${archId}?period=${encodeURIComponent(period)}`
        : `${origin}/archetype/${archId}`

    return serveWithOG(context, { title, description: desc, imageUrl, pageUrl })
  } catch {
    return context.env.ASSETS.fetch(new Request(`${origin}/index.html`))
  }
}
