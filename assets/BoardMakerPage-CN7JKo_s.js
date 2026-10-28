import{r as m,j as e,L as f,J as P}from"./index-CvXCJEZV.js";import{p as B,G as y}from"./GuideBoard-BukobYR1.js";import{u as j}from"./useCardData-B0s53gtW.js";import{b as N}from"./parse-doFF14KW.js";import{s as R}from"./pngExport-BNJ199UP.js";async function L(o){const r=new URL(o,window.location.href);r.origin!==window.location.origin&&r.searchParams.set("_c","1");const i=await fetch(r,{mode:"cors"});if(!i.ok)throw new Error(`${i.status} ${o}`);const n=await i.blob();return new Promise((c,d)=>{const s=new FileReader;s.onload=()=>c(s.result),s.onerror=d,s.readAsDataURL(n)})}async function S(o,r=2){const[,,i,n]=o.getAttribute("viewBox").split(/\s+/).map(Number),c=o.cloneNode(!0);c.setAttribute("xmlns","http://www.w3.org/2000/svg"),c.setAttribute("width",i*r),c.setAttribute("height",n*r),c.setAttribute("font-family",getComputedStyle(o).fontFamily);const d=new Map;await Promise.all([...c.querySelectorAll("image")].map(async l=>{const a=l.getAttribute("href");if(!a||a.startsWith("data:"))return;d.has(a)||d.set(a,L(a).catch(()=>null));const p=await d.get(a);p?l.setAttribute("href",p):l.remove()}));const s=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(c)],{type:"image/svg+xml"}));try{const l=await new Promise((g,u)=>{const h=new Image;h.onload=()=>g(h),h.onerror=u,h.src=s}),a=document.createElement("canvas");a.width=i*r,a.height=n*r;const p=a.getContext("2d");return p.fillStyle="#0d1526",p.fillRect(0,0,a.width,a.height),p.drawImage(l,0,0,a.width,a.height),a}finally{URL.revokeObjectURL(s)}}async function C(o,r="board.png"){const i=await S(o);return R(i,r)}const v="sve-board-maker",b={プレイ:`hand 4
me1 BP21-034
me2 BP21-022 ring
opp3 BP20-062
hand1 BP13-028
ghost hand2
hand3 BP13-030
hand4 BP13-033
arrow hand2 -> me2 play
pp 4 -> 1
badge me2 right play "コスト3" dy=-48
badge me2 below white small "このターンは攻撃できない"`,攻撃:`me2 BP13-028 attack ring=attack
me4 BP21-034
opp2 BP08-063 act
opp4 BP20-062
arrow me2 -> opp2 attack "攻撃"
badge opp2 above ok "○ アクト：攻撃できる"
badge opp4 above attack "× スタンド：攻撃できない"
badge opp2 left white small "2/2 → 破壊"
badge me2 below white small "4/3 → 4/1（次のターンも1のまま）"`,クイック:`hand 3
opp3 BP13-033 attack ring=attack
me2 BP08-050 act
me3 BP20-040
hand1 BP20-040 dim
hand2 BP05-045 ring=quick
hand3 BP08-050 dim
arrow opp3 -> me2 attack "攻撃"
arrow hand2 -> opp3 quick dashed bend=160
badge hand2 right quick "ダメージの前に【クイック】" dy=-40`,進化:`me2 BP13-030 under
me2 BP13-031 ring=evolve
me3 BP21-034
opp3 BP20-062 act
arrow evolve -> me2 evolve
badge me2 above evolve "2/2 → 3/3"
badge me2 below white small "【進化時】の効果があれば発動"
badge evolve below evolve small "エボルヴデッキから重ねる" dx=106`,守護:`me2 BP13-028 attack ring=attack
me4 BP21-034
opp1 BP20-064 act ring=ok kw=守護
opp3 BP20-062 act
opp5 BP08-063
arrow me2 -> opp1 ok "攻撃"
arrow me2 -> opp3 attack dashed
badge opp1 above ok "【守護】を先に攻撃"
badge opp3 above attack small "× 守護がいる間は攻撃できない" dy=-38`},E=[["me1 〜 me5 / opp1 〜 opp5","自分・相手の場（左から）。opp は上下逆さまに描く"],["hand1 〜 / hand N","手札。hand N で枠数を指定（省略時は使った番号まで）"],["me2 BP21-022 / me2 [[カード名]]","カードを置く。カード番号かカード名"],["act / attack / dim / ring / ring=色","横向き（アクト） / 攻撃中（傾き＋回転矢印） / 半透明 / 枠"],["4/1 / -/1","攻撃力/体力を表示（- でその側を省略）。ダメージ後の値などに"],["kw=守護,疾走","キーワードをカード上部に表示"],["me2 BP13-030 under","進化元：その位置のカードの下にずらして重ねる"],["ghost hand2","点線の空き枠（プレイしたカードがあった場所など）"],['arrow hand2 -> me2 play "ラベル"',"矢印。端はカードの縁で止まる。dashed / bend=40"],['badge me2 above play "テキスト"',"above / below / left / right、small、dx= dy= で微調整"],["pp 4 -> 1 / pp 3/6 / ring pp4 play","PP の消費表示 / 現在値/最大値 / 盤面の数字に丸"],['arrow me2 -> oppleader attack "攻撃"',"リーダーへの攻撃。leader / oppleader はマットのLeader枠（カードを置くことも可）"],["evolve / 400,700","エボルヴデッキの位置 / 座標直接指定（マットのピクセル）"],["色","play attack ok evolve quick white"],["# …","コメント"]];function A(){try{return localStorage.getItem(v)||b.プレイ}catch{return b.プレイ}}function I(){const{oracles:o,printsMap:r,loading:i}=j(),[n,c]=m.useState(A),[d,s]=m.useState(""),l=m.useRef(null);m.useEffect(()=>{document.title="盤面図メーカー | エボルヴ統計局"},[]),m.useEffect(()=>{try{localStorage.setItem(v,n)}catch{}},[n]),m.useEffect(()=>{if(!d)return;const t=setTimeout(()=>s(""),2500);return()=>clearTimeout(t)},[d]);const a=m.useMemo(()=>N(o,r),[o,r]),p=m.useMemo(()=>Object.fromEntries(o.map(t=>[t.oracle_id,t])),[o]),g=t=>P(p[t],r),{spec:u,warnings:h}=m.useMemo(()=>B(n,a),[n,a]),k=async()=>{if(l.current)try{await C(l.current,`board_${Date.now()}.png`)}catch{s("画像を保存できませんでした")}},x=async()=>{try{await navigator.clipboard.writeText(`::: board
${n.trim()}
:::
`),s("コラム用ブロックをコピーしました")}catch{s("コピーできませんでした")}};return e.jsxs("div",{className:"board-maker",children:[e.jsx("h1",{className:"board-maker-title",children:"盤面図メーカー"}),e.jsxs("p",{className:"board-maker-lead",children:["テキストで盤面を書くと右に図が出ます。PNG で保存するか、コラムの ",e.jsx("code",{children:"::: board"})," ブロックとして貼り付けられます。 （",e.jsx(f,{to:"/guide",children:"初心者ガイド"}),"の図と同じ描画です）"]}),e.jsxs("div",{className:"board-maker-grid",children:[e.jsxs("div",{className:"board-maker-edit",children:[e.jsxs("div",{className:"board-maker-presets",children:[e.jsx("span",{children:"例："}),Object.keys(b).map(t=>e.jsx("button",{type:"button",className:"db-btn",onClick:()=>c(b[t]),children:t},t))]}),e.jsx("textarea",{className:"board-maker-text",value:n,onChange:t=>c(t.target.value),spellCheck:!1,rows:18}),!i&&h.length>0&&e.jsx("ul",{className:"board-maker-warn",children:h.map((t,w)=>e.jsx("li",{children:t},w))})]}),e.jsxs("div",{className:"board-maker-view",children:[e.jsx(y,{ref:l,spec:u,imageFor:g,label:"盤面図"}),e.jsxs("div",{className:"board-maker-actions",children:[e.jsx("button",{type:"button",className:"db-btn",onClick:k,children:"画像DL"}),e.jsx("button",{type:"button",className:"db-btn",onClick:x,children:"コラム用にコピー"})]})]})]}),e.jsx("table",{className:"board-maker-help",children:e.jsx("tbody",{children:E.map(([t,w])=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx("code",{children:t})}),e.jsx("td",{children:w})]},t))})}),d&&e.jsx("div",{className:"db-toast",children:d})]})}export{I as default};
