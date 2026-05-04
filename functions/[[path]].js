export async function onRequest(context) {
  try {
    const { request } = context
    const url = new URL(request.url)

    console.log("HIT:", url.pathname)

    const page = await context.next()

    const contentType = page.headers.get("content-type") || ""
    if (!contentType.includes("text/html")) {
      return page
    }

    let html = await page.text()

    html = html.replace(
      "</head>",
      `<meta property="og:title" content="TEST TITLE"></head>`
    )

    return new Response(html, {
      headers: { "content-type": "text/html" },
    })

  } catch (e) {
    console.log("ERROR:", e.message)

    return new Response("Function Error", {
      status: 500,
    })
  }
}
