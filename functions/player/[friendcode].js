import { fetchJson, serveWithOG } from '../_shared.js'

export async function onRequest(context) {
  const { request, env, params } = context
  const url = new URL(request.url)
  const origin = url.origin
  const friendcode = params.friendcode

  try {
    const players = await fetchJson(`${origin}/data/players.json`)
    const player = players[friendcode]
    if (!player) throw new Error('not found')

    const name = player.names?.[0] || friendcode
    const wins = player.wins ?? 0
    const second = player.second ?? 0
    const top8 = player.top8 ?? 0
    const title = `${name} — エボルヴ統計局`
    const desc = `優勝${wins}回 · 準優勝${second}回 · TOP8${top8}回`
    const pageUrl = `${origin}/player/${friendcode}`

    return serveWithOG(context, { title, description: desc, imageUrl: null, pageUrl })
  } catch {
    return env.ASSETS.fetch(new Request(`${origin}/index.html`))
  }
}
