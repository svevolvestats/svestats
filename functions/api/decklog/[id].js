// api/decklog/[id].js
async function onRequestPost(context) {
  const { params } = context;
  const deckId = params.id;
  try {
    const res = await fetch(`https://decklog.bushiroad.com/system/app/api/view/${deckId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "accept": "application/json, text/plain, */*",
        "x-accept-version": "v1",
        "origin": "https://decklog.bushiroad.com",
        "Referer": `https://decklog.bushiroad.com/view/${deckId}`,
        "X-Requested-With": "XMLHttpRequest",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      },
      body: JSON.stringify({ referrer: `https://decklog.bushiroad.com/view/${deckId}` })
    });
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
export {
  onRequestPost
};
