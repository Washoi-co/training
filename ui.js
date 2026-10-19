/* A-PUSH 共通の動き（doboku と同じ）：下のタブ（ページ間のリンク）・上のバー（スクロールですりガラス、ロゴ→画面の名前）
   使い方：<body data-tab="sp"> と <script src="/ui.js" defer></script>。タブとロゴはここで差し込む */
(function () {
  var LOGO = '<svg class="aplogo" viewBox="0 0 3847 1000" fill="currentColor" role="img" aria-label="A-PUSH"><path d="M450 104 L846 896 L648 896 L450 500 L252 896 L54 896 Z"/><rect x="960" y="432" width="270" height="136"/><path d="M1354.0 844.0V156.0H1760.0Q1825.0 156.0 1874.5 185.5Q1924.0 215.0 1952.0 267.0Q1980.0 319.0 1980.0 388.0Q1980.0 459.0 1951.5 511.5Q1923.0 564.0 1873.5 593.0Q1824.0 622.0 1760.0 622.0H1575.0V844.0ZM1575.0 461.0H1686.0Q1721.0 461.0 1738.5 443.0Q1756.0 425.0 1756.0 390.0Q1756.0 366.0 1748.5 350.5Q1741.0 335.0 1725.5 327.0Q1710.0 319.0 1686.0 319.0H1575.0ZM2204.0 856.0Q2110.0 856.0 2065.0 804.0Q2020.0 752.0 2020.0 658.0V316.0H2219.0V634.0Q2219.0 650.0 2223.5 664.0Q2228.0 678.0 2236.0 688.0Q2244.0 698.0 2257.0 703.5Q2270.0 709.0 2286.0 709.0Q2311.0 709.0 2329.5 697.5Q2348.0 686.0 2358.5 667.0Q2369.0 648.0 2369.0 626.0V316.0H2568.0V844.0H2405.0L2395.0 764.0H2388.0Q2369.0 793.0 2339.5 814.0Q2310.0 835.0 2275.0 845.5Q2240.0 856.0 2204.0 856.0ZM2893.0 856.0Q2845.0 856.0 2797.5 846.5Q2750.0 837.0 2710.5 816.5Q2671.0 796.0 2647.0 764.0Q2623.0 732.0 2623.0 686.0V679.0Q2623.0 676.0 2624.0 672.0H2809.0Q2808.0 675.0 2808.0 678.0V683.0Q2809.0 701.0 2820.5 713.0Q2832.0 725.0 2851.0 731.0Q2870.0 737.0 2893.0 737.0Q2907.0 737.0 2926.5 735.0Q2946.0 733.0 2961.0 725.0Q2976.0 717.0 2976.0 698.0Q2976.0 681.0 2958.5 672.5Q2941.0 664.0 2912.5 658.5Q2884.0 653.0 2850.0 647.0Q2813.0 641.0 2775.5 631.5Q2738.0 622.0 2706.0 604.5Q2674.0 587.0 2654.5 558.0Q2635.0 529.0 2635.0 483.0Q2635.0 431.0 2656.5 396.0Q2678.0 361.0 2715.5 340.5Q2753.0 320.0 2800.5 311.5Q2848.0 303.0 2900.0 303.0Q2945.0 303.0 2989.5 311.5Q3034.0 320.0 3071.0 338.5Q3108.0 357.0 3130.0 387.0Q3152.0 417.0 3152.0 460.0V467.0Q3152.0 472.0 3151.0 474.0H2968.0V466.0Q2968.0 451.0 2957.5 441.5Q2947.0 432.0 2930.5 427.5Q2914.0 423.0 2897.0 423.0Q2891.0 423.0 2879.0 423.5Q2867.0 424.0 2854.5 427.0Q2842.0 430.0 2833.5 437.0Q2825.0 444.0 2825.0 457.0Q2825.0 469.0 2836.5 476.5Q2848.0 484.0 2867.5 488.5Q2887.0 493.0 2911.0 498.0Q2949.0 505.0 2993.0 511.5Q3037.0 518.0 3076.5 533.5Q3116.0 549.0 3141.0 580.5Q3166.0 612.0 3166.0 669.0Q3166.0 723.0 3144.0 759.5Q3122.0 796.0 3084.0 817.0Q3046.0 838.0 2996.5 847.0Q2947.0 856.0 2893.0 856.0ZM3220.0 844.0V119.0H3419.0V371.0H3426.0Q3443.0 349.0 3469.0 334.5Q3495.0 320.0 3525.0 312.0Q3555.0 304.0 3584.0 304.0Q3647.0 304.0 3687.5 327.5Q3728.0 351.0 3748.0 395.0Q3768.0 439.0 3768.0 502.0V844.0H3569.0V526.0Q3569.0 509.0 3564.5 495.5Q3560.0 482.0 3552.0 472.0Q3544.0 462.0 3531.5 456.5Q3519.0 451.0 3502.0 451.0Q3477.0 451.0 3458.5 462.5Q3440.0 474.0 3429.5 492.5Q3419.0 511.0 3419.0 534.0V844.0Z"/></svg>';
  var TABS = '<nav class="tabbar" aria-label="トレーニング"><div>  <a class="tab" href="/plan/" data-tab="home"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15.5" rx="2.4"/><path d="M3.5 10h17M8.5 3v4M15.5 3v4"/><path d="M8.5 14.5l2 2 4-4"/></svg><span>今日＆計画</span></a>  <a class="tab" href="/" data-tab="sp"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17.5V7a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v6.5a3 3 0 0 1-3 3H9.5L5 20z"/><path d="M9 10.5h6"/></svg><span>話す</span></a>  <a class="tab" href="/shadowing/" data-tab="sh"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3.5" y="13.5" width="4" height="6.5" rx="1.6"/><rect x="16.5" y="13.5" width="4" height="6.5" rx="1.6"/></svg><span>シャドーイング</span></a>  <a class="tab" href="/words/" data-tab="wd"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="6" width="12.5" height="14" rx="2.2"/><path d="M8 3.5h9.5a2.5 2.5 0 0 1 2.5 2.5v11"/></svg><span>単語</span></a></div></nav>';
  var here = document.body.getAttribute("data-tab");
  document.body.insertAdjacentHTML("beforeend", TABS);
  /* 「本コース」の説明（無料版だけ。study は本コースそのものなので出さない）：どの画面も、上の「やり方」の横 */
  if (!/^study\./.test(location.hostname) && here !== "co") document.querySelectorAll(".nav").forEach(function (n) {
    var a = document.createElement("a"); a.className = "pill"; a.href = "/course/"; a.textContent = "本コース"; a.style.textDecoration = "none";
    var how = [].slice.call(n.querySelectorAll(".pill")).filter(function (b) { return /やり方/.test(b.textContent); })[0];
    if (how && how.parentNode === n) { var w = document.createElement("span"); w.className = "navr"; n.insertBefore(w, how); w.appendChild(a); w.appendChild(how); }
    else if (how) how.parentNode.insertBefore(a, how);
    else { var r = document.createElement("span"); r.className = "navr"; r.appendChild(a); n.appendChild(r); }
  });
  document.querySelectorAll(".tabbar .tab").forEach(function (a) {
    var on = a.getAttribute("data-tab") === here;
    a.setAttribute("aria-selected", on ? "true" : "false");
    if (on) a.setAttribute("aria-current", "page");
  });
  document.querySelectorAll(".navl").forEach(function (n) { if (!n.querySelector(".aplogo")) n.insertAdjacentHTML("afterbegin", LOGO); });
  var nav = document.querySelector(".nav");
  function stuck() { if (nav) nav.classList.toggle("stuck", window.scrollY > 40); }
  window.addEventListener("scroll", stuck, { passive: true }); stuck();
})();

