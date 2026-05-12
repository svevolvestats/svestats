import { fetchJson, serveWithOG } from './_shared.js'

export async function onRequest(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const origin = url.origin
  const eventId = url.searchParams.get('event')

  try {
    let meta
    let resolvedEventId = eventId

    if (!eventId) {
      const index = await fetchJson(`${origin}/data/recap/index.json`)
      if (!index || index.length === 0) throw new Error('no events')
      resolvedEventId = index[0].event_id
      meta = await fetchJson(`${origin}/data/recap/${resolvedEventId}/meta.json`)
    } else {
      meta = await fetchJson(`${origin}/data/recap/${eventId}/meta.json`)
    }

    const p = meta.period ?? {}
    const dateStr = p.start && p.end && p.start !== p.end
      ? `${p.start}〜${p.end}`
      : (p.start || '')
    const title = `${meta.event_title} | エボルヴ統計局`
    const desc = `${meta.total_decks}名参加（${dateStr}）大会結果・アーキタイプ分析`
    const pageUrl = `${origin}/recap?event=${resolvedEventId}`

    return serveWithOG(context, { title, description: desc, imageUrl: null, pageUrl })
  } catch {
    return env.ASSETS.fetch(new Request(`${origin}/index.html`))
  }
}
