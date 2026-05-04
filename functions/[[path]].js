export async function onRequest(context) {
  console.log("FUNCTION HIT:", request.url)
  
  const { request } = context
  const url = new URL(request.url)

  // 👉 봇 판별
  const ua = request.headers.get("user-agent") || ""
  const isBot = /discord|slack|twitter|facebook|kakao|bot/i.test(ua)

  // 👉 일반 유저는 그냥 통과
  if (!isBot) {
    return context.next()
  }

  // 👉 카드 상세 페이지인지 체크
  const match = url.pathname.match(/^\/card\/(.+)/)
  if (!match) {
    return context.next()
  }

  const cardId = match[1]

  try {
    // 👉 JSON 가져오기 (이미 repo에 있음)
    const base = url.origin
    const res = await fetch(`${base}/data/oracles.json`)
    const oracles = await res.json()

    const card = oracles.find(c => String(c.cardno) === cardId)

    if (!card) {
      return context.next()
    }

    // 👉 OG 데이터 생성
    const title = card.name + " | エボルヴ統計局"
    const description = (card.text || "").slice(0, 100)
    const image = card.image_url    // URL은 실제 카드 페이지로

    // 👉 index.html 가져오기
    const page = await context.next()
    let html = await page.text()

    // 👉 meta 삽입
    const meta = `
<meta property="og:title" content="${escape(title)}" />
<meta property="og:description" content="${escape(description)}" />
<meta property="og:image" content="${image}" />
<meta property="og:url" content="${url.href}" />
<meta property="og:type" content="website" />
`

    html = html.replace("</head>", `${meta}</head>`)

    return new Response(html, {
      headers: { "content-type": "text/html" },
    })

  } catch (e) {
    return context.next()
  }
}

// 👉 간단 escape
function escape(str = "") {
  return str.replace(/"/g, "&quot;")
}
