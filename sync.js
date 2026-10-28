/* A-PUSH 共通の記録（kanri.apush.jp/sync.js）
   本コース（study.apush.jp）と無料版（training.apush.jp）が読む。団体のサイト（club-kit）と同じデータの形・同じ流れ：
     orgs/{場所}/members/{生徒ID}          … 名前・チーム・班（チームと班は幹部が決める）・lastDay・uids（この生徒として入った端末）
     orgs/{場所}/members/{ID}/days/{日付}  … その日の数 {sp 話す, wd 単語, sh シャドーイング, wn 新しい単語}
     orgs/{場所}/members/{ID}/inbox/{id}   … お知らせ（配るのは functions）。開くと read:true ＝ 既読
   場所：honka＝本コース／free＝無料版（団体は club-kit が直接書く）

   生徒は「生徒ID＋名前」で入る（functions の student が確かめる）。データは端末ではなく生徒IDにつながる＝スマホを替えても、同じIDと名前で戻せる。
     無料版：最初に使った時にIDを出す（画面に出す→スクショで保存）。本コース：会員番号がそのまま生徒ID。
   集めるのは名前（呼び名でよい）と練習の数だけ。メール・電話は聞かない。

   サイト側（このファイルが読めなくても、サイトはいつもどおり動く）：
     <script src="https://kanri.apush.jp/sync.js" defer></script>
     (window.aps=window.aps||[]).push(["start",{org:"free",site:"training.apush.jp",restore:function(days){…}}]);
     (window.aps=window.aps||[]).push(["mark","words",20]);      // 練習した時
   本コース：start に sid（会員番号）と name を入れる＝聞かない。restore：戻した記録 {"2026-10-14":{sp,wd,sh,wn}} をサイトの記録に足す。
   送るのは、生徒が同意にチェックした時だけ。config.js が未設定（__ で始まる）の間は何もしない。 */