/* 「アプリ版もあります」の案内（doboku の今日の画面と同じ形）。スマホのブラウザで開いている時だけ、見出しの下に出す。
   押すと install.js の手順（iPhone＝ホーム画面に追加／Android＝インストール）。× で閉じたら、このサイトでは出さない。
   ページに前からの案内（#a2hs）がある時は出さない（2つ出ないように） */
(function () {
  var ua = navigator.userAgent || "";
  var mobile = /iPhone|iPad|iPod|Android/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  var app = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
  var closed = false; try { closed = localStorage.getItem("ui-inst-closed") === "1"; } catch (e) {}
  if (!mobile || app || closed || document.getElementById("a2hs")) return;
  var at = document.querySelector(".screen .sub") || document.querySelector(".screen .large");
  if (!at) return;
  var d = document.createElement("div");
  d.className = "inst";
  d.innerHTML = '<button class="primary">📲 アプリにする</button><button class="inst-x" aria-label="閉じる">×</button>';   /* 押すとアプリに（Android＝インストール／iPhone＝手順） */
  d.style.cssText = "display:flex;align-items:center;gap:8px";
  d.querySelector(".primary").style.flex = "1";
  at.parentNode.insertBefore(d, at.nextSibling);
  d.querySelector(".inst-x").onclick = function () { d.remove(); try { localStorage.setItem("ui-inst-closed", "1"); } catch (e) {} };
  d.querySelector(".primary").onclick = function () { if (window.APInstall) window.APInstall.open(); };
})();

