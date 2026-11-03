/* ---- 鍵（2026-11-03・全サイト共通。2026-11-04 に ui.js から移した）：無料版で本コースの中身を押した時のシート。apLock() で開く ----
   「本生徒のみアクセス可能です」→「面談を予約する」で公式 LINE（「予約」の文が入った状態）へ */
(function(){
  var BOOK="https://line.me/R/oaMessage/@431enzow/?%E4%BA%88%E7%B4%84";
  var css=".aplk-scrim{position:fixed;inset:0;z-index:9990;background:rgba(15,20,40,.45);display:flex;align-items:flex-end;justify-content:center;animation:aplkf .18s ease-out}"+
    ".aplk{width:100%;max-width:520px;background:var(--card,#fff);color:var(--ink,#141a2e);border-radius:22px 22px 0 0;padding:22px 20px calc(20px + env(safe-area-inset-bottom,0px));box-shadow:0 -8px 30px rgba(0,0,0,.18);animation:aplku .24s cubic-bezier(.2,.9,.3,1.1)}"+
    ".aplk .ic{font-size:30px;line-height:1}.aplk h2{margin:10px 0 6px;font-size:20px;font-weight:900}.aplk p{margin:0 0 16px;color:var(--mute,#6b7385);font-size:14.5px;line-height:1.6}"+
    ".aplk a.go{display:block;text-align:center;text-decoration:none;background:#06C755;color:#fff;border-radius:14px;padding:15px;font-weight:800;font-size:17px}"+
    ".aplk button{display:block;width:100%;margin-top:10px;background:transparent;color:var(--mute,#6b7385);font-size:14px;padding:10px}"+
    "@keyframes aplkf{from{opacity:0}}@keyframes aplku{from{transform:translateY(40px);opacity:0}}"+
    ".lk{display:inline-block;margin-left:6px;font-size:.9em;filter:grayscale(1);opacity:.75}"+
    /* 横スクロールのタブ（話すの文法など。2026-11-04）。鍵付きのタブは薄く */
    ".seg.scroll{display:flex;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;scroll-snap-type:x proximity;overscroll-behavior-x:contain}"+
    ".seg.scroll::-webkit-scrollbar{display:none}.seg.scroll .sl{display:none}"+
    ".seg.scroll button{flex:0 0 auto;white-space:nowrap;padding:7px 14px;scroll-snap-align:start}"+
    ".seg.scroll button[aria-pressed=\"true\"]{background:var(--card,#fff);box-shadow:0 1px 3px rgba(0,0,0,.13),0 0 0 .5px rgba(0,0,0,.04)}"+
    ".seg.scroll button[data-lock]{color:var(--mute,#6b7385);font-weight:500}";
  var s=document.createElement("style");s.textContent=css;document.head.appendChild(s);
  /* 本コースの文法（話すの鍵付きタブ）。無料版・団体のサイトが、持っていない物だけ並べる */
  window.AP_LOCKED_GRAMMAR=["疑問詞（5W1H）","助動詞","関係代名詞","時制","形容詞","現在進行形","頻度の副詞","過去進行形","現在完了","比較級","最上級","接続詞","不定詞","動名詞"];
  window.apLockedTabs=function(have){return window.AP_LOCKED_GRAMMAR.filter(function(g){return have.indexOf(g)<0;}).map(function(g){return '<button type="button" aria-pressed="false" data-lock="文法「'+g+'」">🔒 '+g+'</button>';}).join("");};
  window.apLock=function(what){
    if(document.querySelector(".aplk-scrim"))return;
    var w=document.createElement("div");w.className="aplk-scrim";
    w.innerHTML='<div class="aplk" role="dialog" aria-modal="true"><div class="ic">🔒</div><h2>本生徒のみアクセス可能です</h2>'+
      '<p>'+(what?String(what).replace(/[&<>"]/g,"")+"は、":"")+'本コースの生徒だけが使えます。無料の面談（45分・オンライン）で、話したい日から逆算した練習の計画を一緒に作ります。</p>'+
      '<a class="go" href="'+BOOK+'" target="_blank" rel="noopener">LINE で面談を予約する</a><button type="button">閉じる</button></div>';
    var close=function(){w.remove();};
    w.addEventListener("click",function(e){if(e.target===w)close();});
    w.querySelector("button").onclick=close;
    document.body.appendChild(w);
  };
  /* data-lock を付けたリンク・ボタンは、押すと鍵のシート */
  document.addEventListener("click",function(e){var el=e.target.closest&&e.target.closest("[data-lock]");if(!el)return;e.preventDefault();e.stopPropagation();window.apLock(el.getAttribute("data-lock"));},true);
})();
