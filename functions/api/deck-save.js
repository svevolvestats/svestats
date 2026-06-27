// api/deck-save.js
async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    if (!body || body.v !== 2) return Response.json({ error: "invalid" }, { status: 400 });
    const id = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
    await context.env.R2.put(`shared/${id}.json`, JSON.stringify(body), {
      httpMetadata: { contentType: "application/json" }
    });
    return Response.json({ id });
  } catch {
    return Response.json({ error: "server error" }, { status: 500 });
  }
}
export {
  onRequestPost
};