(function () {
  "use strict";
  var SDK = "https://www.gstatic.com/firebasejs/11.0.2/";
  var REGION = "asia-northeast1";
  var BASE = (function () { var s = document.currentScript && document.currentScript.src; return s ? s.replace(/[^\/]*$/, "") : "/"; })();
  /* サイトの記録の名前 → 共通の名前（団体のサイトと同じ sp/wd/sh/wn） */
  var KIND = { chunk: ["sp"], sp: ["sp"], speak: ["sp"], words: ["wd", "wn"], wd: ["wd"], mix: ["wd"], shadow: ["sh"], sh: ["sh"] };

  var O = null, S = null, KEY = "", fb = null, db = null, uid = null, ready = false, timer = null, asked = false, MSGS = [], unsub = null;

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function today() { var d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function js(src) { return new Promise(function (ok, ng) { var e = document.createElement("script"); e.src = src; e.onload = ok; e.onerror = ng; document.head.appendChild(e); }); }
  function cfg() { var c = window.FB_CONFIG; return c && c.apiKey && String(c.apiKey).indexOf("__") !== 0 ? c : null; }
  function vapid() { var v = window.FB_VAPID; return v && String(v).indexOf("__") !== 0 ? v : null; }
  function warn(e) { if (window.console) console.warn("[aps]", e && (e.message || e)); }
  function who() { return O.to || "A-PUSHの講師"; }
  function cleanName(s) { return String(s || "").trim().replace(/\s+/g, " ").slice(0, 20); }

  /* ---------- 始める ---------- */
  function start(o) {
    if (O || !o || !/^[a-z0-9_-]{2,30}$/.test(o.org || "")) return;
    O = o; KEY = "aps-" + o.org;
    try { S = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { S = {}; }
    S.days = S.days || {}; S.q = S.q || {}; S.read = S.read || {};
    if (o.name) S.name = cleanName(o.name);
    if (o.sid && o.sid !== S.sid) { S.sid = o.sid; S.linked = ""; }   /* 本コース：会員番号が変わった＝入り直す */
    save();
    (window.FB_CONFIG ? Promise.resolve() : js(BASE + "config.js")).then(function () {
      if (cfg() && S.consent === true && S.sid) connect();
    }).catch(function () {});
  }

  /* 練習した */
  function mark(k, n) {
    if (!O) return;
    var ks = KIND[k]; if (!ks) return;
    var d = today(); n = Math.max(0, Math.min(500, Number(n) || 1));
    var x = S.days[d] = S.days[d] || { sp: 0, wd: 0, sh: 0, wn: 0 };
    ks.forEach(function (key) { x[key] = (x[key] || 0) + n; });
    S.q[d] = 1;
    var keys = Object.keys(S.days).sort(); while (keys.length > 60) delete S.days[keys.shift()];
    save();
    if (!cfg()) return;
    if (S.consent === true && S.sid) { connect(); later(); }
    else if (S.consent == null && !asked) { asked = true; setTimeout(ask, 900); }
  }

  /* 本コースでログインし直した時（会員番号と名前が決まっている＝聞かない） */
  function profile(o) {
    if (!O || !o || !o.name) return;
    S.name = cleanName(o.name);
    if (o.sid && o.sid !== S.sid) { S.sid = o.sid; S.linked = ""; }
    if (o.fixed) { O.name = S.name; O.sid = S.sid; }
    save();
    if (S.consent === true && S.sid) connect();
  }

  /* ---------- Firebase ---------- */
  var signing = null;
  /* 匿名でつなぐ（端末ごと）。生徒IDとのひも付けは link で */
  function signIn() {
    if (signing) return signing;
    signing = (window.firebase && window.firebase.functions ? Promise.resolve() :
      js(SDK + "firebase-app-compat.js").then(function () { return Promise.all([js(SDK + "firebase-auth-compat.js"), js(SDK + "firebase-firestore-compat.js"), js(SDK + "firebase-functions-compat.js")]); }))
      .then(function () {
        var F = window.firebase;
        fb = (F.apps || []).filter(function (a) { return a.name === "aps"; })[0] || F.initializeApp(cfg(), "aps");
        db = fb.firestore();
        var auth = fb.auth();
        return auth.currentUser ? { user: auth.currentUser } : auth.signInAnonymously();
      })
      .then(function (r) { uid = r.user.uid; })
      .catch(function (e) { signing = null; throw e; });
    return signing;
  }
  /* 生徒ID＋名前を確かめて、この端末をその生徒にひも付ける。{sid,name}／はじめて＝{name}。戻り値 {org,sid,name,isNew} */
  function link(data) {
    return signIn().then(function () {
      return fb.functions(REGION).httpsCallable("student")(Object.assign({ org: O.org }, data));
    }).then(function (r) {
      var v = r.data;
      S.sid = v.sid; S.name = v.name; S.org = v.org; S.linked = uid; save();
      return v;
    });
  }
  var connecting = null;
  function connect() {
    if (connecting) return connecting;
    connecting = signIn()
      .then(function () { return S.linked === uid ? null : link({ sid: S.sid, name: S.name }); })
      .then(function () { ready = true; return pull(); })
      .then(function () { saveMe(); watchInbox(); return push(); })
      .catch(function (e) { connecting = null; warn(e); });
    return connecting;
  }
  function me() { return db.collection("orgs").doc(S.org || O.org).collection("members").doc(S.sid); }
  function TS() { return window.firebase.firestore.FieldValue.serverTimestamp(); }
  function saveMe() { if (ready) me().update({ lastSeen: TS(), updatedAt: TS() }).catch(warn); }
  /* 前の端末の記録を、この端末に戻す（数は大きい方を取る） */
  function pull() {
    return me().collection("days").get().then(function (snap) {
      var got = {};
      snap.forEach(function (d) {
        var v = d.data(), x = S.days[d.id] = S.days[d.id] || { sp: 0, wd: 0, sh: 0, wn: 0 };
        ["sp", "wd", "sh", "wn"].forEach(function (k) { x[k] = Math.max(x[k] | 0, v[k] | 0); });
        got[d.id] = { sp: v.sp | 0, wd: v.wd | 0, sh: v.sh | 0, wn: v.wn | 0 };
      });
      save();
      if (typeof O.restore === "function" && snap.size) { try { O.restore(got); } catch (e) { warn(e); } }
    }).catch(warn);
  }
  function later() { clearTimeout(timer); timer = setTimeout(push, 3000); }
  /* その日の記録を1件に上書き（何回やっても1日1件）
     ponytail: 同じ日に2台で練習すると、後から送った方の数になる。困るようなら functions で足し合わせる */
  function push() {
    if (!ready || !navigator.onLine) return Promise.resolve();
    var ds = Object.keys(S.q);
    if (!ds.length) return Promise.resolve();
    return Promise.all(ds.map(function (d) {
      var x = S.days[d] || {};
      var doc = { sp: x.sp | 0, wd: x.wd | 0, sh: x.sh | 0, wn: x.wn | 0, at: TS() };
      if (S.ww && S.ww[d] && S.ww[d].length) doc.ww = S.ww[d];
      return me().collection("days").doc(d).set(doc)
        .then(function () { delete S.q[d]; }).catch(warn);
    })).then(function () {
      save();
      var last = Object.keys(S.days).filter(function (k) { var v = S.days[k]; return (v.sp | 0) + (v.wd | 0) + (v.sh | 0) > 0; }).sort().pop() || "";
      return me().update({ lastDay: last, lastSeen: TS(), updatedAt: TS() }).catch(warn);
    });
  }
  window.addEventListener("online", function () { if (ready) push(); });
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden" && ready) push(); });

  /* ---------- お知らせ箱（幹部・講師 → 生徒。開くと既読） ---------- */
  function watchInbox() {
    if (!ready || unsub) return;
    unsub = me().collection("inbox").orderBy("at", "desc").limit(30).onSnapshot(function (snap) {
      MSGS = snap.docs.map(function (d) { var v = d.data(); return { id: d.id, text: v.text || "", from: v.from || "", read: !!v.read, at: v.at && v.at.toDate ? v.at.toDate() : null }; });
      paintBell();
    }, warn);
  }
  function unread() { return MSGS.filter(function (m) { return !m.read && !S.read[m.id]; }); }
  function markRead() {
    MSGS.forEach(function (m) {
      if (m.read) return; S.read[m.id] = 1;
      me().collection("inbox").doc(m.id).update({ read: true }).catch(warn);
    });
    var ks = Object.keys(S.read); if (ks.length > 100) ks.slice(0, ks.length - 100).forEach(function (k) { delete S.read[k]; });
    save(); paintBell();
  }
  /* 通知を受け取る（ホーム画面に追加＋許可した端末だけ。届かなくても、お知らせ箱で読める） */
  function enablePush() {
    if (!ready || !vapid() || !("serviceWorker" in navigator) || !window.Notification) return Promise.resolve(false);
    return Notification.requestPermission().then(function (p) {
      if (p !== "granted") return false;
      return js(SDK + "firebase-messaging-compat.js").then(function () {
        return navigator.serviceWorker.register("/firebase-messaging-sw.js");
      }).then(function (reg) {
        return fb.messaging().getToken({ vapidKey: vapid(), serviceWorkerRegistration: reg });
      }).then(function (t) { if (!t) return false; return me().update({ fcm: t }).then(function () { return true; }); });
    }).catch(function (e) { warn(e); return false; });
  }

  /* ---------- 見た目（どのサイトでも同じ。白基調。サイトの色 --brand があれば使う） ---------- */
  var cssDone = false;
  function css() {
    if (cssDone) return; cssDone = true;
    var s = document.createElement("style");
    s.textContent =
      ".aps-scrim{position:fixed;inset:0;z-index:2147483000;background:rgba(15,30,61,.38);display:flex;align-items:flex-end;justify-content:center;animation:aps-f .2s}" +
      ".aps-sheet{--b:var(--brand,#1D4ED8);width:100%;max-width:520px;max-height:86dvh;overflow:auto;background:#fff;color:#0F1E3D;border-radius:22px 22px 0 0;padding:10px 20px calc(20px + env(safe-area-inset-bottom,0px));" +
      "font:16px/1.6 -apple-system,BlinkMacSystemFont,'Hiragino Sans','Noto Sans JP',system-ui,sans-serif;box-shadow:0 -8px 30px rgba(0,0,0,.15);animation:aps-u .3s cubic-bezier(.2,.8,.2,1)}" +
      ".aps-grab{width:38px;height:5px;border-radius:3px;background:rgba(127,127,127,.35);margin:0 auto 14px}" +
      "@media (min-width:640px){.aps-scrim{align-items:center}.aps-sheet{border-radius:22px}}" +
      ".aps-eb{font-size:12px;font-weight:700;letter-spacing:.06em;color:var(--b);margin:0 0 2px}" +
      ".aps-sheet h2{margin:0 0 8px;font-size:24px;line-height:1.3;letter-spacing:-.015em}.aps-sheet p{margin:0 0 12px;font-size:14.5px;opacity:.8}" +
      ".aps-lb{display:block;font-size:13px;font-weight:700;margin:0 0 4px}" +
      ".aps-in{width:100%;box-sizing:border-box;font:inherit;font-size:16px;padding:13px 14px;border-radius:14px;border:1px solid rgba(15,30,61,.16);background:#F2F4F8;color:inherit;margin:0 0 12px}" +
      ".aps-ck{display:flex;gap:10px;align-items:flex-start;font-size:13.5px;margin:2px 0 16px;cursor:pointer;opacity:.9}.aps-ck input{width:22px;height:22px;margin:1px 0 0;accent-color:var(--b);flex:none}" +
      ".aps-row{display:flex;gap:10px}.aps-btn{flex:1;font:inherit;font-weight:700;border:0;border-radius:16px;padding:15px;cursor:pointer;background:rgba(29,78,216,.1);color:var(--b)}" +
      ".aps-btn.p{background:var(--b);color:#fff}.aps-btn:disabled{opacity:.4;cursor:default}.aps-btn:active{transform:scale(.97)}" +
      ".aps-lk{display:block;width:100%;background:none;border:0;font:inherit;font-size:14px;font-weight:700;color:var(--b);padding:10px 0 0;cursor:pointer}" +
      ".aps-err{color:#BE123C;font-size:13.5px;font-weight:700;margin:-4px 0 12px}" +
      ".aps-id{font:800 34px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.12em;text-align:center;background:#F2F4F8;border-radius:16px;padding:16px;margin:4px 0 12px;user-select:all}" +
      ".aps-bell{position:fixed;z-index:2147482000;right:max(14px,env(safe-area-inset-right,0px));bottom:calc(env(safe-area-inset-bottom,0px) + 96px);border:0;border-radius:999px;padding:10px 16px;" +
      "background:var(--brand,#1D4ED8);color:#fff;font:700 14px/1 -apple-system,'Hiragino Sans','Noto Sans JP',sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.18);cursor:pointer;animation:aps-f .3s}" +
      ".aps-m{padding:12px 0;border-top:1px solid rgba(15,30,61,.1)}.aps-m small{opacity:.6;font-size:12.5px}.aps-m div{white-space:pre-wrap;font-size:15px;margin-top:2px}" +
      ".aps-new{display:inline-block;background:#E11D48;color:#fff;font-size:11px;border-radius:6px;padding:1px 6px;margin-left:6px}" +
      "@keyframes aps-f{from{opacity:0}}@keyframes aps-u{from{transform:translateY(40px);opacity:.6}}" +
      "@media (prefers-reduced-motion:reduce){.aps-scrim,.aps-sheet,.aps-bell{animation:none}}";
    document.head.appendChild(s);
  }
  function sheet(html) {
    css();
    var w = document.createElement("div");
    w.className = "aps-scrim"; w.innerHTML = '<div class="aps-sheet" role="dialog" aria-modal="true"><div class="aps-grab"></div>' + html + "</div>";
    function close() { if (w.parentNode) w.parentNode.removeChild(w); document.removeEventListener("keydown", key); }
    function key(e) { if (e.key === "Escape") close(); }
    w.addEventListener("click", function (e) { if (e.target === w) close(); });
    document.addEventListener("keydown", key);
    var s = w.firstChild, y0 = null, dy = 0;   /* 指で下に引いて閉じる */
    s.addEventListener("touchstart", function (e) { if (s.scrollTop <= 0 && !e.target.closest("input,button,label")) y0 = e.touches[0].clientY; }, { passive: true });
    s.addEventListener("touchmove", function (e) { if (y0 == null) return; dy = Math.max(0, e.touches[0].clientY - y0); s.style.transform = "translateY(" + dy + "px)"; }, { passive: true });
    s.addEventListener("touchend", function () { if (y0 == null) return; if (dy > 90) close(); else s.style.transform = ""; y0 = null; dy = 0; });
    document.body.appendChild(w);
    return { el: w, close: close, q: function (x) { return w.querySelector(x); } };
  }
  function errText(e) {
    var c = e && e.code || "";
    if (/not-found/.test(c)) return "生徒IDか名前が違います。もう一度確かめてください。";
    if (/already-exists/.test(c)) return "この番号はもう使われています。" + who() + "に連絡してください。";
    if (!navigator.onLine) return "ネットにつながっていません。";
    return "つながりませんでした。少し待ってから、もう一度押してください。";
  }

  /* 最初の1回：名前と同意。無料版＝はじめて／生徒IDを持っている、の2つ。本コース＝同意だけ（会員番号と名前は決まっている） */
  function ask(back) {
    if (S.consent != null && !back) return;
    var fixed = !!O.sid, hasId = !!back;
    var sh = sheet(
      '<p class="aps-eb">記録を送る</p><h2 id="aps-h"></h2><p id="aps-p"></p>' +
      (fixed ? "" :
        '<div id="aps-idw"><label class="aps-lb" for="aps-i">生徒ID</label><input class="aps-in" id="aps-i" maxlength="24" autocapitalize="characters" autocomplete="off" autocorrect="off" spellcheck="false" placeholder="例：K7M2Q9" value="' + esc(S.sid || "") + '"></div>' +
        '<label class="aps-lb" for="aps-n">名前（呼び名でOK。' + esc(who()) + 'がわかる名前）</label><input class="aps-in" id="aps-n" maxlength="20" autocomplete="nickname" placeholder="例：はなこ" value="' + esc(S.name || "") + '">') +
      '<label class="aps-ck"><input type="checkbox" id="aps-c"><span>練習した日と回数が、名前と一緒に' + esc(who()) + "に見えることに同意します。メールや電話番号は聞きません。記録はA-PUSHのサーバー（日本・東京）に置かれます。</span></label>" +
      '<p class="aps-err" id="aps-e" hidden></p>' +
      '<div class="aps-row"><button class="aps-btn" id="aps-no">送らない</button><button class="aps-btn p" id="aps-ok" disabled>送る</button></div>' +
      (fixed ? "" : '<button class="aps-lk" id="aps-sw"></button>'));
    var n = sh.q("#aps-n"), i = sh.q("#aps-i"), c = sh.q("#aps-c"), ok = sh.q("#aps-ok"), e = sh.q("#aps-e");
    function mode() {
      if (fixed) { sh.q("#aps-h").textContent = "練習の記録を送りますか？"; sh.q("#aps-p").textContent = "送ると、" + who() + "があなたの練習を見て、応援やお知らせを送れます。"; return; }
      sh.q("#aps-h").textContent = hasId ? "生徒IDと名前で入る" : "名前を入れて記録を送る";
      sh.q("#aps-p").textContent = hasId ? "前に使っていたIDと名前を入れると、今までの記録が戻ります。" : "送ると、" + who() + "があなたの練習を見て、応援やお知らせを送れます。送るのは名前と練習した日・回数だけです。";
      sh.q("#aps-idw").hidden = !hasId;
      sh.q("#aps-sw").textContent = hasId ? "はじめて使う ›" : "生徒IDを持っている（スマホを替えた時など） ›";
      chk();
    }
    function chk() { ok.disabled = !(c.checked && (fixed || (n.value.trim() && (!hasId || i.value.trim())))); }
    c.addEventListener("change", chk); if (n) n.addEventListener("input", chk); if (i) i.addEventListener("input", chk);
    if (!fixed) sh.q("#aps-sw").addEventListener("click", function () { hasId = !hasId; e.hidden = true; mode(); });
    mode();
    sh.q("#aps-no").addEventListener("click", function () { if (!back) { S.consent = false; save(); } sh.close(); });
    ok.addEventListener("click", function () {
      var data = fixed ? { sid: S.sid, name: S.name } : hasId ? { sid: i.value, name: n.value } : { name: n.value };
      ok.disabled = true; ok.textContent = "確かめています…"; e.hidden = true;
      link(data).then(function (v) {
        S.consent = true; Object.keys(S.days).forEach(function (k) { S.q[k] = 1; });   /* 今までの分もまとめて送る */
        save(); sh.close(); connecting = null; connect();
        if (v.isNew && !fixed) showId(true);
      }).catch(function (err) {
        warn(err); e.textContent = errText(err); e.hidden = false; ok.textContent = "送る"; chk();
      });
    });
  }

  /* 生徒IDを見せる（はじめての時・設定から） */
  function showId(first) {
    var sh = sheet('<p class="aps-eb">' + (first ? "あなたの生徒ID" : "記録を送る") + "</p><h2>" + esc(S.name || "") + "</h2>" +
      '<div class="aps-id">' + esc(S.sid || "") + "</div>" +
      "<p>" + (first ? "<b>この画面をスクショして保存してください。</b>" : "") + "スマホを替えた時や記録が消えた時は、このIDと名前を入れると、今までの記録に戻れます。IDを忘れたら" + esc(who()) + "に聞いてください。</p>" +
      '<div class="aps-row">' + (first ? "" : '<button class="aps-btn" id="aps-stop">送るのをやめる</button>') + '<button class="aps-btn p" id="aps-x">' + (first ? "保存した" : "閉じる") + "</button></div>");
    sh.q("#aps-x").addEventListener("click", sh.close);
    var st = sh.q("#aps-stop");
    if (st) st.addEventListener("click", function () { S.consent = false; save(); if (unsub) { unsub(); unsub = null; } MSGS = []; paintBell(); sh.close(); });
  }

  /* 設定（サイトの「記録を送る」ボタンなどから開く） */
  function settings() {
    if (!O || !cfg()) return;
    if (S.consent !== true || !S.sid) { S.consent = null; asked = true; ask(); return; }
    showId(false);
  }

  function paintBell() {
    var u = unread(), b = document.getElementById("aps-bell");
    if (!u.length) { if (b) b.parentNode.removeChild(b); return; }
    css();
    if (!b) { b = document.createElement("button"); b.id = "aps-bell"; b.className = "aps-bell"; b.addEventListener("click", openInbox); document.body.appendChild(b); }
    b.textContent = "📣 お知らせ " + u.length;
  }
  function openInbox() {
    var u = unread().map(function (m) { return m.id; });
    var canPush = vapid() && window.Notification && Notification.permission === "default";
    var sh = sheet('<p class="aps-eb">お知らせ</p><h2>' + esc(who()) + "から</h2>" + (MSGS.length ? MSGS.map(function (m) {
      var t = m.at ? (m.at.getMonth() + 1) + "/" + m.at.getDate() + " " + pad(m.at.getHours()) + ":" + pad(m.at.getMinutes()) : "";
      return '<div class="aps-m"><small>' + esc(m.from) + "・" + t + "</small>" + (u.indexOf(m.id) >= 0 ? '<span class="aps-new">新着</span>' : "") + "<div>" + esc(m.text) + "</div></div>";
    }).join("") : "<p>お知らせはまだありません。</p>") +
      '<div class="aps-row" style="margin-top:12px">' + (canPush ? '<button class="aps-btn" id="aps-push">通知を受け取る</button>' : "") + '<button class="aps-btn p" id="aps-x">閉じる</button></div>');
    sh.q("#aps-x").addEventListener("click", sh.close);
    var p = sh.q("#aps-push"); if (p) p.addEventListener("click", function () { p.disabled = true; enablePush().then(function (ok) { p.textContent = ok ? "✓ 通知ON" : "通知を受け取れませんでした"; }); });
    setTimeout(markRead, 1200);
  }

  /* ---------- 呼び出しの受け口（読み込み前に積まれた分も処理） ---------- */
  /* ログイン（匿名）してから Cloud Functions を呼ぶ。添削（adlib.js）が使う。記録の同意とは別＝同意していなくても添削はできる */
  function call(name, data) {
    return (window.FB_CONFIG ? Promise.resolve() : js(BASE + "config.js")).then(function () {
      if (!cfg()) throw new Error("no firebase config");
      return signIn();
    }).then(function () { return fb.functions(REGION).httpsCallable(name)(data); });
  }
  /* 今日の単語（単語のページの「トレーニング」の分）。["word|意味", …]。先生用の入口のアドリブ生成機が使う（2026-10-29） */
  function words(list) {
    if (!O || !Array.isArray(list)) return;
    var d = today();
    S.ww = S.ww || {};
    S.ww[d] = list.slice(0, 30).map(function (x) { return String(x || "").slice(0, 60); }).filter(Boolean);
    Object.keys(S.ww).sort().slice(0, -3).forEach(function (k) { delete S.ww[k]; });   // 3日分だけ持つ
    S.q[d] = 1; save(); later();
  }
  var API = { start: start, mark: mark, words: words, profile: profile, settings: settings, inbox: openInbox, login: function () { if (O && cfg()) ask(true); }, call: call };
  function run(a) { try { if (a && API[a[0]]) API[a[0]].apply(null, a.slice(1)); } catch (e) { warn(e); } }
  var q = window.aps || [];
  window.aps = { push: run };
  window.APushSync = API;
  for (var i = 0; i < q.length; i++) run(q[i]);
})();
