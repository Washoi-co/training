/* ホーム画面に追加の案内（training・study・各団体のサイトで同じ物）。2026-10-16
   ・LINE などのアプリの中で開いた → 「Safari（ブラウザ）で開く」
   ・iPhoneのSafari → 練習を始める前に「ホーム画面に追加」の手順（Safariとアプリでは記録が別々になるため）
   ・Android → 「インストール」ボタン1つ
   ・もう練習したことがある人 → 「引き継ぎコード」で、記録をアプリに移せる
   ・ホーム画面のアプリで開いている／パソコン → 何も出さない（引き継ぎコードを貼る入口だけ）
   ・どのページも一番上に A-PUSH のロゴ（団体のサイトは型の方に入っている）
   サイト側：<script src="install.js" defer></script>（どのページでも1行）。window.APInstall.open() で手で開ける。 */
(function () {
  "use strict";
  var ua = navigator.userAgent || "";
  var IOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  var ANDROID = /Android/.test(ua);
  var LINE = /\bLine\//i.test(ua);
  var INAPP = LINE || /Instagram|FBAN|FBAV|FB_IAB|Twitter|TikTok|BytedanceWebview|KAKAOTALK|YJApp/i.test(ua);
  var SAFARI = IOS && !INAPP && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(ua);
  var STANDALONE = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
  var MOBILE = IOS || ANDROID;
  var K = "apinst-";   /* サイト（ドメイン）ごとに別。ページが変わっても同じ */
  var deferred = null;

  function get(k) { try { return localStorage.getItem(K + k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(K + k, v); } catch (e) {} }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* もう練習したことがあるか（この端末のこのサイトに記録があるか） */
  function hasRecords() {
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (/(^|-)log$|activity|^ap_|words|-me$|^aps-/.test(k) && k.indexOf("apinst-") !== 0) return true;
      }
    } catch (e) {}
    return false;
  }

  /* ---------- 見た目（サイトの色 --brand を使う） ---------- */
  var cssDone = false;
  function css() {
    if (cssDone) return; cssDone = true;
    var s = document.createElement("style");
    s.textContent =
      ".api-scrim{position:fixed;inset:0;z-index:2147483100;background:rgba(15,30,61,.42);display:flex;align-items:flex-end;justify-content:center;animation:api-f .2s}" +
      ".api-sheet{--b:var(--brand,#1D4ED8);width:100%;max-width:520px;max-height:92dvh;overflow:auto;background:#fff;color:#0F1E3D;border-radius:22px 22px 0 0;padding:10px 20px calc(20px + env(safe-area-inset-bottom,0px));" +
      "font:16px/1.6 -apple-system,BlinkMacSystemFont,'Hiragino Sans','Noto Sans JP',system-ui,sans-serif;box-shadow:0 -8px 30px rgba(0,0,0,.15);animation:api-u .32s cubic-bezier(.2,.8,.2,1)}" +
      "@media (min-width:640px){.api-scrim{align-items:center}.api-sheet{border-radius:22px}}" +
      ".api-grab{width:38px;height:5px;border-radius:3px;background:rgba(127,127,127,.35);margin:0 auto 14px}" +
      ".api-eb{font-size:12px;font-weight:700;letter-spacing:.06em;color:var(--b);margin:0 0 2px}" +
      ".api-sheet h2{margin:0 0 8px;font-size:24px;line-height:1.3;letter-spacing:-.015em}.api-sheet p{margin:0 0 12px;font-size:14.5px;opacity:.82}" +
      ".api-warn{background:rgba(217,119,6,.12);border-radius:12px;padding:10px 12px;font-size:13.5px;margin:0 0 14px}" +
      ".api-steps{display:grid;gap:8px;margin:0 0 16px;padding:0;list-style:none;counter-reset:s}" +
      ".api-step{display:grid;grid-template-columns:28px 1fr auto;gap:10px;align-items:center;background:#F2F4F8;border-radius:14px;padding:10px 12px;font-size:15px;counter-increment:s}" +
      ".api-step::before{content:counter(s);width:28px;height:28px;border-radius:50%;background:var(--b);color:#fff;display:grid;place-items:center;font-weight:700;font-size:14px}" +
      ".api-step svg{width:26px;height:26px;color:var(--b)}" +
      ".api-row{display:flex;gap:10px;flex-wrap:wrap}.api-btn{flex:1 1 140px;font:inherit;font-weight:700;border:0;border-radius:16px;padding:15px;cursor:pointer;background:rgba(29,78,216,.1);color:var(--b);text-align:center;text-decoration:none}" +
      ".api-btn.p{background:var(--b);color:#fff}.api-btn:active{transform:scale(.97)}.api-btn:disabled{opacity:.4}" +
      ".api-link{display:block;margin:12px auto 0;background:none;border:0;color:var(--b);font:inherit;font-size:14px;font-weight:600;cursor:pointer}" +
      ".api-code{width:100%;box-sizing:border-box;min-height:96px;font:12px/1.4 ui-monospace,Menlo,monospace;border:0;border-radius:12px;background:#F2F4F8;color:inherit;padding:10px;margin:0 0 12px;resize:vertical;word-break:break-all}" +
      "@keyframes api-f{from{opacity:0}}@keyframes api-u{from{transform:translateY(40px);opacity:.6}}" +
      "@media (prefers-reduced-motion:reduce){.api-scrim,.api-sheet{animation:none}}";
    document.head.appendChild(s);
  }
  var cur = null;
  function sheet(html) {
    css(); if (cur) cur.close();
    var w = document.createElement("div");
    w.className = "api-scrim"; w.innerHTML = '<div class="api-sheet" role="dialog" aria-modal="true"><div class="api-grab"></div>' + html + "</div>";
    function close() { if (w.parentNode) w.parentNode.removeChild(w); if (cur && cur.el === w) cur = null; }
    w.addEventListener("click", function (e) { if (e.target === w) close(); });
    var s = w.firstChild, y0 = null, dy = 0;   /* 指で下に引いて閉じる */
    s.addEventListener("touchstart", function (e) { if (s.scrollTop <= 0 && !e.target.closest("button,textarea,a")) y0 = e.touches[0].clientY; }, { passive: true });
    s.addEventListener("touchmove", function (e) { if (y0 == null) return; dy = Math.max(0, e.touches[0].clientY - y0); s.style.transform = "translateY(" + dy + "px)"; }, { passive: true });
    s.addEventListener("touchend", function () { if (y0 == null) return; if (dy > 90) close(); else s.style.transform = ""; y0 = null; dy = 0; });
    document.body.appendChild(w);
    cur = { el: w, close: close, q: function (x) { return w.querySelector(x); } };
    return cur;
  }
  var ICON = {
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>',
    add: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="3"/><rect x="9" y="7" width="6" height="6" rx="1.5"/></svg>',
    dots: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>'
  };
  function step(t, ic) { return '<li class="api-step"><span>' + t + "</span>" + (ic || "") + "</li>"; }

  /* ---------- 1) LINE などのアプリの中 ---------- */
  function inApp() {
    var url = location.href.replace(/([?&])openExternalBrowser=1&?/, "$1").replace(/[?&]$/, "");
    var ext = url + (url.indexOf("?") < 0 ? "?" : "&") + "openExternalBrowser=1";
    var sh = sheet('<p class="api-eb">はじめに</p><h2>' + (IOS ? "Safari" : "ブラウザ") + "で開いてください</h2>" +
      "<p>" + (LINE ? "LINE" : "このアプリ") + "の中の画面では、ホーム画面に追加できず、記録も消えやすくなります。</p>" +
      '<div class="api-row">' + (LINE ? '<a class="api-btn p" href="' + esc(ext) + '">' + (IOS ? "Safari" : "ブラウザ") + "で開く</a>" : "") + "</div>" +
      '<p style="margin-top:14px">開かない時は、右' + (IOS ? "下" : "上") + "の " + ICON.dots.replace("<svg", '<svg style="width:18px;height:18px;vertical-align:-4px"') + " →「" + (IOS ? "Safariで開く" : "他のアプリで開く／ブラウザで開く") + "」。</p>" +
      '<button class="api-link" id="api-later">このまま使う</button>');
    sh.q("#api-later").onclick = function () { set("inapp", "1"); sh.close(); };
  }

  /* ---------- 2) iPhoneのSafari：追加の手順 ---------- */
  function iosGuide() {
    var had = hasRecords();
    var sh = sheet('<p class="api-eb">はじめに</p><h2>ホーム画面に追加して始めよう</h2>' +
      "<p>アプリのように開けて、お知らせも届きます。</p>" +
      '<ol class="api-steps">' +
      step("下の<b>共有ボタン</b>を押す", ICON.share) +
      step("<b>「ホーム画面に追加」</b>を選ぶ（見えない時は下へずらす）", ICON.add) +
      step("右上の<b>「追加」</b> → ホーム画面のアイコンから開く", ICON.home) + "</ol>" +
      '<div class="api-warn">⚠️ Safariで練習した記録は、ホーム画面のアプリには入りません。' + (had ? "<b>今までの記録は「引き継ぎコード」で移せます。</b>" : "先に追加してから始めるのがおすすめです。") + "</div>" +
      '<div class="api-row">' + (had ? '<button class="api-btn" id="api-move">記録を移す</button>' : "") + '<button class="api-btn p" id="api-ok">わかった</button></div>' +
      '<button class="api-link" id="api-later">Safariのまま使う</button>');
    sh.q("#api-ok").onclick = function () { set("seen", String(Date.now())); sh.close(); };
    sh.q("#api-later").onclick = function () { set("stay", "1"); sh.close(); };
    var mv = sh.q("#api-move"); if (mv) mv.onclick = exportSheet;
  }

  /* ---------- 3) Android：インストール ---------- */
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferred = e; });
  function androidGuide() {
    var sh = sheet('<p class="api-eb">はじめに</p><h2>アプリとして入れよう</h2><p>ホーム画面から1回で開けて、お知らせも届きます。</p>' +
      (deferred ? "" : '<ol class="api-steps">' + step("右上の <b>⋮</b> を押す", ICON.dots) + step("<b>「ホーム画面に追加」</b>か<b>「アプリをインストール」</b>", ICON.add) + "</ol>") +
      '<div class="api-row">' + (deferred ? '<button class="api-btn p" id="api-inst">インストール</button>' : '<button class="api-btn p" id="api-ok">わかった</button>') + "</div>" +
      (hasRecords() ? '<p style="margin-top:12px;font-size:13px">Androidは、ブラウザとアプリで記録が同じです（移す必要はありません）。</p>' : "") +
      '<button class="api-link" id="api-later">ブラウザのまま使う</button>');
    var b = sh.q("#api-inst");
    if (b) b.onclick = function () { deferred.prompt(); (deferred.userChoice || Promise.resolve()).then(function () { deferred = null; set("seen", String(Date.now())); sh.close(); }); };
    var ok = sh.q("#api-ok"); if (ok) ok.onclick = function () { set("seen", String(Date.now())); sh.close(); };
    sh.q("#api-later").onclick = function () { set("stay", "1"); sh.close(); };
  }

  /* ---------- 4) 引き継ぎコード（この端末のこのサイトの記録を、まるごと文字にする） ---------- */
  function pack() {
    var o = {};
    try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k.indexOf("apinst-") !== 0) o[k] = localStorage.getItem(k); } } catch (e) {}
    var txt = JSON.stringify({ v: 1, host: location.host, at: Date.now(), d: o });
    if (window.CompressionStream) {
      var cs = new Blob([txt]).stream().pipeThrough(new CompressionStream("gzip"));
      return new Response(cs).arrayBuffer().then(function (buf) { return "APZ1." + b64(new Uint8Array(buf)); });
    }
    return Promise.resolve("APJ1." + b64(new TextEncoder().encode(txt)));
  }
  function unpack(code) {
    code = String(code || "").replace(/\s+/g, "");
    var m = /^(APZ1|APJ1)\.(.+)$/.exec(code);
    if (!m) return Promise.reject(new Error("コードの形が違います"));
    var bytes = unb64(m[2]);
    var p = m[1] === "APZ1"
      ? new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).text()
      : Promise.resolve(new TextDecoder().decode(bytes));
    return p.then(function (t) { var j = JSON.parse(t); if (!j || j.v !== 1 || !j.d) throw new Error("中身が読めません"); return j; });
  }
  function b64(u8) { var s = ""; for (var i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }
  function unb64(s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }

  function exportSheet() {
    var sh = sheet('<p class="api-eb">記録を移す 1/2</p><h2>引き継ぎコードをコピー</h2>' +
      "<p>このコードに、今までの記録・ゴール・名前が入っています。</p>" +
      '<textarea class="api-code" id="api-c" readonly>作っています…</textarea>' +
      '<div class="api-row"><button class="api-btn p" id="api-copy" disabled>コピーする</button></div>' +
      '<p style="margin-top:12px;font-size:13.5px">次に、ホーム画面に追加したアプリを開く → 出てくる<b>「引き継ぎコードを貼る」</b>に貼り付け。</p>');
    pack().then(function (c) {
      var t = sh.q("#api-c"), b = sh.q("#api-copy"); if (!t) return;
      t.value = c; b.disabled = false;
      b.onclick = function () {
        var done = function () { b.textContent = "✓ コピーしました"; set("exported", String(Date.now())); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(c).then(done, function () { t.select(); document.execCommand("copy"); done(); });
        else { t.select(); document.execCommand("copy"); done(); }
      };
    });
  }
  function importSheet() {
    var sh = sheet('<p class="api-eb">記録を移す 2/2</p><h2>引き継ぎコードを貼る</h2>' +
      "<p>Safariで練習していた人だけ。ブラウザでコピーしたコードを長押し →「ペースト」。</p>" +
      '<textarea class="api-code" id="api-c" placeholder="APZ1.…" autocapitalize="off" autocomplete="off" spellcheck="false"></textarea>' +
      '<p id="api-err" style="color:#E11D48;font-size:13.5px;margin:-4px 0 10px"></p>' +
      '<div class="api-row"><button class="api-btn" id="api-x">閉じる</button><button class="api-btn p" id="api-go" disabled>移す</button></div>');
    var t = sh.q("#api-c"), go = sh.q("#api-go");
    t.oninput = function () { go.disabled = !t.value.trim(); };
    sh.q("#api-x").onclick = function () { set("imported", "skip"); sh.close(); };
    go.onclick = function () {
      go.disabled = true;
      unpack(t.value).then(function (j) {
        if (j.host !== location.host) throw new Error("別のサイトのコードです（" + j.host + "）");
        Object.keys(j.d).forEach(function (k) { try { localStorage.setItem(k, j.d[k]); } catch (e) {} });
        set("imported", String(Date.now()));
        sh.q(".api-sheet").innerHTML = '<div class="api-grab"></div><p class="api-eb">記録を移す</p><h2>移しました</h2><p>読み込み直します…</p>';
        setTimeout(function () { location.reload(); }, 900);
      }).catch(function (e) { sh.q("#api-err").textContent = "移せませんでした：" + e.message; go.disabled = false; });
    };
  }

  /* ---------- どれを出すか ---------- */
  function decide() {
    if (STANDALONE) {
      /* アプリで初めて開いた・まだ記録がない → 引き継ぎの入口だけ（iPhone） */
      if (IOS && !get("imported") && !hasRecords()) {
        var bar = document.createElement("button");
        css(); bar.className = "api-btn"; bar.textContent = "Safariで練習していた人：引き継ぎコードを貼る";
        bar.style.cssText = "position:fixed;left:16px;right:16px;bottom:calc(env(safe-area-inset-bottom,0px) + 92px);z-index:2147482100;flex:none;background:var(--brand,#1D4ED8);color:#fff;box-shadow:0 6px 20px rgba(0,0,0,.18);font-size:14px;padding:13px";
        bar.onclick = function () { bar.remove(); importSheet(); };
        document.body.appendChild(bar);
        setTimeout(function () { if (bar.parentNode) bar.remove(); }, 20000);
      }
      return;
    }
    if (!MOBILE) return;
    if (INAPP) { if (!get("inapp")) inApp(); return; }
    if (get("stay")) return;
    var seen = Number(get("seen") || 0);
    if (Date.now() - seen < 3 * 864e5) return;   /* 「わかった」から3日は出さない */
    if (SAFARI || (IOS && /CriOS/.test(ua))) iosGuide();
    else if (ANDROID) setTimeout(androidGuide, 1500);   /* インストールの準備（beforeinstallprompt）を少し待つ */
  }
  function open() {
    if (STANDALONE) { importSheet(); return; }
    if (INAPP) inApp(); else if (IOS) iosGuide(); else if (ANDROID) androidGuide();
  }

  /* ---------- A-PUSHのロゴを一番上に（ページにロゴが無い時だけ。団体のサイトは型に入っている） ---------- */
  function topLogo() {
    if (document.querySelector(".aplogo,.api-top,.navl")) return;   /* doboku と同じ見た目のページ（.navl）は ui.js がロゴを入れる */
    var bar = document.createElement("div");
    bar.className = "api-top";
    bar.innerHTML = "<svg class=\"api-logo\" viewBox=\"0 0 3847 1000\" role=\"img\" aria-label=\"A-PUSH\" fill=\"currentColor\"><path d=\"M450 104 L846 896 L648 896 L450 500 L252 896 L54 896 Z\"/><rect x=\"960\" y=\"432\" width=\"270\" height=\"136\"/><path d=\"M1354.0 844.0V156.0H1760.0Q1825.0 156.0 1874.5 185.5Q1924.0 215.0 1952.0 267.0Q1980.0 319.0 1980.0 388.0Q1980.0 459.0 1951.5 511.5Q1923.0 564.0 1873.5 593.0Q1824.0 622.0 1760.0 622.0H1575.0V844.0ZM1575.0 461.0H1686.0Q1721.0 461.0 1738.5 443.0Q1756.0 425.0 1756.0 390.0Q1756.0 366.0 1748.5 350.5Q1741.0 335.0 1725.5 327.0Q1710.0 319.0 1686.0 319.0H1575.0ZM2204.0 856.0Q2110.0 856.0 2065.0 804.0Q2020.0 752.0 2020.0 658.0V316.0H2219.0V634.0Q2219.0 650.0 2223.5 664.0Q2228.0 678.0 2236.0 688.0Q2244.0 698.0 2257.0 703.5Q2270.0 709.0 2286.0 709.0Q2311.0 709.0 2329.5 697.5Q2348.0 686.0 2358.5 667.0Q2369.0 648.0 2369.0 626.0V316.0H2568.0V844.0H2405.0L2395.0 764.0H2388.0Q2369.0 793.0 2339.5 814.0Q2310.0 835.0 2275.0 845.5Q2240.0 856.0 2204.0 856.0ZM2893.0 856.0Q2845.0 856.0 2797.5 846.5Q2750.0 837.0 2710.5 816.5Q2671.0 796.0 2647.0 764.0Q2623.0 732.0 2623.0 686.0V679.0Q2623.0 676.0 2624.0 672.0H2809.0Q2808.0 675.0 2808.0 678.0V683.0Q2809.0 701.0 2820.5 713.0Q2832.0 725.0 2851.0 731.0Q2870.0 737.0 2893.0 737.0Q2907.0 737.0 2926.5 735.0Q2946.0 733.0 2961.0 725.0Q2976.0 717.0 2976.0 698.0Q2976.0 681.0 2958.5 672.5Q2941.0 664.0 2912.5 658.5Q2884.0 653.0 2850.0 647.0Q2813.0 641.0 2775.5 631.5Q2738.0 622.0 2706.0 604.5Q2674.0 587.0 2654.5 558.0Q2635.0 529.0 2635.0 483.0Q2635.0 431.0 2656.5 396.0Q2678.0 361.0 2715.5 340.5Q2753.0 320.0 2800.5 311.5Q2848.0 303.0 2900.0 303.0Q2945.0 303.0 2989.5 311.5Q3034.0 320.0 3071.0 338.5Q3108.0 357.0 3130.0 387.0Q3152.0 417.0 3152.0 460.0V467.0Q3152.0 472.0 3151.0 474.0H2968.0V466.0Q2968.0 451.0 2957.5 441.5Q2947.0 432.0 2930.5 427.5Q2914.0 423.0 2897.0 423.0Q2891.0 423.0 2879.0 423.5Q2867.0 424.0 2854.5 427.0Q2842.0 430.0 2833.5 437.0Q2825.0 444.0 2825.0 457.0Q2825.0 469.0 2836.5 476.5Q2848.0 484.0 2867.5 488.5Q2887.0 493.0 2911.0 498.0Q2949.0 505.0 2993.0 511.5Q3037.0 518.0 3076.5 533.5Q3116.0 549.0 3141.0 580.5Q3166.0 612.0 3166.0 669.0Q3166.0 723.0 3144.0 759.5Q3122.0 796.0 3084.0 817.0Q3046.0 838.0 2996.5 847.0Q2947.0 856.0 2893.0 856.0ZM3220.0 844.0V119.0H3419.0V371.0H3426.0Q3443.0 349.0 3469.0 334.5Q3495.0 320.0 3525.0 312.0Q3555.0 304.0 3584.0 304.0Q3647.0 304.0 3687.5 327.5Q3728.0 351.0 3748.0 395.0Q3768.0 439.0 3768.0 502.0V844.0H3569.0V526.0Q3569.0 509.0 3564.5 495.5Q3560.0 482.0 3552.0 472.0Q3544.0 462.0 3531.5 456.5Q3519.0 451.0 3502.0 451.0Q3477.0 451.0 3458.5 462.5Q3440.0 474.0 3429.5 492.5Q3419.0 511.0 3419.0 534.0V844.0Z\"/></svg>";
    var st = document.createElement("style");
    st.textContent = ".api-top{display:flex;align-items:center;padding:calc(env(safe-area-inset-top,0px) + 10px) max(16px,env(safe-area-inset-left,0px)) 6px;color:#FF2D16;position:relative;z-index:1}" +
      ".api-top .api-logo{height:20px;width:auto;display:block}";
    document.head.appendChild(st);
    document.body.insertBefore(bar, document.body.firstChild);
  }

  window.APInstall = { open: open, exportCode: exportSheet, importCode: importSheet };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { topLogo(); setTimeout(decide, 600); });
  else { topLogo(); setTimeout(decide, 600); }
})();
