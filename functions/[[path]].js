export async function onRequest(context) {
  const { request } = context
  const url = new URL(request.url)

  const ua = request.headers.get("user-agent") || ""
  const isBot = /discord|slack|twitter|facebook|kakao|bot/i.test(ua)

  if (url.pathname.startsWith("/card/") && isBot) {
    console.log(`OG Request: ${ua} ${url.pathname}${url.search}`)
    const cardId = url.pathname.split("/")[2]

    const dataRes = await fetch(`${url.origin}/data/oracles.json`)
    const oracles = await dataRes.json()
    const card = oracles.find(c => String(c.cardno) === cardId)

    if (card) {
      return new Response(`
<!doctype html>
<html>
<head>
<meta property="og:title" content="${card.name}" />
<meta property="og:description" content="${(card.text || "").slice(0, 100)}" />
<meta property="og:image" content="${card.image_url}" />
<meta property="og:url" content="${url.href}" />
<meta property="og:type" content="website" />
</head>
<body></body>
</html>
`, {
        headers: { "content-type": "text/html" }
      })
    }
  }

  return context.next()
}
