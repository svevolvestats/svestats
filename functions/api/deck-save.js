// api/deck-save.js
var MAX_BYTES = 32 * 1024;
var KEYS = ["v", "name", "cls", "co", "s", "e", "rep", "m"];
async function onRequestPost(context) {
  try {
    const text = await context.request.text();
    if (text.length > MAX_BYTES) return Response.json({ error: "too large" }, { status: 413 });
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      return Response.json({ error: "invalid" }, { status: 400 });
    }
    if (!body || typeof body !== "object" || Array.isArray(body) || body.v !== 2) {
      return Response.json({ error: "invalid" }, { status: 400 });
    }
    const deck = {};
    for (const k of KEYS) if (k in body) deck[k] = body[k];
    let id = null;
    for (let i = 0; i < 5 && !id; i++) {
      const cand = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
      if (!await context.env.R2.head(`shared/${cand}.json`)) id = cand;
    }
    if (!id) return Response.json({ error: "server error" }, { status: 500 });
    await context.env.R2.put(`shared/${id}.json`, JSON.stringify(deck), {
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
