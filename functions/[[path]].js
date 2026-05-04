export async function onRequest(context) {
  const { request } = context
  const url = new URL(request.url)

  const ua = request.headers.get("user-agent") || ""
  const isBot = /discord|slack|twitter|facebook|kakao|bot/i.test(ua)

  console.log(`Request: ${request.method} ${url.pathname} (Bot: ${isBot})`)

  return context.next()
}
