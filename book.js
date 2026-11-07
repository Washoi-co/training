/* A-PUSH：コーチに相談（予約）。「計画」の一番上のバナー → 下から出るシートで、空いている時間から選んで予約する（2026-11-08）
   使い方：<div id="ap-book"></div> と APushBook.mount(要素, {call: (関数の名前, データ) => Promise<{data}>, lessons: 本コースなら true})
   空き・予約は kanri の booking 関数 → LINE 予約と同じ Apps Script（同じ台帳・同じカレンダー・同じ二重予約の防止）。
   見た目は apush-design（赤は「予約する」ボタンの1か所だけ）。色の変数は --apb- で、サイトの変数とまざらない。 */
(function () {
  "use strict";
  var CSS = [
    ".apb{--apb-red:#ff2d16;--apb-red-strong:#d41b06;--apb-red-text:#d41b06;--apb-ink:#0b0b0c;--apb-paper:#fff;--apb-paper-2:#f4f4f5;--apb-muted:#5c5c64;--apb-line:rgba(11,11,12,.12);--apb-on-ink:#fff;",
    "--apb-display:'Zen Kaku Gothic New','Hiragino Sans','Yu Gothic',sans-serif;--apb-text:'Noto Sans JP','Hiragino Sans','Yu Gothic',sans-serif;--apb-en:Archivo,'Helvetica Neue',Arial,sans-serif}",
    "@media (prefers-color-scheme:dark){.apb{--apb-red-text:#ff5a47;--apb-ink:#fff;--apb-paper:#0b0b0c;--apb-paper-2:#1a1a1c;--apb-muted:#a1a1aa;--apb-line:rgba(255,255,255,.14);--apb-on-ink:#0b0b0c}}",
    ".apb-banner{display:flex;align-items:center;gap:12px;width:100%;min-height:64px;margin:0 0 16px;padding:16px 18px;border:0;border-radius:3px;background:var(--apb-ink);color:var(--apb-on-ink);text-align:left;cursor:pointer;font:inherit;transition:transform .22s cubic-bezier(.2,1.5,.4,1)}",
    ".apb-banner:active{transform:scale(.97);transition-duration:.1s}",
    ".apb-banner:focus-visible,.apb button:focus-visible,.apb a:focus-visible,.apb input:focus-visible,.apb select:focus-visible{outline:2px solid var(--apb-ink);outline-offset:2px}",
    ".apb-banner:focus-visible{outline-color:var(--apb-red)}",
    ".apb-b-tx{flex:1;min-width:0}",
    ".apb-b-t{display:block;font-family:var(--apb-display);font-weight:900;font-size:17px;line-height:1.5}",
    ".apb-b-s{display:block;margin-top:2px;font-family:var(--apb-text);font-size:12px;font-weight:700;opacity:.72}",
    ".apb-b-arr{font-family:var(--apb-en);font-weight:900;font-size:22px;line-height:1}",
    ".apb-back{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.45);opacity:0;transition:opacity .3s}",
    ".apb-back.on{opacity:1}",
    ".apb-sheet{width:100%;max-width:560px;max-height:92vh;max-height:92dvh;overflow:auto;overscroll-behavior:contain;background:var(--apb-paper);color:var(--apb-ink);border-radius:6px 6px 0 0;padding:20px 16px calc(24px + env(safe-area-inset-bottom));font-family:var(--apb-text);box-shadow:0 30px 80px -20px rgba(0,0,0,.6);transform:translateY(100%);transition:transform .35s cubic-bezier(.32,.72,0,1)}",
    ".apb-back.on .apb-sheet{transform:none}",
    ".apb-hd{display:flex;align-items:flex-start;gap:12px}",
    ".apb-hd h2{flex:1;margin:0;font-family:var(--apb-display);font-weight:900;font-size:20px;line-height:1.5}",
    ".apb-x{width:44px;height:44px;margin:-8px -8px 0 0;border:0;background:none;color:var(--apb-ink);font-size:24px;line-height:1;cursor:pointer}",
    ".apb-lead{margin:4px 0 16px;font-size:14px;line-height:1.8;color:var(--apb-muted)}",
    ".apb-seg{display:flex;margin:0 0 16px;border:1px solid var(--apb-line);border-radius:3px;overflow:hidden}",
    ".apb-seg button{flex:1;min-height:44px;border:0;background:none;color:var(--apb-ink);font-family:var(--apb-display);font-weight:900;font-size:15px;cursor:pointer}",
    ".apb-seg button[aria-pressed=true]{background:var(--apb-ink);color:var(--apb-on-ink)}",
    ".apb-label{margin:20px 0 8px;font-family:var(--apb-display);font-weight:900;font-size:14px}",
    ".apb-note{margin:12px 0;font-size:14px;line-height:1.8;color:var(--apb-muted)}",
    ".apb-err{margin:12px 0;font-size:14px;line-height:1.8;font-weight:700;color:var(--apb-red-text)}",
    ".apb-cal{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}",
    ".apb-wd{text-align:center;font-size:11px;font-weight:700;color:var(--apb-muted);padding:2px 0}",
    ".apb-day{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:44px;border:1px solid transparent;border-radius:2px;background:none;color:var(--apb-muted);font-family:var(--apb-en);font-weight:800;font-size:15px;line-height:1.1;opacity:.45;padding:0}",
    ".apb-day small{font-family:var(--apb-text);font-size:9px;font-weight:700}",
    ".apb-day.ok{opacity:1;color:var(--apb-ink);border-color:var(--apb-line);background:var(--apb-paper-2);cursor:pointer}",
    ".apb-day.sel{background:var(--apb-ink);color:var(--apb-on-ink);border-color:var(--apb-ink)}",
    ".apb-times{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px}",
    ".apb-t{min-height:44px;border:1px solid var(--apb-line);border-radius:2px;background:var(--apb-paper);color:var(--apb-ink);font-family:var(--apb-en);font-weight:800;font-size:15px;cursor:pointer}",
    ".apb-t[aria-pressed=true]{background:var(--apb-ink);color:var(--apb-on-ink);border-color:var(--apb-ink)}",
    ".apb-card{margin:8px 0;padding:14px 16px;border:1px solid var(--apb-line);border-radius:3px}",
    ".apb-card b{display:block;font-family:var(--apb-display);font-weight:900;font-size:16px;line-height:1.6}",
    ".apb-card small{display:block;font-size:12px;color:var(--apb-muted)}",
    ".apb-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}",
    ".apb-f{display:block;margin:12px 0 0;font-size:13px;font-weight:700}",
    ".apb-f input,.apb-f select{display:block;width:100%;box-sizing:border-box;min-height:44px;margin-top:6px;padding:0 12px;border:1px solid var(--apb-line);border-radius:2px;background:var(--apb-paper);color:var(--apb-ink);font:16px var(--apb-text)}",
    ".apb-btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 18px;border:0;border-radius:2px;font-family:var(--apb-display);font-weight:900;font-size:15px;text-decoration:none;cursor:pointer;transition:transform .22s cubic-bezier(.2,1.5,.4,1)}",
    ".apb-btn:active{transform:scale(.97);transition-duration:.1s}",
    ".apb-go{width:100%;min-height:56px;margin-top:20px;font-size:19px;background:var(--apb-red);color:#fff;box-shadow:0 10px 40px -8px rgba(255,45,22,.35)}",
    ".apb-go:hover{background:var(--apb-red-strong)}",
    ".apb-go:disabled{opacity:.5;cursor:default}",
    ".apb-ghost{background:none;color:var(--apb-ink);box-shadow:inset 0 0 0 1px var(--apb-ink)}",
    "@media (prefers-reduced-motion:reduce){.apb-banner,.apb-btn,.apb-sheet,.apb-back{transition:none}.apb-banner:active,.apb-btn:active{transform:none}}"
  ].join("");
  var WD = ["日", "月", "火", "水", "木", "金", "土"];

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return "&#" + c.charCodeAt(0) + ";"; }); }
  function utc(ymd) { return Date.UTC(+ymd.slice(0, 4), +ymd.slice(5, 7) - 1, +ymd.slice(8, 10)); }
  function md(ymd) { return (+ymd.slice(5, 7)) + "/" + (+ymd.slice(8, 10)) + "（" + WD[new Date(utc(ymd)).getUTCDay()] + "）"; }
  function when(b) { return md(b.date) + " " + b.time + "〜" + b.end; }
  /* Google カレンダーに入れるリンク（自分のカレンダーに入れるだけ。A-PUSH からは何も送らない） */
  function gcal(b, title) {
    var f = function (t) { return new Date(Date.parse(b.date + "T" + t + ":00+09:00")).toISOString().replace(/[-:]|\.\d+/g, ""); };
    return "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + encodeURIComponent("A-PUSH " + title) +
      "&dates=" + f(b.time) + "/" + f(b.end) + (b.meet ? "&details=" + encodeURIComponent(b.meet) : "");
  }
  function msgOf(e) {
    var m = String((e && e.message) || "");
    return /[ぁ-んァ-ヶ一-龠]/.test(m) ? m : "つながりませんでした。電波の良い所で、もう一度お試しください。";
  }

  function mount(el, opt) {
    if (!el || el.dataset.apb) return;
    el.dataset.apb = "1";
    if (!document.getElementById("apb-css")) { var st = document.createElement("style"); st.id = "apb-css"; st.textContent = CSS; document.head.appendChild(st); }
    el.classList.add("apb");
    el.innerHTML = '<button type="button" class="apb-banner"><span class="apb-b-tx"><span class="apb-b-t">コーチと気楽に英語学習の相談をする</span>' +
      '<span class="apb-b-s">45分・オンライン｜空いている時間から選べます</span></span><span class="apb-b-arr" aria-hidden="true">›</span></button>';
    var banner = el.firstChild;
    banner.addEventListener("click", function () { open(opt, banner); });
  }

  function open(opt, banner) {
    var kind = "meeting", data = null, day = "", time = "", busy = false, notice = "";
    var back = document.createElement("div");
    back.className = "apb apb-back";
    back.innerHTML = '<div class="apb-sheet" role="dialog" aria-modal="true" aria-labelledby="apb-h"><div class="apb-hd"><h2 id="apb-h">コーチに相談する</h2>' +
      '<button type="button" class="apb-x" aria-label="閉じる">×</button></div>' +
      '<p class="apb-lead">英語の勉強のしかた、続け方、迷っていること。なんでも気楽にどうぞ。</p>' +
      (opt.lessons ? '<div class="apb-seg" role="group" aria-label="予約の種類"><button type="button" data-k="meeting" aria-pressed="true">コーチング</button><button type="button" data-k="lesson" aria-pressed="false">レッスン</button></div>' : "") +
      '<div class="apb-body" aria-live="polite"></div></div>';
    document.body.appendChild(back);
    var body = back.querySelector(".apb-body");
    var prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    requestAnimationFrame(function () { back.classList.add("on"); });
    back.querySelector(".apb-x").focus();

    function close() {
      back.classList.remove("on");
      document.documentElement.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
      setTimeout(function () { back.remove(); }, 350);
      banner.focus();
    }
    function onKey(e) { if (e.key === "Escape") close(); }
    document.addEventListener("keydown", onKey);
    back.addEventListener("click", function (e) { if (e.target === back) close(); });
    back.querySelector(".apb-x").addEventListener("click", close);
    [].forEach.call(back.querySelectorAll(".apb-seg button"), function (b) {
      b.addEventListener("click", function () {
        if (busy || kind === b.dataset.k) return;
        kind = b.dataset.k;
        [].forEach.call(back.querySelectorAll(".apb-seg button"), function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        load();
      });
    });

    function call(d) { return Promise.resolve().then(function () { return opt.call("booking", d); }).then(function (r) { return r.data; }); }
    function title() { return kind === "lesson" ? "レッスン" : "コーチング"; }

    function load() {
      day = ""; time = ""; busy = true;
      body.innerHTML = '<p class="apb-note">空いている時間を読み込んでいます…</p>';
      call({ action: "days", kind: kind }).then(function (d) {
        busy = false;
        if (!d || !d.ok) return fail((d && d.error) || "");
        data = d; draw();
      }, function (e) { busy = false; fail(msgOf(e)); });
    }
    function fail(m) {
      body.innerHTML = '<p class="apb-err">' + esc(m || "いま予約を開けません。少し後でもう一度お試しください。") + '</p><button type="button" class="apb-btn apb-ghost">もう一度読み込む</button>';
      body.querySelector("button").addEventListener("click", load);
    }

    function mine() {
      if (!data.mine || !data.mine.length) return "";
      return '<p class="apb-label">ご予約</p>' + data.mine.map(function (b) {
        return '<div class="apb-card"><b>' + esc(when(b)) + '</b><small>' + esc(b.kind) + '・' + esc(b.place) + '（' + esc(b.no) + '）</small>' +
          (b.meet ? '<div class="apb-row"><a class="apb-btn apb-ghost" href="' + esc(b.meet) + '" target="_blank" rel="noopener">Meet を開く</a></div>' : "") + "</div>";
      }).join("") + '<p class="apb-note">' + (data.line ? "変更・キャンセルは LINE で「キャンセル」と送ってください。" : "変更・キャンセルは english@apush.jp へご連絡ください。") + "</p>";
    }

    function draw() {
      var html = (notice ? '<p class="apb-err">' + esc(notice) + "</p>" : "") + mine();
      notice = "";
      if (data.blocked) {
        body.innerHTML = html + '<p class="apb-note">このご相談が終わったら、次の予約ができます。</p>';
        return;
      }
      var days = data.days || [];
      if (!days.some(function (x) { return x.times.length; })) {
        body.innerHTML = html + '<p class="apb-note">いま予約できる時間がありません。少し後でもう一度ご覧ください。</p>';
        return;
      }
      /* カレンダー：今日の週の日曜から、4週間の終わりまで */
      var first = new Date(utc(days[0].date)).getUTCDay();
      var cells = WD.map(function (w) { return '<span class="apb-wd" aria-hidden="true">' + w + "</span>"; });
      for (var i = 0; i < first; i++) cells.push("<span></span>");
      days.forEach(function (x, i) {
        var dn = +x.date.slice(8, 10), ok = x.times.length > 0;
        var top = i === 0 || dn === 1 ? "<small>" + (+x.date.slice(5, 7)) + "月</small>" : "";
        cells.push('<button type="button" class="apb-day' + (ok ? " ok" : "") + (x.date === day ? " sel" : "") + '" data-d="' + x.date + '"' + (ok ? "" : " disabled") +
          ' aria-label="' + md(x.date) + (ok ? " 空きあり" : " 空きなし") + '"' + (x.date === day ? ' aria-pressed="true"' : "") + ">" + top + dn + "</button>");
      });
      html += '<p class="apb-label">日にちを選ぶ</p><div class="apb-cal">' + cells.join("") + "</div>";
      var d = days.filter(function (x) { return x.date === day; })[0];
      if (d) {
        html += '<p class="apb-label">' + md(d.date) + " の時間</p>" + '<div class="apb-times">' + d.times.map(function (t) {
          return '<button type="button" class="apb-t" data-t="' + t.time + '" aria-pressed="' + (t.time === time) + '">' + t.time + "〜" + t.end + "</button>";
        }).join("") + "</div>";
        var t = d.times.filter(function (x) { return x.time === time; })[0];
        if (t) html += form(d.date, t);
      }
      body.innerHTML = html;
      [].forEach.call(body.querySelectorAll(".apb-day.ok"), function (b) { b.addEventListener("click", function () { day = b.dataset.d; time = ""; draw(); }); });
      [].forEach.call(body.querySelectorAll(".apb-t"), function (b) {
        b.addEventListener("click", function () { time = b.dataset.t; draw(); var go = body.querySelector(".apb-go"); if (go) go.scrollIntoView({ block: "nearest", behavior: "smooth" }); });
      });
      var go = body.querySelector(".apb-go");
      if (go) go.addEventListener("click", book);
    }

    function form(date, t) {
      var places = data.places || [];
      var h = '<div class="apb-card"><b>' + esc(title()) + "｜" + esc(md(date) + " " + t.time + "〜" + t.end) + "</b><small>" + (kind === "lesson" ? "" : "オンライン（Google Meet）") + "</small></div>";
      if (kind === "lesson" && places.length > 1) h += '<label class="apb-f">場所<select id="apb-place">' + places.map(function (p) { return "<option>" + esc(p) + "</option>"; }).join("") + "</select></label>";
      if (data.needName) h += '<label class="apb-f">お名前（呼び名でかまいません）<input id="apb-name" autocomplete="nickname" maxlength="20" required></label>';
      if (!data.line) h += '<label class="apb-f">ご連絡用のメール<input id="apb-mail" type="email" autocomplete="email" inputmode="email" maxlength="254" required placeholder="name@example.com"></label>';
      return h + '<button type="button" class="apb-btn apb-go">この時間で予約する</button><p class="apb-err" id="apb-msg" hidden></p>';
    }

    function book() {
      var go = body.querySelector(".apb-go"), out = body.querySelector("#apb-msg");
      var v = function (id) { var x = body.querySelector(id); return x ? x.value.trim() : ""; };
      var say = function (m) { out.textContent = m; out.hidden = false; };
      if (body.querySelector("#apb-name") && !v("#apb-name")) return say("お名前を入れてください。");
      if (body.querySelector("#apb-mail") && !/^[^@\s]+@[^@\s]+\.[^@\s.]+$/.test(v("#apb-mail"))) return say("メールアドレスを入れてください。");
      go.disabled = true; go.textContent = "予約しています…"; busy = true;
      call({ action: "book", kind: kind, date: day, time: time, place: v("#apb-place"), name: v("#apb-name"), email: v("#apb-mail") }).then(function (r) {
        busy = false;
        if (r && r.ok) return done(r);
        if (r && r.gone) { notice = r.error; return load(); }   /* 先にうまった：空きを読み直して、もう一度選んでもらう */
        go.disabled = false; go.textContent = "この時間で予約する"; say((r && r.error) || "予約できませんでした。もう一度お試しください。");
      }, function (e) { busy = false; go.disabled = false; go.textContent = "この時間で予約する"; say(msgOf(e)); });
    }

    function done(r) {
      var b = r.booking;
      body.innerHTML = '<p class="apb-label">ご予約を受け付けました</p><div class="apb-card"><b>' + esc(when(b)) + "</b><small>" + esc(b.kind) + "・" + esc(b.place) + "（" + esc(b.no) + "）</small>" +
        '<div class="apb-row">' + (b.meet ? '<a class="apb-btn apb-ghost" href="' + esc(b.meet) + '" target="_blank" rel="noopener">Meet を開く</a>' : "") +
        '<a class="apb-btn apb-ghost" href="' + esc(gcal(b, title())) + '" target="_blank" rel="noopener">カレンダーに入れる</a></div></div>' +
        '<p class="apb-note">' + (r.line ? "前日と1時間前に LINE でお知らせします。変更・キャンセルは LINE で「キャンセル」と送ってください。"
          : "当日は時間になったら「Meet を開く」から入ってください。このバナーからいつでも確かめられます。変更・キャンセルは english@apush.jp へご連絡ください。") + "</p>";
    }

    load();
  }

  window.APushBook = { mount: mount };
})();
