export async function onRequest(context) {
  try {
    const { request } = context
    const url = new URL(request.url)

    const ua = request.headers.get("user-agent") || ""
    const isBot = /discord|slack|twitter|facebook|kakao|bot/i.test(ua)

    // 👉 먼저 정적 파일 시도
    let response = await context.next()

    const contentType = response.headers.get("content-type") || ""

    // 👉 HTML이 아니면 그대로 반환 (JS/CSS/이미지)
    if (!contentType.includes("text/html")) {
      return response
    }

    // 👉 HTML 읽기
    let html = await response.text()

    // 👉 SPA fallback (파일 없을 때)
    if (response.status === 404) {
      const fallback = await fetch(`${url.origin}/index.html`)
      html = await fallback.text()
    }

    // 👉 OG는 봇일 때만
    if (isBot && url.pathname.startsWith("/card/")) {
      try {
        const cardId = url.pathname.split("/")[2]

        const dataRes = await fetch(`${url.origin}/data/oracles.json`)
        if (dataRes.ok) {
          const oracles = await dataRes.json()
          const card = oracles.find(c => String(c.cardno) === cardId)

          if (card) {
            const title = card.name + " | エボルヴ統計局"
            const description = (card.text || "").slice(0, 100)
            const image = card.image_url || `${url.origin}/default.png`

            const meta = `
<meta property="og:title" content="${escape(title)}" />
<meta property="og:description" content="${escape(description)}" />
<meta property="og:image" content="${image}" />
<meta property="og:url" content="${url.href}" />
<meta property="og:type" content="website" />
`

            html = html.replace("</head>", `${meta}</head>`)
          }
        }
      } catch (e) {
        console.log("OG ERROR:", e.message)
      }
    }

    return new Response(html, {
      headers: { "content-type": "text/html" },
    })

  } catch (e) {
    console.log("FATAL:", e.message)

    return new Response("Function Error", {
      status: 500,
    })
  }
}

function escape(str = "") {
  return str.replace(/"/g, "&quot;")
}