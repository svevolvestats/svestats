export async function onRequest(context) {
  try {
    const { request } = context
    const url = new URL(request.url)

    console.log("HIT:", url.pathname)

    return await context.next()

  } catch (e) {
    console.log("ERROR:", e.message)

    return new Response("Function Error", {
      status: 500,
    })
  }
}
