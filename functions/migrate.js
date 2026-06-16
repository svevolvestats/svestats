// migrate.js
var ALLOWED_ORIGIN = "https://svestats.pages.dev";
var MAX_PAYLOAD = 512 * 1024;
var MIGRATE_KEYS = [
  "sve-theme",
  "sve-favorites",
  "sve-decks",
  "sve-decks-autosave",
  "sve-sort",
  "sve-order",
  "holo-theme"
];
function safePath(raw) {
  if (typeof raw !== "string") return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}
function bootstrap(payloadB64, path) {
  const keys = JSON.stringify(MIGRATE_KEYS);
  const p = JSON.stringify(payloadB64);
  const dest = JSON.stringify(path);
  return `<!doctype html><html><head><meta charset="utf-8"><title></title></head><body><script>
(function(){
  var dest=${dest};
  try{
    if(${p} && !localStorage.getItem('sve-migrated')){
      var bin=atob(${p});
      var bytes=new Uint8Array(bin.length);
      for(var i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
      var data=JSON.parse(new TextDecoder().decode(bytes));
      var allow=${keys};
      for(var k in data){
        if(allow.indexOf(k)!==-1 && typeof data[k]==='string'){
          try{localStorage.setItem(k,data[k]);}catch(e){}
        }
      }
      try{localStorage.setItem('sve-migrated',new Date().toISOString());}catch(e){}
    }
  }catch(e){}
  location.replace(dest);
})();
<\/script></body></html>`;
}
async function onRequestPost(context) {
  const { request } = context;
  let path = "/";
  let payload = "";
  try {
    const form = await request.formData();
    path = safePath(form.get("path"));
    const origin = request.headers.get("Origin");
    const originOk = !origin || origin === ALLOWED_ORIGIN;
    const p = form.get("p");
    if (originOk && typeof p === "string" && p.length <= MAX_PAYLOAD && /^[A-Za-z0-9+/=]*$/.test(p)) {
      payload = p;
    }
  } catch {
  }
  return new Response(bootstrap(payload, path), {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }
  });
}
async function onRequest(context) {
  return Response.redirect(new URL("/", context.request.url).toString(), 302);
}
export {
  onRequest,
  onRequestPost
};