/* ---- 初めて開いた時の案内（2026-10-18）：何がどこにあるかを、1つずつ光らせて説明する ----
   apTour("キー", [["CSSセレクタ","説明"], ...])。1回見たら（スキップでも）もう出さない。
   ほかの案内（やり方・アプリとして入れよう）が出ている間は待ち、最初の場所が見えてから始める。 */
(function(){
  var css=".aptour-spot{position:fixed;z-index:9998;border-radius:14px;box-shadow:0 0 0 9999px rgba(15,20,40,.62);transition:all .25s ease;pointer-events:none}"+
    ".aptour-tip{position:fixed;z-index:9999;left:16px;right:16px;max-width:420px;margin:0 auto;background:#fff;color:#141a2e;border-radius:16px;padding:14px 16px;box-shadow:0 10px 30px rgba(0,0,0,.25);font-size:15px;line-height:1.6}"+
    ".aptour-tip small{display:block;color:#6b7385;font-size:12px;margin-bottom:4px}"+
    ".aptour-row{display:flex;justify-content:space-between;align-items:center;margin-top:10px}"+
    ".aptour-row button{border-radius:99px;padding:8px 16px;font-size:14px;font-weight:700}"+
    ".aptour-skip{background:transparent;color:#6b7385}.aptour-next{background:#141a2e;color:#fff}";
  var busy=function(){ return [].some.call(document.querySelectorAll("dialog[open],.sheet.open,.api-scrim"),function(e){ var s=getComputedStyle(e); return s.display!=="none"&&s.visibility!=="hidden"; }); };
  var shown=function(el){ if(!el) return false; var r=el.getBoundingClientRect(); return r.width>0&&r.height>0&&getComputedStyle(el).visibility!=="hidden"; };
  var running=false;
  window.apTour=function(key,steps){
    var k="apush-tour-"+key;
    try{ if(localStorage.getItem(k)) return; }catch(e){ return; }
    var tries=0,calm=0;
    (function wait(){   // ほかの案内が無い状態が1.5秒続いてから始める
      calm=(running||busy()||!shown(document.querySelector(steps[0][0])))?0:calm+1;
      if(calm<3){ if(++tries<360) setTimeout(wait,500); return; }
      start();
    })();
    function start(){
      var list=steps.filter(function(s){ return shown(document.querySelector(s[0])); });
      if(!list.length) return;
      running=true;
      if(!document.getElementById("aptour-css")){ var st=document.createElement("style"); st.id="aptour-css"; st.textContent=css; document.head.appendChild(st); }
      var spot=document.createElement("div"); spot.className="aptour-spot";
      var tip=document.createElement("div"); tip.className="aptour-tip"; tip.setAttribute("role","dialog"); tip.setAttribute("aria-live","polite");
      document.body.appendChild(spot); document.body.appendChild(tip);
      var i=0;
      var guard=setInterval(function(){ var b=busy(); spot.style.display=tip.style.display=b?"none":""; if(!b) place(); },400);   // 途中でシートが出たら隠す
      function end(){ try{ localStorage.setItem(k,"1"); }catch(e){} clearInterval(guard); spot.remove(); tip.remove(); running=false; removeEventListener("resize",place); }
      function place(){
        var el=document.querySelector(list[i][0]); if(!el) return;
        var r=el.getBoundingClientRect(), p=6;
        spot.style.left=(r.left-p)+"px"; spot.style.top=(r.top-p)+"px"; spot.style.width=(r.width+p*2)+"px"; spot.style.height=(r.height+p*2)+"px";
        var below=r.bottom+p+12, h=tip.offsetHeight;
        tip.style.top=(below+h<innerHeight-8?below:Math.max(8,r.top-p-12-h))+"px";
      }
      function show(){
        var el=document.querySelector(list[i][0]);
        el.scrollIntoView({block:"center"});
        tip.innerHTML='<small>はじめての方へ　'+(i+1)+' / '+list.length+'</small>'+list[i][1]+
          '<div class="aptour-row"><button class="aptour-skip" type="button">スキップ</button><button class="aptour-next" type="button">'+(i===list.length-1?"はじめる":"次へ")+'</button></div>';
        tip.querySelector(".aptour-skip").onclick=end;
        tip.querySelector(".aptour-next").onclick=function(){ if(++i>=list.length){ end(); return; } show(); };
        setTimeout(place,350); place();
      }
      addEventListener("resize",place);
      show();
    }
  };
})();

/* ページごとの案内（初めて開いた時だけ。ログインの後に始まる） */
(function(){
  var P=location.pathname, S=window.SITE||{}, T=(S.tours||{})[P];   /* 案内の中身はサイトの設定（club-kit の groups/*.json） */
  if(T&&window.apTour) apTour((S.tourKey||S.id||"site")+P,T);
})();
