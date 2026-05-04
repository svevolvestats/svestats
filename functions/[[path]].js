export async function onRequest(context) {
  const { request } = context
  const url = new URL(request.url)

  const ua = request.headers.get("user-agent") || ""
  const isBot = /discord|slack|twitter|facebook|kakao|bot/i.test(ua)

  if (url.pathname.startsWith("/card/") && isBot) {
    const cardId = url.pathname.split("/")[2]

    const dataRes = await fetch(`${url.origin}/data/oracles.json`)
    const oracles = await dataRes.json()
    const card = oracles.find(c => String(c.cardno) === cardId)

    if (card) {
        return new Response(`
    <!doctype html>
    <html>
    <head>
    <meta charset="utf-8">
    <meta property="og:title" content="${card.name}">
    <meta property="og:description" content="${(card.text || "").slice(0, 100)}">
    <meta property="og:image" content="${card.image_url}">
    <meta property="og:url" content="${url.href}">
    <meta property="og:type" content="website">
    </head>
    </html>
    `, {
        headers: {
            "content-type": "text/html",
            "cache-control": "no-store"
        }
        })
    }
    }

  return context.next()
}
