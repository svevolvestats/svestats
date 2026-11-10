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
  if (/[\\\u0000-\u001f]/.test(raw)) return "/";
  return raw;
}
function jsLiteral(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026").split(String.fromCharCode(8232)).join("\\u2028").split(String.fromCharCode(8233)).join("\\u2029");
}
function bootstrap(payloadB64, path) {
  const keys = jsLiteral(MIGRATE_KEYS);
  const p = jsLiteral(payloadB64);
  const dest = jsLiteral(path);
  return `<!doctype html><html><head><meta charset="utf-8"><title></title></head><body><script>
(function(){
  var dest=${dest};
  try{
    if(!localStorage.getItem('sve-migrated')){
      if(${p}){
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
      }
      // Set the flag even with no/empty payload so .cc never bounces again.
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
