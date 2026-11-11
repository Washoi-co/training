/* ---- 鍵（2026-11-03・全サイト共通。2026-11-04 に ui.js から移した）：無料版で本コースの中身を押した時のシート。apLock() で開く ----
   「本生徒のみアクセス可能です」→「面談を予約する」で公式 LINE（「予約」の文が入った状態）へ */
(function(){
  var BOOK="https://line.me/R/oaMessage/@431enzow/?%E4%BA%88%E7%B4%84";
  var css=".aplk-scrim{position:fixed;inset:0;z-index:9990;background:rgba(15,20,40,.45);display:flex;align-items:flex-end;justify-content:center;animation:aplkf .18s ease-out}"+
    ".aplk{width:100%;max-width:520px;background:var(--card,#fff);color:var(--ink,#141a2e);border-radius:22px 22px 0 0;padding:22px 20px calc(20px + env(safe-area-inset-bottom,0px));box-shadow:0 -8px 30px rgba(0,0,0,.18);animation:aplku .24s cubic-bezier(.2,.9,.3,1.1)}"+
    ".aplk .lt{margin:0;color:var(--mute,#6b7385);font-size:13px;font-weight:700}"+
    ".aplk h2{margin:8px 0 18px;font-size:28px;line-height:1.3;font-weight:900;letter-spacing:-.01em;color:var(--ink,#141a2e)}"+
    ".aplk .tri{margin-top:16px;background:var(--soft,#f2f4f8);border-radius:14px;padding:14px 16px}"+
    ".aplk .tri b.h{display:block;font-size:14px;font-weight:900;margin-bottom:8px}"+
    ".aplk .tri ol{margin:0;padding:0;list-style:none;counter-reset:t}"+
    ".aplk .tri li{counter-increment:t;position:relative;padding-left:26px;margin:7px 0;font-size:13.5px;line-height:1.55;color:var(--ink,#141a2e)}"+
    ".aplk .tri li::before{content:counter(t);position:absolute;left:0;top:1px;width:19px;height:19px;border-radius:50%;background:#FF2D16;color:#fff;font-size:11.5px;font-weight:800;display:flex;align-items:center;justify-content:center}"+
    ".aplk .tri li b{font-weight:800;margin-right:4px}"+
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
  /* 本コース（study）の章にある文法だけ（Beginner 24章・Intermediate 26章から。無い物は並べない）。2026-11-04 */
  window.AP_LOCKED_GRAMMAR=["be動詞（What is this?）","数・色（How many?）","持ち主（Whose?）","職業","形容詞","現在形","三人称単数","現在進行形","頻度の副詞",
    "疑問詞（5W1H）","過去形","過去進行形","過去形と過去進行形","未来（will）","be going to","will と be going to","現在完了（経験・完了）","現在完了（継続）","現在完了と過去形",
    "比較級","最上級","助動詞 can","助動詞 should","助動詞 must / have to","must not と don't have to",
    "接続詞 and / but","接続詞 so / because","接続詞 although / though","接続詞 if / whether","接続詞 when / while","接続詞 before / after","接続詞 as soon as / as long as","接続詞 in case / even if",
    "関係代名詞 who","関係代名詞 which","関係代名詞 that","不定詞","動名詞"];
  /* have：そのサイトにもうある文法（この言葉で始まる物は並べない） */
  window.apLockedTabs=function(have){return window.AP_LOCKED_GRAMMAR.filter(function(g){return !have.some(function(h){return g.indexOf(h)===0;});}).map(function(g){return '<button type="button" aria-pressed="false" data-lock="文法「'+g+'」">🔒 '+g+'</button>';}).join("");};
  /* 一番上に大きく出す一言（A）。試験の画面は exam.html が window.AP_LOCK_HEAD を入れる（2026-11-04 kimi の文） */
  function headOf(what){
    if(window.AP_LOCK_HEAD)return window.AP_LOCK_HEAD;
    what=String(what||"");
    if(what.indexOf("文法")===0)return what.slice(2)+"も本コースで";
    if(what==="この単語帳")return "単語も本コースでみっちり";
    if(what==="この動画")return "シャドーイングも本コースでみっちり";
    return (what||"英語")+"も本コースで";
  }
  var esc=function(x){return String(x).replace(/[&<>"]/g,"");};
  window.apLock=function(what){
    if(document.querySelector(".aplk-scrim"))return;
    var w=document.createElement("div");w.className="aplk-scrim";
    w.innerHTML='<div class="aplk" role="dialog" aria-modal="true" aria-label="本コース生徒のみアクセス可能です">'+
      '<p class="lt">🔒 本コース生徒のみアクセス可能です</p><h2>'+esc(headOf(what))+'</h2>'+
      '<a class="go" href="'+BOOK+'" target="_blank" rel="noopener">LINE で面談を予約する</a>'+
      '<div class="tri"><b class="h">A-PUSHの三角システム</b><ol>'+
        '<li><b>コーチ</b>モチベーションを保ち、学習法を改善します</li>'+
        '<li><b>ネイティブ</b>毎週ネイティブと話す日がある。だから毎週、そこに向けて準備します</li>'+
        '<li><b>アプリ</b>A-PUSHの計算された学習法をフルに使えて、学習の管理もできます</li>'+
      '</ol></div><button type="button">閉じる</button></div>';
    var close=function(){w.remove();};
    w.addEventListener("click",function(e){if(e.target===w)close();});
    w.querySelector("button").onclick=close;
    document.body.appendChild(w);
  };
  /* data-lock を付けたリンク・ボタンは、押すと鍵のシート */
  document.addEventListener("click",function(e){var el=e.target.closest&&e.target.closest("[data-lock]");if(!el)return;e.preventDefault();e.stopPropagation();window.apLock(el.getAttribute("data-lock"));},true);
})();
